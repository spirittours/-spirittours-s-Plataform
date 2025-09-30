"""
AI Multi-Model SDK for Python
Enterprise SDK for Phase 2 Extended AI Multi-Model Platform
$100K IA Multi-Modelo Upgrade - Python Developer SDK
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Union, Any, Callable
import aiohttp
import websockets
from dataclasses import dataclass
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class AIResponse:
    """Response from AI model processing"""
    success: bool
    data: Optional[Dict] = None
    error: Optional[str] = None
    model: Optional[str] = None
    processing_time: Optional[float] = None
    cost: Optional[float] = None
    request_id: Optional[str] = None


@dataclass
class ConsensusResponse:
    """Response from consensus processing"""
    success: bool
    consensus: List[AIResponse]
    summary: Dict
    recommended_result: AIResponse
    total_cost: float
    processing_time: float


@dataclass
class BatchJob:
    """Batch job information"""
    id: str
    status: str
    progress: float
    total_requests: int
    completed_requests: int
    failed_requests: int
    estimated_completion: Optional[str]
    created_at: str


class AIMultiModelSDKError(Exception):
    """Base exception for SDK errors"""
    def __init__(self, message: str, status_code: Optional[int] = None, response_data: Optional[Dict] = None):
        super().__init__(message)
        self.status_code = status_code
        self.response_data = response_data


class AIError(AIMultiModelSDKError):
    """AI processing related errors"""
    pass


class AnalyticsError(AIMultiModelSDKError):
    """Analytics related errors"""
    pass


class BatchError(AIMultiModelSDKError):
    """Batch processing related errors"""
    pass


class WebhookError(AIMultiModelSDKError):
    """Webhook related errors"""
    pass


class AccountError(AIMultiModelSDKError):
    """Account related errors"""
    pass


class AIMultiModelSDK:
    """
    Main SDK class for AI Multi-Model Platform
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.yourcompany.com",
        version: str = "v1",
        timeout: int = 30,
        enable_websocket: bool = True,
        websocket_url: Optional[str] = None,
        auto_reconnect: bool = True,
        rate_limit_retries: int = 3,
        retry_delay: float = 1.0,
        debug: bool = False
    ):
        """
        Initialize the SDK
        
        Args:
            api_key: API key for authentication
            base_url: Base URL of the API
            version: API version
            timeout: Request timeout in seconds
            enable_websocket: Enable WebSocket connection
            websocket_url: WebSocket URL (defaults to base_url/ws)
            auto_reconnect: Auto-reconnect WebSocket on disconnection
            rate_limit_retries: Number of retries for rate limiting
            retry_delay: Delay between retries in seconds
            debug: Enable debug logging
        """
        if not api_key:
            raise ValueError("API key is required")
        
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.version = version
        self.timeout = timeout
        self.enable_websocket = enable_websocket
        self.websocket_url = websocket_url or f"{self.base_url.replace('http', 'ws')}/ws"
        self.auto_reconnect = auto_reconnect
        self.rate_limit_retries = rate_limit_retries
        self.retry_delay = retry_delay
        self.debug = debug
        
        if debug:
            logging.getLogger().setLevel(logging.DEBUG)
        
        # API endpoint
        self.api_url = f"{self.base_url}/api/{self.version}"
        
        # Session for HTTP requests
        self.session = None
        
        # WebSocket connection
        self.websocket = None
        self.websocket_connected = False
        self.websocket_callbacks = {}
        
        # Initialize modules
        self.ai = AIModule(self)
        self.analytics = AnalyticsModule(self)
        self.batch = BatchModule(self)
        self.webhooks = WebhookModule(self)
        self.account = AccountModule(self)
        
        logger.info("AI Multi-Model SDK initialized successfully")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self._initialize_session()
        if self.enable_websocket:
            await self._connect_websocket()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def _initialize_session(self):
        """Initialize HTTP session"""
        headers = {
            'X-API-Key': self.api_key,
            'Content-Type': 'application/json',
            'User-Agent': 'AIMultiModelSDK-Python/2.0.0'
        }
        
        connector = aiohttp.TCPConnector(limit=100)
        timeout_config = aiohttp.ClientTimeout(total=self.timeout)
        
        self.session = aiohttp.ClientSession(
            headers=headers,
            connector=connector,
            timeout=timeout_config
        )
    
    async def _make_request(
        self, 
        method: str, 
        endpoint: str, 
        data: Optional[Dict] = None, 
        params: Optional[Dict] = None,
        retry_count: int = 0
    ) -> Dict:
        """
        Make HTTP request with error handling and retries
        """
        if not self.session:
            await self._initialize_session()
        
        url = f"{self.api_url}{endpoint}"
        
        try:
            logger.debug(f"Making {method} request to {url}")
            
            kwargs = {}
            if data:
                kwargs['json'] = data
            if params:
                kwargs['params'] = params
            
            async with self.session.request(method, url, **kwargs) as response:
                response_data = await response.json()
                
                if response.status == 429 and retry_count < self.rate_limit_retries:
                    # Rate limited, retry with exponential backoff
                    delay = self.retry_delay * (2 ** retry_count)
                    logger.warning(f"Rate limited. Retrying in {delay}s (attempt {retry_count + 1})")
                    await asyncio.sleep(delay)
                    return await self._make_request(method, endpoint, data, params, retry_count + 1)
                
                if not response.ok:
                    raise AIMultiModelSDKError(
                        response_data.get('error', f'HTTP {response.status}'),
                        response.status,
                        response_data
                    )
                
                logger.debug(f"Response received: {response.status}")
                return response_data
                
        except aiohttp.ClientError as e:
            logger.error(f"Request failed: {str(e)}")
            raise AIMultiModelSDKError(f"Request failed: {str(e)}")
    
    async def _connect_websocket(self):
        """Connect to WebSocket"""
        try:
            ws_url = f"{self.websocket_url}?apiKey={self.api_key}"
            self.websocket = await websockets.connect(ws_url)
            self.websocket_connected = True
            
            logger.info("WebSocket connected")
            
            # Start listening for messages
            asyncio.create_task(self._websocket_listener())
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {str(e)}")
            if self.auto_reconnect:
                asyncio.create_task(self._reconnect_websocket())
    
    async def _websocket_listener(self):
        """Listen for WebSocket messages"""
        try:
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    await self._handle_websocket_message(data)
                except json.JSONDecodeError:
                    logger.warning("Invalid JSON received from WebSocket")
                
        except websockets.exceptions.ConnectionClosed:
            logger.warning("WebSocket connection closed")
            self.websocket_connected = False
            
            if self.auto_reconnect:
                asyncio.create_task(self._reconnect_websocket())
    
    async def _handle_websocket_message(self, message: Dict):
        """Handle incoming WebSocket message"""
        message_type = message.get('type')
        data = message.get('data', {})
        
        # Call registered callbacks
        if message_type in self.websocket_callbacks:
            for callback in self.websocket_callbacks[message_type]:
                try:
                    if asyncio.iscoroutinefunction(callback):
                        await callback(data)
                    else:
                        callback(data)
                except Exception as e:
                    logger.error(f"Callback error: {str(e)}")
    
    async def _reconnect_websocket(self):
        """Reconnect to WebSocket"""
        await asyncio.sleep(5)  # Wait before reconnecting
        await self._connect_websocket()
    
    def subscribe(self, event_type: str, callback: Callable):
        """
        Subscribe to WebSocket events
        
        Args:
            event_type: Type of event to subscribe to
            callback: Callback function to handle events
        """
        if event_type not in self.websocket_callbacks:
            self.websocket_callbacks[event_type] = []
        
        self.websocket_callbacks[event_type].append(callback)
        
        # Send subscription message
        if self.websocket_connected:
            asyncio.create_task(self._send_websocket_message({
                'type': 'subscribe',
                'data': {'subscriptionType': event_type}
            }))
    
    def unsubscribe(self, event_type: str, callback: Optional[Callable] = None):
        """
        Unsubscribe from WebSocket events
        
        Args:
            event_type: Type of event to unsubscribe from
            callback: Specific callback to remove (removes all if None)
        """
        if event_type in self.websocket_callbacks:
            if callback:
                self.websocket_callbacks[event_type].remove(callback)
            else:
                del self.websocket_callbacks[event_type]
        
        # Send unsubscription message
        if self.websocket_connected:
            asyncio.create_task(self._send_websocket_message({
                'type': 'unsubscribe',
                'data': {'subscriptionType': event_type}
            }))
    
    async def _send_websocket_message(self, message: Dict):
        """Send message through WebSocket"""
        if self.websocket_connected and self.websocket:
            try:
                await self.websocket.send(json.dumps(message))
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {str(e)}")
    
    async def close(self):
        """Close SDK connections"""
        if self.websocket:
            await self.websocket.close()
        
        if self.session:
            await self.session.close()
        
        logger.info("SDK closed")


