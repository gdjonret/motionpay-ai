import pytest
from app.limits import buckets
from app.main import tutorial_cache


@pytest.fixture(autouse=True)
def isolated_request_limits():
    buckets.clear()
    tutorial_cache.clear()
    yield
    buckets.clear()
