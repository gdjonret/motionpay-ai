import os
from uuid import UUID

import httpx
from fastapi import Header, HTTPException


async def require_user(authorization: str = Header(default='')) -> str:
    """Resolve identity with Supabase; never trust a client-supplied user ID."""
    if not authorization.startswith('Bearer ') or not authorization[7:].strip():
        raise HTTPException(401, 'Sign in to continue.')
    url = os.getenv('SUPABASE_URL', '').rstrip('/')
    key = os.getenv('SUPABASE_PUBLISHABLE_KEY', '')
    if not url or not key:
        raise HTTPException(503, 'Account verification is not configured.')
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(f'{url}/auth/v1/user', headers={'apikey': key, 'Authorization': authorization})
        if response.status_code in (401, 403):
            raise HTTPException(401, 'Your session expired. Please sign in again.')
        response.raise_for_status()
        return str(UUID(response.json()['id']))
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        raise HTTPException(503, 'Unable to verify your account. Please try again.') from None