class AIModule:
    """AI processing module"""
    
    def __init__(self, sdk: AIMultiModelSDK):
        self.sdk = sdk
    
    async def process(
        self,
        prompt: str,
        model: Optional[str] = None,
        parameters: Optional[Dict] = None,
        use_case: Optional[str] = None
    ) -> AIResponse:
        """
        Process a single AI request
        
        Args:
            prompt: Input prompt for the AI model
            model: Specific model to use (optional)
            parameters: Model parameters (optional)
            use_case: Use case for intelligent model selection (optional)
            
        Returns:
            AIResponse object with the result
        """
        if not prompt:
            raise ValueError("Prompt is required")
        
        data = {
            'prompt': prompt,
            'model': model,
            'parameters': parameters or {},
            'use_case': use_case
        }
        
        try:
            response = await self.sdk._make_request('POST', '/ai/process', data)
            
            if response.get('success'):
                return AIResponse(
                    success=True,
                    data=response.get('data'),
                    model=response.get('model'),
                    processing_time=response.get('processing_time'),
                    cost=response.get('cost'),
                    request_id=response.get('request_id')
                )
            else:
                return AIResponse(
                    success=False,
                    error=response.get('error')
                )
                
        except Exception as e:
            raise AIError(f"Failed to process AI request: {str(e)}")
    
    async def consensus(
        self,
        prompt: str,
        models: List[str],
        parameters: Optional[Dict] = None
    ) -> ConsensusResponse:
        """
        Process with consensus from multiple models
        
        Args:
            prompt: Input prompt for the AI models
            models: List of models to use for consensus
            parameters: Model parameters (optional)
            
        Returns:
            ConsensusResponse object with the results
        """
        if not prompt:
            raise ValueError("Prompt is required")
        
        if not models:
            raise ValueError("At least one model is required for consensus")
        
        data = {
            'prompt': prompt,
            'models': models,
            'parameters': parameters or {}
        }
        
        try:
            response = await self.sdk._make_request('POST', '/ai/consensus', data)
            
            consensus_results = []
            for result in response.get('consensus', []):
                consensus_results.append(AIResponse(
                    success=result.get('success', False),
                    data=result.get('data'),
                    model=result.get('model'),
                    processing_time=result.get('processing_time'),
                    cost=result.get('cost'),
                    error=result.get('error')
                ))
            
            recommended = response.get('recommended_result', {})
            recommended_response = AIResponse(
                success=recommended.get('success', False),
                data=recommended.get('data'),
                model=recommended.get('model'),
                processing_time=recommended.get('processing_time'),
                cost=recommended.get('cost')
            )
            
            return ConsensusResponse(
                success=response.get('success', False),
                consensus=consensus_results,
                summary=response.get('summary', {}),
                recommended_result=recommended_response,
                total_cost=response.get('total_cost', 0.0),
                processing_time=response.get('processing_time', 0.0)
            )
            
        except Exception as e:
            raise AIError(f"Failed to process consensus request: {str(e)}")
    
    async def get_models(self) -> Dict:
        """Get available AI models"""
        try:
            response = await self.sdk._make_request('GET', '/ai/models')
            return response
        except Exception as e:
            raise AIError(f"Failed to get available models: {str(e)}")
    
    async def get_model_info(self, model_id: str) -> Dict:
        """
        Get specific model information
        
        Args:
            model_id: ID of the model
            
        Returns:
            Model information dictionary
        """
        if not model_id:
            raise ValueError("Model ID is required")
        
        try:
            response = await self.sdk._make_request('GET', f'/ai/models/{model_id}')
            return response
        except Exception as e:
            raise AIError(f"Failed to get model info for {model_id}: {str(e)}")
    
    async def test(
        self,
        prompt: str,
        models: Optional[List[str]] = None,
        parameters: Optional[Dict] = None
    ) -> Dict:
        """
        Test models with a sample prompt
        
        Args:
            prompt: Test prompt
            models: List of models to test (optional)
            parameters: Model parameters (optional)
            
        Returns:
            Test results dictionary
        """
        if not prompt:
            raise ValueError("Prompt is required for testing")
        
        data = {
            'prompt': prompt,
            'models': models or [],
            'parameters': parameters or {}
        }
        
        try:
            response = await self.sdk._make_request('POST', '/ai/test', data)
            return response
        except Exception as e:
            raise AIError(f"Failed to test models: {str(e)}")


