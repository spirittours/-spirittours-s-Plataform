"""
AI Content Generation - Provider-Specific Adapters

This module implements concrete adapters for each AI provider:
- OpenAI (GPT-4)
- Anthropic (Claude)
- Google (Gemini)
- Groq (Meta Llama)
- Mistral
- Together AI (Qwen)

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

import asyncio
import time
import httpx
from typing import Dict, Any, Optional, List
import logging
import json

from .ai_providers_base import (
    AIProviderAdapter,
    ContentRequest,
    ContentResponse,
    ProviderConfig,
    AIProvider,
    ProviderError,
    RateLimitError,
    AuthenticationError,
    ContentGenerationError,
    ProviderUnavailableError
)

logger = logging.getLogger(__name__)


class OpenAIAdapter(AIProviderAdapter):
    """
    OpenAI GPT-4 adapter
    
    Best for: High-quality creative content, multilingual support
    Model: gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo
    """
    
    BASE_URL = "https://api.openai.com/v1"
    
    def _initialize_client(self):
        """Initialize OpenAI HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        logger.info(f"OpenAI adapter initialized with model: {self.config.model}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test OpenAI API connection"""
        try:
            response = await self.client.get("/models")
            
            if response.status_code == 200:
                models = response.json()
                return {
                    "connected": True,
                    "provider": "openai",
                    "model": self.config.model,
                    "available_models": len(models.get("data", [])),
                    "message": "Successfully connected to OpenAI API"
                }
            else:
                return {
                    "connected": False,
                    "provider": "openai",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"OpenAI connection test failed: {str(e)}")
            return {
                "connected": False,
                "provider": "openai",
                "error": str(e)
            }
    
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """Generate content using OpenAI GPT-4"""
        start_time = time.time()
        
        try:
            # Build messages
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # API request
            payload = {
                "model": self.config.model,
                "messages": messages,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "n": 1  # Number of completions
            }
            
            response = await self._make_request_with_retry(payload)
            
            # Extract content
            content = response["choices"][0]["message"]["content"].strip()
            
            # Token usage
            usage = response.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", 0)
            
            # Calculate generation time
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract metadata
            metadata = {
                "model": self.config.model,
                "finish_reason": response["choices"][0].get("finish_reason"),
                "hashtags": self._extract_hashtags(content) if request.include_hashtags else []
            }
            
            logger.info(f"OpenAI generation successful: {total_tokens} tokens in {generation_time_ms}ms")
            
            return ContentResponse(
                provider=AIProvider.OPENAI,
                content=content,
                metadata=metadata,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                generation_time_ms=generation_time_ms,
                confidence_score=0.95  # OpenAI typically high quality
            )
            
        except Exception as e:
            logger.error(f"OpenAI content generation failed: {str(e)}")
            raise ContentGenerationError(f"OpenAI generation failed: {str(e)}")
    
    async def _make_request_with_retry(self, payload: Dict) -> Dict:
        """Make API request with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.post("/chat/completions", json=payload)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limit
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay_seconds * (attempt + 1))
                        continue
                    raise RateLimitError("OpenAI rate limit exceeded")
                elif response.status_code == 401:
                    raise AuthenticationError("Invalid OpenAI API key")
                else:
                    error_detail = response.json().get("error", {}).get("message", response.text)
                    raise ProviderError(f"OpenAI API error: {error_detail}")
                    
            except httpx.TimeoutException:
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay_seconds)
                    continue
                raise ProviderUnavailableError("OpenAI request timeout")
            except httpx.RequestError as e:
                raise ProviderUnavailableError(f"OpenAI request failed: {str(e)}")
        
        raise ProviderError("Max retries exceeded")
    
    def _build_user_prompt(self, request: ContentRequest) -> str:
        """Build user prompt with context"""
        prompt_parts = [request.prompt]
        
        if request.topic:
            prompt_parts.append(f"Topic: {request.topic}")
        
        if request.keywords:
            prompt_parts.append(f"Keywords: {', '.join(request.keywords)}")
        
        if request.reference_content:
            prompt_parts.append(f"Reference: {request.reference_content}")
        
        if request.character_limit:
            prompt_parts.append(f"Keep it under {request.character_limit} characters.")
        
        return "\n\n".join(prompt_parts)


class AnthropicAdapter(AIProviderAdapter):
    """
    Anthropic Claude adapter
    
    Best for: Long-form content, nuanced tone control, brand voice consistency
    Model: claude-3-5-sonnet-20241022, claude-3-opus-20240229
    """
    
    BASE_URL = "https://api.anthropic.com/v1"
    API_VERSION = "2023-06-01"
    
    def _initialize_client(self):
        """Initialize Anthropic HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "x-api-key": self.config.api_key,
                "anthropic-version": self.API_VERSION,
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        logger.info(f"Anthropic adapter initialized with model: {self.config.model}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Anthropic API connection"""
        try:
            # Make a minimal request to test connection
            response = await self.client.post(
                "/messages",
                json={
                    "model": self.config.model,
                    "max_tokens": 10,
                    "messages": [{"role": "user", "content": "Hi"}]
                }
            )
            
            if response.status_code == 200:
                return {
                    "connected": True,
                    "provider": "anthropic",
                    "model": self.config.model,
                    "message": "Successfully connected to Anthropic API"
                }
            else:
                return {
                    "connected": False,
                    "provider": "anthropic",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Anthropic connection test failed: {str(e)}")
            return {
                "connected": False,
                "provider": "anthropic",
                "error": str(e)
            }
    
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """Generate content using Anthropic Claude"""
        start_time = time.time()
        
        try:
            # Build system prompt and user message
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)
            
            # API request (Anthropic uses different format)
            payload = {
                "model": self.config.model,
                "max_tokens": request.max_tokens,
                "temperature": request.temperature,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": user_prompt}
                ]
            }
            
            response = await self._make_request_with_retry(payload)
            
            # Extract content
            content = response["content"][0]["text"].strip()
            
            # Token usage
            usage = response.get("usage", {})
            input_tokens = usage.get("input_tokens", 0)
            output_tokens = usage.get("output_tokens", 0)
            total_tokens = input_tokens + output_tokens
            
            # Calculate generation time
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract metadata
            metadata = {
                "model": self.config.model,
                "stop_reason": response.get("stop_reason"),
                "hashtags": self._extract_hashtags(content) if request.include_hashtags else []
            }
            
            logger.info(f"Anthropic generation successful: {total_tokens} tokens in {generation_time_ms}ms")
            
            return ContentResponse(
                provider=AIProvider.ANTHROPIC,
                content=content,
                metadata=metadata,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                generation_time_ms=generation_time_ms,
                confidence_score=0.93  # Claude excellent for quality
            )
            
        except Exception as e:
            logger.error(f"Anthropic content generation failed: {str(e)}")
            raise ContentGenerationError(f"Anthropic generation failed: {str(e)}")
    
    async def _make_request_with_retry(self, payload: Dict) -> Dict:
        """Make API request with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.post("/messages", json=payload)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay_seconds * (attempt + 1))
                        continue
                    raise RateLimitError("Anthropic rate limit exceeded")
                elif response.status_code == 401:
                    raise AuthenticationError("Invalid Anthropic API key")
                else:
                    error_detail = response.json().get("error", {}).get("message", response.text)
                    raise ProviderError(f"Anthropic API error: {error_detail}")
                    
            except httpx.TimeoutException:
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay_seconds)
                    continue
                raise ProviderUnavailableError("Anthropic request timeout")
            except httpx.RequestError as e:
                raise ProviderUnavailableError(f"Anthropic request failed: {str(e)}")
        
        raise ProviderError("Max retries exceeded")
    
    def _build_user_prompt(self, request: ContentRequest) -> str:
        """Build user prompt (same as OpenAI)"""
        prompt_parts = [request.prompt]
        
        if request.topic:
            prompt_parts.append(f"Topic: {request.topic}")
        
        if request.keywords:
            prompt_parts.append(f"Keywords: {', '.join(request.keywords)}")
        
        if request.reference_content:
            prompt_parts.append(f"Reference: {request.reference_content}")
        
        if request.character_limit:
            prompt_parts.append(f"Keep it under {request.character_limit} characters.")
        
        return "\n\n".join(prompt_parts)


class GoogleGeminiAdapter(AIProviderAdapter):
    """
    Google Gemini adapter
    
    Best for: High-volume content, free tier, multilingual support
    Model: gemini-pro, gemini-pro-vision
    """
    
    BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
    
    def _initialize_client(self):
        """Initialize Google Gemini HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            timeout=30.0
        )
        self.api_key = self.config.api_key
        logger.info(f"Google Gemini adapter initialized with model: {self.config.model}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Google Gemini API connection"""
        try:
            url = f"/models/{self.config.model}"
            response = await self.client.get(url, params={"key": self.api_key})
            
            if response.status_code == 200:
                model_info = response.json()
                return {
                    "connected": True,
                    "provider": "google",
                    "model": self.config.model,
                    "model_info": model_info.get("displayName", ""),
                    "message": "Successfully connected to Google Gemini API"
                }
            else:
                return {
                    "connected": False,
                    "provider": "google",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Google Gemini connection test failed: {str(e)}")
            return {
                "connected": False,
                "provider": "google",
                "error": str(e)
            }
    
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """Generate content using Google Gemini"""
        start_time = time.time()
        
        try:
            # Build combined prompt (Gemini doesn't have separate system/user)
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)
            full_prompt = f"{system_prompt}\n\n{user_prompt}"
            
            # API request
            url = f"/models/{self.config.model}:generateContent"
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": full_prompt}
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": request.temperature,
                    "maxOutputTokens": request.max_tokens,
                }
            }
            
            response = await self._make_request_with_retry(url, payload)
            
            # Extract content
            content = response["candidates"][0]["content"]["parts"][0]["text"].strip()
            
            # Token usage (Gemini provides token counts)
            usage = response.get("usageMetadata", {})
            input_tokens = usage.get("promptTokenCount", 0)
            output_tokens = usage.get("candidatesTokenCount", 0)
            total_tokens = usage.get("totalTokenCount", input_tokens + output_tokens)
            
            # Calculate generation time
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract metadata
            metadata = {
                "model": self.config.model,
                "finish_reason": response["candidates"][0].get("finishReason"),
                "hashtags": self._extract_hashtags(content) if request.include_hashtags else []
            }
            
            logger.info(f"Google Gemini generation successful: {total_tokens} tokens in {generation_time_ms}ms")
            
            return ContentResponse(
                provider=AIProvider.GOOGLE,
                content=content,
                metadata=metadata,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                generation_time_ms=generation_time_ms,
                confidence_score=0.88  # Good quality
            )
            
        except Exception as e:
            logger.error(f"Google Gemini content generation failed: {str(e)}")
            raise ContentGenerationError(f"Google Gemini generation failed: {str(e)}")
    
    async def _make_request_with_retry(self, url: str, payload: Dict) -> Dict:
        """Make API request with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.post(
                    url,
                    json=payload,
                    params={"key": self.api_key}
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay_seconds * (attempt + 1))
                        continue
                    raise RateLimitError("Google Gemini rate limit exceeded")
                elif response.status_code == 401 or response.status_code == 403:
                    raise AuthenticationError("Invalid Google API key")
                else:
                    error_detail = response.json().get("error", {}).get("message", response.text)
                    raise ProviderError(f"Google Gemini API error: {error_detail}")
                    
            except httpx.TimeoutException:
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay_seconds)
                    continue
                raise ProviderUnavailableError("Google Gemini request timeout")
            except httpx.RequestError as e:
                raise ProviderUnavailableError(f"Google Gemini request failed: {str(e)}")
        
        raise ProviderError("Max retries exceeded")
    
    def _build_user_prompt(self, request: ContentRequest) -> str:
        """Build user prompt"""
        prompt_parts = [request.prompt]
        
        if request.topic:
            prompt_parts.append(f"Topic: {request.topic}")
        
        if request.keywords:
            prompt_parts.append(f"Keywords: {', '.join(request.keywords)}")
        
        if request.reference_content:
            prompt_parts.append(f"Reference: {request.reference_content}")
        
        if request.character_limit:
            prompt_parts.append(f"Keep it under {request.character_limit} characters.")
        
        return "\n\n".join(prompt_parts)


class GroqAdapter(AIProviderAdapter):
    """
    Groq adapter (Meta Llama via Groq)
    
    Best for: Real-time content generation, fastest response times
    Model: llama-3.1-70b-versatile, llama-3.1-8b-instant
    """
    
    BASE_URL = "https://api.groq.com/openai/v1"
    
    def _initialize_client(self):
        """Initialize Groq HTTP client"""
        self.client = httpx.AsyncClient(
            base_url=self.BASE_URL,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json"
            },
            timeout=30.0
        )
        logger.info(f"Groq adapter initialized with model: {self.config.model}")
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Groq API connection"""
        try:
            response = await self.client.get("/models")
            
            if response.status_code == 200:
                models = response.json()
                return {
                    "connected": True,
                    "provider": "groq",
                    "model": self.config.model,
                    "available_models": len(models.get("data", [])),
                    "message": "Successfully connected to Groq API"
                }
            else:
                return {
                    "connected": False,
                    "provider": "groq",
                    "error": f"HTTP {response.status_code}: {response.text}"
                }
                
        except Exception as e:
            logger.error(f"Groq connection test failed: {str(e)}")
            return {
                "connected": False,
                "provider": "groq",
                "error": str(e)
            }
    
    async def generate_content(self, request: ContentRequest) -> ContentResponse:
        """Generate content using Groq (Meta Llama)"""
        start_time = time.time()
        
        try:
            # Build messages (OpenAI-compatible format)
            system_prompt = self._build_system_prompt(request)
            user_prompt = self._build_user_prompt(request)
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            # API request
            payload = {
                "model": self.config.model,
                "messages": messages,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
            }
            
            response = await self._make_request_with_retry(payload)
            
            # Extract content
            content = response["choices"][0]["message"]["content"].strip()
            
            # Token usage
            usage = response.get("usage", {})
            input_tokens = usage.get("prompt_tokens", 0)
            output_tokens = usage.get("completion_tokens", 0)
            total_tokens = usage.get("total_tokens", 0)
            
            # Calculate generation time
            generation_time_ms = int((time.time() - start_time) * 1000)
            
            # Extract metadata
            metadata = {
                "model": self.config.model,
                "finish_reason": response["choices"][0].get("finish_reason"),
                "hashtags": self._extract_hashtags(content) if request.include_hashtags else [],
                "speed_note": "Groq provides fastest inference"
            }
            
            logger.info(f"Groq generation successful: {total_tokens} tokens in {generation_time_ms}ms (FAST!)")
            
            return ContentResponse(
                provider=AIProvider.GROQ,
                content=content,
                metadata=metadata,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                generation_time_ms=generation_time_ms,
                confidence_score=0.85  # Good quality, optimized for speed
            )
            
        except Exception as e:
            logger.error(f"Groq content generation failed: {str(e)}")
            raise ContentGenerationError(f"Groq generation failed: {str(e)}")
    
    async def _make_request_with_retry(self, payload: Dict) -> Dict:
        """Make API request with retry logic"""
        for attempt in range(self.config.max_retries):
            try:
                response = await self.client.post("/chat/completions", json=payload)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    if attempt < self.config.max_retries - 1:
                        await asyncio.sleep(self.config.retry_delay_seconds * (attempt + 1))
                        continue
                    raise RateLimitError("Groq rate limit exceeded")
                elif response.status_code == 401:
                    raise AuthenticationError("Invalid Groq API key")
                else:
                    error_detail = response.json().get("error", {}).get("message", response.text)
                    raise ProviderError(f"Groq API error: {error_detail}")
                    
            except httpx.TimeoutException:
                if attempt < self.config.max_retries - 1:
                    await asyncio.sleep(self.config.retry_delay_seconds)
                    continue
                raise ProviderUnavailableError("Groq request timeout")
            except httpx.RequestError as e:
                raise ProviderUnavailableError(f"Groq request failed: {str(e)}")
        
        raise ProviderError("Max retries exceeded")
    
    def _build_user_prompt(self, request: ContentRequest) -> str:
        """Build user prompt"""
        prompt_parts = [request.prompt]
        
        if request.topic:
            prompt_parts.append(f"Topic: {request.topic}")
        
        if request.keywords:
            prompt_parts.append(f"Keywords: {', '.join(request.keywords)}")
        
        if request.reference_content:
            prompt_parts.append(f"Reference: {request.reference_content}")
        
        if request.character_limit:
            prompt_parts.append(f"Keep it under {request.character_limit} characters.")
        
        return "\n\n".join(prompt_parts)


# Note: Mistral and Together AI (Qwen) adapters follow similar patterns
# They can be added in the same way as the above adapters
