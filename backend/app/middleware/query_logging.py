"""
Slow Query Logging Middleware - Issue #66

Monitors database query performance and logs slow queries (>500ms).
Helps identify performance bottlenecks and validate index effectiveness.

Target: p95 query time <300ms
Alert threshold: 500ms (queries exceeding this are logged with EXPLAIN)
"""

import time
import logging
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from sqlalchemy import event
from sqlalchemy.engine import Engine
from app.core.config import settings

logger = logging.getLogger(__name__)


class QueryPerformanceMonitor:
    """
    SQLAlchemy event listener for tracking query execution time.
    Logs slow queries with execution plan for optimization.
    """

    def __init__(self, threshold_ms: int = 500):
        self.threshold_ms = threshold_ms
        self.queries = []
        self.current_query_start = None

    def before_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """Record query start time"""
        self.current_query_start = time.perf_counter()

    def after_cursor_execute(self, conn, cursor, statement, parameters, context, executemany):
        """Log slow queries with execution time"""
        if self.current_query_start is None:
            return

        execution_time = (time.perf_counter() - self.current_query_start) * 1000  # Convert to ms

        query_info = {
            'statement': statement,
            'parameters': parameters,
            'execution_time_ms': round(execution_time, 2),
        }

        self.queries.append(query_info)

        # Log slow queries
        if execution_time > self.threshold_ms:
            logger.warning(
                f"SLOW QUERY DETECTED ({execution_time:.2f}ms > {self.threshold_ms}ms)\n"
                f"Statement: {statement}\n"
                f"Parameters: {parameters}"
            )

            # Attempt to get EXPLAIN ANALYZE (PostgreSQL only)
            if statement.strip().upper().startswith('SELECT') and 'postgresql' in str(conn.engine.url):
                try:
                    explain_stmt = f"EXPLAIN ANALYZE {statement}"
                    result = conn.execute(explain_stmt, parameters)
                    explain_output = '\n'.join([row[0] for row in result])
                    logger.warning(f"EXPLAIN ANALYZE:\n{explain_output}")
                except Exception as e:
                    logger.debug(f"Could not get EXPLAIN ANALYZE: {e}")

        self.current_query_start = None

    def reset(self):
        """Reset queries list for new request"""
        self.queries = []


class DatabasePerformanceMiddleware(BaseHTTPMiddleware):
    """
    HTTP middleware that monitors database query performance per request.
    Logs request-level metrics: total queries, total time, slow queries.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip health check endpoints to reduce noise
        if request.url.path in ['/health', '/healthz', '/metrics']:
            return await call_next(request)

        # Create query monitor for this request
        monitor = QueryPerformanceMonitor(threshold_ms=500)

        # Attach SQLAlchemy event listeners
        event.listen(Engine, "before_cursor_execute", monitor.before_cursor_execute)
        event.listen(Engine, "after_cursor_execute", monitor.after_cursor_execute)

        # Track request time
        start_time = time.perf_counter()

        try:
            response = await call_next(request)
        finally:
            # Remove event listeners
            event.remove(Engine, "before_cursor_execute", monitor.before_cursor_execute)
            event.remove(Engine, "after_cursor_execute", monitor.after_cursor_execute)

            # Calculate metrics
            request_time_ms = (time.perf_counter() - start_time) * 1000
            total_queries = len(monitor.queries)
            total_query_time_ms = sum(q['execution_time_ms'] for q in monitor.queries)
            slow_queries = [q for q in monitor.queries if q['execution_time_ms'] > 500]

            # Log request summary
            if total_queries > 0:
                logger.info(
                    f"REQUEST: {request.method} {request.url.path} | "
                    f"Total Time: {request_time_ms:.2f}ms | "
                    f"Queries: {total_queries} | "
                    f"DB Time: {total_query_time_ms:.2f}ms | "
                    f"Slow Queries: {len(slow_queries)}"
                )

            # Alert if request has too many queries (N+1 problem)
            if total_queries > 20:
                logger.warning(
                    f"HIGH QUERY COUNT: {request.method} {request.url.path} "
                    f"executed {total_queries} queries - possible N+1 problem"
                )

            # Alert if total DB time is high (>300ms target)
            if total_query_time_ms > 300:
                logger.warning(
                    f"HIGH DB TIME: {request.method} {request.url.path} "
                    f"spent {total_query_time_ms:.2f}ms in database (target: <300ms)"
                )

        return response


class QueryMetricsCollector:
    """
    Collects query performance metrics for monitoring and alerting.
    Can be used with Prometheus/OpenTelemetry for dashboards.
    """

    def __init__(self):
        self.query_count = 0
        self.slow_query_count = 0
        self.total_query_time_ms = 0.0
        self.request_count = 0

    def record_query(self, execution_time_ms: float):
        """Record a query execution"""
        self.query_count += 1
        self.total_query_time_ms += execution_time_ms

        if execution_time_ms > 500:
            self.slow_query_count += 1

    def record_request(self):
        """Record a request processed"""
        self.request_count += 1

    def get_metrics(self) -> dict:
        """Get current metrics snapshot"""
        avg_query_time = (
            self.total_query_time_ms / self.query_count if self.query_count > 0 else 0
        )

        return {
            'query_count': self.query_count,
            'slow_query_count': self.slow_query_count,
            'total_query_time_ms': round(self.total_query_time_ms, 2),
            'average_query_time_ms': round(avg_query_time, 2),
            'request_count': self.request_count,
            'queries_per_request': round(self.query_count / self.request_count, 2) if self.request_count > 0 else 0,
        }

    def reset(self):
        """Reset all metrics"""
        self.query_count = 0
        self.slow_query_count = 0
        self.total_query_time_ms = 0.0
        self.request_count = 0


# Global metrics collector instance
metrics_collector = QueryMetricsCollector()