class AnalyticsModule:
    """Analytics and metrics module"""
    
    def __init__(self, sdk: AIMultiModelSDK):
        self.sdk = sdk
    
    async def get_usage(self, timeframe: str = '24h') -> Dict:
        """Get usage analytics"""
        try:
            response = await self.sdk._make_request('GET', '/analytics/usage', params={'timeframe': timeframe})
            return response
        except Exception as e:
            raise AnalyticsError(f"Failed to get usage analytics: {str(e)}")
    
    async def get_performance(self, timeframe: str = '24h') -> Dict:
        """Get performance metrics"""
        try:
            response = await self.sdk._make_request('GET', '/analytics/performance', params={'timeframe': timeframe})
            return response
        except Exception as e:
            raise AnalyticsError(f"Failed to get performance metrics: {str(e)}")
    
    async def get_costs(self, timeframe: str = '24h') -> Dict:
        """Get cost analytics"""
        try:
            response = await self.sdk._make_request('GET', '/analytics/costs', params={'timeframe': timeframe})
            return response
        except Exception as e:
            raise AnalyticsError(f"Failed to get cost analytics: {str(e)}")


class BatchModule:
    """Batch processing module"""
    
    def __init__(self, sdk: AIMultiModelSDK):
        self.sdk = sdk
    
    async def submit(
        self,
        requests: List[Dict],
        callback_url: Optional[str] = None,
        priority: str = 'normal'
    ) -> Dict:
        """Submit a batch job"""
        if not requests or not isinstance(requests, list):
            raise ValueError("Requests array is required")
        
        data = {
            'requests': requests,
            'callback_url': callback_url,
            'priority': priority
        }
        
        try:
            response = await self.sdk._make_request('POST', '/batch/submit', data)
            return response
        except Exception as e:
            raise BatchError(f"Failed to submit batch job: {str(e)}")
    
    async def get_status(self, job_id: str) -> BatchJob:
        """Get batch job status"""
        if not job_id:
            raise ValueError("Job ID is required")
        
        try:
            response = await self.sdk._make_request('GET', f'/batch/{job_id}')
            data = response.get('data', {})
            
            return BatchJob(
                id=data.get('id', ''),
                status=data.get('status', ''),
                progress=data.get('progress', 0.0),
                total_requests=data.get('totalRequests', 0),
                completed_requests=data.get('completedRequests', 0),
                failed_requests=data.get('failedRequests', 0),
                estimated_completion=data.get('estimatedCompletion'),
                created_at=data.get('createdAt', '')
            )
        except Exception as e:
            raise BatchError(f"Failed to get status for job {job_id}: {str(e)}")
    
    async def cancel(self, job_id: str) -> Dict:
        """Cancel a batch job"""
        if not job_id:
            raise ValueError("Job ID is required")
        
        try:
            response = await self.sdk._make_request('DELETE', f'/batch/{job_id}')
            return response
        except Exception as e:
            raise BatchError(f"Failed to cancel job {job_id}: {str(e)}")


