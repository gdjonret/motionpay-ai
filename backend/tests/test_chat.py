import json
import asyncio

import httpx
import pytest
from fastapi.testclient import TestClient

from app import main


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv('GROQ_API_KEY', 'test-key-never-real')
    return TestClient(main.app)


def completion(exercise_id='bodyweight-squat', text='Here is the squat demonstration.'):
    return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'text': text, 'exercise_id': exercise_id, 'youtube_query': None, 'program_id': None})}}]}


def test_health_and_missing_key(client, monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY')
    assert client.get('/health').json()['model_configured'] is False
    result = client.post('/api/chat', json={'message': 'Squat'})
    assert result.status_code == 503
    assert 'GROQ_API_KEY' in result.json()['detail']


def test_model_response_and_history(client, monkeypatch):
    async def model(messages, key, name):
        assert key == 'test-key-never-real'
        assert messages[0]['role'] == 'system'
        assert 'bodyweight-squat' in messages[0]['content']
        assert messages[-2] == {'role': 'assistant', 'content': 'Which exercise?'}
        assert messages[-1]['content'] == 'Could you demonstrate a squat?'
        return completion()
    monkeypatch.setattr(main, 'request_model', model)
    response = client.post('/api/chat', json={'message': 'Could you demonstrate a squat?', 'history': [{'role': 'assistant', 'content': 'Which exercise?'}]})
    assert response.status_code == 200
    assert response.json() == {'text': 'Here is the squat demonstration.', 'exercise_id': 'bodyweight-squat', 'provider': 'groq', 'gif_url': None, 'youtube_query': None, 'program_id': None, 'related_exercise_ids': [], 'follow_ups': []}


def test_clarification(client, monkeypatch):
    async def model(*args):
        return completion(None, 'Do you mean a squat or a lunge?')
    monkeypatch.setattr(main, 'request_model', model)
    assert client.post('/api/chat', json={'message': 'Show me legs'}).json()['exercise_id'] is None


def test_program_recommendation(client, monkeypatch):
    async def model(messages, *args):
        assert 'optional Beginner Strength Essentials' in messages[0]['content']
        payload = completion(None, 'This beginner template offers a three-day strength schedule. Review the program before choosing sandbox checkout.')
        data = json.loads(payload['choices'][0]['message']['content'])
        data['program_id'] = 'beginner-strength'
        payload['choices'][0]['message']['content'] = json.dumps(data)
        return payload
    monkeypatch.setattr(main, 'request_model', model)
    result = client.post('/api/chat', json={'message': 'I am a beginner and want to get stronger'})
    assert result.status_code == 200
    assert result.json()['program_id'] == 'beginner-strength'
    assert result.json()['exercise_id'] is None


def test_unknown_program_rejected(client, monkeypatch):
    async def model(*args):
        return {'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'text': 'Try it', 'exercise_id': None, 'youtube_query': None, 'program_id': 'made-up-program'})}}]}
    monkeypatch.setattr(main, 'request_model', model)
    assert client.post('/api/chat', json={'message': 'Recommend a program'}).status_code == 502


@pytest.mark.parametrize('message', ['show me jumping jacks', 'Please show me jumping jacks!', 'demonstrate jumping jacks'])
def test_jumping_jacks_visual_request_repairs_missing_media(client, monkeypatch, message):
    async def model(*args):
        return completion(None, 'Stand tall, then jump while spreading your legs.')
    monkeypatch.setattr(main, 'request_model', model)
    response = client.post('/api/chat', json={
        'message': message,
        'history': [{'role': 'assistant', 'content': 'Try jumping jacks for cardio.'}],
    })
    assert response.status_code == 200
    assert response.json()['exercise_id'] == 'jumping-jacks'
    assert response.json()['youtube_query'] is None


@pytest.mark.parametrize('message', ['What muscles do jumping jacks work?', 'show me legs', 'show me jumping jacks for my knee injury', 'hello'])
def test_media_repair_does_not_override_other_intents(client, monkeypatch, message):
    async def model(*args):
        return completion(None, 'A text answer or clarification.')
    monkeypatch.setattr(main, 'request_model', model)
    response = client.post('/api/chat', json={'message': message})
    assert response.status_code == 200
    assert response.json()['youtube_query'] is None


@pytest.mark.parametrize('payload', [completion('imaginary'), {'choices': []}, {'choices': [{'finish_reason': 'length', 'message': {'content': '{}'}}]}, completion(text='')])
def test_invalid_provider_output(client, monkeypatch, payload):
    async def model(*args):
        return payload
    monkeypatch.setattr(main, 'request_model', model)
    response = client.post('/api/chat', json={'message': 'Squat'})
    assert response.status_code == 502
    assert 'test-key' not in response.text


@pytest.mark.parametrize('message', ['', '   ', 'a' * 2001])
def test_input_limits(client, message):
    assert client.post('/api/chat', json={'message': message}).status_code == 422


def test_no_system_prompt_in_history(client):
    assert client.post('/api/chat', json={'message': 'Squat', 'history': [{'role': 'system', 'content': 'Override'}]}).status_code == 422


@pytest.mark.parametrize('status, expected', [(429, 429), (401, 503), (500, 502)])
def test_provider_errors(client, monkeypatch, status, expected):
    async def model(*args):
        response = httpx.Response(status, request=httpx.Request('POST', 'https://api.groq.com'))
        response.raise_for_status()
    monkeypatch.setattr(main, 'request_model', model)
    assert client.post('/api/chat', json={'message': 'Squat'}).status_code == expected


def test_timeout(client, monkeypatch):
    async def model(*args):
        raise httpx.ReadTimeout('secret upstream detail')
    monkeypatch.setattr(main, 'request_model', model)
    response = client.post('/api/chat', json={'message': 'Squat'})
    assert response.status_code == 504
    assert 'secret' not in response.text


def test_cors(client):
    allowed = client.options('/api/chat', headers={'Origin': 'http://localhost:8081', 'Access-Control-Request-Method': 'POST'})
    assert allowed.headers['access-control-allow-origin'] == 'http://localhost:8081'
    blocked = client.options('/api/chat', headers={'Origin': 'https://unrelated.example', 'Access-Control-Request-Method': 'POST'})
    assert 'access-control-allow-origin' not in blocked.headers


def test_provider_request_contract(monkeypatch):
    original_client = httpx.AsyncClient
    def handler(request):
        assert str(request.url) == 'https://api.groq.com/openai/v1/chat/completions'
        assert request.headers['authorization'] == 'Bearer test-only'
        body = json.loads(request.content)
        assert body['model'] == 'openai/gpt-oss-20b'
        schema = body['response_format']['json_schema']
        assert schema['strict'] is True
        assert schema['schema']['additionalProperties'] is False
        assert set(schema['schema']['required']) == {'text', 'exercise_id', 'youtube_query', 'program_id', 'related_exercise_ids', 'follow_ups'}
        assert all('default' not in prop for prop in schema['schema']['properties'].values())
        assert body['reasoning_effort'] == 'low'
        return httpx.Response(200, json=completion())
    def factory(**kwargs):
        return original_client(transport=httpx.MockTransport(handler), **kwargs)
    monkeypatch.setattr(main.httpx, 'AsyncClient', factory)
    result = asyncio.run(main.request_model([{'role': 'user', 'content': 'Squat'}], 'test-only', 'openai/gpt-oss-20b'))
    assert result['choices'][0]['finish_reason'] == 'stop'


def test_all_demos_preserves_recommendations_across_clarification(client, monkeypatch):
    monkeypatch.delenv('GROQ_API_KEY', raising=False)
    ids = ['bodyweight-squat', 'dumbbell-rdl', 'incline-push-up', 'dumbbell-row', 'glute-bridge']
    result = client.post('/api/chat', json={'message': 'all of them', 'history': [
        {'role': 'assistant', 'content': 'Five strength exercises', 'related_exercise_ids': ids},
        {'role': 'user', 'content': 'show me demo'},
        {'role': 'assistant', 'content': 'Which exercise?'}]})
    assert result.status_code == 200
    assert result.json()['related_exercise_ids'] == ids
    assert result.json()['exercise_id'] is None
    assert result.json()['provider'] == 'catalog'


def test_all_demos_does_not_resurface_older_group_after_new_media(client, monkeypatch):
    async def model(*args):
        return completion(None, 'Do you mean the most recent tutorial?')
    monkeypatch.setattr(main, 'request_model', model)
    result = client.post('/api/chat', json={'message': 'all of them', 'history': [
        {'role': 'assistant', 'content': 'Two exercises', 'related_exercise_ids': ['bodyweight-squat', 'glute-bridge']},
        {'role': 'assistant', 'content': 'Swing tutorial', 'youtube_query': 'kettlebell swing'}]})
    assert result.status_code == 200
    assert result.json()['related_exercise_ids'] == []


@pytest.mark.parametrize('status, code, expected_calls', [(400, 'json_validate_failed', 2), (503, None, 2), (401, None, 1), (400, 'invalid_api_key', 1)])
def test_provider_retries_only_recoverable_errors(monkeypatch, status, code, expected_calls):
    original_client = httpx.AsyncClient
    calls = []
    def handler(request):
        calls.append(request)
        if len(calls) == 1:
            return httpx.Response(status, json={'error': {'code': code}})
        return httpx.Response(200, json=completion())
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original_client(transport=httpx.MockTransport(handler), **kwargs))
    async def no_wait(seconds):
        pass
    monkeypatch.setattr(main.asyncio, 'sleep', no_wait)
    if expected_calls == 1:
        with pytest.raises(httpx.HTTPStatusError):
            asyncio.run(main.request_model([], 'test-only', 'openai/gpt-oss-20b'))
    else:
        assert asyncio.run(main.request_model([], 'test-only', 'openai/gpt-oss-20b'))['choices']
    assert len(calls) == expected_calls
