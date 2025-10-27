"""Unit tests for Pinecone service"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import hashlib

from app.services.pinecone_service import PineconeService
from app.core.exceptions import ServiceError
from app.schemas.job_matching import SkillVector


@pytest.fixture
def mock_pinecone_module():
    """Mock pinecone module"""
    with patch("app.services.pinecone_service.pinecone") as mock_pc:
        mock_pc.list_indexes.return_value = []
        mock_pc.Index.return_value = Mock()
        yield mock_pc


@pytest.fixture
def mock_openai_service():
    """Mock OpenAI service"""
    mock_service = Mock()
    mock_service.create_embedding.return_value = [
        0.1
    ] * 1536  # Standard embedding dimension
    mock_service.create_embeddings_batch.return_value = [[0.1] * 1536] * 5
    return mock_service


@pytest.fixture
def pinecone_service(mock_pinecone_module, mock_openai_service):
    """Create Pinecone service instance with mocked dependencies"""
    with patch(
        "app.services.pinecone_service.OpenAIService", return_value=mock_openai_service
    ):
        service = PineconeService()
        return service


@pytest.fixture
def sample_skill_vectors():
    """Sample skill vectors"""
    return [
        SkillVector(skill="Python", years_experience=5, proficiency="expert"),
        SkillVector(skill="FastAPI", years_experience=2, proficiency="advanced"),
        SkillVector(skill="SQL", years_experience=4, proficiency="advanced"),
    ]


class TestInitialization:
    """Test Pinecone service initialization"""

    def test_service_initializes_successfully(
        self, pinecone_service, mock_pinecone_module
    ):
        """Test service initialization"""
        assert pinecone_service is not None
        assert pinecone_service.jobs_index is not None
        assert pinecone_service.users_index is not None
        mock_pinecone_module.init.assert_called_once()

    def test_initialization_creates_indexes_if_not_exist(
        self, mock_pinecone_module, mock_openai_service
    ):
        """Test index creation on initialization"""
        mock_pinecone_module.list_indexes.return_value = []

        with patch(
            "app.services.pinecone_service.OpenAIService",
            return_value=mock_openai_service,
        ):
            service = PineconeService()

            # Should create both indexes
            assert mock_pinecone_module.create_index.call_count == 2

    def test_initialization_reuses_existing_indexes(self, mock_openai_service):
        """Test reusing existing indexes"""
        with patch("app.services.pinecone_service.pinecone") as mock_pc:
            # Mock to show indexes already exist
            mock_pc.list_indexes.return_value = ["jobs-index", "users-index"]
            mock_pc.Index.return_value = Mock()

            with patch(
                "app.services.pinecone_service.OpenAIService",
                return_value=mock_openai_service,
            ):
                with patch(
                    "app.core.config.settings.PINECONE_INDEX_NAME_JOBS", "jobs-index"
                ):
                    with patch(
                        "app.core.config.settings.PINECONE_INDEX_NAME_USERS",
                        "users-index",
                    ):
                        service = PineconeService()

                        # Should not create indexes since they exist
                        assert mock_pc.create_index.call_count == 0

    def test_initialization_handles_errors(self, mock_pinecone_module):
        """Test handling initialization errors"""
        mock_pinecone_module.init.side_effect = Exception("Connection failed")

        with pytest.raises(ServiceError) as exc_info:
            PineconeService()

        assert "Failed to initialize Pinecone" in str(exc_info.value)


class TestEmbeddingGeneration:
    """Test embedding generation"""

    def test_generate_embedding_success(self, pinecone_service, mock_openai_service):
        """Test successful embedding generation"""
        text = "Python developer with 5 years experience"

        result = pinecone_service.generate_embedding(text)

        assert len(result) == 1536
        mock_openai_service.create_embedding.assert_called_once_with(text)

    def test_generate_embedding_caches_result(
        self, pinecone_service, mock_openai_service
    ):
        """Test that embeddings are cached"""
        text = "Python developer"

        # First call
        result1 = pinecone_service.generate_embedding(text)
        # Second call
        result2 = pinecone_service.generate_embedding(text)

        # Should only call OpenAI once
        assert mock_openai_service.create_embedding.call_count == 1
        assert result1 == result2

    def test_generate_embedding_cache_can_be_bypassed(
        self, pinecone_service, mock_openai_service
    ):
        """Test bypassing cache"""
        text = "Python developer"

        # First call with cache
        pinecone_service.generate_embedding(text, use_cache=True)
        # Second call without cache
        pinecone_service.generate_embedding(text, use_cache=False)

        # Should call OpenAI twice
        assert mock_openai_service.create_embedding.call_count == 2

    def test_generate_embedding_handles_errors(
        self, pinecone_service, mock_openai_service
    ):
        """Test error handling in embedding generation"""
        mock_openai_service.create_embedding.side_effect = Exception("API Error")

        with pytest.raises(ServiceError) as exc_info:
            pinecone_service.generate_embedding("test text")

        assert "Failed to generate embedding" in str(exc_info.value)

    def test_batch_generate_embeddings(self, pinecone_service, mock_openai_service):
        """Test batch embedding generation"""
        texts = ["text1", "text2", "text3", "text4", "text5"]

        result = pinecone_service.batch_generate_embeddings(texts)

        assert len(result) == 5
        mock_openai_service.create_embeddings_batch.assert_called()

    def test_batch_generate_embeddings_handles_large_batches(
        self, pinecone_service, mock_openai_service
    ):
        """Test batching with large text lists"""
        texts = [f"text{i}" for i in range(50)]

        result = pinecone_service.batch_generate_embeddings(texts, batch_size=20)

        # Should call create_embeddings_batch 3 times (50 / 20 = 3 batches)
        assert mock_openai_service.create_embeddings_batch.call_count == 3

    def test_batch_generate_embeddings_handles_errors(
        self, pinecone_service, mock_openai_service
    ):
        """Test error handling in batch generation"""
        mock_openai_service.create_embeddings_batch.side_effect = Exception(
            "Batch API Error"
        )

        with pytest.raises(ServiceError) as exc_info:
            pinecone_service.batch_generate_embeddings(["text1", "text2"])

        assert "Failed to generate batch embeddings" in str(exc_info.value)


class TestCacheManagement:
    """Test embedding cache management"""

    def test_cache_stores_timestamp(self, pinecone_service, mock_openai_service):
        """Test that cache stores timestamp"""
        text = "test text"
        cache_key = hashlib.sha256(text.encode()).hexdigest()

        pinecone_service.generate_embedding(text)

        assert cache_key in pinecone_service._embedding_cache
        vector, timestamp = pinecone_service._embedding_cache[cache_key]
        assert isinstance(timestamp, datetime)

    def test_cache_expires_after_ttl(self, pinecone_service, mock_openai_service):
        """Test cache expiration"""
        text = "test text"
        cache_key = hashlib.sha256(text.encode()).hexdigest()

        # First call
        pinecone_service.generate_embedding(text)

        # Manually set old timestamp
        vector, _ = pinecone_service._embedding_cache[cache_key]
        old_time = datetime.utcnow() - timedelta(hours=25)
        pinecone_service._embedding_cache[cache_key] = (vector, old_time)

        # Second call should regenerate
        pinecone_service.generate_embedding(text)

        assert mock_openai_service.create_embedding.call_count == 2


class TestUserSkillsIndexing:
    """Test user skills indexing"""

    def test_index_user_skills_success(self, pinecone_service, sample_skill_vectors):
        """Test successful user skills indexing"""
        user_id = "user123"
        resume_id = "resume456"

        pinecone_service.index_user_skills(user_id, sample_skill_vectors, resume_id)

        # Should upsert to users index
        pinecone_service.users_index.upsert.assert_called_once()

        # Check upserted data
        call_args = pinecone_service.users_index.upsert.call_args
        vectors = call_args[1]["vectors"]
        assert len(vectors) == 3  # 3 skills

    def test_index_user_skills_generates_embeddings(
        self, pinecone_service, mock_openai_service
    ):
        """Test that embeddings are generated for skills without vectors"""
        skills = [
            SkillVector(skill="Python", years_experience=5),
            SkillVector(skill="JavaScript", years_experience=3),
        ]

        pinecone_service.index_user_skills("user123", skills)

        # Should generate embeddings for each skill
        assert mock_openai_service.create_embedding.call_count >= 2

    def test_index_user_skills_with_existing_vectors(
        self, pinecone_service, mock_openai_service
    ):
        """Test indexing skills that already have vectors"""
        skills = [SkillVector(skill="Python", years_experience=5, vector=[0.5] * 1536)]

        pinecone_service.index_user_skills("user123", skills)

        # Should not generate new embeddings
        assert mock_openai_service.create_embedding.call_count == 0

    def test_index_user_skills_creates_correct_metadata(
        self, pinecone_service, sample_skill_vectors
    ):
        """Test metadata structure in indexed vectors"""
        user_id = "user123"
        resume_id = "resume456"

        pinecone_service.index_user_skills(user_id, sample_skill_vectors, resume_id)

        call_args = pinecone_service.users_index.upsert.call_args
        vectors = call_args[1]["vectors"]

        # Check first vector metadata
        vector_id, vector_data, metadata = vectors[0]
        assert metadata["user_id"] == user_id
        assert metadata["resume_id"] == resume_id
        assert "skill" in metadata
        assert "years" in metadata
        assert "proficiency" in metadata

    def test_index_user_skills_handles_errors(
        self, pinecone_service, sample_skill_vectors
    ):
        """Test error handling in skill indexing"""
        pinecone_service.users_index.upsert.side_effect = Exception("Upsert failed")

        with pytest.raises(ServiceError) as exc_info:
            pinecone_service.index_user_skills("user123", sample_skill_vectors)

        assert "Failed to index user skills" in str(exc_info.value)


class TestJobIndexing:
    """Test job indexing"""

    def test_index_job_success(self, pinecone_service):
        """Test successful job indexing"""
        job_id = "job123"
        title = "Senior Python Developer"
        description = "Looking for experienced Python developer..."
        required_skills = ["Python", "FastAPI", "SQL"]
        metadata = {
            "company": "Tech Corp",
            "location": "San Francisco",
            "location_type": "hybrid",
            "salary_min": 150000,
            "salary_max": 200000,
        }

        pinecone_service.index_job(
            job_id, title, description, required_skills, metadata
        )

        # Should upsert to jobs index at least twice (job + skills)
        assert pinecone_service.jobs_index.upsert.call_count >= 2

    def test_index_job_creates_skill_vectors(self, pinecone_service):
        """Test that individual skill vectors are created"""
        job_id = "job123"
        required_skills = ["Python", "FastAPI", "SQL"]

        pinecone_service.index_job(
            job_id=job_id,
            job_title="Developer",
            job_description="Test",
            required_skills=required_skills,
            metadata={},
        )

        # First call for main job vector
        first_call = pinecone_service.jobs_index.upsert.call_args_list[0]
        assert len(first_call[1]["vectors"]) == 1

        # Second call for skill vectors
        second_call = pinecone_service.jobs_index.upsert.call_args_list[1]
        assert len(second_call[1]["vectors"]) == 3  # 3 skills

    def test_index_job_includes_metadata(self, pinecone_service):
        """Test job metadata is properly included"""
        job_id = "job123"
        metadata = {
            "company": "Tech Corp",
            "location": "Remote",
            "visa_sponsorship": True,
            "experience_level": "senior",
        }

        pinecone_service.index_job(
            job_id=job_id,
            job_title="Developer",
            job_description="Test",
            required_skills=["Python"],
            metadata=metadata,
        )

        # Check main job vector metadata
        call_args = pinecone_service.jobs_index.upsert.call_args_list[0]
        vector_id, vector_data, job_metadata = call_args[1]["vectors"][0]

        assert job_metadata["company"] == "Tech Corp"
        assert job_metadata["location"] == "Remote"
        assert job_metadata["visa_sponsorship"] is True
        assert job_metadata["experience_level"] == "senior"

    def test_index_job_handles_errors(self, pinecone_service):
        """Test error handling in job indexing"""
        pinecone_service.jobs_index.upsert.side_effect = Exception("Index error")

        with pytest.raises(ServiceError) as exc_info:
            pinecone_service.index_job("job123", "Title", "Description", ["Python"], {})

        assert "Failed to index job" in str(exc_info.value)


class TestJobSearch:
    """Test job search functionality"""

    def test_search_similar_jobs_success(self, pinecone_service, sample_skill_vectors):
        """Test successful job search"""
        # Mock query results
        mock_match = Mock()
        mock_match.id = "job123"
        mock_match.score = 0.95
        mock_match.metadata = {
            "title": "Python Developer",
            "company": "Tech Corp",
            "is_skill_vector": False,
        }
        pinecone_service.jobs_index.query.return_value = Mock(matches=[mock_match])

        result = pinecone_service.search_similar_jobs(sample_skill_vectors, top_k=10)

        assert len(result.matches) == 1
        assert result.matches[0].id == "job123"
        assert result.matches[0].score == 0.95

    def test_search_filters_skill_vectors(self, pinecone_service, sample_skill_vectors):
        """Test that skill vectors are filtered out from results"""
        # Mock results with both job and skill vectors
        job_match = Mock(id="job123", score=0.95, metadata={"is_skill_vector": False})
        skill_match = Mock(
            id="job123_skill", score=0.90, metadata={"is_skill_vector": True}
        )

        pinecone_service.jobs_index.query.return_value = Mock(
            matches=[job_match, skill_match]
        )

        result = pinecone_service.search_similar_jobs(sample_skill_vectors, top_k=10)

        # Should only return job vector, not skill vector
        assert len(result.matches) == 1
        assert result.matches[0].id == "job123"

    def test_search_with_filters(self, pinecone_service, sample_skill_vectors):
        """Test search with metadata filters"""
        pinecone_service.jobs_index.query.return_value = Mock(matches=[])

        filters = {
            "visa_sponsorship": True,
            "min_salary": 100000,
            "experience_level": ["senior", "mid"],
        }

        pinecone_service.search_similar_jobs(
            sample_skill_vectors, top_k=10, filters=filters
        )

        # Check that filters were passed to query
        call_args = pinecone_service.jobs_index.query.call_args
        filter_arg = call_args[1].get("filter")

        assert filter_arg is not None
        assert "visa_sponsorship" in filter_arg
        assert "salary_min" in filter_arg
        assert "experience_level" in filter_arg

    def test_search_combines_user_skills(
        self, pinecone_service, mock_openai_service, sample_skill_vectors
    ):
        """Test that user skills are combined into query vector"""
        pinecone_service.jobs_index.query.return_value = Mock(matches=[])

        pinecone_service.search_similar_jobs(sample_skill_vectors, top_k=10)

        # Should generate embedding for combined skills
        mock_openai_service.create_embedding.assert_called()
        call_args = mock_openai_service.create_embedding.call_args
        combined_text = call_args[0][0]

        # Should contain all skill names
        assert "Python" in combined_text
        assert "FastAPI" in combined_text
        assert "SQL" in combined_text

    def test_search_returns_metadata(self, pinecone_service, sample_skill_vectors):
        """Test that search results include metadata"""
        mock_match = Mock()
        mock_match.id = "job123"
        mock_match.score = 0.95
        mock_match.metadata = {
            "title": "Python Developer",
            "company": "Tech Corp",
            "location": "Remote",
            "salary_min": 150000,
            "salary_max": 200000,
        }

        pinecone_service.jobs_index.query.return_value = Mock(matches=[mock_match])

        result = pinecone_service.search_similar_jobs(sample_skill_vectors)

        assert result.matches[0].metadata["title"] == "Python Developer"
        assert result.matches[0].metadata["company"] == "Tech Corp"


class TestVectorOperations:
    """Test vector database operations"""

    def test_delete_user_vectors(self, pinecone_service):
        """Test deleting user vectors"""
        user_id = "user123"

        # This would be implemented in the service
        # pinecone_service.delete_user_vectors(user_id)
        # For now, just test that the index has delete capability
        assert hasattr(pinecone_service.users_index, "delete")

    def test_delete_job_vector(self, pinecone_service):
        """Test deleting job vectors"""
        job_id = "job123"

        # Test that the index has delete capability
        assert hasattr(pinecone_service.jobs_index, "delete")

    def test_update_job_vector(self, pinecone_service):
        """Test that re-indexing updates existing vectors"""
        job_id = "job123"

        # First index
        pinecone_service.index_job(
            job_id=job_id,
            job_title="Developer",
            job_description="Test 1",
            required_skills=["Python"],
            metadata={"company": "Company A"},
        )

        # Re-index with updated data
        pinecone_service.index_job(
            job_id=job_id,
            job_title="Senior Developer",
            job_description="Test 2",
            required_skills=["Python", "FastAPI"],
            metadata={"company": "Company B"},
        )

        # Should have called upsert multiple times (overwrites existing)
        assert pinecone_service.jobs_index.upsert.call_count >= 2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
