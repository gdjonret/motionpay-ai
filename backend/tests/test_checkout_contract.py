from copy import deepcopy
from unittest.mock import AsyncMock
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app import main, payments
from app.auth import require_user
from test_reliability import PURCHASE, USER


@pytest.fixture
def client():
    main.app.dependency_overrides[require_user] = lambda: USER
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_retry_uses_durable_request_and_payload(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': False, 'pending_order_id': None}))
    async def db(method, path, **kwargs):
        return [PURCHASE] if path == 'rpc/reserve_program_checkout' else None
    calls = []
    async def pp(method, path, **kwargs):
        calls.append(kwargs)
        return {'id': 'ORDER123456', 'links': [{'rel': 'payer-action', 'href': 'https://www.sandbox.paypal.com/checkoutnow?token=ORDER123456'}]}
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post('/api/paypal/orders').status_code == 200
    assert client.post('/api/paypal/orders').status_code == 200
    assert calls[0] == calls[1]


def test_approved_capture_then_atomic_unlock(client, monkeypatch):
    order_id = 'ORDER123456'
    purchase = {**PURCHASE, 'paypal_order_id': order_id}
    order = {'id': order_id, 'status': 'APPROVED', 'purchase_units': [{'custom_id': USER + ':beginner-strength', 'amount': {'value': '9.99', 'currency_code': 'USD'}}]}
    writes = []
    async def db(method, path, **kwargs):
        if method == 'GET': return [purchase]
        writes.append(path)
    async def pp(method, path, **kwargs):
        if method == 'GET': return order
        assert kwargs['headers']['PayPal-Request-Id'] == 'capture-' + order_id
        result = deepcopy(order); result['status'] = 'COMPLETED'
        result['purchase_units'][0]['payments'] = {'captures': [{'id': 'CAP123', 'status': 'COMPLETED', 'amount': {'value': '9.99', 'currency_code': 'USD'}, 'final_capture': True}]}
        return result
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post(f'/api/paypal/orders/{order_id}/capture').json()['unlocked']
    assert writes == ['rpc/complete_program_purchase']


def test_uncertain_ancient_create_is_not_recharged(client, monkeypatch):
    monkeypatch.setattr(payments, 'access', AsyncMock(return_value={'unlocked': False, 'pending_order_id': None}))
    old = {**PURCHASE, 'created_at': (datetime.now(timezone.utc) - timedelta(hours=7)).isoformat()}
    monkeypatch.setattr(payments, 'database', AsyncMock(return_value=[old]))
    pp = AsyncMock()
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post('/api/paypal/orders').status_code == 409
    pp.assert_not_called()
