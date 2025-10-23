"""
Redis MCP Server for HireFlux
Cache management and RQ job queue monitoring
"""
import os
import asyncio
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import redis.asyncio as redis
from rq import Queue
from rq.job import Job
from mcp import Server, Tool

class RedisMCPServer:
    def __init__(self):
        self.server = Server("redis")
        redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_client = None
        self.redis_url = redis_url
        self.register_tools()

    async def get_client(self):
        """Get or create Redis client"""
        if self.redis_client is None:
            self.redis_client = await redis.from_url(self.redis_url, decode_responses=True)
        return self.redis_client

    def register_tools(self):
        """Register Redis tools"""

        @self.server.tool()
        async def get_cache_stats(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Get cache statistics for key pattern

            Args:
                params:
                    keys_pattern: str - Pattern to match (e.g., "resume:*")
                    period: str - "1h" | "24h" | "7d"

            Returns:
                {
                    total_keys: int,
                    hit_rate: float,
                    memory_usage_mb: float,
                    avg_ttl_seconds: float
                }
            """
            client = await self.get_client()
            pattern = params.get("keys_pattern", "*")

            try:
                # Get matching keys
                keys = []
                async for key in client.scan_iter(match=pattern):
                    keys.append(key)

                total_keys = len(keys)
                total_ttl = 0
                total_memory = 0

                # Sample statistics from keys
                for key in keys[:1000]:  # Limit to 1000 keys for performance
                    ttl = await client.ttl(key)
                    if ttl > 0:
                        total_ttl += ttl

                    # Get memory usage (approximate)
                    memory = await client.memory_usage(key)
                    if memory:
                        total_memory += memory

                avg_ttl = total_ttl / total_keys if total_keys > 0 else 0
                memory_mb = total_memory / (1024 * 1024)

                # Get hit/miss stats from INFO (if available)
                info = await client.info("stats")
                keyspace_hits = info.get("keyspace_hits", 0)
                keyspace_misses = info.get("keyspace_misses", 0)
                total_hits = keyspace_hits + keyspace_misses
                hit_rate = keyspace_hits / total_hits if total_hits > 0 else 0

                return {
                    "total_keys": total_keys,
                    "hit_rate": hit_rate,
                    "memory_usage_mb": memory_mb,
                    "avg_ttl_seconds": avg_ttl
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def inspect_queue(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Inspect RQ job queue status

            Args:
                params:
                    queue_name: str - Queue name (default: "default")

            Returns:
                {
                    pending_jobs: int,
                    failed_jobs: int,
                    finished_jobs: int,
                    started_jobs: int,
                    oldest_job_age_seconds: Optional[int],
                    failed_job_details: List[Dict]
                }
            """
            queue_name = params.get("queue_name", "default")

            try:
                # Use synchronous redis for RQ compatibility
                import redis as sync_redis
                sync_client = sync_redis.from_url(self.redis_url)
                queue = Queue(queue_name, connection=sync_client)

                pending = len(queue)
                failed = len(queue.failed_job_registry)
                finished = len(queue.finished_job_registry)
                started = len(queue.started_job_registry)

                # Get oldest job age
                oldest_age = None
                if pending > 0:
                    job_ids = queue.job_ids
                    if job_ids:
                        oldest_job = Job.fetch(job_ids[0], connection=sync_client)
                        if oldest_job.enqueued_at:
                            oldest_age = (datetime.utcnow() - oldest_job.enqueued_at).total_seconds()

                # Get failed job details
                failed_details = []
                failed_registry = queue.failed_job_registry
                for job_id in failed_registry.get_job_ids()[:10]:  # Last 10 failures
                    try:
                        job = Job.fetch(job_id, connection=sync_client)
                        failed_details.append({
                            "job_id": job_id,
                            "func_name": job.func_name,
                            "enqueued_at": job.enqueued_at.isoformat() if job.enqueued_at else None,
                            "exc_info": job.exc_info[:500] if job.exc_info else None  # Truncate
                        })
                    except:
                        pass

                return {
                    "queue_name": queue_name,
                    "pending_jobs": pending,
                    "failed_jobs": failed,
                    "finished_jobs": finished,
                    "started_jobs": started,
                    "oldest_job_age_seconds": oldest_age,
                    "failed_job_details": failed_details
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def invalidate_pattern(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Invalidate cache keys matching pattern

            Args:
                params:
                    pattern: str - Pattern to match (e.g., "resume:user:123:*")

            Returns:
                {
                    keys_deleted: int,
                    status: str
                }
            """
            client = await self.get_client()
            pattern = params["pattern"]

            try:
                keys_to_delete = []
                async for key in client.scan_iter(match=pattern):
                    keys_to_delete.append(key)

                if keys_to_delete:
                    deleted = await client.delete(*keys_to_delete)
                else:
                    deleted = 0

                return {
                    "keys_deleted": deleted,
                    "status": "success"
                }
            except Exception as e:
                return {"error": str(e), "status": "failed"}

        @self.server.tool()
        async def monitor_memory(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Monitor Redis memory usage

            Returns:
                {
                    used_memory_mb: float,
                    used_memory_peak_mb: float,
                    total_keys: int,
                    evicted_keys: int,
                    fragmentation_ratio: float
                }
            """
            client = await self.get_client()

            try:
                info = await client.info("memory")
                stats = await client.info("stats")

                used_memory = info.get("used_memory", 0) / (1024 * 1024)
                peak_memory = info.get("used_memory_peak", 0) / (1024 * 1024)
                fragmentation = info.get("mem_fragmentation_ratio", 0)

                # Get total keys across all databases
                keyspace = await client.info("keyspace")
                total_keys = sum(
                    db_info.get("keys", 0)
                    for db_info in keyspace.values()
                    if isinstance(db_info, dict)
                )

                evicted_keys = stats.get("evicted_keys", 0)

                return {
                    "used_memory_mb": used_memory,
                    "used_memory_peak_mb": peak_memory,
                    "total_keys": total_keys,
                    "evicted_keys": evicted_keys,
                    "fragmentation_ratio": fragmentation
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def list_slow_keys(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            List keys with high memory usage

            Args:
                params:
                    top_n: int - Number of keys to return (default: 10)
                    pattern: Optional[str] - Pattern to filter

            Returns:
                {
                    slow_keys: List[Dict] - [{key, memory_bytes, ttl_seconds, type}]
                }
            """
            client = await self.get_client()
            top_n = params.get("top_n", 10)
            pattern = params.get("pattern", "*")

            try:
                key_stats = []
                async for key in client.scan_iter(match=pattern, count=1000):
                    memory = await client.memory_usage(key)
                    if memory and memory > 1024:  # Only keys > 1KB
                        ttl = await client.ttl(key)
                        key_type = await client.type(key)

                        key_stats.append({
                            "key": key,
                            "memory_bytes": memory,
                            "ttl_seconds": ttl,
                            "type": key_type
                        })

                # Sort by memory usage
                key_stats.sort(key=lambda x: x["memory_bytes"], reverse=True)

                return {
                    "slow_keys": key_stats[:top_n]
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def get(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Get value by key

            Args:
                params:
                    key: str - Cache key

            Returns:
                {
                    value: Optional[str],
                    exists: bool
                }
            """
            client = await self.get_client()
            key = params["key"]

            try:
                value = await client.get(key)
                return {
                    "value": value,
                    "exists": value is not None
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def set(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Set key-value with optional TTL

            Args:
                params:
                    key: str - Cache key
                    value: str - Value to store
                    ttl: Optional[int] - TTL in seconds

            Returns:
                {
                    status: str
                }
            """
            client = await self.get_client()
            key = params["key"]
            value = params["value"]
            ttl = params.get("ttl")

            try:
                if ttl:
                    await client.setex(key, ttl, value)
                else:
                    await client.set(key, value)

                return {"status": "success"}
            except Exception as e:
                return {"error": str(e), "status": "failed"}

    async def run(self):
        """Run the MCP server"""
        await self.server.run()

    async def cleanup(self):
        """Cleanup resources"""
        if self.redis_client:
            await self.redis_client.close()

if __name__ == "__main__":
    server = RedisMCPServer()
    try:
        asyncio.run(server.run())
    finally:
        asyncio.run(server.cleanup())
