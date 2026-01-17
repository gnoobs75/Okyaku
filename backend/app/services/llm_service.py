"""
LLM Service - Core AI interface using OpenAI SDK with Ollama backend.

This service provides a unified interface for all AI operations in Okyaku CRM.
It uses the OpenAI SDK pointing to a local Ollama instance running Llama 3.1,
providing zero-cost, self-hosted AI capabilities.

Usage:
    from app.services.llm_service import llm_service

    # Simple chat
    response = await llm_service.chat([
        {"role": "user", "content": "Hello!"}
    ])

    # Chat with tools for agents
    response = await llm_service.chat_with_tools(messages, tools)

    # Streaming for real-time UI
    async for chunk in llm_service.stream_chat(messages):
        print(chunk)

    # Warmup models for faster first inference
    await llm_service.warmup()
"""

from typing import Optional, AsyncGenerator, Any
from enum import Enum
import json
import time
import httpx
import asyncio

from openai import AsyncOpenAI, APIError, APIConnectionError

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class InferenceMetrics:
    """Tracks inference performance metrics."""

    def __init__(self):
        self.total_requests = 0
        self.total_errors = 0
        self.total_tokens = 0
        self.inference_times: list[float] = []
        self.last_inference_time_ms: float = 0
        self._lock = asyncio.Lock()

    async def record_inference(
        self,
        duration_ms: float,
        tokens: int = 0,
        success: bool = True
    ):
        """Record an inference request."""
        async with self._lock:
            self.total_requests += 1
            self.last_inference_time_ms = duration_ms
            self.inference_times.append(duration_ms)
            self.total_tokens += tokens
            if not success:
                self.total_errors += 1
            # Keep only last 100 for rolling average
            if len(self.inference_times) > 100:
                self.inference_times = self.inference_times[-100:]

    @property
    def avg_inference_time_ms(self) -> float:
        """Get average inference time in milliseconds."""
        if not self.inference_times:
            return 0
        return sum(self.inference_times) / len(self.inference_times)

    @property
    def error_rate(self) -> float:
        """Get error rate as a percentage."""
        if self.total_requests == 0:
            return 0
        return (self.total_errors / self.total_requests) * 100

    def get_stats(self) -> dict:
        """Get all stats as a dictionary."""
        return {
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate_percent": round(self.error_rate, 2),
            "total_tokens": self.total_tokens,
            "avg_inference_time_ms": round(self.avg_inference_time_ms, 2),
            "last_inference_time_ms": round(self.last_inference_time_ms, 2),
        }


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    OLLAMA = "ollama"
    ANTHROPIC = "anthropic"


