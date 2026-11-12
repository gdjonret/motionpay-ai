"""Bounded single-worker demo limits. Forwarded client-IP headers are not trusted."""
import asyncio
import logging
import time
from collections import OrderedDict, deque
from uuid import uuid4

from fastapi import Request
from starlette.responses import JSONResponse

logger = logging.getLogger('uvicorn.error')
buckets = OrderedDict()
slots = asyncio.Semaphore(4)


def allowed(key, limit, window, now=None):
    now = time.monotonic() if now is None else now
    bucket = buckets.pop(key, deque())
    while bucket and bucket[0] <= now - window:
        bucket.popleft()
    ok = len(bucket) < limit
    if ok:
        bucket.append(now)
    buckets[key] = bucket
    while len(buckets) > 10000:
        buckets.popitem(last=False)
    return ok


async def protect(request: Request, call_next):
    path = request.url.path
    if request.method == 'OPTIONS' or not path.startswith('/api/'):
        return await call_next(request)
    ip = request.client.host if request.client else 'unknown'
    try:
        length = int(request.headers.get('content-length', '0'))
    except ValueError:
        return JSONResponse({'detail': 'Invalid request length.'}, status_code=400)
    if length > 40000:
        return JSONResponse({'detail': 'Request too large.'}, status_code=413)
    if request.method in ('POST', 'PUT', 'PATCH'):
        chunks = []
        total = 0
        async for chunk in request.stream():
            total += len(chunk)
            if total > 40000:
                return JSONResponse({'detail': 'Request too large.'}, status_code=413)
            chunks.append(chunk)
        request._body = b''.join(chunks)
    expensive = path in ('/api/chat', '/api/tutorial', '/api/demonstration') or path.endswith('/slow.gif') or (path == '/api/plans' and request.method == 'POST')
    if not allowed(('all', ip), 90, 60) or (expensive and (
        not allowed(('cost-minute', ip), 15, 60) or not allowed(('cost-day', ip), 500, 86400)
    )):
        return JSONResponse({'detail': 'Request limit reached. Please wait before trying again.'}, status_code=429, headers={'Retry-After': '60'})
    request_id = str(uuid4())
    start = time.monotonic()
    acquired = False
    try:
        if expensive:
            try:
                await asyncio.wait_for(slots.acquire(), timeout=1)
                acquired = True
            except asyncio.TimeoutError:
                return JSONResponse({'detail': 'The coach is busy. Please try again shortly.'}, status_code=503)
        response = await call_next(request)
        response.headers['X-Request-ID'] = request_id
        logger.info('request=%s route=%s status=%s duration_ms=%d', request_id,
                    'payments' if '/paypal/' in path else 'api', response.status_code,
                    int((time.monotonic() - start) * 1000))
        return response
    finally:
        if acquired:
            slots.release()
