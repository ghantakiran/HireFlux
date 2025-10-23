"""Unit tests for OpenAI service wrapper"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.services.openai_service import OpenAIService
from app.core.exceptions import ServiceError


@pytest.fixture
def openai_service():
    """Create OpenAI service instance"""
    return OpenAIService()


@pytest.fixture
def mock_openai_client():
    """Create mock OpenAI client"""
    return Mock()


class TestOpenAIServiceInitialization:
    """Test OpenAI service initialization"""

    def test_service_initializes_successfully(self):
        """Test service initialization"""
        service = OpenAIService()
        assert service is not None
        assert service.model == "gpt-4-turbo-preview"

    def test_service_uses_configured_model(self):
        """Test service uses model from config"""
        with patch('app.core.config.settings.OPENAI_MODEL', 'gpt-4'):
            service = OpenAIService()
            assert service.model == "gpt-4"


class TestChatCompletion:
    """Test chat completion functionality"""

    def test_generate_completion_success(self, openai_service):
        """Test successful completion generation"""
        with patch.object(openai_service, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Generated text"))]
            mock_response.usage = Mock(
                prompt_tokens=100,
                completion_tokens=200,
                total_tokens=300
            )
            mock_client.chat.completions.create.return_value = mock_response

            result = openai_service.generate_completion(
                messages=[{"role": "user", "content": "Test prompt"}]
            )

            assert result["content"] == "Generated text"
            assert result["usage"]["total_tokens"] == 300
            mock_client.chat.completions.create.assert_called_once()

    def test_generate_completion_with_system_message(self, openai_service):
        """Test completion with system message"""
        with patch.object(openai_service, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Response"))]
            mock_response.usage = Mock(total_tokens=100, prompt_tokens=50, completion_tokens=50)
            mock_client.chat.completions.create.return_value = mock_response

            openai_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You are helpful"},
                    {"role": "user", "content": "Hello"}
                ]
            )

            call_args = mock_client.chat.completions.create.call_args
            assert len(call_args.kwargs['messages']) == 2

    def test_generate_completion_handles_error(self, openai_service):
        """Test error handling in completion"""
        with patch.object(openai_service, 'client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("API Error")

            with pytest.raises(ServiceError) as exc_info:
                openai_service.generate_completion(
                    messages=[{"role": "user", "content": "Test"}]
                )

            assert "API Error" in str(exc_info.value)


class TestTokenCounting:
    """Test token counting functionality"""

    def test_count_tokens_simple_text(self, openai_service):
        """Test counting tokens in simple text"""
        text = "Hello, world!"
        count = openai_service.count_tokens(text)

        assert isinstance(count, int)
        assert count > 0

    def test_count_tokens_empty_string(self, openai_service):
        """Test counting tokens in empty string"""
        count = openai_service.count_tokens("")
        assert count == 0

    def test_count_tokens_long_text(self, openai_service):
        """Test counting tokens in long text"""
        text = " ".join(["word"] * 1000)
        count = openai_service.count_tokens(text)

        assert count > 100


class TestCostCalculation:
    """Test cost calculation"""

    def test_calculate_cost_gpt4(self, openai_service):
        """Test cost calculation for GPT-4"""
        cost = openai_service.calculate_cost(
            prompt_tokens=1000,
            completion_tokens=500,
            model="gpt-4-turbo-preview"
        )

        assert cost > 0
        assert isinstance(cost, float)

    def test_calculate_cost_different_models(self, openai_service):
        """Test cost varies by model"""
        cost_gpt4 = openai_service.calculate_cost(1000, 500, "gpt-4")
        cost_gpt35 = openai_service.calculate_cost(1000, 500, "gpt-3.5-turbo")

        assert cost_gpt4 > cost_gpt35


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_check_rate_limit_under_limit(self, openai_service):
        """Test rate limit check when under limit"""
        result = openai_service.check_rate_limit()
        assert result is True

    @patch('time.sleep')
    def test_handles_rate_limit_error(self, mock_sleep, openai_service):
        """Test handling rate limit error"""
        with patch.object(openai_service, 'client') as mock_client:
            # First call fails with rate limit, second succeeds
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Success"))]
            mock_response.usage = Mock(total_tokens=100, prompt_tokens=50, completion_tokens=50)

            mock_client.chat.completions.create.side_effect = [
                Exception("Rate limit exceeded"),
                mock_response
            ]

            with pytest.raises(ServiceError):
                openai_service.generate_completion(
                    messages=[{"role": "user", "content": "Test"}],
                    max_retries=0
                )


class TestPromptBuilding:
    """Test prompt building utilities"""

    def test_build_resume_optimization_prompt(self, openai_service):
        """Test building resume optimization prompt"""
        resume_data = {
            "contact_info": {"full_name": "John Doe"},
            "work_experience": [],
            "skills": ["Python", "JavaScript"]
        }

        prompt = openai_service.build_resume_optimization_prompt(
            resume_data=resume_data,
            target_title="Software Engineer",
            tone="formal"
        )

        assert "John Doe" in prompt
        assert "Software Engineer" in prompt
        assert "Python" in prompt
        assert isinstance(prompt, str)
        assert len(prompt) > 100

    def test_build_prompt_with_keywords(self, openai_service):
        """Test building prompt with keywords"""
        resume_data = {"skills": ["Python"]}
        keywords = ["React", "Node.js", "AWS"]

        prompt = openai_service.build_resume_optimization_prompt(
            resume_data=resume_data,
            target_title="Full Stack Developer",
            keywords=keywords
        )

        assert "React" in prompt
        assert "Node.js" in prompt
        assert "AWS" in prompt


class TestResponseParsing:
    """Test parsing OpenAI responses"""

    def test_parse_resume_generation_response(self, openai_service):
        """Test parsing resume generation response"""
        response_text = """
        {
            "summary": "Experienced software engineer",
            "work_experience": [],
            "skills": ["Python", "JavaScript"]
        }
        """

        parsed = openai_service.parse_json_response(response_text)

        assert "summary" in parsed
        assert "skills" in parsed
        assert isinstance(parsed["skills"], list)

    def test_parse_malformed_json(self, openai_service):
        """Test handling malformed JSON"""
        response_text = "Not valid JSON {"

        with pytest.raises(ValueError):
            openai_service.parse_json_response(response_text)


class TestStreaming:
    """Test streaming functionality"""

    @pytest.mark.skip(reason="Streaming implementation pending")
    def test_stream_completion(self, openai_service):
        """Test streaming completion"""
        # Test will be implemented when streaming is added
        pass


class TestCaching:
    """Test response caching"""

    def test_cache_stores_response(self, openai_service):
        """Test that responses can be cached"""
        cache_key = "test_prompt_hash"
        response = {"content": "Cached response"}

        openai_service.cache_response(cache_key, response)
        cached = openai_service.get_cached_response(cache_key)

        assert cached == response

    def test_cache_miss_returns_none(self, openai_service):
        """Test cache miss returns None"""
        cached = openai_service.get_cached_response("nonexistent_key")
        assert cached is None


class TestUsageLogging:
    """Test usage logging for cost tracking"""

    def test_log_usage_creates_record(self, openai_service):
        """Test usage logging"""
        usage_data = {
            "model": "gpt-4",
            "prompt_tokens": 100,
            "completion_tokens": 50,
            "total_tokens": 150,
            "cost": 0.003
        }

        log_id = openai_service.log_usage(
            user_id="test-user",
            operation="resume_generation",
            **usage_data
        )

        assert log_id is not None
        assert isinstance(log_id, str)


class TestErrorRecovery:
    """Test error recovery mechanisms"""

    def test_retry_on_timeout(self, openai_service):
        """Test retry logic on timeout"""
        with patch.object(openai_service, 'client') as mock_client:
            mock_response = Mock()
            mock_response.choices = [Mock(message=Mock(content="Success"))]
            mock_response.usage = Mock(total_tokens=100, prompt_tokens=50, completion_tokens=50)

            # Fail twice, succeed on third try
            mock_client.chat.completions.create.side_effect = [
                Exception("Timeout"),
                Exception("Timeout"),
                mock_response
            ]

            result = openai_service.generate_completion(
                messages=[{"role": "user", "content": "Test"}],
                max_retries=3
            )

            assert result["content"] == "Success"
            assert mock_client.chat.completions.create.call_count == 3

    def test_gives_up_after_max_retries(self, openai_service):
        """Test giving up after max retries"""
        with patch.object(openai_service, 'client') as mock_client:
            mock_client.chat.completions.create.side_effect = Exception("Persistent error")

            with pytest.raises(ServiceError):
                openai_service.generate_completion(
                    messages=[{"role": "user", "content": "Test"}],
                    max_retries=2
                )

            assert mock_client.chat.completions.create.call_count == 3  # Initial + 2 retries
