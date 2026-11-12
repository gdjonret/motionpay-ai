"""Opt-in database integration check. Creates and removes two disposable users.

Run from backend: .venv/bin/python tests/integration_supabase.py
Never creates a real PayPal order or touches existing account data.
"""
import asyncio
import os
import secrets
from uuid import uuid4
import httpx
from dotenv import load_dotenv


async def main():
    load_dotenv('.env')
    base = os.environ['SUPABASE_URL'].rstrip('/')
    service = os.environ['SUPABASE_SERVICE_ROLE_KEY']
    public = os.environ['SUPABASE_PUBLISHABLE_KEY']
    admin_headers = {'apikey': service}
    if not service.startswith('sb_secret_'):
        admin_headers['Authorization'] = 'Bearer ' + service
    users = []
    async with httpx.AsyncClient(base_url=base, headers=admin_headers, timeout=20) as admin:
        try:
            for _ in range(2):
                email = f'motionpay-test-{uuid4().hex}@example.com'
                password = secrets.token_urlsafe(24)
                response = await admin.post('/auth/v1/admin/users', json={'email': email, 'password': password, 'email_confirm': True})
                response.raise_for_status()
                user = response.json()['id']
                users.append(user)
                async with httpx.AsyncClient(base_url=base, headers={'apikey': public}, timeout=20) as client:
                    login = await client.post('/auth/v1/token?grant_type=password', json={'email': email, 'password': password})
                    login.raise_for_status()
                    if len(users) == 1:
                        owner_headers = {'apikey': public, 'Authorization': 'Bearer ' + login.json()['access_token']}
                    else:
                        other_headers = {'apikey': public, 'Authorization': 'Bearer ' + login.json()['access_token']}
            body = {'p_user_id': users[0], 'p_return_base': 'http://localhost:8000'}
            replies = await asyncio.gather(*(admin.post('/rest/v1/rpc/reserve_program_checkout', json=body) for _ in range(2)))
            for reply in replies: reply.raise_for_status()
            purchase = replies[0].json()[0]
            assert purchase['id'] == replies[1].json()[0]['id']
            assert purchase['status'] == 'creating'
            order = 'TEST' + uuid4().hex.upper()[:20]
            bind = await admin.post('/rest/v1/rpc/bind_program_checkout', json={'p_purchase_id': purchase['id'], 'p_user_id': users[0], 'p_order_id': order})
            bind.raise_for_status()
            async with httpx.AsyncClient(base_url=base, headers=owner_headers, timeout=20) as owner, httpx.AsyncClient(base_url=base, headers=other_headers, timeout=20) as other:
                read = await owner.get('/rest/v1/purchases', params={'id': 'eq.' + purchase['id'], 'select': 'id'})
                read.raise_for_status(); assert len(read.json()) == 1
                hidden = await other.get('/rest/v1/purchases', params={'id': 'eq.' + purchase['id'], 'select': 'id'})
                hidden.raise_for_status(); assert hidden.json() == []
                forbidden = await owner.post('/rest/v1/rpc/complete_program_purchase', json={'p_order_id': order, 'p_user_id': users[0], 'p_capture_id': 'FAKE'})
                assert forbidden.status_code in (401, 403, 404)
                write = await owner.post('/rest/v1/program_entitlements', json={'user_id': users[0], 'program_id': 'beginner-strength', 'purchase_id': purchase['id']})
                assert write.status_code in (401, 403)
                for _ in range(2):
                    result = await admin.post('/rest/v1/rpc/complete_program_purchase', json={'p_order_id': order, 'p_user_id': users[0], 'p_capture_id': 'TEST-' + order})
                    result.raise_for_status()
                rows = await owner.get('/rest/v1/program_entitlements', params={'select': 'program_id'})
                rows.raise_for_status(); assert len(rows.json()) == 1
                rows = await other.get('/rest/v1/program_entitlements', params={'select': 'program_id'})
                rows.raise_for_status(); assert rows.json() == []
            print('PASS: concurrent reservation, durable binding, account isolation, denied client writes/RPC, idempotent completion.')
        finally:
            for user in users:
                # Only UUIDs returned by this test's own create-user calls.
                result = await admin.delete('/auth/v1/admin/users/' + user)
                result.raise_for_status()
            print('Disposable test accounts removed.')


if __name__ == '__main__':
    asyncio.run(main())
