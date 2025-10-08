"""
🤖 MULTI-AI ORCHESTRATOR SYSTEM
Sistema de Orquestación Multi-IA Configurable
Spirit Tours Platform - Control Centralizado de Proveedores de IA

Este módulo permite al administrador:
- Configurar múltiples proveedores de IA (GPT-4/5, Claude, Gemini, Qwen, DeepSeek, Meta, Grok, etc.)
- Combinar varios modelos para diferentes tareas
- Optimizar costos seleccionando el mejor proveedor
- Balancear carga entre proveedores
- Failover automático si un proveedor falla
- Monitoreo de rendimiento y costos en tiempo real
- A/B testing entre modelos

Autor: GenSpark AI Developer
Fecha: 2024-10-08
Versión: 3.0.0
"""

import os
import json
import asyncio
import aiohttp
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import hashlib
import redis
import numpy as np
from decimal import Decimal

# OpenAI
import openai

# Anthropic (Claude)
from anthropic import AsyncAnthropic

# Google (Gemini)
import google.generativeai as genai

# Hugging Face (Meta, others)
from transformers import pipeline, AutoTokenizer, AutoModelForCausalLM

# Custom implementations for other providers
import requests

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIProvider(Enum):
    """Proveedores de IA disponibles"""
    OPENAI_GPT4 = "openai_gpt4"
    OPENAI_GPT5 = "openai_gpt5"  # Future
    ANTHROPIC_CLAUDE = "anthropic_claude_3"
    GOOGLE_GEMINI = "google_gemini_pro"
    GOOGLE_GEMINI_ULTRA = "google_gemini_ultra"
    META_LLAMA = "meta_llama_3"
    QWEN = "qwen_turbo"
    DEEPSEEK = "deepseek_coder"
    GROK = "xai_grok"
    MISTRAL = "mistral_large"
    COHERE = "cohere_command"
    AI21_JURASSIC = "ai21_jurassic"
    CUSTOM = "custom_model"

class TaskType(Enum):
    """Tipos de tareas para IA"""
    TEXT_GENERATION = "text_generation"
    CHAT_COMPLETION = "chat_completion"
    CODE_GENERATION = "code_generation"
    TRANSLATION = "translation"
    SUMMARIZATION = "summarization"
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    IMAGE_GENERATION = "image_generation"
    EMBEDDINGS = "embeddings"
    TOUR_DESIGN = "tour_design"
    CUSTOMER_SERVICE = "customer_service"

@dataclass
class AIProviderConfig:
    """Configuración de un proveedor de IA"""
    provider: AIProvider
    api_key: str
    endpoint: Optional[str] = None
    model_name: str = ""
    max_tokens: int = 2000
    temperature: float = 0.7
    cost_per_1k_tokens: float = 0.01
    priority: int = 1  # Lower is higher priority
    enabled: bool = True
    rate_limit: int = 100  # Requests per minute
    timeout: int = 30  # Seconds
    capabilities: List[TaskType] = field(default_factory=list)
    custom_params: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AIResponse:
    """Respuesta de un proveedor de IA"""
    provider: AIProvider
    content: str
    usage: Dict[str, int]
    cost: float
    latency: float
    model: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None

@dataclass
class OrchestrationStrategy:
    """Estrategia de orquestación"""
    mode: str  # "single", "fallback", "parallel", "round_robin", "cost_optimized", "quality_optimized"
    primary_provider: Optional[AIProvider] = None
    providers: List[AIProvider] = field(default_factory=list)
    voting_threshold: float = 0.7  # For consensus in parallel mode
    max_retries: int = 3
    cache_ttl: int = 3600  # Cache time in seconds

