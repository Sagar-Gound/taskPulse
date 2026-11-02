import json
import time
from typing import Any
import redis.asyncio as aioredis

from app.core.config import settings

_memory_cache: dict[str, tuple[float, str]] = {}
_redis_client: aioredis.Redis | None = None

def get_redis_client() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            decode_responses=True,
            socket_timeout=1.5,
            socket_connect_timeout=1.5,
        )
    return _redis_client

async def get_cached_json(key: str) -> tuple[Any | None, bool]:
    # Check redis first, fallback to in-memory store
    try:
        client = get_redis_client()
        val = await client.get(key)
        if val is not None:
            return json.loads(val), True
    except Exception:
        now = time.time()
        if key in _memory_cache:
            expires_at, val = _memory_cache[key]
            if expires_at > now:
                return json.loads(val), True
            _memory_cache.pop(key, None)
    return None, False

async def set_cached_json(key: str, data: Any, ttl: int = 300) -> None:
    serialized = json.dumps(data)
    try:
        client = get_redis_client()
        await client.setex(key, ttl, serialized)
    except Exception:
        _memory_cache[key] = (time.time() + ttl, serialized)

async def invalidate_cache_pattern(pattern: str) -> None:
    try:
        client = get_redis_client()
        keys = await client.keys(pattern)
        if keys:
            await client.delete(*keys)
    except Exception:
        clean_prefix = pattern.replace("*", "")
        for k in list(_memory_cache.keys()):
            if k.startswith(clean_prefix):
                _memory_cache.pop(k, None)

