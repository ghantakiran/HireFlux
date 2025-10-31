"""
API Endpoint Monitoring and Health Checks

Provides comprehensive monitoring for API endpoints including:
- Health checks
- Performance metrics
- Uptime monitoring
- Error rate tracking
"""

from fastapi import Request, Response
from typing import Dict, Any, Optional
import time
import psutil
import asyncio
from datetime import datetime, timedelta
from collections import defaultdict, deque

from app.core.config import settings


class EndpointMonitor:
    """
    Monitor API endpoint performance and health
    """

    def __init__(self):
        self.request_count = defaultdict(int)
        self.error_count = defaultdict(int)
        self.response_times = defaultdict(lambda: deque(maxlen=1000))
        self.start_time = datetime.utcnow()

    def record_request(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
    ):
        """Record metrics for a request"""

        key = f"{method} {endpoint}"

        # Increment request count
        self.request_count[key] += 1

        # Record errors (4xx and 5xx)
        if status_code >= 400:
            self.error_count[key] += 1

        # Record response time
        self.response_times[key].append(response_time)

    def get_endpoint_stats(self, endpoint: str, method: str) -> Dict[str, Any]:
        """Get statistics for a specific endpoint"""

        key = f"{method} {endpoint}"
        times = list(self.response_times[key])

        if not times:
            return {
                "requests": 0,
                "errors": 0,
                "error_rate": 0.0,
                "avg_response_time": 0.0,
                "p95_response_time": 0.0,
                "p99_response_time": 0.0,
            }

        times_sorted = sorted(times)
        total_requests = self.request_count[key]
        total_errors = self.error_count[key]

        return {
            "requests": total_requests,
            "errors": total_errors,
            "error_rate": (total_errors / total_requests * 100) if total_requests > 0 else 0.0,
            "avg_response_time": sum(times) / len(times),
            "p95_response_time": times_sorted[int(len(times_sorted) * 0.95)] if times_sorted else 0.0,
            "p99_response_time": times_sorted[int(len(times_sorted) * 0.99)] if times_sorted else 0.0,
            "min_response_time": min(times),
            "max_response_time": max(times),
        }

    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all endpoints"""

        stats = {}
        for key in self.request_count.keys():
            method, endpoint = key.split(" ", 1)
            stats[key] = self.get_endpoint_stats(endpoint, method)

        return stats

    def get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics"""

        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        uptime = datetime.utcnow() - self.start_time

        return {
            "status": "healthy" if cpu_percent < 90 and memory.percent < 90 else "degraded",
            "uptime_seconds": int(uptime.total_seconds()),
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / (1024 * 1024),
            "disk_percent": disk.percent,
            "disk_free_gb": disk.free / (1024 * 1024 * 1024),
        }


# Global monitor instance
endpoint_monitor = EndpointMonitor()


async def monitoring_middleware(request: Request, call_next):
    """
    Middleware to monitor API requests
    """

    start_time = time.time()
    path = request.url.path
    method = request.method

    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as e:
        status_code = 500
        # Record the error
        endpoint_monitor.record_request(
            endpoint=path,
            method=method,
            status_code=status_code,
            response_time=(time.time() - start_time) * 1000,
        )
        raise e

    # Calculate response time in milliseconds
    response_time = (time.time() - start_time) * 1000

    # Record metrics
    endpoint_monitor.record_request(
        endpoint=path,
        method=method,
        status_code=status_code,
        response_time=response_time,
    )

    # Add response headers
    response.headers["X-Response-Time"] = f"{response_time:.2f}ms"

    return response


def get_health_check() -> Dict[str, Any]:
    """
    Get comprehensive health check data
    """

    system_health = endpoint_monitor.get_system_health()
    endpoint_stats = endpoint_monitor.get_all_stats()

    # Calculate overall metrics
    total_requests = sum(s["requests"] for s in endpoint_stats.values())
    total_errors = sum(s["errors"] for s in endpoint_stats.values())
    overall_error_rate = (
        (total_errors / total_requests * 100) if total_requests > 0 else 0.0
    )

    return {
        "status": system_health["status"],
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": system_health["uptime_seconds"],
        "system": {
            "cpu_percent": system_health["cpu_percent"],
            "memory_percent": system_health["memory_percent"],
            "memory_available_mb": system_health["memory_available_mb"],
            "disk_percent": system_health["disk_percent"],
            "disk_free_gb": system_health["disk_free_gb"],
        },
        "requests": {
            "total": total_requests,
            "errors": total_errors,
            "error_rate": overall_error_rate,
        },
        "timestamp": datetime.utcnow().isoformat(),
    }


def get_metrics() -> Dict[str, Any]:
    """
    Get detailed metrics for all endpoints
    """

    return {
        "endpoints": endpoint_monitor.get_all_stats(),
        "system": endpoint_monitor.get_system_health(),
        "timestamp": datetime.utcnow().isoformat(),
    }


class HealthCheckCache:
    """
    Cache health check results to avoid excessive system calls
    """

    def __init__(self, cache_ttl_seconds: int = 5):
        self.cache_ttl = timedelta(seconds=cache_ttl_seconds)
        self.cached_result: Optional[Dict[str, Any]] = None
        self.cache_time: Optional[datetime] = None

    def get_health(self) -> Dict[str, Any]:
        """Get health check with caching"""

        now = datetime.utcnow()

        # Return cached result if still valid
        if (
            self.cached_result
            and self.cache_time
            and (now - self.cache_time) < self.cache_ttl
        ):
            return self.cached_result

        # Compute new health check
        self.cached_result = get_health_check()
        self.cache_time = now

        return self.cached_result


# Global health check cache
health_cache = HealthCheckCache(cache_ttl_seconds=5)
