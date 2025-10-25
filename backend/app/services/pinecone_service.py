"""Pinecone vector database service"""
import pinecone
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import hashlib

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.services.openai_service import OpenAIService
from app.schemas.job_matching import (
    VectorSearchRequest,
    VectorSearchResponse,
    VectorSearchResult,
    EmbeddingRequest,
    EmbeddingResponse,
    SkillVector,
)


class PineconeService:
    """Pinecone vector database operations"""

    def __init__(self):
        """Initialize Pinecone connection"""
        try:
            # Initialize Pinecone
            pinecone.init(
                api_key=settings.PINECONE_API_KEY,
                environment=settings.PINECONE_ENVIRONMENT,
            )

            # Get or create indexes
            self.jobs_index = self._get_or_create_index(
                settings.PINECONE_INDEX_NAME_JOBS,
                dimension=1536,  # OpenAI ada-002 embeddings
            )
            self.users_index = self._get_or_create_index(
                settings.PINECONE_INDEX_NAME_USERS, dimension=1536
            )

            # Initialize OpenAI service for embeddings
            self.openai_service = OpenAIService()

            # Embedding cache
            self._embedding_cache: Dict[str, tuple[List[float], datetime]] = {}
            self._cache_ttl = timedelta(hours=24)

        except Exception as e:
            raise ServiceError(f"Failed to initialize Pinecone: {str(e)}")

    def _get_or_create_index(self, index_name: str, dimension: int = 1536):
        """Get existing index or create new one"""
        try:
            if index_name not in pinecone.list_indexes():
                pinecone.create_index(
                    name=index_name,
                    dimension=dimension,
                    metric="cosine",
                    pods=1,
                    pod_type="p1.x1",
                )
            return pinecone.Index(index_name)
        except Exception as e:
            raise ServiceError(f"Failed to get/create index {index_name}: {str(e)}")

    def generate_embedding(self, text: str, use_cache: bool = True) -> List[float]:
        """Generate embedding vector for text using OpenAI"""
        # Create cache key
        cache_key = hashlib.sha256(text.encode()).hexdigest()

        # Check cache
        if use_cache and cache_key in self._embedding_cache:
            vector, cached_at = self._embedding_cache[cache_key]
            if datetime.utcnow() - cached_at < self._cache_ttl:
                return vector

        # Generate new embedding
        try:
            vector = self.openai_service.create_embedding(text)

            # Cache the result
            self._embedding_cache[cache_key] = (vector, datetime.utcnow())

            # Clean old cache entries
            self._clean_cache()

            return vector
        except Exception as e:
            raise ServiceError(f"Failed to generate embedding: {str(e)}")

    def batch_generate_embeddings(
        self, texts: List[str], batch_size: int = 20
    ) -> List[List[float]]:
        """Generate embeddings for multiple texts in batches"""
        all_vectors = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            try:
                vectors = self.openai_service.create_embeddings_batch(batch)
                all_vectors.extend(vectors)
            except Exception as e:
                raise ServiceError(f"Failed to generate batch embeddings: {str(e)}")

        return all_vectors

    def index_user_skills(
        self, user_id: str, skills: List[SkillVector], resume_id: Optional[str] = None
    ):
        """Index user skills in Pinecone"""
        try:
            vectors_to_upsert = []

            for skill in skills:
                # Generate embedding if not provided
                if not skill.vector:
                    skill.vector = self.generate_embedding(
                        f"{skill.skill} {skill.category or ''} {skill.proficiency or ''}"
                    )

                # Create unique ID
                vector_id = f"user_{user_id}_skill_{skill.skill.replace(' ', '_')}"

                # Prepare metadata
                metadata = {
                    "user_id": user_id,
                    "resume_id": resume_id or "",
                    "skill": skill.skill,
                    "category": skill.category or "",
                    "years": skill.years_experience or 0,
                    "proficiency": skill.proficiency or "",
                    "indexed_at": datetime.utcnow().isoformat(),
                }

                vectors_to_upsert.append((vector_id, skill.vector, metadata))

            # Upsert to Pinecone
            self.users_index.upsert(vectors=vectors_to_upsert)

        except Exception as e:
            raise ServiceError(f"Failed to index user skills: {str(e)}")

    def index_job(
        self,
        job_id: str,
        job_title: str,
        job_description: str,
        required_skills: List[str],
        metadata: Dict[str, Any],
    ):
        """Index job posting in Pinecone"""
        try:
            # Generate embedding for full job description
            job_text = f"{job_title}\n{job_description}\nRequired skills: {', '.join(required_skills)}"
            job_vector = self.generate_embedding(job_text)

            # Prepare metadata
            job_metadata = {
                "job_id": job_id,
                "title": job_title,
                "company": metadata.get("company", ""),
                "location": metadata.get("location", ""),
                "location_type": metadata.get("location_type", ""),
                "salary_min": metadata.get("salary_min", 0),
                "salary_max": metadata.get("salary_max", 0),
                "required_skills": required_skills,
                "experience_level": metadata.get("experience_level", ""),
                "visa_sponsorship": metadata.get("visa_sponsorship", False),
                "posted_date": metadata.get(
                    "posted_date", datetime.utcnow().isoformat()
                ),
                "indexed_at": datetime.utcnow().isoformat(),
            }

            # Upsert to Pinecone
            self.jobs_index.upsert(vectors=[(job_id, job_vector, job_metadata)])

            # Also index individual skills
            skill_vectors = []
            for skill in required_skills:
                skill_vector = self.generate_embedding(skill)
                skill_id = f"job_{job_id}_skill_{skill.replace(' ', '_')}"
                skill_metadata = {
                    **job_metadata,
                    "skill": skill,
                    "is_skill_vector": True,
                }
                skill_vectors.append((skill_id, skill_vector, skill_metadata))

            if skill_vectors:
                self.jobs_index.upsert(vectors=skill_vectors)

        except Exception as e:
            raise ServiceError(f"Failed to index job: {str(e)}")

    def search_similar_jobs(
        self,
        user_skills: List[SkillVector],
        top_k: int = 10,
        filters: Optional[Dict[str, Any]] = None,
    ) -> VectorSearchResponse:
        """Search for jobs similar to user skills"""
        try:
            start_time = datetime.utcnow()

            # Combine user skills into query vector
            skill_texts = [
                f"{s.skill} {s.category or ''} {s.proficiency or ''}"
                for s in user_skills
            ]
            combined_text = " ".join(skill_texts)
            query_vector = self.generate_embedding(combined_text)

            # Build filter
            pinecone_filter = {}
            if filters:
                if filters.get("visa_sponsorship") is not None:
                    pinecone_filter["visa_sponsorship"] = {
                        "$eq": filters["visa_sponsorship"]
                    }
                if filters.get("min_salary"):
                    pinecone_filter["salary_min"] = {"$gte": filters["min_salary"]}
                if filters.get("experience_level"):
                    pinecone_filter["experience_level"] = {
                        "$in": filters["experience_level"]
                    }

            # Query Pinecone
            results = self.jobs_index.query(
                vector=query_vector,
                top_k=top_k,
                include_metadata=True,
                filter=pinecone_filter if pinecone_filter else None,
            )

            # Convert to response format
            matches = [
                VectorSearchResult(
                    id=match.id, score=match.score, metadata=match.metadata
                )
                for match in results.matches
                if not match.metadata.get(
                    "is_skill_vector", False
                )  # Exclude skill vectors
            ]

            query_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return VectorSearchResponse(matches=matches, query_time_ms=int(query_time))

        except Exception as e:
            raise ServiceError(f"Failed to search jobs: {str(e)}")

    def search_similar_users(
        self, job_skills: List[str], top_k: int = 10
    ) -> VectorSearchResponse:
        """Search for users with skills similar to job requirements"""
        try:
            start_time = datetime.utcnow()

            # Combine job skills into query vector
            combined_text = " ".join(job_skills)
            query_vector = self.generate_embedding(combined_text)

            # Query Pinecone
            results = self.users_index.query(
                vector=query_vector, top_k=top_k, include_metadata=True
            )

            # Convert to response format
            matches = [
                VectorSearchResult(
                    id=match.id, score=match.score, metadata=match.metadata
                )
                for match in results.matches
            ]

            query_time = (datetime.utcnow() - start_time).total_seconds() * 1000

            return VectorSearchResponse(matches=matches, query_time_ms=int(query_time))

        except Exception as e:
            raise ServiceError(f"Failed to search users: {str(e)}")

    def delete_user_vectors(self, user_id: str):
        """Delete all vectors for a user"""
        try:
            # Query to find all user vectors
            results = self.users_index.query(
                vector=[0.0] * 1536,  # Dummy vector
                top_k=10000,
                filter={"user_id": {"$eq": user_id}},
                include_metadata=False,
            )

            # Delete vectors
            if results.matches:
                vector_ids = [match.id for match in results.matches]
                self.users_index.delete(ids=vector_ids)

        except Exception as e:
            raise ServiceError(f"Failed to delete user vectors: {str(e)}")

    def delete_job_vectors(self, job_id: str):
        """Delete all vectors for a job"""
        try:
            # Delete main job vector
            self.jobs_index.delete(ids=[job_id])

            # Delete skill vectors
            results = self.jobs_index.query(
                vector=[0.0] * 1536,  # Dummy vector
                top_k=10000,
                filter={"job_id": {"$eq": job_id}, "is_skill_vector": {"$eq": True}},
                include_metadata=False,
            )

            if results.matches:
                vector_ids = [match.id for match in results.matches]
                self.jobs_index.delete(ids=vector_ids)

        except Exception as e:
            raise ServiceError(f"Failed to delete job vectors: {str(e)}")

    def calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between two texts"""
        try:
            vector1 = self.generate_embedding(text1)
            vector2 = self.generate_embedding(text2)

            # Calculate cosine similarity
            import numpy as np

            similarity = np.dot(vector1, vector2) / (
                np.linalg.norm(vector1) * np.linalg.norm(vector2)
            )

            return float(similarity)

        except Exception as e:
            raise ServiceError(f"Failed to calculate similarity: {str(e)}")

    def _clean_cache(self):
        """Remove expired cache entries"""
        now = datetime.utcnow()
        expired_keys = [
            key
            for key, (_, cached_at) in self._embedding_cache.items()
            if now - cached_at > self._cache_ttl
        ]
        for key in expired_keys:
            del self._embedding_cache[key]

    def get_stats(self) -> Dict[str, Any]:
        """Get Pinecone index statistics"""
        try:
            jobs_stats = self.jobs_index.describe_index_stats()
            users_stats = self.users_index.describe_index_stats()

            return {
                "jobs_index": {
                    "total_vectors": jobs_stats.total_vector_count,
                    "dimension": jobs_stats.dimension,
                },
                "users_index": {
                    "total_vectors": users_stats.total_vector_count,
                    "dimension": users_stats.dimension,
                },
                "cache_size": len(self._embedding_cache),
            }
        except Exception as e:
            raise ServiceError(f"Failed to get stats: {str(e)}")
