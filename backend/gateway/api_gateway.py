"""
API Gateway with Rate Limiting and Throttling
Spirit Tours Platform - Gateway System
"""

import time
import hashlib
import json
import asyncio
from typing import Dict, Optional, Tuple, List, Any
from datetime import datetime, timedelta
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as redis
from functools import wraps
import logging
from dataclasses import dataclass
from enum import Enum
import jwt
from collections import defaultdict
import ipaddress

logger = logging.getLogger(__name__)


class RateLimitStrategy(Enum):
    """Rate limiting strategies"""
    TOKEN_BUCKET = "token_bucket"
    SLIDING_WINDOW = "sliding_window"
    FIXED_WINDOW = "fixed_window"
    LEAKY_BUCKET = "leaky_bucket"


@dataclass
class RateLimitConfig:
    """Rate limit configuration"""
    requests_per_second: int = 10
    requests_per_minute: int = 100
    requests_per_hour: int = 1000
    requests_per_day: int = 10000
    burst_size: int = 20
    strategy: RateLimitStrategy = RateLimitStrategy.TOKEN_BUCKET


class RateLimiter:
    """Advanced rate limiter with multiple strategies"""
    
    def __init__(self, redis_client: redis.Redis, default_config: RateLimitConfig = None):
        self.redis = redis_client
        self.default_config = default_config or RateLimitConfig()
        self.custom_limits: Dict[str, RateLimitConfig] = {}
        
    def set_custom_limit(self, key: str, config: RateLimitConfig):
        """Set custom rate limit for specific key (user, API key, endpoint)"""
        self.custom_limits[key] = config
    
    def get_config(self, key: str) -> RateLimitConfig:
        """Get rate limit config for key"""
        return self.custom_limits.get(key, self.default_config)
    
    async def check_token_bucket(self, key: str, config: RateLimitConfig) -> Tuple[bool, Dict]:
        """Token bucket algorithm"""
        bucket_key = f"rate_limit:token_bucket:{key}"
        current_time = time.time()
        
        # Get current bucket state
        bucket_data = await self.redis.get(bucket_key)
        
        if bucket_data:
            bucket = json.loads(bucket_data)
            tokens = bucket['tokens']
            last_refill = bucket['last_refill']
        else:
            tokens = config.burst_size
            last_refill = current_time
        
        # Calculate tokens to add based on time elapsed
        time_elapsed = current_time - last_refill
        tokens_to_add = time_elapsed * config.requests_per_second
        tokens = min(config.burst_size, tokens + tokens_to_add)
        
        if tokens >= 1:
            # Consume a token
            tokens -= 1
            
            # Update bucket
            bucket = {
                'tokens': tokens,
                'last_refill': current_time
            }
            await self.redis.setex(bucket_key, 3600, json.dumps(bucket))
            
            return True, {
                'remaining': int(tokens),
                'limit': config.burst_size,
                'reset': int(current_time + (config.burst_size - tokens) / config.requests_per_second)
            }
        else:
            # Rate limit exceeded
            wait_time = (1 - tokens) / config.requests_per_second
            return False, {
                'remaining': 0,
                'limit': config.burst_size,
                'reset': int(current_time + wait_time),
                'retry_after': int(wait_time)
            }
    
    async def check_sliding_window(self, key: str, config: RateLimitConfig) -> Tuple[bool, Dict]:
        """Sliding window algorithm"""
        window_key = f"rate_limit:sliding_window:{key}"
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        # Remove old entries
        await self.redis.zremrangebyscore(window_key, 0, window_start)
        
        # Count requests in window
        request_count = await self.redis.zcard(window_key)
        
        if request_count < config.requests_per_minute:
            # Add current request
            await self.redis.zadd(window_key, {str(current_time): current_time})
            await self.redis.expire(window_key, 60)
            
            return True, {
                'remaining': config.requests_per_minute - request_count - 1,
                'limit': config.requests_per_minute,
                'reset': int(current_time + 60)
            }
        else:
            # Get oldest request time
            oldest = await self.redis.zrange(window_key, 0, 0, withscores=True)
            if oldest:
                reset_time = oldest[0][1] + 60
            else:
                reset_time = current_time + 60
                
            return False, {
                'remaining': 0,
                'limit': config.requests_per_minute,
                'reset': int(reset_time),
                'retry_after': int(reset_time - current_time)
            }
    
    async def check_fixed_window(self, key: str, config: RateLimitConfig) -> Tuple[bool, Dict]:
        """Fixed window algorithm"""
        window = int(time.time() // 60) * 60  # Current minute
        window_key = f"rate_limit:fixed_window:{key}:{window}"
        
        # Increment counter
        count = await self.redis.incr(window_key)
        
        # Set expiry on first request
        if count == 1:
            await self.redis.expire(window_key, 60)
        
        if count <= config.requests_per_minute:
            return True, {
                'remaining': config.requests_per_minute - count,
                'limit': config.requests_per_minute,
                'reset': window + 60
            }
        else:
            return False, {
                'remaining': 0,
                'limit': config.requests_per_minute,
                'reset': window + 60,
                'retry_after': window + 60 - int(time.time())
            }
    
    async def check_rate_limit(self, key: str) -> Tuple[bool, Dict]:
        """Check rate limit using configured strategy"""
        config = self.get_config(key)
        
        if config.strategy == RateLimitStrategy.TOKEN_BUCKET:
            return await self.check_token_bucket(key, config)
        elif config.strategy == RateLimitStrategy.SLIDING_WINDOW:
            return await self.check_sliding_window(key, config)
        elif config.strategy == RateLimitStrategy.FIXED_WINDOW:
            return await self.check_fixed_window(key, config)
        else:
            # Default to token bucket
            return await self.check_token_bucket(key, config)


class APIGateway:
    """API Gateway with advanced features"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.rate_limiter = RateLimiter(redis_client)
        self.blocked_ips: Set[str] = set()
        self.api_keys: Dict[str, Dict] = {}
        self.request_cache: Dict[str, Tuple[Any, float]] = {}
        self.circuit_breakers: Dict[str, 'CircuitBreaker'] = {}
        
    async def authenticate_request(self, request: Request) -> Optional[Dict]:
        """Authenticate incoming request"""
        # Check API key
        api_key = request.headers.get("X-API-Key")
        if api_key and api_key in self.api_keys:
            return self.api_keys[api_key]
        
        # Check JWT token
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # Verify JWT token
                payload = jwt.decode(token, "secret_key", algorithms=["HS256"])
                return {"user_id": payload.get("sub"), "type": "jwt"}
            except jwt.InvalidTokenError:
                pass
        
        return None
    
    def is_ip_blocked(self, ip: str) -> bool:
        """Check if IP is blocked"""
        return ip in self.blocked_ips
    
    def block_ip(self, ip: str, duration: int = 3600):
        """Block IP address"""
        self.blocked_ips.add(ip)
        # Schedule unblock
        asyncio.create_task(self._unblock_ip_after(ip, duration))
    
    async def _unblock_ip_after(self, ip: str, duration: int):
        """Unblock IP after duration"""
        await asyncio.sleep(duration)
        self.blocked_ips.discard(ip)
        logger.info(f"IP {ip} unblocked after {duration} seconds")
    
    def get_cache_key(self, request: Request) -> str:
        """Generate cache key for request"""
        path = request.url.path
        query = str(request.url.query)
        method = request.method
        return hashlib.md5(f"{method}:{path}:{query}".encode()).hexdigest()
    
    async def get_cached_response(self, cache_key: str) -> Optional[Any]:
        """Get cached response if available and not expired"""
        if cache_key in self.request_cache:
            response, timestamp = self.request_cache[cache_key]
            if time.time() - timestamp < 60:  # 1 minute cache
                return response
            else:
                del self.request_cache[cache_key]
        return None
    
    def cache_response(self, cache_key: str, response: Any):
        """Cache response"""
        self.request_cache[cache_key] = (response, time.time())
        
        # Limit cache size
        if len(self.request_cache) > 1000:
            # Remove oldest entries
            sorted_items = sorted(self.request_cache.items(), key=lambda x: x[1][1])
            for key, _ in sorted_items[:100]:
                del self.request_cache[key]


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(self, name: str, failure_threshold: int = 5, 
                 recovery_timeout: int = 60, expected_exception: type = Exception):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open
    
    async def call(self, func, *args, **kwargs):
        """Execute function with circuit breaker"""
        if self.state == "open":
            if self._should_attempt_reset():
                self.state = "half_open"
            else:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail=f"Service {self.name} is temporarily unavailable"
                )
        
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except self.expected_exception as e:
            self._on_failure()
            raise e
    
    def _should_attempt_reset(self) -> bool:
        """Check if should attempt reset"""
        return (self.last_failure_time and 
                time.time() - self.last_failure_time >= self.recovery_timeout)
    
    def _on_success(self):
        """Handle successful call"""
        self.failure_count = 0
        self.state = "closed"
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "open"
            logger.warning(f"Circuit breaker {self.name} opened")


class GatewayMiddleware(BaseHTTPMiddleware):
    """API Gateway middleware"""
    
    def __init__(self, app, gateway: APIGateway):
        super().__init__(app)
        self.gateway = gateway
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Get client IP
        client_ip = request.client.host
        
        # Check if IP is blocked
        if self.gateway.is_ip_blocked(client_ip):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"detail": "IP address is blocked"}
            )
        
        # Authenticate request
        auth_info = await self.gateway.authenticate_request(request)
        
        # Determine rate limit key
        if auth_info:
            if auth_info.get("type") == "api_key":
                rate_limit_key = f"api_key:{auth_info.get('api_key')}"
            else:
                rate_limit_key = f"user:{auth_info.get('user_id')}"
        else:
            rate_limit_key = f"ip:{client_ip}"
        
        # Check rate limit
        allowed, rate_limit_info = await self.gateway.rate_limiter.check_rate_limit(rate_limit_key)
        
        if not allowed:
            # Rate limit exceeded
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded",
                    "retry_after": rate_limit_info.get("retry_after", 60)
                }
            )
            response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("limit"))
            response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("remaining"))
            response.headers["X-RateLimit-Reset"] = str(rate_limit_info.get("reset"))
            response.headers["Retry-After"] = str(rate_limit_info.get("retry_after", 60))
            return response
        
        # Check cache for GET requests
        if request.method == "GET":
            cache_key = self.gateway.get_cache_key(request)
            cached_response = await self.gateway.get_cached_response(cache_key)
            if cached_response:
                # Return cached response
                response = JSONResponse(content=cached_response)
                response.headers["X-Cache"] = "HIT"
                response.headers["X-Response-Time"] = f"{int((time.time() - start_time) * 1000)}ms"
                return response
        
        try:
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers
            response.headers["X-RateLimit-Limit"] = str(rate_limit_info.get("limit"))
            response.headers["X-RateLimit-Remaining"] = str(rate_limit_info.get("remaining"))
            response.headers["X-RateLimit-Reset"] = str(rate_limit_info.get("reset"))
            
            # Add response time header
            response_time = int((time.time() - start_time) * 1000)
            response.headers["X-Response-Time"] = f"{response_time}ms"
            
            # Cache successful GET responses
            if request.method == "GET" and response.status_code == 200:
                # Note: In production, you'd properly handle the response body
                cache_key = self.gateway.get_cache_key(request)
                # self.gateway.cache_response(cache_key, response_body)
                response.headers["X-Cache"] = "MISS"
            
            return response
            
        except Exception as e:
            logger.error(f"Request failed: {e}")
            
            # Check if should block IP due to suspicious activity
            # (e.g., too many errors)
            
            return JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"detail": "Internal server error"}
            )


def rate_limit(requests_per_minute: int = 60):
    """Decorator for rate limiting specific endpoints"""
    def decorator(func):
        @wraps(func)
        async def wrapper(request: Request, *args, **kwargs):
            # Rate limiting logic here
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator


# Usage example
if __name__ == "__main__":
    # Example configuration
    import asyncio
    
    async def main():
        # Initialize Redis
        redis_client = await redis.from_url("redis://localhost:6379")
        
        # Create gateway
        gateway = APIGateway(redis_client)
        
        # Set custom rate limits
        gateway.rate_limiter.set_custom_limit(
            "premium_user",
            RateLimitConfig(
                requests_per_second=50,
                requests_per_minute=500,
                requests_per_hour=5000,
                burst_size=100
            )
        )
        
        # Test rate limiting
        for i in range(15):
            allowed, info = await gateway.rate_limiter.check_rate_limit("test_user")
            print(f"Request {i+1}: {'Allowed' if allowed else 'Blocked'} - Remaining: {info.get('remaining')}")
            await asyncio.sleep(0.1)
    
    asyncio.run(main())