class LLMService:
    """
    Core LLM service using OpenAI SDK with Ollama backend.

    Features:
    - OpenAI-compatible API pointing to local Ollama
    - Support for chat completions, tool calling, and streaming
    - Automatic fallback handling
    - Token usage tracking
    - Health checks
    - Performance metrics and inference timing
    - Model warmup for faster first inference
    """

    def __init__(self):
        self._client: Optional[AsyncOpenAI] = None
        self._anthropic_client = None
        self._is_ollama_available: Optional[bool] = None
        self._is_warmed_up: bool = False
        self._warmup_time_ms: float = 0
        self.metrics = InferenceMetrics()

    @property
    def client(self) -> AsyncOpenAI:
        """Lazily initialize the OpenAI client pointing to Ollama."""
        if self._client is None:
            self._client = AsyncOpenAI(
                base_url=settings.OLLAMA_BASE_URL,
                api_key="ollama",  # Ollama doesn't require a real key
                timeout=120.0,  # Longer timeout for local inference
            )
        return self._client

    @property
    def model(self) -> str:
        """Get the configured model name."""
        return settings.OLLAMA_MODEL

    @property
    def embedding_model(self) -> str:
        """Get the configured embedding model name."""
        return settings.OLLAMA_EMBEDDING_MODEL

    async def check_health(self) -> dict:
        """
        Check if Ollama is running and responsive.

        Returns:
            Dict with health status and available models
        """
        try:
            # Try to list models via Ollama API
            async with httpx.AsyncClient() as client:
                # Ollama native endpoint (not OpenAI-compatible)
                response = await client.get(
                    f"{settings.OLLAMA_BASE_URL.replace('/v1', '')}/api/tags",
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    self._is_ollama_available = True
                    return {
                        "status": "healthy",
                        "provider": "ollama",
                        "base_url": settings.OLLAMA_BASE_URL,
                        "available_models": models,
                        "configured_model": self.model,
                        "model_available": any(self.model in m for m in models),
                    }
        except Exception as e:
            logger.warning(f"Ollama health check failed: {e}")
            self._is_ollama_available = False

        return {
            "status": "unavailable",
            "provider": "ollama",
            "base_url": settings.OLLAMA_BASE_URL,
            "error": "Could not connect to Ollama. Ensure it's running with 'ollama serve'",
            "configured_model": self.model,
        }

    async def chat(
        self,
        messages: list[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """
        Send a chat completion request.

        Args:
            messages: List of message dicts with 'role' and 'content'
            temperature: Sampling temperature (0-1)
            max_tokens: Maximum tokens in response
            system_prompt: Optional system prompt to prepend

        Returns:
            Dict with response content and metadata including timing
        """
        start_time = time.perf_counter()
        try:
            # Prepend system prompt if provided
            all_messages = []
            if system_prompt:
                all_messages.append({"role": "system", "content": system_prompt})
            all_messages.extend(messages)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                temperature=temperature or settings.AI_TEMPERATURE,
                max_tokens=max_tokens or settings.AI_MAX_TOKENS,
            )

            content = response.choices[0].message.content
            duration_ms = (time.perf_counter() - start_time) * 1000
            total_tokens = response.usage.total_tokens if response.usage else 0

            # Record metrics
            await self.metrics.record_inference(
                duration_ms=duration_ms,
                tokens=total_tokens,
                success=True
            )

            logger.info(
                "LLM chat completed",
                model=self.model,
                duration_ms=round(duration_ms, 2),
                tokens=total_tokens,
            )

            return {
                "success": True,
                "content": content,
                "model": self.model,
                "provider": "ollama",
                "usage": {
                    "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
                    "completion_tokens": response.usage.completion_tokens if response.usage else 0,
                    "total_tokens": total_tokens,
                },
                "finish_reason": response.choices[0].finish_reason,
                "inference_time_ms": round(duration_ms, 2),
            }

        except APIConnectionError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            await self.metrics.record_inference(duration_ms, success=False)
            logger.error(
                "Ollama connection error",
                error=str(e),
                duration_ms=round(duration_ms, 2),
            )
            return {
                "success": False,
                "error": "Could not connect to Ollama. Ensure it's running with 'ollama serve'",
                "provider": "ollama",
                "inference_time_ms": round(duration_ms, 2),
            }
        except APIError as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            await self.metrics.record_inference(duration_ms, success=False)
            logger.error(
                "Ollama API error",
                error=str(e),
                duration_ms=round(duration_ms, 2),
            )
            return {
                "success": False,
                "error": str(e),
                "provider": "ollama",
                "inference_time_ms": round(duration_ms, 2),
            }
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            await self.metrics.record_inference(duration_ms, success=False)
            logger.error(
                "LLM chat error",
                error=str(e),
                duration_ms=round(duration_ms, 2),
            )
            return {
                "success": False,
                "error": str(e),
                "provider": "ollama",
                "inference_time_ms": round(duration_ms, 2),
            }

    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        temperature: Optional[float] = None,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """
        Chat with function/tool calling for AI agents.

        Args:
            messages: List of message dicts
            tools: List of tool definitions (OpenAI format)
            temperature: Sampling temperature
            system_prompt: Optional system prompt

        Returns:
            Dict with response, tool calls if any, and metadata
        """
        try:
            all_messages = []
            if system_prompt:
                all_messages.append({"role": "system", "content": system_prompt})
            all_messages.extend(messages)

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                tools=tools,
                tool_choice="auto",
                temperature=temperature or settings.AI_TEMPERATURE,
            )

            choice = response.choices[0]
            message = choice.message

            result = {
                "success": True,
                "content": message.content,
                "model": self.model,
                "provider": "ollama",
                "finish_reason": choice.finish_reason,
                "tool_calls": None,
            }

            # Extract tool calls if present
            if message.tool_calls:
                result["tool_calls"] = [
                    {
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in message.tool_calls
                ]

            return result

        except Exception as e:
            logger.error(f"LLM chat with tools error: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "ollama",
            }

    async def stream_chat(
        self,
        messages: list[dict],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat completion for real-time UI.

        Args:
            messages: List of message dicts
            temperature: Sampling temperature
            max_tokens: Maximum tokens
            system_prompt: Optional system prompt

        Yields:
            String chunks of the response
        """
        try:
            all_messages = []
            if system_prompt:
                all_messages.append({"role": "system", "content": system_prompt})
            all_messages.extend(messages)

            stream = await self.client.chat.completions.create(
                model=self.model,
                messages=all_messages,
                temperature=temperature or settings.AI_TEMPERATURE,
                max_tokens=max_tokens or settings.AI_MAX_TOKENS,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            yield f"\n[Error: {str(e)}]"

    async def generate_embedding(self, text: str) -> Optional[list[float]]:
        """
        Generate embedding vector for text.

        Args:
            text: Text to embed

        Returns:
            List of floats representing the embedding, or None on error
        """
        try:
            response = await self.client.embeddings.create(
                model=self.embedding_model,
                input=text,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Embedding generation error: {e}")
            return None

    async def generate_json(
        self,
        messages: list[dict],
        schema: dict,
        system_prompt: Optional[str] = None,
    ) -> dict:
        """
        Generate structured JSON output.

        Args:
            messages: List of message dicts
            schema: JSON schema for expected output
            system_prompt: Optional system prompt

        Returns:
            Dict with parsed JSON response or error
        """
        # Add JSON instruction to system prompt
        json_instruction = f"""You must respond with valid JSON that matches this schema:
{json.dumps(schema, indent=2)}

Respond ONLY with the JSON, no other text."""

        full_system = f"{system_prompt}\n\n{json_instruction}" if system_prompt else json_instruction

        result = await self.chat(
            messages=messages,
            system_prompt=full_system,
            temperature=0.3,  # Lower temperature for structured output
        )

        if not result["success"]:
            return result

        # Try to parse JSON from response
        try:
            content = result["content"].strip()
            # Handle markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1])

            parsed = json.loads(content)
            return {
                **result,
                "parsed": parsed,
            }
        except json.JSONDecodeError as e:
            return {
                **result,
                "success": False,
                "error": f"Failed to parse JSON response: {e}",
                "raw_content": result["content"],
            }

    async def warmup(self, include_embedding: bool = True) -> dict:
        """
        Warm up AI models by loading them into VRAM.

        This triggers a small inference to ensure models are loaded
        and ready for fast response times. Call this at application
        startup for better first-request performance.

        Args:
            include_embedding: Also warm up the embedding model

        Returns:
            Dict with warmup status and timing information
        """
        start_time = time.perf_counter()
        results = {
            "llm": {"status": "pending", "time_ms": 0},
            "embedding": {"status": "skipped", "time_ms": 0},
        }

        # Warm up LLM with a minimal request
        llm_start = time.perf_counter()
        try:
            response = await self.chat(
                messages=[{"role": "user", "content": "Hi"}],
                max_tokens=5,
            )
            llm_time = (time.perf_counter() - llm_start) * 1000
            results["llm"] = {
                "status": "success" if response.get("success") else "failed",
                "time_ms": round(llm_time, 2),
                "model": self.model,
                "error": response.get("error") if not response.get("success") else None,
            }
        except Exception as e:
            llm_time = (time.perf_counter() - llm_start) * 1000
            results["llm"] = {
                "status": "failed",
                "time_ms": round(llm_time, 2),
                "model": self.model,
                "error": str(e),
            }

        # Warm up embedding model
        if include_embedding:
            embed_start = time.perf_counter()
            try:
                embedding = await self.generate_embedding("warmup test")
                embed_time = (time.perf_counter() - embed_start) * 1000
                results["embedding"] = {
                    "status": "success" if embedding else "failed",
                    "time_ms": round(embed_time, 2),
                    "model": self.embedding_model,
                }
            except Exception as e:
                embed_time = (time.perf_counter() - embed_start) * 1000
                results["embedding"] = {
                    "status": "failed",
                    "time_ms": round(embed_time, 2),
                    "model": self.embedding_model,
                    "error": str(e),
                }

        total_time = (time.perf_counter() - start_time) * 1000
        success = all(
            r["status"] == "success" or r["status"] == "skipped"
            for r in results.values()
        )

        self._is_warmed_up = success
        self._warmup_time_ms = total_time

        logger.info(
            "Model warmup completed",
            success=success,
            llm_status=results["llm"]["status"],
            llm_time_ms=results["llm"]["time_ms"],
            embed_status=results["embedding"]["status"],
            embed_time_ms=results["embedding"]["time_ms"],
            total_time_ms=round(total_time, 2),
        )

        return {
            "success": success,
            "total_time_ms": round(total_time, 2),
            "models": results,
        }

    def get_stats(self) -> dict:
        """
        Get comprehensive service statistics.

        Returns:
            Dict with metrics, warmup status, and configuration
        """
        return {
            "is_warmed_up": self._is_warmed_up,
            "warmup_time_ms": self._warmup_time_ms,
            "configured_model": self.model,
            "embedding_model": self.embedding_model,
            "base_url": settings.OLLAMA_BASE_URL,
            "metrics": self.metrics.get_stats(),
        }


# Global service instance
llm_service = LLMService()
