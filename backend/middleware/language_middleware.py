"""
Language Detection Middleware

Middleware for automatically detecting and setting the preferred language
from various sources (headers, cookies, query parameters).
"""

from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from backend.i18n.translation_service import translation_service


class LanguageMiddleware(BaseHTTPMiddleware):
    """
    Middleware to detect and set user's preferred language.
    
    Language detection priority:
    1. Query parameter (?lang=es)
    2. Cookie (language cookie)
    3. Accept-Language header
    4. Default language (en)
    
    The detected language is:
    - Stored in request.state.language
    - Set as a response cookie (if changed)
    - Used for any language-specific processing
    """
    
    COOKIE_NAME = 'language'
    COOKIE_MAX_AGE = 365 * 24 * 60 * 60  # 1 year
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and detect language preference.
        
        Args:
            request: Incoming request
            call_next: Next middleware/handler
            
        Returns:
            Response with language cookie set
        """
        # Detect language from multiple sources
        language = self._detect_language(request)
        
        # Store in request state for use in handlers
        request.state.language = language
        
        # Process request
        response = await call_next(request)
        
        # Set language cookie if not already set or different
        current_cookie = request.cookies.get(self.COOKIE_NAME)
        if current_cookie != language:
            response.set_cookie(
                key=self.COOKIE_NAME,
                value=language,
                max_age=self.COOKIE_MAX_AGE,
                httponly=True,
                samesite='lax',
                secure=False  # Set to True in production with HTTPS
            )
        
        # Add language to response headers for debugging
        response.headers['X-Language'] = language
        
        return response
    
    def _detect_language(self, request: Request) -> str:
        """
        Detect preferred language from request.
        
        Priority order:
        1. Query parameter (?lang=es)
        2. Cookie
        3. Accept-Language header
        4. Default language
        
        Args:
            request: Incoming request
            
        Returns:
            Detected language code
        """
        # 1. Check query parameter
        lang_param = request.query_params.get('lang')
        if lang_param and self._is_supported_language(lang_param):
            return lang_param
        
        # 2. Check cookie
        lang_cookie = request.cookies.get(self.COOKIE_NAME)
        if lang_cookie and self._is_supported_language(lang_cookie):
            return lang_cookie
        
        # 3. Check Accept-Language header
        accept_language = request.headers.get('Accept-Language')
        if accept_language:
            detected = translation_service.detect_language_from_header(accept_language)
            if self._is_supported_language(detected):
                return detected
        
        # 4. Return default language
        return translation_service.DEFAULT_LANGUAGE
    
    def _is_supported_language(self, language: str) -> bool:
        """
        Check if a language code is supported.
        
        Args:
            language: Language code to check
            
        Returns:
            True if language is supported
        """
        return language in translation_service.SUPPORTED_LANGUAGES


def get_language_from_request(request: Request) -> str:
    """
    Helper function to get the detected language from request state.
    
    Usage in route handlers:
    ```python
    @router.get('/some-endpoint')
    async def some_endpoint(request: Request):
        language = get_language_from_request(request)
        # Use language for processing
    ```
    
    Args:
        request: FastAPI request object
        
    Returns:
        Detected language code or default language
    """
    return getattr(request.state, 'language', translation_service.DEFAULT_LANGUAGE)
