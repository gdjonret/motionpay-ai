import httpx
import pytest
from fastapi.testclient import TestClient
from app import main


@pytest.fixture(autouse=True)
def configured(monkeypatch):
    monkeypatch.setenv('DEMONSTRATION_PROVIDER', 'workoutx')
    monkeypatch.setenv('WORKOUTX_API_KEY', 'test-workoutx-key')


@pytest.mark.parametrize('name,url,status', [
    ('Glute Bridge', 'https://cdn.workoutxapp.com/demo.mp4?signature=test', 'found'),
    ('weighted glute bridge', 'https://cdn.workoutxapp.com/demo.mp4', 'empty'),
    ('Glute Bridge', 'javascript:alert(1)', 'empty'),
])
def test_exact_match_only(monkeypatch, name, url, status):
    original = httpx.AsyncClient
    def handler(request):
        assert request.url.params['name'] == 'glute bridge'
        assert request.headers['X-WorkoutX-Key'] == 'test-workoutx-key'
        assert 'test-workoutx-key' not in str(request.url)
        return httpx.Response(200, json={'results': [{'name': name, 'media': {'mp4': url}}]})
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    result = TestClient(main.app).get('/api/demonstration', params={'q': 'glute bridge'}).json()
    assert result['status'] == status
    if status == 'found':
        assert result['source'] == 'WorkoutX'


def test_failure_allows_fallback(monkeypatch):
    original = httpx.AsyncClient
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(lambda request: httpx.Response(429)), **kwargs))
    assert TestClient(main.app).get('/api/demonstration?q=squat').json() == {'status': 'unavailable', 'video_url': None}


def test_no_key(monkeypatch):
    monkeypatch.delenv('WORKOUTX_API_KEY')
    assert TestClient(main.app).get('/api/demonstration?q=squat').json()['status'] == 'not_configured'


def test_blank_query():
    assert TestClient(main.app).get('/api/demonstration?q=%20').status_code == 422
