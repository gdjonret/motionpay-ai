"""Sandbox-only checkout. Provider secrets and entitlement writes stay server-side."""
import os
import re
import time
import asyncio
from decimal import Decimal, InvalidOperation
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from app.auth import require_user
from app.program_content import content

router = APIRouter()
PAYPAL = 'https://api-m.sandbox.paypal.com'
PROGRAM = 'beginner-strength'
_token = {'value': None, 'expires': 0}
_token_lock = asyncio.Lock()


async def database(method, path, **kwargs):
    url = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
    if not url or not key:
        raise HTTPException(503, 'Purchase storage is not configured yet.')
    async with httpx.AsyncClient(timeout=15) as client:
        headers = {'apikey': key, 'Prefer': 'return=representation'}
        if not key.startswith('sb_secret_'):
            headers['Authorization'] = f'Bearer {key}'
        response = await client.request(method, f'{url}/rest/v1/{path}', headers=headers, **kwargs)
    response.raise_for_status()
    return response.json() if response.content else None


async def paypal(method, path, **kwargs):
    client_id = os.getenv('PAYPAL_CLIENT_ID', '')
    secret = os.getenv('PAYPAL_CLIENT_SECRET', '')
    if not client_id or not secret:
        raise HTTPException(503, 'Sandbox checkout is not configured yet.')
    async with httpx.AsyncClient(timeout=25) as client:
        async with _token_lock:
            if not _token['value'] or _token['expires'] < time.monotonic():
                token = await client.post(f'{PAYPAL}/v1/oauth2/token', auth=(client_id, secret), data={'grant_type': 'client_credentials'})
                token.raise_for_status()
                data = token.json()
                _token.update(value=data['access_token'], expires=time.monotonic() + max(0, int(data['expires_in']) - 60))
        headers = kwargs.pop('headers', {})
        response = await client.request(method, PAYPAL + path, headers={
            'Authorization': 'Bearer ' + _token['value'], 'Prefer': 'return=representation', **headers,
        }, **kwargs)
        if response.status_code == 401:
            _token.update(value=None, expires=0)
        response.raise_for_status()
        return response.json()


def approval_link(order):
    for link in order.get('links', []):
        if link.get('rel') in ('approve', 'payer-action') and re.match(r'^https://(?:www\.)?sandbox\.paypal\.com/', link.get('href', '')):
            return link['href']
    raise HTTPException(409, 'This checkout cannot be reopened. Check payment status first.')


def custom_id(purchase):
    return purchase['user_id'] + ':' + (purchase.get('plan_id') or purchase['program_id'])


def verify_capture(order, purchase):
    try:
        units = order['purchase_units']
        if order['id'] != purchase['paypal_order_id'] or order['status'] != 'COMPLETED' or len(units) != 1:
            raise ValueError()
        unit = units[0]
        captures = unit['payments']['captures']
        if unit['custom_id'] != custom_id(purchase) or len(captures) != 1:
            raise ValueError()
        capture = captures[0]
        if capture['status'] != 'COMPLETED' or capture['amount']['currency_code'] != purchase['currency']:
            raise ValueError()
        if Decimal(capture['amount']['value']) != Decimal(purchase['amount_cents']) / 100:
            raise ValueError()
        if not capture.get('id') or capture.get('final_capture') is False:
            raise ValueError()
        return capture['id']
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise HTTPException(409, 'Payment is not verified as completed. Access remains locked.') from None


def verify_order(order, purchase):
    try:
        units = order['purchase_units']
        unit = units[0]
        if len(units) != 1 or order['id'] != purchase['paypal_order_id']:
            raise ValueError()
        if unit['custom_id'] != custom_id(purchase):
            raise ValueError()
        if unit['amount']['currency_code'] != purchase['currency'] or Decimal(unit['amount']['value']) != Decimal(purchase['amount_cents']) / 100:
            raise ValueError()
    except (KeyError, TypeError, ValueError, InvalidOperation):
        raise HTTPException(409, 'Checkout details do not match. No payment was captured.') from None


@router.get('/api/programs/beginner-strength')
async def program_summary():
    try:
        rows = await database('GET', 'programs', params={'id': 'eq.' + PROGRAM, 'active': 'eq.true', 'select': 'id,title,price_cents,currency'})
        if not rows:
            raise HTTPException(503, 'Program is unavailable.')
        return {**rows[0], 'duration': '4 weeks', 'frequency': '3 sessions / week', 'sandbox': True}
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, 'Program details are unavailable. Please retry.') from None


@router.get('/api/programs/beginner-strength/access')
async def access(user_id: str = Depends(require_user)):
    try:
        owned = await database('GET', 'program_entitlements', params={'user_id': 'eq.' + user_id, 'program_id': 'eq.' + PROGRAM, 'select': 'program_id'})
        pending = [] if owned else await database('GET', 'purchases', params={'user_id': 'eq.' + user_id, 'program_id': 'eq.' + PROGRAM, 'status': 'eq.created', 'select': 'paypal_order_id,amount_cents,currency', 'order': 'created_at.desc', 'limit': 1})
        return {'unlocked': bool(owned), 'pending_order_id': pending[0]['paypal_order_id'] if pending else None,
                'pending_amount_cents': pending[0]['amount_cents'] if pending else None, 'pending_currency': pending[0]['currency'] if pending else None}
    except httpx.HTTPError:
        raise HTTPException(503, 'Unable to load program access. Please try again.') from None


@router.get('/api/purchases')
async def purchase_history(user_id: str = Depends(require_user)):
    try:
        return await database('GET', 'purchases', params={'user_id': 'eq.' + user_id, 'select': 'program_id,checkout_title,status,amount_cents,currency,created_at', 'order': 'created_at.desc', 'limit': 20})
    except httpx.HTTPError:
        raise HTTPException(503, 'Unable to load purchase history.') from None


