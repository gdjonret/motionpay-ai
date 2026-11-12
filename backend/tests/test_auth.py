import httpx
import pytest
from fastapi.testclient import TestClient
from app import main, auth


def test_missing_bearer():
    assert TestClient(main.app).get('/api/me').status_code == 401


@pytest.mark.parametrize('upstream,expected', [(200, 200), (401, 401), (500, 503)])
def test_verified_identity(monkeypatch, upstream, expected):
    monkeypatch.setenv('SUPABASE_URL', 'https://example.supabase.co')
    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', 'test-publishable')
    original = httpx.AsyncClient
    user_id = '11111111-1111-4111-8111-111111111111'
    def handler(request):
        assert str(request.url) == 'https://example.supabase.co/auth/v1/user'
        assert request.headers['authorization'] == 'Bearer test-token'
        return httpx.Response(upstream, json={'id': user_id})
    monkeypatch.setattr(auth.httpx, 'AsyncClient', lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs))
    response = TestClient(main.app).get('/api/me', headers={'Authorization': 'Bearer test-token'})
    assert response.status_code == expected
    if expected == 200:
        assert response.json() == {'id': user_id}
    assert 'test-token' not in response.text
