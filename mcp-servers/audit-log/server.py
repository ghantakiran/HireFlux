"""
Audit Log MCP Server for HireFlux
Immutable compliance logging for GDPR/CCPA
"""
import os
import asyncio
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import asyncpg
from mcp import Server, Tool

class AuditLogMCPServer:
    def __init__(self):
        self.server = Server("audit_log")
        self.db_url = os.getenv("POSTGRES_CONNECTION_STRING")
        self.pool = None
        self.immutable_enabled = os.getenv("IMMUTABLE_STORAGE", "enabled") == "enabled"
        self.register_tools()

    async def get_pool(self):
        """Get or create database connection pool"""
        if self.pool is None:
            self.pool = await asyncpg.create_pool(self.db_url)
        return self.pool

    def register_tools(self):
        """Register audit log tools"""

        @self.server.tool()
        async def record_event(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Record immutable audit event

            Args:
                params:
                    event_type: str - Event type (e.g., "application_submitted")
                    user_id: str - User ID
                    timestamp: Optional[str] - ISO timestamp (default: now)
                    metadata: Dict - Event metadata
                    immutable: bool - Mark as immutable (default: True)

            Returns:
                {
                    event_id: str,
                    recorded_at: str,
                    status: str
                }
            """
            event_type = params["event_type"]
            user_id = params["user_id"]
            timestamp = params.get("timestamp", datetime.utcnow().isoformat())
            metadata = params["metadata"]
            immutable = params.get("immutable", True)

            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Insert into events_audit table
                    event_id = await conn.fetchval(
                        """
                        INSERT INTO events_audit
                            (event_type, user_id, event_timestamp, metadata, immutable)
                        VALUES ($1, $2, $3, $4, $5)
                        RETURNING id
                        """,
                        event_type,
                        user_id,
                        datetime.fromisoformat(timestamp.replace('Z', '+00:00')),
                        json.dumps(metadata),
                        immutable
                    )

                return {
                    "event_id": str(event_id),
                    "recorded_at": datetime.utcnow().isoformat(),
                    "status": "success"
                }
            except Exception as e:
                return {"error": str(e), "status": "failed"}

        @self.server.tool()
        async def verify_consent(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Verify user consent for action

            Args:
                params:
                    user_id: str - User ID
                    job_board: str - Job board name
                    consent_type: str - "auto_apply" | "data_sharing"

            Returns:
                {
                    valid: bool,
                    consent_timestamp: Optional[str],
                    expires_at: Optional[str]
                }
            """
            user_id = params["user_id"]
            job_board = params["job_board"]
            consent_type = params["consent_type"]

            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Query latest consent event
                    consent = await conn.fetchrow(
                        """
                        SELECT event_timestamp, metadata
                        FROM events_audit
                        WHERE user_id = $1
                          AND event_type = 'consent_granted'
                          AND metadata->>'job_board' = $2
                          AND metadata->>'consent_type' = $3
                        ORDER BY event_timestamp DESC
                        LIMIT 1
                        """,
                        user_id,
                        job_board,
                        consent_type
                    )

                    if not consent:
                        return {
                            "valid": False,
                            "reason": "no_consent_found"
                        }

                    # Check if revoked
                    revoked = await conn.fetchval(
                        """
                        SELECT COUNT(*)
                        FROM events_audit
                        WHERE user_id = $1
                          AND event_type = 'consent_revoked'
                          AND metadata->>'job_board' = $2
                          AND metadata->>'consent_type' = $3
                          AND event_timestamp > $4
                        """,
                        user_id,
                        job_board,
                        consent_type,
                        consent["event_timestamp"]
                    )

                    if revoked > 0:
                        return {
                            "valid": False,
                            "reason": "consent_revoked"
                        }

                    metadata = json.loads(consent["metadata"])
                    expires_at = metadata.get("expires_at")

                    # Check expiration
                    if expires_at:
                        if datetime.fromisoformat(expires_at) < datetime.utcnow():
                            return {
                                "valid": False,
                                "reason": "consent_expired"
                            }

                    return {
                        "valid": True,
                        "consent_timestamp": consent["event_timestamp"].isoformat(),
                        "expires_at": expires_at
                    }

            except Exception as e:
                return {"error": str(e), "valid": False}

        @self.server.tool()
        async def query_data_lineage(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Query data lineage for GDPR compliance

            Args:
                params:
                    user_id: str - User ID
                    event_types: Optional[List[str]] - Filter by event types
                    start_date: Optional[str] - ISO date
                    end_date: Optional[str] - ISO date
                    limit: int - Max results (default: 100)

            Returns:
                {
                    events: List[Dict],
                    total_count: int
                }
            """
            user_id = params["user_id"]
            event_types = params.get("event_types")
            start_date = params.get("start_date")
            end_date = params.get("end_date")
            limit = params.get("limit", 100)

            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Build query
                    query = """
                        SELECT id, event_type, event_timestamp, metadata
                        FROM events_audit
                        WHERE user_id = $1
                    """
                    args = [user_id]
                    arg_index = 2

                    if event_types:
                        query += f" AND event_type = ANY(${arg_index})"
                        args.append(event_types)
                        arg_index += 1

                    if start_date:
                        query += f" AND event_timestamp >= ${arg_index}"
                        args.append(datetime.fromisoformat(start_date))
                        arg_index += 1

                    if end_date:
                        query += f" AND event_timestamp <= ${arg_index}"
                        args.append(datetime.fromisoformat(end_date))
                        arg_index += 1

                    query += f" ORDER BY event_timestamp DESC LIMIT ${arg_index}"
                    args.append(limit)

                    rows = await conn.fetch(query, *args)

                    events = []
                    for row in rows:
                        events.append({
                            "event_id": str(row["id"]),
                            "event_type": row["event_type"],
                            "timestamp": row["event_timestamp"].isoformat(),
                            "metadata": json.loads(row["metadata"])
                        })

                    # Get total count
                    count_query = """
                        SELECT COUNT(*)
                        FROM events_audit
                        WHERE user_id = $1
                    """
                    total_count = await conn.fetchval(count_query, user_id)

                    return {
                        "events": events,
                        "total_count": total_count
                    }

            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def export_user_data(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Export all user data for GDPR access request

            Args:
                params:
                    user_id: str - User ID
                    format: str - "json" | "csv"

            Returns:
                {
                    data: Dict | str,
                    event_count: int,
                    export_timestamp: str
                }
            """
            user_id = params["user_id"]
            export_format = params.get("format", "json")

            try:
                # Get all events
                lineage_result = await self.server.call_tool(
                    "query_data_lineage",
                    {"user_id": user_id, "limit": 10000}
                )

                export_data = {
                    "user_id": user_id,
                    "export_timestamp": datetime.utcnow().isoformat(),
                    "events": lineage_result.get("events", []),
                    "total_events": lineage_result.get("total_count", 0)
                }

                if export_format == "csv":
                    # Convert to CSV (simplified)
                    csv_data = "event_id,event_type,timestamp,metadata\n"
                    for event in export_data["events"]:
                        csv_data += f"{event['event_id']},{event['event_type']},{event['timestamp']},\"{json.dumps(event['metadata'])}\"\n"
                    return {
                        "data": csv_data,
                        "event_count": export_data["total_events"],
                        "export_timestamp": export_data["export_timestamp"]
                    }

                return {
                    "data": export_data,
                    "event_count": export_data["total_events"],
                    "export_timestamp": export_data["export_timestamp"]
                }

            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def delete_user_data(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Mark user data for deletion (GDPR right to be forgotten)

            Args:
                params:
                    user_id: str - User ID
                    reason: str - Deletion reason
                    soft_delete: bool - Soft delete (anonymize) vs hard delete

            Returns:
                {
                    status: str,
                    events_affected: int,
                    deletion_timestamp: str
                }
            """
            user_id = params["user_id"]
            reason = params["reason"]
            soft_delete = params.get("soft_delete", True)

            try:
                pool = await self.get_pool()
                async with pool.acquire() as conn:
                    # Record deletion event first
                    await conn.execute(
                        """
                        INSERT INTO events_audit
                            (event_type, user_id, event_timestamp, metadata, immutable)
                        VALUES ('data_deletion_requested', $1, $2, $3, true)
                        """,
                        user_id,
                        datetime.utcnow(),
                        json.dumps({"reason": reason, "soft_delete": soft_delete})
                    )

                    if soft_delete:
                        # Anonymize non-immutable events
                        affected = await conn.fetchval(
                            """
                            UPDATE events_audit
                            SET metadata = jsonb_set(metadata, '{anonymized}', 'true')
                            WHERE user_id = $1 AND immutable = false
                            RETURNING COUNT(*)
                            """,
                            user_id
                        )
                    else:
                        # Hard delete (only non-immutable)
                        affected = await conn.fetchval(
                            """
                            DELETE FROM events_audit
                            WHERE user_id = $1 AND immutable = false
                            RETURNING COUNT(*)
                            """,
                            user_id
                        )

                    return {
                        "status": "success",
                        "events_affected": affected or 0,
                        "deletion_timestamp": datetime.utcnow().isoformat(),
                        "deletion_type": "soft" if soft_delete else "hard"
                    }

            except Exception as e:
                return {"error": str(e), "status": "failed"}

    async def run(self):
        """Run the MCP server"""
        await self.server.run()

    async def cleanup(self):
        """Cleanup resources"""
        if self.pool:
            await self.pool.close()

if __name__ == "__main__":
    server = AuditLogMCPServer()
    try:
        asyncio.run(server.run())
    finally:
        asyncio.run(server.cleanup())
