from datetime import datetime, timezone
from unittest.mock import AsyncMock
import httpx
import pytest
from fastapi.testclient import TestClient
from app import main, payments
from app.auth import require_user
from app.limits import allowed

USER = '11111111-1111-4111-8111-111111111111'
PURCHASE = {'id': '22222222-2222-4222-8222-222222222222', 'user_id': USER, 'program_id': 'beginner-strength', 'amount_cents': 999,
    'currency': 'USD', 'checkout_title': 'Beginner Strength Essentials', 'return_base': 'http://localhost:8000',
    'created_at': datetime.now(timezone.utc).isoformat()}


@pytest.fixture
def client():
    main.app.dependency_overrides[require_user] = lambda: USER
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_slow_followup_uses_latest_external_demo(client):
    r = client.post('/api/chat', json={'message': 'make it slower', 'history': [
        {'role': 'assistant', 'content': 'Squat', 'exercise_id': 'bodyweight-squat'},
        {'role': 'assistant', 'content': 'Swing tutorial', 'youtube_query': 'kettlebell swing'},
    ]})
    assert r.json()['exercise_id'] is None
    assert r.json()['gif_url'] is None
    assert 'YouTube' in r.json()['text']


def test_limits_expire_and_do_not_trust_new_headers(client):
    assert allowed('test', 1, 60, now=0)
    assert not allowed('test', 1, 60, now=59)
    assert allowed('test', 1, 60, now=60)
    for _ in range(15):
        assert client.get('/api/demonstration?q=squat').status_code == 200
    result = client.get('/api/demonstration?q=squat', headers={'X-Forwarded-For': '1.2.3.4'})
    assert result.status_code == 429
    assert result.headers['Retry-After'] == '60'


def test_oversized_body_rejected(client):
    assert client.post('/api/chat', content='x' * 40001).status_code == 413


def test_expired_pending_order_can_be_replaced(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': False, 'pending_order_id': 'EXPIRED123'}))
    calls = []
    async def db(method, path, **kwargs):
        calls.append((method, path, kwargs))
        return [PURCHASE] if path == 'rpc/reserve_program_checkout' else None
    async def pp(method, path, **kwargs):
        if method == 'GET':
            httpx.Response(404, request=httpx.Request('GET', payments.PAYPAL + path)).raise_for_status()
        assert kwargs['headers']['PayPal-Request-Id'] == PURCHASE['id']
        assert kwargs['json']['purchase_units'][0]['amount']['value'] == '9.99'
        return {'id': 'NEW12345678', 'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=NEW12345678'}]}
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    r = client.post('/api/paypal/orders')
    assert r.status_code == 200
    assert r.json()['order_id'] == 'NEW12345678'
    assert calls[0][2]['json']['status'] == 'cancelled'
    assert calls[-1][1] == 'rpc/bind_program_checkout'


def test_transient_pending_failure_does_not_create_replacement(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': False, 'pending_order_id': 'PENDING123'}))
    async def pp(*args, **kwargs):
        httpx.Response(503, request=httpx.Request('GET', payments.PAYPAL)).raise_for_status()
    db = AsyncMock()
    monkeypatch.setattr(payments, 'paypal', pp)
    monkeypatch.setattr(payments, 'database', db)
    assert client.post('/api/paypal/orders').status_code == 502
    db.assert_not_called()


def test_approved_order_checked_before_capture(client, monkeypatch):
    p = {**PURCHASE, 'paypal_order_id': 'ORDER123456'}
    calls = []
    async def db(*args, **kwargs): return [p]
    async def pp(method, path, **kwargs):
        calls.append(method)
        return {'id': 'ORDER123456', 'status': 'APPROVED', 'purchase_units': [{'custom_id': USER + ':beginner-strength', 'amount': {'value': '0.01', 'currency_code': 'USD'}}]}
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post('/api/paypal/orders/ORDER123456/capture').status_code == 409
    assert calls == ['GET']


def test_content_requires_entitlement(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': False}))
    assert client.get('/api/programs/beginner-strength/content').status_code == 403


def test_program_has_distinct_focus_and_valid_exercises(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': True}))
    data = client.get('/api/programs/beginner-strength/content').json()
    assert len({week['focus'] for week in data['weeks']}) == 4
    ids = {exercise['id'] for exercise in main.load_catalog()}
    assert all(item['exercise_id'] in ids for week in data['weeks'] for day in week['sessions'] for item in day['exercises'])