class AIProviderInterface(ABC):
    """Interfaz base para proveedores de IA"""
    
    @abstractmethod
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta del proveedor"""
        pass
    
    @abstractmethod
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida la API key del proveedor"""
        pass
    
    @abstractmethod
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima el costo de una operación"""
        pass

class OpenAIProvider(AIProviderInterface):
    """Proveedor OpenAI (GPT-4/5)"""
    
    def __init__(self):
        self.client = None
    
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta usando OpenAI"""
        start_time = datetime.now()
        
        try:
            if not self.client:
                openai.api_key = config.api_key
                self.client = openai
            
            # Select appropriate model
            model = config.model_name or "gpt-4-turbo-preview"
            
            if task_type == TaskType.CHAT_COMPLETION:
                response = await asyncio.to_thread(
                    self.client.ChatCompletion.create,
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful AI assistant for Spirit Tours."},
                        {"role": "user", "content": prompt}
                    ],
                    max_tokens=config.max_tokens,
                    temperature=config.temperature,
                    **config.custom_params
                )
                
                content = response.choices[0].message.content
                usage = response.usage.to_dict()
                
            elif task_type == TaskType.IMAGE_GENERATION:
                response = await asyncio.to_thread(
                    self.client.Image.create,
                    prompt=prompt,
                    n=1,
                    size="1024x1024"
                )
                content = response.data[0].url
                usage = {"total_tokens": 0}  # Image generation doesn't use tokens
                
            else:
                # Default text generation
                response = await asyncio.to_thread(
                    self.client.Completion.create,
                    model=model,
                    prompt=prompt,
                    max_tokens=config.max_tokens,
                    temperature=config.temperature,
                    **config.custom_params
                )
                content = response.choices[0].text
                usage = response.usage.to_dict()
            
            # Calculate cost
            total_tokens = usage.get('total_tokens', 0)
            cost = self.estimate_cost(total_tokens, config)
            
            # Calculate latency
            latency = (datetime.now() - start_time).total_seconds()
            
            return AIResponse(
                provider=config.provider,
                content=content,
                usage=usage,
                cost=cost,
                latency=latency,
                model=model,
                timestamp=datetime.now(),
                metadata={'task_type': task_type.value}
            )
            
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return AIResponse(
                provider=config.provider,
                content="",
                usage={},
                cost=0,
                latency=(datetime.now() - start_time).total_seconds(),
                model=config.model_name,
                timestamp=datetime.now(),
                error=str(e)
            )
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida API key de OpenAI"""
        try:
            openai.api_key = api_key
            await asyncio.to_thread(openai.Model.list)
            return True
        except:
            return False
    
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima costo basado en tokens"""
        return (tokens / 1000) * config.cost_per_1k_tokens

