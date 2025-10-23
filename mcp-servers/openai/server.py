"""
OpenAI MCP Server for HireFlux
Provides LLM operations with cost tracking and model fallback
"""
import os
import asyncio
from typing import Any, Dict, List, Optional
from datetime import datetime
import tiktoken
from openai import AsyncOpenAI
from mcp import Server, Tool
import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

class OpenAIMCPServer:
    def __init__(self):
        self.server = Server("openai")
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.redis_client = None
        self.cost_tracking_enabled = os.getenv("COST_TRACKING_ENABLED", "true").lower() == "true"

        # Pricing per 1K tokens (as of 2025-10)
        self.pricing = {
            "gpt-4-turbo": {"input": 0.01, "output": 0.03},
            "gpt-4": {"input": 0.03, "output": 0.06},
            "gpt-3.5-turbo": {"input": 0.0005, "output": 0.0015},
            "text-embedding-3-small": {"input": 0.00002, "output": 0}
        }

        self.register_tools()

    async def init_redis(self):
        """Initialize Redis connection for cost tracking"""
        if self.cost_tracking_enabled:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            self.redis_client = await redis.from_url(redis_url, decode_responses=True)

    def count_tokens(self, text: str, model: str = "gpt-4-turbo") -> int:
        """Count tokens in text using tiktoken"""
        try:
            encoding = tiktoken.encoding_for_model(model)
            return len(encoding.encode(text))
        except KeyError:
            # Fallback to cl100k_base for unknown models
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))

    def calculate_cost(self, input_tokens: int, output_tokens: int, model: str) -> float:
        """Calculate cost for token usage"""
        if model not in self.pricing:
            model = "gpt-4-turbo"  # Default

        input_cost = (input_tokens / 1000) * self.pricing[model]["input"]
        output_cost = (output_tokens / 1000) * self.pricing[model]["output"]
        return input_cost + output_cost

    async def track_usage(self, user_id: str, feature: str, cost: float, tokens: int, model: str):
        """Track usage in Redis"""
        if not self.redis_client:
            return

        timestamp = datetime.utcnow().isoformat()
        month_key = datetime.utcnow().strftime("%Y-%m")

        # Track by user
        await self.redis_client.hincrby(f"llm:cost:user:{user_id}:{month_key}", "total_cost_cents", int(cost * 100))
        await self.redis_client.hincrby(f"llm:cost:user:{user_id}:{month_key}", "total_tokens", tokens)

        # Track by feature
        await self.redis_client.hincrby(f"llm:cost:feature:{feature}:{month_key}", "total_cost_cents", int(cost * 100))
        await self.redis_client.hincrby(f"llm:cost:feature:{feature}:{month_key}", "total_tokens", tokens)

        # Track by model
        await self.redis_client.hincrby(f"llm:cost:model:{model}:{month_key}", "total_cost_cents", int(cost * 100))
        await self.redis_client.hincrby(f"llm:cost:model:{model}:{month_key}", "total_tokens", tokens)

        # Record individual event
        event_key = f"llm:events:{user_id}"
        await self.redis_client.lpush(event_key, f"{timestamp}|{feature}|{model}|{tokens}|{cost:.4f}")
        await self.redis_client.ltrim(event_key, 0, 999)  # Keep last 1000 events

    def register_tools(self):
        """Register OpenAI tools"""

        @self.server.tool()
        async def chat_completion(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Generate chat completion with cost tracking and fallback

            Args:
                params:
                    model: str - Model name (gpt-4-turbo, gpt-3.5-turbo)
                    messages: List[Dict] - Chat messages
                    temperature: float - Sampling temperature (0-2)
                    max_tokens: int - Maximum tokens to generate
                    metadata: Dict - {user_id, feature, budget_limit, fallback_model}

            Returns:
                {
                    content: str,
                    model: str,
                    tokens: {input: int, output: int, total: int},
                    cost: float,
                    finish_reason: str
                }
            """
            model = params.get("model", "gpt-4-turbo")
            messages = params["messages"]
            temperature = params.get("temperature", 0.7)
            max_tokens = params.get("max_tokens", 1500)
            metadata = params.get("metadata", {})

            # Estimate input tokens
            input_text = "\n".join([msg.get("content", "") for msg in messages])
            estimated_input_tokens = self.count_tokens(input_text, model)

            # Check budget limit
            budget_limit = metadata.get("budget_limit")
            if budget_limit:
                estimated_cost = self.calculate_cost(estimated_input_tokens, max_tokens, model)
                if estimated_cost > budget_limit:
                    # Fallback to cheaper model
                    fallback_model = metadata.get("fallback_model", "gpt-3.5-turbo")
                    model = fallback_model

            # Make API call with retry
            try:
                response = await self._call_with_retry(
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens
                )

                content = response.choices[0].message.content
                finish_reason = response.choices[0].finish_reason
                usage = response.usage

                # Calculate actual cost
                cost = self.calculate_cost(usage.prompt_tokens, usage.completion_tokens, model)

                # Track usage
                if metadata.get("user_id"):
                    await self.track_usage(
                        user_id=metadata["user_id"],
                        feature=metadata.get("feature", "unknown"),
                        cost=cost,
                        tokens=usage.total_tokens,
                        model=model
                    )

                return {
                    "content": content,
                    "model": model,
                    "tokens": {
                        "input": usage.prompt_tokens,
                        "output": usage.completion_tokens,
                        "total": usage.total_tokens
                    },
                    "cost": cost,
                    "finish_reason": finish_reason
                }

            except Exception as e:
                return {
                    "error": str(e),
                    "model": model,
                    "estimated_cost": self.calculate_cost(estimated_input_tokens, max_tokens, model)
                }

        @self.server.tool()
        async def create_embedding(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Generate text embeddings

            Args:
                params:
                    text: str - Text to embed
                    model: str - Embedding model (text-embedding-3-small)
                    metadata: Dict - {user_id, feature}

            Returns:
                {
                    embedding: List[float],
                    model: str,
                    tokens: int,
                    cost: float
                }
            """
            text = params["text"]
            model = params.get("model", "text-embedding-3-small")
            metadata = params.get("metadata", {})

            try:
                response = await self.client.embeddings.create(
                    input=text,
                    model=model
                )

                embedding = response.data[0].embedding
                tokens = response.usage.total_tokens
                cost = self.calculate_cost(tokens, 0, model)

                # Track usage
                if metadata.get("user_id"):
                    await self.track_usage(
                        user_id=metadata["user_id"],
                        feature=metadata.get("feature", "embeddings"),
                        cost=cost,
                        tokens=tokens,
                        model=model
                    )

                return {
                    "embedding": embedding,
                    "model": model,
                    "tokens": tokens,
                    "cost": cost
                }

            except Exception as e:
                return {"error": str(e)}

        @self.server.tool()
        async def get_cost_breakdown(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Get cost breakdown for user or feature

            Args:
                params:
                    user_id: Optional[str] - User ID
                    feature: Optional[str] - Feature name
                    period: str - "day" | "month"
                    group_by: str - "feature" | "model"

            Returns:
                {
                    total_cost: float,
                    total_tokens: int,
                    breakdown: List[Dict]
                }
            """
            if not self.redis_client:
                return {"error": "Cost tracking not enabled"}

            user_id = params.get("user_id")
            feature = params.get("feature")
            period = params.get("period", "month")
            group_by = params.get("group_by", "feature")

            month_key = datetime.utcnow().strftime("%Y-%m")
            breakdown = []
            total_cost = 0
            total_tokens = 0

            if user_id:
                # Get user costs
                user_data = await self.redis_client.hgetall(f"llm:cost:user:{user_id}:{month_key}")
                if user_data:
                    total_cost = int(user_data.get("total_cost_cents", 0)) / 100
                    total_tokens = int(user_data.get("total_tokens", 0))

                # Get breakdown by feature or model
                if group_by == "feature":
                    # Scan all features for this user (simplified - in production use better indexing)
                    pass

            elif feature:
                # Get feature costs
                feature_data = await self.redis_client.hgetall(f"llm:cost:feature:{feature}:{month_key}")
                if feature_data:
                    total_cost = int(feature_data.get("total_cost_cents", 0)) / 100
                    total_tokens = int(feature_data.get("total_tokens", 0))

            return {
                "total_cost": total_cost,
                "total_tokens": total_tokens,
                "breakdown": breakdown,
                "period": period
            }

        @self.server.tool()
        async def estimate_tokens(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Estimate token count and cost before making request

            Args:
                params:
                    text: str - Text to estimate
                    model: str - Model name
                    max_output_tokens: int - Expected output tokens

            Returns:
                {
                    input_tokens: int,
                    estimated_output_tokens: int,
                    total_tokens: int,
                    estimated_cost: float
                }
            """
            text = params["text"]
            model = params.get("model", "gpt-4-turbo")
            max_output_tokens = params.get("max_output_tokens", 1500)

            input_tokens = self.count_tokens(text, model)
            total_tokens = input_tokens + max_output_tokens
            estimated_cost = self.calculate_cost(input_tokens, max_output_tokens, model)

            return {
                "input_tokens": input_tokens,
                "estimated_output_tokens": max_output_tokens,
                "total_tokens": total_tokens,
                "estimated_cost": estimated_cost,
                "model": model
            }

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, min=2, max=10))
    async def _call_with_retry(self, **kwargs):
        """Make OpenAI API call with retry logic"""
        return await self.client.chat.completions.create(**kwargs)

    async def run(self):
        """Run the MCP server"""
        await self.init_redis()
        await self.server.run()

if __name__ == "__main__":
    server = OpenAIMCPServer()
    asyncio.run(server.run())
