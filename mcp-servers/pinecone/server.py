"""
Pinecone MCP Server for HireFlux
Vector database operations for job matching
"""
import os
import asyncio
from typing import Any, Dict, List, Optional
from pinecone import Pinecone, ServerlessSpec
from mcp import Server, Tool

class PineconeMCPServer:
    def __init__(self):
        self.server = Server("pinecone")
        api_key = os.getenv("PINECONE_API_KEY")
        environment = os.getenv("PINECONE_ENVIRONMENT", "us-west1-gcp")

        self.pc = Pinecone(api_key=api_key)
        self.index_name = os.getenv("PINECONE_INDEX", "jobs-production")

        # Initialize index connection
        self.index = None
        self.register_tools()

    def get_index(self):
        """Get or create index"""
        if self.index is None:
            if self.index_name not in self.pc.list_indexes().names():
                # Create index if doesn't exist
                self.pc.create_index(
                    name=self.index_name,
                    dimension=1536,  # OpenAI text-embedding-3-small
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-west-2")
                )
            self.index = self.pc.Index(self.index_name)
        return self.index

    def register_tools(self):
        """Register Pinecone tools"""

        @self.server.tool()
        async def upsert_vectors(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Upsert vectors to index

            Args:
                params:
                    vectors: List[Dict] - [{id, values, metadata}]
                    namespace: Optional[str] - Namespace for vectors

            Returns:
                {
                    upserted_count: int,
                    status: str
                }
            """
            vectors = params["vectors"]
            namespace = params.get("namespace", "")

            try:
                index = self.get_index()
                result = index.upsert(vectors=vectors, namespace=namespace)

                return {
                    "upserted_count": result.upserted_count,
                    "status": "success"
                }
            except Exception as e:
                return {"error": str(e), "status": "failed"}

        @self.server.tool()
        async def query_similar(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Query similar vectors

            Args:
                params:
                    vector: List[float] - Query vector (1536-dim)
                    top_k: int - Number of results (default: 50)
                    filter: Optional[Dict] - Metadata filter
                    namespace: Optional[str] - Namespace to query
                    include_metadata: bool - Include metadata (default: True)
                    include_values: bool - Include vector values (default: False)

            Returns:
                {
                    matches: List[Dict] - [{id, score, metadata?, values?}],
                    namespace: str
                }
            """
            vector = params["vector"]
            top_k = params.get("top_k", 50)
            metadata_filter = params.get("filter")
            namespace = params.get("namespace", "")
            include_metadata = params.get("include_metadata", True)
            include_values = params.get("include_values", False)

            try:
                index = self.get_index()
                result = index.query(
                    vector=vector,
                    top_k=top_k,
                    filter=metadata_filter,
                    namespace=namespace,
                    include_metadata=include_metadata,
                    include_values=include_values
                )

                matches = []
                for match in result.matches:
                    match_data = {
                        "id": match.id,
                        "score": match.score
                    }
                    if include_metadata and match.metadata:
                        match_data["metadata"] = match.metadata
                    if include_values and match.values:
                        match_data["values"] = match.values

                    matches.append(match_data)

                return {
                    "matches": matches,
                    "namespace": namespace
                }
            except Exception as e:
                return {"error": str(e), "matches": []}

        @self.server.tool()
        async def get_index_stats(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Get index statistics

            Args:
                params:
                    filter: Optional[Dict] - Metadata filter for stats

            Returns:
                {
                    dimension: int,
                    index_fullness: float,
                    total_vector_count: int,
                    namespaces: Dict[str, Dict]
                }
            """
            metadata_filter = params.get("filter")

            try:
                index = self.get_index()
                stats = index.describe_index_stats(filter=metadata_filter)

                return {
                    "dimension": stats.dimension,
                    "index_fullness": stats.index_fullness,
                    "total_vector_count": stats.total_vector_count,
                    "namespaces": stats.namespaces
                }
            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def delete_by_filter(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Delete vectors by metadata filter

            Args:
                params:
                    filter: Dict - Metadata filter
                    namespace: Optional[str] - Namespace

            Returns:
                {
                    status: str,
                    deleted_count: Optional[int]
                }
            """
            metadata_filter = params["filter"]
            namespace = params.get("namespace", "")

            try:
                index = self.get_index()
                index.delete(filter=metadata_filter, namespace=namespace)

                return {"status": "success"}
            except Exception as e:
                return {"error": str(e), "status": "failed"}

        @self.server.tool()
        async def bulk_upsert(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Bulk upsert vectors in batches

            Args:
                params:
                    vectors: List[Dict] - [{id, values, metadata}]
                    batch_size: int - Batch size (default: 100)
                    namespace: Optional[str] - Namespace

            Returns:
                {
                    total_upserted: int,
                    batches_processed: int,
                    status: str
                }
            """
            vectors = params["vectors"]
            batch_size = params.get("batch_size", 100)
            namespace = params.get("namespace", "")

            try:
                index = self.get_index()
                total_upserted = 0
                batches = [vectors[i:i + batch_size] for i in range(0, len(vectors), batch_size)]

                for batch in batches:
                    result = index.upsert(vectors=batch, namespace=namespace)
                    total_upserted += result.upserted_count

                return {
                    "total_upserted": total_upserted,
                    "batches_processed": len(batches),
                    "status": "success"
                }
            except Exception as e:
                return {"error": str(e), "status": "failed"}

        @self.server.tool()
        async def fetch_vectors(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Fetch vectors by IDs

            Args:
                params:
                    ids: List[str] - Vector IDs to fetch
                    namespace: Optional[str] - Namespace

            Returns:
                {
                    vectors: Dict[str, Dict] - {id: {values, metadata}}
                }
            """
            ids = params["ids"]
            namespace = params.get("namespace", "")

            try:
                index = self.get_index()
                result = index.fetch(ids=ids, namespace=namespace)

                vectors = {}
                for vec_id, vec_data in result.vectors.items():
                    vectors[vec_id] = {
                        "values": vec_data.values,
                        "metadata": vec_data.metadata if vec_data.metadata else {}
                    }

                return {"vectors": vectors}
            except Exception as e:
                return {"error": str(e), "vectors": {}}

    async def run(self):
        """Run the MCP server"""
        await self.server.run()

if __name__ == "__main__":
    server = PineconeMCPServer()
    asyncio.run(server.run())
