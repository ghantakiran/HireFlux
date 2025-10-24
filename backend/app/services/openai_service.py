"""OpenAI service wrapper with rate limiting and cost tracking"""
import json
import time
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import tiktoken
from openai import OpenAI

from app.core.config import settings
from app.core.exceptions import ServiceError


class OpenAIService:
    """Service for interacting with OpenAI API"""

    # Cost per 1K tokens (as of 2024)
    PRICING = {
        "gpt-4": {"prompt": 0.03, "completion": 0.06},
        "gpt-4-turbo-preview": {"prompt": 0.01, "completion": 0.03},
        "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    }

    def __init__(self):
        """Initialize OpenAI service"""
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE

        if self.api_key:
            self.client = OpenAI(api_key=self.api_key)
        else:
            self.client = None

        # Initialize tokenizer
        try:
            self.encoding = tiktoken.encoding_for_model(self.model)
        except KeyError:
            self.encoding = tiktoken.get_encoding("cl100k_base")

        # Simple in-memory cache
        self._cache = {}
        self._usage_logs = []

        # Rate limiting
        self._request_times = []
        self._max_requests_per_minute = 50

    def generate_completion(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Generate chat completion

        Args:
            messages: List of message dicts with role and content
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            max_retries: Maximum retry attempts

        Returns:
            Dict with content and usage information

        Raises:
            ServiceError: If generation fails
        """
        if not self.client:
            raise ServiceError("OpenAI API key not configured")

        max_tokens = max_tokens or self.max_tokens
        temperature = temperature or self.temperature

        retry_count = 0
        last_error = None

        while retry_count <= max_retries:
            try:
                # Check rate limit
                if not self.check_rate_limit():
                    time.sleep(1)
                    continue

                # Make API call
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature
                )

                # Track request time for rate limiting
                self._request_times.append(datetime.utcnow())

                # Extract response
                content = response.choices[0].message.content
                usage = {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }

                return {
                    "content": content,
                    "usage": usage,
                    "model": self.model
                }

            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Check if it's a rate limit error
                if "rate limit" in error_str or "429" in error_str:
                    wait_time = 2 ** retry_count  # Exponential backoff
                    time.sleep(wait_time)
                    retry_count += 1
                    continue

                # Check if it's a timeout
                if "timeout" in error_str:
                    retry_count += 1
                    continue

                # For other errors, raise immediately
                raise ServiceError(f"OpenAI API error: {str(e)}")

        # Max retries exceeded
        raise ServiceError(f"OpenAI API failed after {max_retries} retries: {str(last_error)}")

    def count_tokens(self, text: str) -> int:
        """
        Count tokens in text

        Args:
            text: Text to count tokens for

        Returns:
            Number of tokens
        """
        if not text:
            return 0

        try:
            tokens = self.encoding.encode(text)
            return len(tokens)
        except Exception:
            # Fallback: rough estimate
            return len(text.split()) * 1.3

    def calculate_cost(
        self,
        prompt_tokens: int,
        completion_tokens: int,
        model: Optional[str] = None
    ) -> float:
        """
        Calculate cost of API call

        Args:
            prompt_tokens: Number of prompt tokens
            completion_tokens: Number of completion tokens
            model: Model name (uses default if not provided)

        Returns:
            Cost in USD
        """
        model = model or self.model

        # Get pricing for model
        pricing = self.PRICING.get(model, self.PRICING["gpt-4-turbo-preview"])

        # Calculate cost
        prompt_cost = (prompt_tokens / 1000) * pricing["prompt"]
        completion_cost = (completion_tokens / 1000) * pricing["completion"]

        return round(prompt_cost + completion_cost, 6)

    def check_rate_limit(self) -> bool:
        """
        Check if we're within rate limits

        Returns:
            True if under limit, False otherwise
        """
        # Remove requests older than 1 minute
        cutoff = datetime.utcnow() - timedelta(minutes=1)
        self._request_times = [t for t in self._request_times if t > cutoff]

        # Check if under limit
        return len(self._request_times) < self._max_requests_per_minute

    def build_resume_optimization_prompt(
        self,
        resume_data: Dict[str, Any],
        target_title: Optional[str] = None,
        tone: str = "formal",
        keywords: Optional[List[str]] = None,
        company: Optional[str] = None,
        strict_factual: bool = True
    ) -> str:
        """
        Build prompt for resume optimization

        Args:
            resume_data: Parsed resume data
            target_title: Target job title
            tone: Desired tone (formal, conversational, concise)
            keywords: Keywords to emphasize
            company: Target company
            strict_factual: Only use provided information

        Returns:
            Formatted prompt string
        """
        # Extract key information
        name = resume_data.get("contact_info", {}).get("full_name", "")
        skills = resume_data.get("skills", [])
        experience = resume_data.get("work_experience", [])

        # Build base prompt
        prompt_parts = [
            f"You are an expert resume writer. Optimize the following resume for ATS systems and hiring managers.",
            f"\nCandidate: {name}" if name else "",
            f"\nTarget Role: {target_title}" if target_title else "",
            f"\nTarget Company: {company}" if company else "",
            f"\nTone: {tone.upper()}",
        ]

        if keywords:
            prompt_parts.append(f"\nEmphasize these keywords: {', '.join(keywords)}")

        if strict_factual:
            prompt_parts.append(
                "\n\nIMPORTANT: Only use information provided. Do not fabricate experiences, "
                "achievements, or skills. If information is missing, indicate it clearly."
            )

        # Add resume data
        prompt_parts.append(f"\n\nCurrent Skills: {', '.join(skills)}")

        if experience:
            prompt_parts.append("\n\nWork Experience:")
            for exp in experience[:3]:  # Limit to avoid token overflow
                prompt_parts.append(f"- {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')}")

        prompt_parts.append(
            "\n\nProvide an optimized resume in JSON format with sections: "
            "summary, work_experience, education, skills, certifications."
        )

        return " ".join([p for p in prompt_parts if p])

    def parse_json_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse JSON from response text

        Args:
            response_text: Response text that may contain JSON

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If JSON cannot be parsed
        """
        # Try to find JSON in the response
        text = response_text.strip()

        # Remove markdown code blocks if present
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        # Try to parse
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse JSON response: {str(e)}")

    def cache_response(self, cache_key: str, response: Dict[str, Any]) -> None:
        """
        Cache a response

        Args:
            cache_key: Unique key for the cached item
            response: Response data to cache
        """
        self._cache[cache_key] = {
            "response": response,
            "timestamp": datetime.utcnow()
        }

        # Simple cache cleanup: remove items older than 1 hour
        cutoff = datetime.utcnow() - timedelta(hours=1)
        self._cache = {
            k: v for k, v in self._cache.items()
            if v["timestamp"] > cutoff
        }

    def get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response

        Args:
            cache_key: Cache key

        Returns:
            Cached response or None if not found/expired
        """
        cached = self._cache.get(cache_key)
        if not cached:
            return None

        # Check if expired (1 hour)
        if datetime.utcnow() - cached["timestamp"] > timedelta(hours=1):
            del self._cache[cache_key]
            return None

        return cached["response"]

    def log_usage(
        self,
        user_id: str,
        operation: str,
        model: str,
        prompt_tokens: int,
        completion_tokens: int,
        total_tokens: int,
        cost: float
    ) -> str:
        """
        Log API usage for cost tracking

        Args:
            user_id: User ID
            operation: Operation type
            model: Model used
            prompt_tokens: Prompt tokens
            completion_tokens: Completion tokens
            total_tokens: Total tokens
            cost: Estimated cost

        Returns:
            Log ID
        """
        log_entry = {
            "id": hashlib.md5(f"{user_id}{operation}{datetime.utcnow()}".encode()).hexdigest(),
            "user_id": user_id,
            "operation": operation,
            "model": model,
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
            "cost": cost,
            "timestamp": datetime.utcnow()
        }

        self._usage_logs.append(log_entry)

        # Keep only last 1000 logs in memory
        if len(self._usage_logs) > 1000:
            self._usage_logs = self._usage_logs[-1000:]

        return log_entry["id"]

    def get_usage_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get usage statistics

        Args:
            user_id: Filter by user ID (optional)

        Returns:
            Usage statistics
        """
        logs = self._usage_logs

        if user_id:
            logs = [log for log in logs if log["user_id"] == user_id]

        if not logs:
            return {
                "total_requests": 0,
                "total_tokens": 0,
                "total_cost": 0.0
            }

        return {
            "total_requests": len(logs),
            "total_tokens": sum(log["total_tokens"] for log in logs),
            "total_cost": sum(log["cost"] for log in logs)
        }