@router.post('/api/paypal/orders')
async def create_order(user_id: str = Depends(require_user)):
    state = await access(user_id)
    if state['unlocked']:
        raise HTTPException(409, 'You already own this program.')
    return await start_checkout(user_id, state['pending_order_id'], 'rpc/reserve_program_checkout', {'p_user_id': user_id}, PROGRAM)


async def start_checkout(user_id, pending_order_id, reserve_rpc, reserve_args, reference_id):
    """Resume a live pending order or reserve a purchase row, then create its PayPal order idempotently."""
    try:
        if pending_order_id:
            try:
                order = await paypal('GET', '/v2/checkout/orders/' + pending_order_id)
            except httpx.HTTPStatusError as error:
                if error.response.status_code != 404:
                    raise
                order = {'id': pending_order_id, 'status': 'EXPIRED'}
            if order['status'] in ('CREATED', 'PAYER_ACTION_REQUIRED', 'SAVED'):
                return {'order_id': order['id'], 'approval_url': approval_link(order)}
            if order['status'] in ('APPROVED', 'COMPLETED'):
                return {'order_id': order['id'], 'approval_url': None}
            await database('PATCH', 'purchases', params={'paypal_order_id': 'eq.' + order['id'], 'user_id': 'eq.' + user_id}, json={'status': 'cancelled'})
        base = os.getenv('PUBLIC_API_URL', 'http://localhost:8000').rstrip('/')
        if urlparse(base).scheme not in ('https', 'http') or not urlparse(base).netloc:
            raise HTTPException(503, 'Checkout return address is not configured.')
        reserved = await database('POST', reserve_rpc, json={**reserve_args, 'p_return_base': base})
        purchase = reserved[0]
        # Expired uncertain creates must be reconciled, never retried under a NEW key.
        # PayPal keeps create idempotency keys for six hours by default.
        from datetime import datetime, timezone
        if not purchase.get('paypal_order_id') and (datetime.now(timezone.utc) - datetime.fromisoformat(purchase['created_at'].replace('Z', '+00:00'))).total_seconds() > 5 * 3600:
            raise HTTPException(409, 'An interrupted checkout needs support review. Do not start another payment.')
        order = await paypal('POST', '/v2/checkout/orders', headers={'PayPal-Request-Id': purchase['id']}, json={
            'intent': 'CAPTURE',
            'purchase_units': [{'reference_id': reference_id, 'custom_id': custom_id({**purchase, 'user_id': user_id}),
                'description': purchase['checkout_title'], 'amount': {'currency_code': purchase['currency'], 'value': str(Decimal(purchase['amount_cents']) / Decimal(100))}}],
            'payment_source': {'paypal': {'experience_context': {'shipping_preference': 'NO_SHIPPING', 'user_action': 'PAY_NOW',
                'return_url': purchase['return_base'] + '/api/paypal/return', 'cancel_url': purchase['return_base'] + '/api/paypal/cancel'}}},
        })
        link = approval_link(order)
        await database('POST', 'rpc/bind_program_checkout', json={'p_purchase_id': purchase['id'], 'p_user_id': user_id, 'p_order_id': order['id']})
        return {'order_id': order['id'], 'approval_url': link}
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(502, 'Unable to start sandbox checkout. Please try again.') from None


@router.post('/api/paypal/orders/{order_id}/capture')
async def capture_order(order_id: str, user_id: str = Depends(require_user)):
    if not re.fullmatch(r'[A-Z0-9]{8,40}', order_id):
        raise HTTPException(422, 'Invalid order.')
    try:
        purchases = await database('GET', 'purchases', params={'paypal_order_id': 'eq.' + order_id, 'user_id': 'eq.' + user_id, 'select': '*'})
        if not purchases:
            raise HTTPException(404, 'Checkout not found for this account.')
        purchase = purchases[0]
        order = await paypal('GET', '/v2/checkout/orders/' + order_id)
        if order['status'] == 'APPROVED':
            verify_order(order, purchase)
            order = await paypal('POST', '/v2/checkout/orders/' + order_id + '/capture', headers={'PayPal-Request-Id': 'capture-' + order_id}, json={})
        capture_id = verify_capture(order, purchase)
        await database('POST', 'rpc/complete_program_purchase', json={'p_order_id': order_id, 'p_user_id': user_id, 'p_capture_id': capture_id})
        return {'unlocked': True, 'program_id': purchase['program_id'], 'plan_id': purchase.get('plan_id')}
    except (httpx.HTTPError, KeyError, ValueError):
        raise HTTPException(502, 'Unable to confirm payment. Retry verification; do not pay again.') from None


@router.get('/api/paypal/return', response_class=HTMLResponse)
async def paypal_return():
    return '<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><h1>Return to MotionPay</h1><p>Checkout returned. Switch back to MotionPay and tap Verify payment. Approval and payment status are checked by the server; this page does not unlock access.</p><a href="motionpay://program">Open MotionPay (installed development build)</a><p>In Expo Go, switch back to the app manually.</p></body></html>'


@router.get('/api/paypal/cancel', response_class=HTMLResponse)
async def paypal_cancel():
    return '<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><h1>Checkout cancelled</h1><p>No access was unlocked. Return to MotionPay whenever you are ready.</p></body></html>'


@router.get('/api/programs/beginner-strength/content')
async def program_content(user_id: str = Depends(require_user)):
    if not (await access(user_id))['unlocked']:
        raise HTTPException(403, 'Purchase this program to view its sessions.')
    return content()