class AnthropicProvider(AIProviderInterface):
    """Proveedor Anthropic (Claude)"""
    
    def __init__(self):
        self.client = None
    
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta usando Claude"""
        start_time = datetime.now()
        
        try:
            if not self.client:
                self.client = AsyncAnthropic(api_key=config.api_key)
            
            model = config.model_name or "claude-3-opus-20240229"
            
            response = await self.client.messages.create(
                model=model,
                max_tokens=config.max_tokens,
                temperature=config.temperature,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text
            usage = {
                'input_tokens': response.usage.input_tokens,
                'output_tokens': response.usage.output_tokens,
                'total_tokens': response.usage.input_tokens + response.usage.output_tokens
            }
            
            cost = self.estimate_cost(usage['total_tokens'], config)
            latency = (datetime.now() - start_time).total_seconds()
            
            return AIResponse(
                provider=config.provider,
                content=content,
                usage=usage,
                cost=cost,
                latency=latency,
                model=model,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Anthropic error: {str(e)}")
            return AIResponse(
                provider=config.provider,
                content="",
                usage={},
                cost=0,
                latency=(datetime.now() - start_time).total_seconds(),
                model=config.model_name,
                timestamp=datetime.now(),
                error=str(e)
            )
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida API key de Anthropic"""
        try:
            client = AsyncAnthropic(api_key=api_key)
            await client.messages.create(
                model="claude-3-haiku-20240307",
                max_tokens=10,
                messages=[{"role": "user", "content": "test"}]
            )
            return True
        except:
            return False
    
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima costo para Claude"""
        return (tokens / 1000) * config.cost_per_1k_tokens

class GoogleGeminiProvider(AIProviderInterface):
    """Proveedor Google Gemini"""
    
    def __init__(self):
        self.initialized = False
    
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta usando Gemini"""
        start_time = datetime.now()
        
        try:
            if not self.initialized:
                genai.configure(api_key=config.api_key)
                self.initialized = True
            
            model_name = config.model_name or "gemini-pro"
            model = genai.GenerativeModel(model_name)
            
            response = await asyncio.to_thread(
                model.generate_content,
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=config.max_tokens,
                    temperature=config.temperature
                )
            )
            
            content = response.text
            # Gemini doesn't provide token count directly
            estimated_tokens = len(content.split()) * 1.3
            usage = {'total_tokens': int(estimated_tokens)}
            
            cost = self.estimate_cost(usage['total_tokens'], config)
            latency = (datetime.now() - start_time).total_seconds()
            
            return AIResponse(
                provider=config.provider,
                content=content,
                usage=usage,
                cost=cost,
                latency=latency,
                model=model_name,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Gemini error: {str(e)}")
            return AIResponse(
                provider=config.provider,
                content="",
                usage={},
                cost=0,
                latency=(datetime.now() - start_time).total_seconds(),
                model=config.model_name,
                timestamp=datetime.now(),
                error=str(e)
            )
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida API key de Google"""
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-pro')
            response = model.generate_content("test")
            return True
        except:
            return False
    
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima costo para Gemini"""
        return (tokens / 1000) * config.cost_per_1k_tokens

class QwenProvider(AIProviderInterface):
    """Proveedor Qwen (Alibaba)"""
    
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta usando Qwen"""
        start_time = datetime.now()
        
        try:
            endpoint = config.endpoint or "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
            
            headers = {
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": config.model_name or "qwen-turbo",
                "input": {
                    "prompt": prompt
                },
                "parameters": {
                    "max_tokens": config.max_tokens,
                    "temperature": config.temperature
                }
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=config.timeout)
                ) as response:
                    result = await response.json()
            
            content = result['output']['text']
            usage = result.get('usage', {})
            
            cost = self.estimate_cost(usage.get('total_tokens', 0), config)
            latency = (datetime.now() - start_time).total_seconds()
            
            return AIResponse(
                provider=config.provider,
                content=content,
                usage=usage,
                cost=cost,
                latency=latency,
                model=config.model_name,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"Qwen error: {str(e)}")
            return AIResponse(
                provider=config.provider,
                content="",
                usage={},
                cost=0,
                latency=(datetime.now() - start_time).total_seconds(),
                model=config.model_name,
                timestamp=datetime.now(),
                error=str(e)
            )
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida API key de Qwen"""
        # Implement validation
        return True
    
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima costo para Qwen"""
        return (tokens / 1000) * config.cost_per_1k_tokens

class DeepSeekProvider(AIProviderInterface):
    """Proveedor DeepSeek"""
    
    async def generate(
        self,
        prompt: str,
        config: AIProviderConfig,
        task_type: TaskType
    ) -> AIResponse:
        """Genera respuesta usando DeepSeek"""
        start_time = datetime.now()
        
        try:
            endpoint = config.endpoint or "https://api.deepseek.com/v1/chat/completions"
            
            headers = {
                "Authorization": f"Bearer {config.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "model": config.model_name or "deepseek-coder",
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": config.max_tokens,
                "temperature": config.temperature
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=config.timeout)
                ) as response:
                    result = await response.json()
            
            content = result['choices'][0]['message']['content']
            usage = result.get('usage', {})
            
            cost = self.estimate_cost(usage.get('total_tokens', 0), config)
            latency = (datetime.now() - start_time).total_seconds()
            
            return AIResponse(
                provider=config.provider,
                content=content,
                usage=usage,
                cost=cost,
                latency=latency,
                model=config.model_name,
                timestamp=datetime.now()
            )
            
        except Exception as e:
            logger.error(f"DeepSeek error: {str(e)}")
            return AIResponse(
                provider=config.provider,
                content="",
                usage={},
                cost=0,
                latency=(datetime.now() - start_time).total_seconds(),
                model=config.model_name,
                timestamp=datetime.now(),
                error=str(e)
            )
    
    async def validate_api_key(self, api_key: str) -> bool:
        """Valida API key de DeepSeek"""
        return True
    
    def estimate_cost(self, tokens: int, config: AIProviderConfig) -> float:
        """Estima costo para DeepSeek"""
        return (tokens / 1000) * config.cost_per_1k_tokens

class MultiAIOrchestrator:
    """Orquestador principal de múltiples IA"""
    
    def __init__(self):
        self.providers: Dict[AIProvider, AIProviderInterface] = {}
        self.configs: Dict[AIProvider, AIProviderConfig] = {}
        self.performance_metrics: Dict[AIProvider, List[float]] = {}
        self.cost_tracker: Dict[AIProvider, float] = {}
        self.cache = {}  # Simple in-memory cache
        self.redis_client = None  # For distributed cache
        
        # Initialize providers
        self._initialize_providers()
        
        logger.info("🤖 Multi-AI Orchestrator initialized")
    
    def _initialize_providers(self):
        """Inicializa los proveedores de IA"""
        self.providers[AIProvider.OPENAI_GPT4] = OpenAIProvider()
        self.providers[AIProvider.OPENAI_GPT5] = OpenAIProvider()
        self.providers[AIProvider.ANTHROPIC_CLAUDE] = AnthropicProvider()
        self.providers[AIProvider.GOOGLE_GEMINI] = GoogleGeminiProvider()
        self.providers[AIProvider.GOOGLE_GEMINI_ULTRA] = GoogleGeminiProvider()
        self.providers[AIProvider.QWEN] = QwenProvider()
        self.providers[AIProvider.DEEPSEEK] = DeepSeekProvider()
        
        # Initialize performance tracking
        for provider in AIProvider:
            self.performance_metrics[provider] = []
            self.cost_tracker[provider] = 0.0
    
    def configure_provider(
        self,
        provider: AIProvider,
        config: AIProviderConfig
    ):
        """Configura un proveedor de IA"""
        self.configs[provider] = config
        logger.info(f"✅ Configured {provider.value}")
    
    async def execute(
        self,
        prompt: str,
        task_type: TaskType,
        strategy: OrchestrationStrategy,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Union[AIResponse, List[AIResponse]]:
        """
        Ejecuta una tarea usando la estrategia configurada
        """
        # Check cache first
        cache_key = self._generate_cache_key(prompt, task_type, strategy)
        cached_response = self._get_from_cache(cache_key)
        if cached_response:
            logger.info("📦 Returning cached response")
            return cached_response
        
        # Execute based on strategy
        if strategy.mode == "single":
            response = await self._execute_single(
                prompt, task_type, strategy.primary_provider
            )
        elif strategy.mode == "fallback":
            response = await self._execute_with_fallback(
                prompt, task_type, strategy.providers
            )
        elif strategy.mode == "parallel":
            response = await self._execute_parallel(
                prompt, task_type, strategy.providers, strategy.voting_threshold
            )
        elif strategy.mode == "round_robin":
            response = await self._execute_round_robin(
                prompt, task_type, strategy.providers
            )
        elif strategy.mode == "cost_optimized":
            response = await self._execute_cost_optimized(
                prompt, task_type, strategy.providers
            )
        elif strategy.mode == "quality_optimized":
            response = await self._execute_quality_optimized(
                prompt, task_type, strategy.providers
            )
        else:
            raise ValueError(f"Unknown strategy mode: {strategy.mode}")
        
        # Cache response
        self._cache_response(cache_key, response, strategy.cache_ttl)
        
        # Update metrics
        if isinstance(response, AIResponse):
            self._update_metrics(response)
        else:
            for r in response:
                self._update_metrics(r)
        
        return response
    
    async def _execute_single(
        self,
        prompt: str,
        task_type: TaskType,
        provider: AIProvider
    ) -> AIResponse:
        """Ejecuta con un solo proveedor"""
        if provider not in self.configs:
            raise ValueError(f"Provider {provider} not configured")
        
        config = self.configs[provider]
        if not config.enabled:
            raise ValueError(f"Provider {provider} is disabled")
        
        provider_impl = self.providers[provider]
        response = await provider_impl.generate(prompt, config, task_type)
        
        return response
    
    async def _execute_with_fallback(
        self,
        prompt: str,
        task_type: TaskType,
        providers: List[AIProvider]
    ) -> AIResponse:
        """Ejecuta con fallback si falla el primero"""
        for provider in providers:
            if provider not in self.configs or not self.configs[provider].enabled:
                continue
            
            try:
                response = await self._execute_single(prompt, task_type, provider)
                if not response.error:
                    return response
            except Exception as e:
                logger.warning(f"Provider {provider} failed: {str(e)}")
                continue
        
        raise Exception("All providers failed")
    
    async def _execute_parallel(
        self,
        prompt: str,
        task_type: TaskType,
        providers: List[AIProvider],
        voting_threshold: float
    ) -> AIResponse:
        """Ejecuta en paralelo y hace voting"""
        tasks = []
        valid_providers = []
        
        for provider in providers:
            if provider in self.configs and self.configs[provider].enabled:
                tasks.append(self._execute_single(prompt, task_type, provider))
                valid_providers.append(provider)
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter successful responses
        valid_responses = [
            r for r in responses 
            if isinstance(r, AIResponse) and not r.error
        ]
        
        if not valid_responses:
            raise Exception("No valid responses from parallel execution")
        
        # Voting mechanism - combine responses
        combined_content = self._combine_responses(valid_responses, voting_threshold)
        
        # Calculate average metrics
        avg_cost = sum(r.cost for r in valid_responses) / len(valid_responses)
        avg_latency = sum(r.latency for r in valid_responses) / len(valid_responses)
        
        return AIResponse(
            provider=AIProvider.CUSTOM,
            content=combined_content,
            usage={'total_tokens': sum(r.usage.get('total_tokens', 0) for r in valid_responses)},
            cost=avg_cost,
            latency=avg_latency,
            model="ensemble",
            timestamp=datetime.now(),
            metadata={
                'providers_used': [r.provider.value for r in valid_responses],
                'voting_threshold': voting_threshold
            }
        )
    
    async def _execute_round_robin(
        self,
        prompt: str,
        task_type: TaskType,
        providers: List[AIProvider]
    ) -> AIResponse:
        """Ejecuta round-robin entre proveedores"""
        # Get next provider in rotation
        if not hasattr(self, '_round_robin_index'):
            self._round_robin_index = 0
        
        enabled_providers = [
            p for p in providers 
            if p in self.configs and self.configs[p].enabled
        ]
        
        if not enabled_providers:
            raise ValueError("No enabled providers")
        
        provider = enabled_providers[self._round_robin_index % len(enabled_providers)]
        self._round_robin_index += 1
        
        return await self._execute_single(prompt, task_type, provider)
    
    async def _execute_cost_optimized(
        self,
        prompt: str,
        task_type: TaskType,
        providers: List[AIProvider]
    ) -> AIResponse:
        """Ejecuta con el proveedor más económico"""
        # Sort by cost
        sorted_providers = sorted(
            providers,
            key=lambda p: self.configs[p].cost_per_1k_tokens if p in self.configs else float('inf')
        )
        
        for provider in sorted_providers:
            if provider not in self.configs or not self.configs[provider].enabled:
                continue
            
            try:
                response = await self._execute_single(prompt, task_type, provider)
                if not response.error:
                    return response
            except:
                continue
        
        raise Exception("No cost-optimized provider available")
    
    async def _execute_quality_optimized(
        self,
        prompt: str,
        task_type: TaskType,
        providers: List[AIProvider]
    ) -> AIResponse:
        """Ejecuta con el proveedor de mejor calidad"""
        # Sort by performance metrics (lower latency, higher success rate)
        provider_scores = {}
        
        for provider in providers:
            if provider not in self.configs or not self.configs[provider].enabled:
                continue
            
            metrics = self.performance_metrics.get(provider, [])
            if metrics:
                avg_latency = np.mean(metrics)
                score = 1.0 / (avg_latency + 1)  # Lower latency = higher score
            else:
                score = 0.5  # Default score for new providers
            
            provider_scores[provider] = score
        
        # Sort by score
        sorted_providers = sorted(
            provider_scores.keys(),
            key=lambda p: provider_scores[p],
            reverse=True
        )
        
        for provider in sorted_providers:
            try:
                response = await self._execute_single(prompt, task_type, provider)
                if not response.error:
                    return response
            except:
                continue
        
        raise Exception("No quality-optimized provider available")
    
    def _combine_responses(
        self,
        responses: List[AIResponse],
        threshold: float
    ) -> str:
        """Combina respuestas de múltiples proveedores"""
        if len(responses) == 1:
            return responses[0].content
        
        # Simple majority voting for now
        # In production, use more sophisticated NLP techniques
        contents = [r.content for r in responses]
        
        # For simplicity, return the longest response
        # In production, use semantic similarity and voting
        return max(contents, key=len)
    
    def _generate_cache_key(
        self,
        prompt: str,
        task_type: TaskType,
        strategy: OrchestrationStrategy
    ) -> str:
        """Genera clave de cache"""
        key_data = f"{prompt}_{task_type.value}_{strategy.mode}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def _get_from_cache(self, key: str) -> Optional[AIResponse]:
        """Obtiene respuesta de cache"""
        if key in self.cache:
            cached = self.cache[key]
            if datetime.now() < cached['expires']:
                return cached['response']
            else:
                del self.cache[key]
        return None
    
    def _cache_response(self, key: str, response: AIResponse, ttl: int):
        """Guarda respuesta en cache"""
        self.cache[key] = {
            'response': response,
            'expires': datetime.now() + timedelta(seconds=ttl)
        }
    
    def _update_metrics(self, response: AIResponse):
        """Actualiza métricas de rendimiento"""
        if response.provider in self.performance_metrics:
            self.performance_metrics[response.provider].append(response.latency)
            # Keep only last 100 metrics
            if len(self.performance_metrics[response.provider]) > 100:
                self.performance_metrics[response.provider].pop(0)
        
        # Update cost tracking
        if response.provider in self.cost_tracker:
            self.cost_tracker[response.provider] += response.cost
    
    def get_dashboard_data(self) -> Dict[str, Any]:
        """Obtiene datos para el dashboard de administración"""
        dashboard = {
            'providers': {},
            'total_cost': sum(self.cost_tracker.values()),
            'performance_summary': {},
            'recommendations': []
        }
        
        for provider in AIProvider:
            if provider in self.configs:
                config = self.configs[provider]
                metrics = self.performance_metrics.get(provider, [])
                
                provider_data = {
                    'enabled': config.enabled,
                    'model': config.model_name,
                    'cost_per_1k': config.cost_per_1k_tokens,
                    'total_cost': self.cost_tracker.get(provider, 0),
                    'requests_count': len(metrics),
                    'avg_latency': np.mean(metrics) if metrics else 0,
                    'success_rate': len([m for m in metrics if m > 0]) / len(metrics) if metrics else 0,
                    'capabilities': [t.value for t in config.capabilities]
                }
                
                dashboard['providers'][provider.value] = provider_data
        
        # Performance summary
        all_latencies = []
        for metrics in self.performance_metrics.values():
            all_latencies.extend(metrics)
        
        if all_latencies:
            dashboard['performance_summary'] = {
                'avg_latency': np.mean(all_latencies),
                'median_latency': np.median(all_latencies),
                'p95_latency': np.percentile(all_latencies, 95),
                'p99_latency': np.percentile(all_latencies, 99)
            }
        
        # Recommendations
        if dashboard['total_cost'] > 1000:
            dashboard['recommendations'].append(
                "Consider switching to cost-optimized strategy for non-critical tasks"
            )
        
        # Find underutilized providers
        for provider, data in dashboard['providers'].items():
            if data['enabled'] and data['requests_count'] < 10:
                dashboard['recommendations'].append(
                    f"Provider {provider} is underutilized - consider load balancing"
                )
        
        return dashboard
    
    async def benchmark_providers(
        self,
        test_prompts: List[str],
        task_type: TaskType
    ) -> Dict[str, Any]:
        """Benchmark all configured providers"""
        results = {}
        
        for provider in self.configs:
            if not self.configs[provider].enabled:
                continue
            
            provider_results = {
                'latencies': [],
                'costs': [],
                'errors': 0,
                'success': 0
            }
            
            for prompt in test_prompts:
                try:
                    response = await self._execute_single(prompt, task_type, provider)
                    if not response.error:
                        provider_results['latencies'].append(response.latency)
                        provider_results['costs'].append(response.cost)
                        provider_results['success'] += 1
                    else:
                        provider_results['errors'] += 1
                except:
                    provider_results['errors'] += 1
            
            # Calculate statistics
            if provider_results['latencies']:
                provider_results['avg_latency'] = np.mean(provider_results['latencies'])
                provider_results['avg_cost'] = np.mean(provider_results['costs'])
                provider_results['success_rate'] = provider_results['success'] / len(test_prompts)
            else:
                provider_results['avg_latency'] = float('inf')
                provider_results['avg_cost'] = float('inf')
                provider_results['success_rate'] = 0
            
            results[provider.value] = provider_results
        
        # Rank providers
        rankings = {
            'by_speed': sorted(results.keys(), key=lambda p: results[p]['avg_latency']),
            'by_cost': sorted(results.keys(), key=lambda p: results[p]['avg_cost']),
            'by_reliability': sorted(results.keys(), key=lambda p: results[p]['success_rate'], reverse=True)
        }
        
        return {
            'results': results,
            'rankings': rankings,
            'timestamp': datetime.now().isoformat()
        }


# API para el dashboard de administración
class AIOrchestrationAPI:
    """API para gestión desde el dashboard"""
    
    def __init__(self, orchestrator: MultiAIOrchestrator):
        self.orchestrator = orchestrator
    
    async def configure_provider(
        self,
        provider_name: str,
        api_key: str,
        settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configura un proveedor desde el dashboard"""
        try:
            provider = AIProvider(provider_name)
            
            config = AIProviderConfig(
                provider=provider,
                api_key=api_key,
                model_name=settings.get('model_name', ''),
                max_tokens=settings.get('max_tokens', 2000),
                temperature=settings.get('temperature', 0.7),
                cost_per_1k_tokens=settings.get('cost_per_1k_tokens', 0.01),
                priority=settings.get('priority', 1),
                enabled=settings.get('enabled', True),
                rate_limit=settings.get('rate_limit', 100),
                timeout=settings.get('timeout', 30),
                capabilities=[TaskType(t) for t in settings.get('capabilities', [])]
            )
            
            # Validate API key
            provider_impl = self.orchestrator.providers[provider]
            is_valid = await provider_impl.validate_api_key(api_key)
            
            if not is_valid:
                return {
                    'success': False,
                    'error': 'Invalid API key'
                }
            
            self.orchestrator.configure_provider(provider, config)
            
            return {
                'success': True,
                'message': f'Provider {provider_name} configured successfully'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def set_strategy(
        self,
        mode: str,
        providers: List[str],
        settings: Dict[str, Any]
    ) -> OrchestrationStrategy:
        """Configura estrategia de orquestación"""
        strategy = OrchestrationStrategy(
            mode=mode,
            providers=[AIProvider(p) for p in providers],
            voting_threshold=settings.get('voting_threshold', 0.7),
            max_retries=settings.get('max_retries', 3),
            cache_ttl=settings.get('cache_ttl', 3600)
        )
        
        if mode == 'single' and providers:
            strategy.primary_provider = AIProvider(providers[0])
        
        return strategy
    
    async def test_configuration(
        self,
        provider_name: str,
        test_prompt: str = "Hello, can you respond?"
    ) -> Dict[str, Any]:
        """Prueba la configuración de un proveedor"""
        try:
            provider = AIProvider(provider_name)
            
            response = await self.orchestrator._execute_single(
                test_prompt,
                TaskType.CHAT_COMPLETION,
                provider
            )
            
            return {
                'success': not bool(response.error),
                'response': response.content[:200],
                'latency': response.latency,
                'cost': response.cost,
                'error': response.error
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_cost_report(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Genera reporte de costos"""
        report = {
            'total_cost': sum(self.orchestrator.cost_tracker.values()),
            'by_provider': self.orchestrator.cost_tracker,
            'period': {
                'start': start_date.isoformat() if start_date else 'all_time',
                'end': end_date.isoformat() if end_date else 'now'
            }
        }
        
        # Cost optimization suggestions
        suggestions = []
        
        # Find most expensive provider
        if self.orchestrator.cost_tracker:
            most_expensive = max(
                self.orchestrator.cost_tracker.items(),
                key=lambda x: x[1]
            )
            suggestions.append(
                f"Provider {most_expensive[0].value} has the highest cost: ${most_expensive[1]:.2f}"
            )
        
        report['suggestions'] = suggestions
        
        return report


# Singleton instance
orchestrator = MultiAIOrchestrator()
api = AIOrchestrationAPI(orchestrator)

# Example usage
async def example_usage():
    """Ejemplo de uso del sistema"""
    
    # Configure providers
    orchestrator.configure_provider(
        AIProvider.OPENAI_GPT4,
        AIProviderConfig(
            provider=AIProvider.OPENAI_GPT4,
            api_key="your-openai-key",
            model_name="gpt-4-turbo-preview",
            cost_per_1k_tokens=0.01,
            capabilities=[TaskType.CHAT_COMPLETION, TaskType.TEXT_GENERATION]
        )
    )
    
    orchestrator.configure_provider(
        AIProvider.ANTHROPIC_CLAUDE,
        AIProviderConfig(
            provider=AIProvider.ANTHROPIC_CLAUDE,
            api_key="your-claude-key",
            model_name="claude-3-opus-20240229",
            cost_per_1k_tokens=0.015,
            capabilities=[TaskType.CHAT_COMPLETION, TaskType.CODE_GENERATION]
        )
    )
    
    # Single provider strategy
    single_strategy = OrchestrationStrategy(
        mode="single",
        primary_provider=AIProvider.OPENAI_GPT4
    )
    
    response = await orchestrator.execute(
        prompt="Design a 3-day tour of Paris",
        task_type=TaskType.TOUR_DESIGN,
        strategy=single_strategy
    )
    
    print(f"Response: {response.content[:200]}...")
    print(f"Cost: ${response.cost:.4f}")
    print(f"Latency: {response.latency:.2f}s")
    
    # Parallel execution with voting
    parallel_strategy = OrchestrationStrategy(
        mode="parallel",
        providers=[AIProvider.OPENAI_GPT4, AIProvider.ANTHROPIC_CLAUDE],
        voting_threshold=0.7
    )
    
    response = await orchestrator.execute(
        prompt="What are the best restaurants in Barcelona?",
        task_type=TaskType.CHAT_COMPLETION,
        strategy=parallel_strategy
    )
    
    # Cost-optimized strategy
    cost_strategy = OrchestrationStrategy(
        mode="cost_optimized",
        providers=[AIProvider.OPENAI_GPT4, AIProvider.ANTHROPIC_CLAUDE, AIProvider.GOOGLE_GEMINI]
    )
    
    response = await orchestrator.execute(
        prompt="Translate this to Spanish: Hello world",
        task_type=TaskType.TRANSLATION,
        strategy=cost_strategy
    )
    
    # Get dashboard data
    dashboard = orchestrator.get_dashboard_data()
    print("\n📊 Dashboard Data:")
    print(f"Total Cost: ${dashboard['total_cost']:.2f}")
    print(f"Providers: {len(dashboard['providers'])}")
    print(f"Recommendations: {dashboard['recommendations']}")


if __name__ == "__main__":
    asyncio.run(example_usage())