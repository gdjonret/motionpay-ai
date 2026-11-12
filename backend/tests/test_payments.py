from copy import deepcopy
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app import main, payments
from app.auth import require_user

USER = '11111111-1111-4111-8111-111111111111'
ORDER = 'ABC123456789'
PURCHASE = {'user_id': USER, 'program_id': 'beginner-strength', 'paypal_order_id': ORDER, 'currency': 'USD', 'amount_cents': 999}
COMPLETED = {'id': ORDER, 'status': 'COMPLETED', 'purchase_units': [{'custom_id': USER + ':beginner-strength', 'payments': {'captures': [{'id': 'CAP123', 'status': 'COMPLETED', 'amount': {'value': '9.99', 'currency_code': 'USD'}, 'final_capture': True}]}}]}


def test_verified_capture():
    assert payments.verify_capture(COMPLETED, PURCHASE) == 'CAP123'


@pytest.mark.parametrize('change', ['amount', 'currency', 'status', 'user', 'order', 'pending', 'multiple'])
def test_rejects_unverified_capture(change):
    order = deepcopy(COMPLETED)
    capture = order['purchase_units'][0]['payments']['captures'][0]
    if change == 'amount': capture['amount']['value'] = '0.01'
    if change == 'currency': capture['amount']['currency_code'] = 'EUR'
    if change == 'status': order['status'] = 'APPROVED'
    if change == 'user': order['purchase_units'][0]['custom_id'] = 'someone-else:beginner-strength'
    if change == 'order': order['id'] = 'OTHER123'
    if change == 'pending': capture['status'] = 'PENDING'
    if change == 'multiple': order['purchase_units'].append(deepcopy(order['purchase_units'][0]))
    with pytest.raises(HTTPException): payments.verify_capture(order, PURCHASE)


@pytest.fixture
def client():
    main.app.dependency_overrides[require_user] = lambda: USER
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()


def test_cannot_capture_another_accounts_order(client, monkeypatch):
    async def db(*args, **kwargs):
        assert kwargs['params']['user_id'] == 'eq.' + USER
        return []
    async def forbidden(*args, **kwargs): raise AssertionError('Must not contact PayPal')
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', forbidden)
    assert client.post(f'/api/paypal/orders/{ORDER}/capture').status_code == 404


def test_completed_order_retry_does_not_charge_again(client, monkeypatch):
    async def db(method, path, **kwargs):
        if path == 'purchases': return [PURCHASE]
        assert path == 'rpc/complete_program_purchase'
        assert kwargs['json']['p_capture_id'] == 'CAP123'
    async def pp(method, path, **kwargs):
        assert method == 'GET'
        return COMPLETED
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post(f'/api/paypal/orders/{ORDER}/capture').json()['unlocked'] is True


def test_not_approved_remains_locked(client, monkeypatch):
    async def db(*args, **kwargs): return [PURCHASE]
    async def pp(*args, **kwargs): return {'id': ORDER, 'status': 'CREATED'}
    monkeypatch.setattr(payments, 'database', db)
    monkeypatch.setattr(payments, 'paypal', pp)
    assert client.post(f'/api/paypal/orders/{ORDER}/capture').status_code == 409


def test_checkout_requires_account():
    assert TestClient(main.app).post('/api/paypal/orders').status_code == 401


@pytest.mark.parametrize(('path', 'status'), [('/api/paypal/return', 'returned'), ('/api/paypal/cancel', 'cancelled')])
def test_hosted_checkout_returns_to_web_app(monkeypatch, path, status):
    monkeypatch.setenv('PUBLIC_APP_URL', 'https://motionpay.example/')
    response = TestClient(main.app, follow_redirects=False).get(path)
    assert response.status_code == 303
    assert response.headers['location'] == f'https://motionpay.example/?checkout={status}'


def test_checkout_return_rejects_unsafe_app_url(monkeypatch):
    monkeypatch.setenv('PUBLIC_APP_URL', 'javascript:alert(1)')
    response = TestClient(main.app).get('/api/paypal/return')
    assert response.status_code == 200
    assert 'Return to MotionPay' in response.text