class WebhookModule:
    """Webhook management module"""
    
    def __init__(self, sdk: AIMultiModelSDK):
        self.sdk = sdk
    
    async def register(self, url: str, events: List[str], secret: Optional[str] = None) -> Dict:
        """Register a webhook"""
        if not url:
            raise ValueError("Webhook URL is required")
        
        if not events or not isinstance(events, list):
            raise ValueError("Events array is required")
        
        data = {
            'url': url,
            'events': events,
            'secret': secret
        }
        
        try:
            response = await self.sdk._make_request('POST', '/webhooks', data)
            return response
        except Exception as e:
            raise WebhookError(f"Failed to register webhook: {str(e)}")
    
    async def list(self) -> Dict:
        """List webhooks"""
        try:
            response = await self.sdk._make_request('GET', '/webhooks')
            return response
        except Exception as e:
            raise WebhookError(f"Failed to list webhooks: {str(e)}")
    
    async def update(self, webhook_id: str, **kwargs) -> Dict:
        """Update webhook"""
        if not webhook_id:
            raise ValueError("Webhook ID is required")
        
        try:
            response = await self.sdk._make_request('PUT', f'/webhooks/{webhook_id}', kwargs)
            return response
        except Exception as e:
            raise WebhookError(f"Failed to update webhook {webhook_id}: {str(e)}")
    
    async def delete(self, webhook_id: str) -> Dict:
        """Delete webhook"""
        if not webhook_id:
            raise ValueError("Webhook ID is required")
        
        try:
            response = await self.sdk._make_request('DELETE', f'/webhooks/{webhook_id}')
            return response
        except Exception as e:
            raise WebhookError(f"Failed to delete webhook {webhook_id}: {str(e)}")


