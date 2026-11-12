import json
from copy import deepcopy

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app import main, payments, plans
from app.auth import require_user
from app.exercise_requests import load_catalog

USER = '11111111-1111-4111-8111-111111111111'
PLAN_ID = '33333333-3333-4333-8333-333333333333'
ORDER = 'PLANORDER1234'
BODY = {'goal': 'glutes', 'level': 'Beginner', 'days_per_week': 3, 'equipment': ['Dumbbells', 'Bands'], 'session_minutes': 30, 'notes': 'Home workouts'}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('GROQ_API_KEY', 'test-key-never-real')
    main.app.dependency_overrides[require_user] = lambda: USER
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def ai_draft(ids, sessions=3, per_session=4, weeks=4):
    return {'title': 'Glute Builder', 'summary': 'Fits your goal.',
            'sessions': [{'name': f'Day {i}', 'exercises': [{'exercise_id': ids[(i * per_session + j) % len(ids)], 'sets': 3, 'reps': '10–12'} for j in range(per_session)]} for i in range(sessions)],
            'weeks': [{'focus': f'Week {w}', 'guidance': 'Move well.'} for w in range(weeks)]}


def model_returning(draft):
    async def model(messages, key, name, ids):
        assert 'Catalog (id|name|muscle|level)' in messages[0]['content']
        return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps(draft(ids) if callable(draft) else draft)}}]}
    return model


def stored_plan(**overrides):
    content = plans.build_content(ai_draft([e['id'] for e in load_catalog()][:20]), plans.PlanRequest(**BODY), 'ai')
    return {'id': PLAN_ID, 'user_id': USER, 'title': content['title'], 'preferences': BODY, 'content': content, 'generated_by': 'ai',
            'price_cents': 699, 'currency': 'USD', 'unlocked_at': None, 'purchase_id': None, 'created_at': '2026-11-10T00:00:00Z', **overrides}


def test_candidates_respect_equipment_and_level():
    request = plans.PlanRequest(**BODY)
    pool = plans.candidates(load_catalog(), request, 'seed')
    assert pool and all(e['equipment'] in {'Bodyweight', 'Dumbbells', 'Bands'} and e['difficulty'] == 'Beginner' for e in pool)
    assert all(e['muscle'] not in ('Mobility', 'Cardio') for e in pool) and len(pool) <= 80


def test_ai_plan_is_stored_with_server_price(client, monkeypatch):
    monkeypatch.setattr(plans, 'request_plan', model_returning(ai_draft))
    saved = {}
    async def db(method, path, **kwargs):
        assert (method, path) == ('POST', 'custom_plans')
        saved.update(kwargs['json'])
        return [{**kwargs['json'], 'id': PLAN_ID, 'unlocked_at': None, 'created_at': '2026-11-10T00:00:00Z'}]
    monkeypatch.setattr(payments, 'database', db)
    result = client.post('/api/plans', json={**BODY, 'price_cents': 1})
    assert result.status_code == 200
    data = result.json()
    assert saved['user_id'] == USER and saved['generated_by'] == 'ai' and saved['price_cents'] == 399 + 300
    assert data['price_cents'] == 699 and not data['unlocked']
    assert len(data['content']['weeks']) == 1 and [w['week'] for w in data['locked_weeks']] == [2, 3, 4]
    assert len(saved['content']['weeks']) == 4 and saved['content']['weeks'][0]['sessions'][0]['day'].startswith('Monday')


@pytest.mark.parametrize('broken', ['few_sessions', 'few_weeks', 'short_session', 'unknown_ids', 'provider_error'])
def test_invalid_or_unavailable_ai_falls_back_to_rules(client, monkeypatch, broken):
    if broken == 'provider_error':
        async def model(*args):
            raise httpx.HTTPStatusError('limit', request=httpx.Request('POST', 'https://x'), response=httpx.Response(429))
    else:
        def draft(ids):
            if broken == 'few_sessions': return ai_draft(ids, sessions=2)
            if broken == 'few_weeks': return ai_draft(ids, weeks=3)
            if broken == 'short_session': return ai_draft(ids, per_session=2)
            return ai_draft(['made-up-exercise'] * 10)
        model = model_returning(draft)
    monkeypatch.setattr(plans, 'request_plan', model)
    async def db(method, path, **kwargs):
        return [{**kwargs['json'], 'id': PLAN_ID, 'unlocked_at': None, 'created_at': 'now'}]
    monkeypatch.setattr(payments, 'database', db)
    data = client.post('/api/plans', json=BODY).json()
    assert data['generated_by'] == 'rules'
    ids = {e['id'] for e in load_catalog()}
    sessions = data['content']['weeks'][0]['sessions']
    assert len(sessions) == 3 and all(item['exercise_id'] in ids for s in sessions for item in s['exercises'])


def test_plan_request_validation(client):
    assert client.post('/api/plans', json={**BODY, 'days_per_week': 7}).status_code == 422
    assert client.post('/api/plans', json={**BODY, 'equipment': ['Spaceship']}).status_code == 422
    assert TestClient(main.app).post('/api/plans', json=BODY).status_code in (401, 503)


