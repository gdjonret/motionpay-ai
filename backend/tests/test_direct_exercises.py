import json
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app import main
from app.exercise_requests import ALIASES, shortlist


def test_named_demo_available_without_ai_key(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    provider = AsyncMock(side_effect=AssertionError('No model call expected'))
    monkeypatch.setattr(main, 'request_model', provider)
    result = TestClient(main.app).post('/api/chat', json={'message': 'Show me a squat'})
    assert result.status_code == 200
    assert result.json()['exercise_id'] == 'bodyweight-squat'
    assert result.json()['provider'] == 'catalog'
    provider.assert_not_called()


@pytest.mark.parametrize('message, expected', [
    ('Show me a bench press', 'bench-press'),
    ('How do I do Bulgarian split squats?', 'bulgarian-split-squat'),
    ("show me the world's greatest stretch", 'worlds-greatest-stretch'),
    ('Show me jumping jacks', 'jumping-jacks'),
    ('Show me a squat', 'bodyweight-squat'),
])
def test_catalog_names_resolve_without_model(monkeypatch, message, expected):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    monkeypatch.setattr(main, 'request_model', AsyncMock(side_effect=AssertionError('No model call expected')))
    result = TestClient(main.app).post('/api/chat', json={'message': message})
    assert result.status_code == 200
    assert result.json()['exercise_id'] == expected


def test_prompt_catalog_is_shortlisted(monkeypatch):
    monkeypatch.setenv('GROQ_API_KEY', 'test-key-never-real')
    seen = {}

    async def model(messages, *args):
        seen['system'] = messages[0]['content']
        return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'text': 'Sure.', 'exercise_id': 'kettlebell-swing', 'youtube_query': None, 'program_id': None})}}]}
    monkeypatch.setattr(main, 'request_model', model)
    result = TestClient(main.app).post('/api/chat', json={'message': 'What kettlebell exercises are good for glutes?', 'history': [{'role': 'assistant', 'content': 'Here you go.', 'exercise_id': 'pec-deck'}]})
    assert result.status_code == 200
    lines = seen['system'].split('Catalog (id|name|equipment|muscle[|instructions]):\n', 1)[1].splitlines()
    ids = {line.split('|')[0] for line in lines}
    assert len(main.load_catalog()) > 100 and len(lines) <= 8 + 1 + 20
    assert {'kettlebell-swing', 'kettlebell-romanian-deadlift', 'pec-deck', 'bodyweight-squat', 'jumping-jacks'} <= ids
    # Only the exercise already shown carries full instructions.
    assert [line.split('|')[0] for line in lines if line.count('|') >= 4] == ['pec-deck']


def test_related_exercises_and_follow_ups_are_sanitized(monkeypatch):
    monkeypatch.setenv('GROQ_API_KEY', 'test-key-never-real')
    async def model(*args):
        return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({
            'text': 'Try push-ups, wide push-ups and dips.', 'exercise_id': None, 'youtube_query': None, 'program_id': None,
            'related_exercise_ids': ['push-up', 'made-up', 'push-up', 'wide-push-up', 'chair-dip', 'plank', 'burpee', 'crunch', 'v-up'],
            'follow_ups': ['Make it easier', 'x', 'y' * 80, 'What muscles?', 'Build me a plan', 'Fourth']})}}]}
    monkeypatch.setattr(main, 'request_model', model)
    data = TestClient(main.app).post('/api/chat', json={'message': 'Bench press alternatives at home?'}).json()
    assert data['related_exercise_ids'] == ['push-up', 'wide-push-up', 'chair-dip', 'plank', 'burpee', 'crunch']
    assert data['follow_ups'] == ['Make it easier', 'What muscles?', 'Build me a plan']


def test_direct_demo_includes_follow_ups(monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    data = TestClient(main.app).post('/api/chat', json={'message': 'Show me a squat'}).json()
    assert data['follow_ups'][0] == 'Make it slower' and len(data['follow_ups']) == 3


def test_rate_limit_retries_once_when_window_reopens_soon(monkeypatch):
    import asyncio
    import httpx
    original_client = httpx.AsyncClient
    calls = []
    def handler(request):
        calls.append(1)
        if len(calls) == 1:
            return httpx.Response(429, headers={'retry-after': '0.01'})
        return httpx.Response(200, json={'choices': []})
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    real_sleep = asyncio.sleep
    monkeypatch.setattr(main.asyncio, 'sleep', lambda seconds: real_sleep(0))
    assert asyncio.run(main.request_model([], 'k', 'm')) == {'choices': []} and len(calls) == 2


def test_shortlist_keeps_core_when_nothing_matches():
    catalog = main.load_catalog()
    assert {item['id'] for item in shortlist(catalog, ['hello there'])} == set(ALIASES)