class AccountModule:
    """Account management module"""
    
    def __init__(self, sdk: AIMultiModelSDK):
        self.sdk = sdk
    
    async def get_info(self) -> Dict:
        """Get account information"""
        try:
            response = await self.sdk._make_request('GET', '/account')
            return response
        except Exception as e:
            raise AccountError(f"Failed to get account info: {str(e)}")
    
    async def get_docs(self) -> Dict:
        """Get API documentation"""
        try:
            response = await self.sdk._make_request('GET', '/docs')
            return response
        except Exception as e:
            raise AccountError(f"Failed to get API documentation: {str(e)}")


# Utility functions
def validate_api_key(api_key: str) -> bool:
    """Validate API key format"""
    if not api_key or not isinstance(api_key, str):
        return False
    
    return api_key.startswith('sk_') and len(api_key) >= 32


def format_parameters(params: Dict) -> Dict:
    """Format model parameters"""
    formatted = {}
    
    if 'temperature' in params:
        formatted['temperature'] = max(0, min(2, params['temperature']))
    
    if 'max_tokens' in params:
        formatted['max_tokens'] = max(1, params['max_tokens'])
    
    if 'top_p' in params:
        formatted['top_p'] = max(0, min(1, params['top_p']))
    
    return formatted


def generate_request_id() -> str:
    """Generate request ID for tracking"""
    import random
    import string
    
    timestamp = str(int(time.time()))
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    
    return f"req_{timestamp}_{random_str}"


# Export main classes
__all__ = [
    'AIMultiModelSDK',
    'AIResponse',
    'ConsensusResponse',
    'BatchJob',
    'AIMultiModelSDKError',
    'AIError',
    'AnalyticsError',
    'BatchError',
    'WebhookError',
    'AccountError',
    'validate_api_key',
    'format_parameters',
    'generate_request_id'
]