def test_locked_plan_hides_weeks_and_unlocked_shows_all(client, monkeypatch):
    plan = stored_plan()
    async def db(method, path, **kwargs):
        assert kwargs['params']['user_id'] == 'eq.' + USER
        return [plan] if path == 'custom_plans' else []
    monkeypatch.setattr(payments, 'database', db)
    locked = client.get(f'/api/plans/{PLAN_ID}').json()
    assert len(locked['content']['weeks']) == 1 and len(locked['locked_weeks']) == 3
    plan.update(unlocked_at='2026-11-10T01:00:00Z', purchase_id='p')
    unlocked = client.get(f'/api/plans/{PLAN_ID}').json()
    assert unlocked['unlocked'] and len(unlocked['content']['weeks']) == 4 and unlocked['locked_weeks'] == []


def test_other_users_plan_is_not_found(client, monkeypatch):
    async def db(*args, **kwargs): return []
    monkeypatch.setattr(payments, 'database', db)
    assert client.get(f'/api/plans/{PLAN_ID}').status_code == 404
    assert client.get('/api/plans/not-a-uuid').status_code == 404
    assert client.post(f'/api/plans/{PLAN_ID}/checkout').status_code == 404


def test_plan_checkout_uses_plan_reservation_and_custom_id(client, monkeypatch):
    calls = {}
    async def db(method, path, **kwargs):
        if path == 'custom_plans': return [stored_plan()]
        if path == 'purchases': return []
        if path == 'rpc/reserve_plan_checkout':
            calls['reserve'] = kwargs['json']
            return [{'id': '44444444-4444-4444-8444-444444444444', 'user_id': USER, 'program_id': 'custom-plan', 'plan_id': PLAN_ID, 'amount_cents': 699,
                     'currency': 'USD', 'checkout_title': 'Glute Builder', 'return_base': 'http://localhost:8000', 'paypal_order_id': None, 'created_at': '2099-01-01T00:00:00+00:00'}]
        calls['bind'] = kwargs['json']
    async def pp(method, path, **kwargs):
        calls['order'] = kwargs['json']
        return {'id': ORDER, 'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=' + ORDER}]}
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    result = client.post(f'/api/plans/{PLAN_ID}/checkout')
    assert result.status_code == 200 and result.json()['order_id'] == ORDER
    assert calls['reserve']['p_plan_id'] == PLAN_ID and calls['reserve']['p_user_id'] == USER
    unit = calls['order']['purchase_units'][0]
    assert unit['custom_id'] == f'{USER}:{PLAN_ID}' and unit['reference_id'] == 'custom-plan' and unit['amount']['value'] == '6.99'


def test_unlocked_plan_cannot_be_bought_again(client, monkeypatch):
    async def db(method, path, **kwargs): return [stored_plan(unlocked_at='2026-11-10T01:00:00Z', purchase_id='p')]
    monkeypatch.setattr(payments, 'database', db)
    assert client.post(f'/api/plans/{PLAN_ID}/checkout').status_code == 409


def test_plan_capture_verifies_plan_custom_id(client, monkeypatch):
    purchase = {'user_id': USER, 'program_id': 'custom-plan', 'plan_id': PLAN_ID, 'paypal_order_id': ORDER, 'currency': 'USD', 'amount_cents': 699}
    completed = {'id': ORDER, 'status': 'COMPLETED', 'purchase_units': [{'custom_id': f'{USER}:{PLAN_ID}', 'payments': {'captures': [
        {'id': 'CAP999', 'status': 'COMPLETED', 'amount': {'value': '6.99', 'currency_code': 'USD'}, 'final_capture': True}]}}]}
    writes = []
    async def db(method, path, **kwargs):
        if method == 'GET': return [purchase]
        writes.append((path, kwargs['json']))
    async def pp(*args, **kwargs): return completed
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    result = client.post(f'/api/paypal/orders/{ORDER}/capture').json()
    assert result == {'unlocked': True, 'program_id': 'custom-plan', 'plan_id': PLAN_ID}
    assert writes == [('rpc/complete_program_purchase', {'p_order_id': ORDER, 'p_user_id': USER, 'p_capture_id': 'CAP999'})]
    spoofed = deepcopy(completed)
    spoofed['purchase_units'][0]['custom_id'] = f'{USER}:beginner-strength'
    with pytest.raises(HTTPException):
        payments.verify_capture(spoofed, purchase)


def test_coach_can_offer_custom_plan(client, monkeypatch):
    async def model(messages, *args):
        assert 'custom-plan' in messages[0]['content']
        return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'text': 'I can build that for you.', 'exercise_id': None, 'youtube_query': None, 'program_id': 'custom-plan'})}}]}
    monkeypatch.setattr(main, 'request_model', model)
    result = client.post('/api/chat', json={'message': 'Build me a 3-day dumbbell plan'})
    assert result.status_code == 200 and result.json()['program_id'] == 'custom-plan'
