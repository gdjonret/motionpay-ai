import httpx
from fastapi.testclient import TestClient
from app import main


def test_without_key_offers_search_link(monkeypatch):
    monkeypatch.delenv('YOUTUBE_API_KEY', raising=False)
    data = TestClient(main.app).get('/api/tutorial', params={'q': 'dumbbell curl'}).json()
    assert data['status'] == 'not_configured'
    assert data['video_id'] is None
    assert data['search_url'].startswith('https://www.youtube.com/results?')


def test_search_uses_short_embeddable_filter(monkeypatch):
    monkeypatch.setenv('YOUTUBE_API_KEY', 'test-only')
    original = httpx.AsyncClient
    def handler(request):
        assert request.url.params['videoDuration'] == 'short'
        assert request.url.params['videoEmbeddable'] == 'true'
        assert request.url.params['safeSearch'] == 'strict'
        assert request.url.params['key'] == 'test-only'
        return httpx.Response(200, json={'items': [{'id': {'videoId': 'abcdefghijk'}, 'snippet': {'title': 'Dumbbell curl tutorial', 'channelTitle': 'Trainer'}}]})
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    data = TestClient(main.app).get('/api/tutorial', params={'q': 'dumbbell curl'}).json()
    assert data['video_id'] == 'abcdefghijk'
    assert data['channel'] == 'Trainer'
    assert 'test-only' not in str(data)


def test_quota_failure_keeps_search_link(monkeypatch):
    monkeypatch.setenv('YOUTUBE_API_KEY', 'test-only')
    original = httpx.AsyncClient
    monkeypatch.setattr(main.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(lambda request: httpx.Response(403)), **kwargs))
    data = TestClient(main.app).get('/api/tutorial', params={'q': 'squat'}).json()
    assert data['status'] == 'unavailable'
    assert data['search_url']
