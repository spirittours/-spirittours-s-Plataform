"""
Social Media Platform Adapters
Provides unified interface for interacting with different social media APIs
"""

import httpx
import logging
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from datetime import datetime

logger = logging.getLogger(__name__)


# ============================================================================
# BASE ADAPTER
# ============================================================================

class SocialMediaAdapter(ABC):
    """
    Abstract base class for social media platform adapters
    All platform adapters must implement these methods
    """
    
    def __init__(self, credentials: Dict[str, Any]):
        """
        Initialize adapter with platform credentials
        
        Args:
            credentials: Dictionary with decrypted API credentials
        """
        self.credentials = credentials
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    @abstractmethod
    async def test_connection(self) -> Dict[str, Any]:
        """
        Test connection to platform API
        
        Returns:
            Dict with keys: connected (bool), account_info (dict), error (str)
        """
        pass
    
    @abstractmethod
    async def publish_post(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publish a post to the platform
        
        Args:
            content: Post content (text, media_urls, etc.)
            
        Returns:
            Dict with post_id, post_url, published_at
        """
        pass
    
    @abstractmethod
    async def get_post_metrics(self, post_id: str) -> Dict[str, Any]:
        """
        Get engagement metrics for a post
        
        Args:
            post_id: Platform-specific post ID
            
        Returns:
            Dict with likes, comments, shares, views
        """
        pass
    
    async def close(self):
        """Close HTTP client"""
        await self.http_client.aclose()


# ============================================================================
# FACEBOOK ADAPTER
# ============================================================================

class FacebookAdapter(SocialMediaAdapter):
    """
    Facebook Graph API adapter
    API Docs: https://developers.facebook.com/docs/graph-api
    """
    
    API_VERSION = 'v19.0'
    BASE_URL = f'https://graph.facebook.com/{API_VERSION}'
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Facebook connection using Page Access Token"""
        try:
            access_token = self.credentials.get('access_token')
            page_id = self.credentials.get('page_id')
            
            if not access_token or not page_id:
                return {
                    'connected': False,
                    'error': 'Missing access_token or page_id'
                }
            
            # Get page information
            url = f"{self.BASE_URL}/{page_id}"
            params = {
                'access_token': access_token,
                'fields': 'id,name,username,fan_count,link'
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Facebook connection successful: {data.get('name')}")
                
                return {
                    'connected': True,
                    'account_info': {
                        'id': data.get('id'),
                        'name': data.get('name'),
                        'username': data.get('username'),
                        'followers': data.get('fan_count'),
                        'url': data.get('link')
                    }
                }
            else:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"❌ Facebook connection failed: {error_msg}")
                
                return {
                    'connected': False,
                    'error': error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ Facebook connection error: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
    
    async def publish_post(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Publish post to Facebook Page"""
        try:
            access_token = self.credentials.get('access_token')
            page_id = self.credentials.get('page_id')
            
            url = f"{self.BASE_URL}/{page_id}/feed"
            
            data = {
                'access_token': access_token,
                'message': content.get('content_text', '')
            }
            
            # Add link if provided
            if content.get('link'):
                data['link'] = content['link']
            
            response = await self.http_client.post(url, data=data)
            
            if response.status_code == 200:
                result = response.json()
                post_id = result.get('id')
                
                logger.info(f"✅ Published to Facebook: {post_id}")
                
                return {
                    'success': True,
                    'post_id': post_id,
                    'post_url': f"https://facebook.com/{post_id}",
                    'published_at': datetime.utcnow().isoformat()
                }
            else:
                error = response.json().get('error', {})
                raise Exception(error.get('message', 'Failed to publish'))
                
        except Exception as e:
            logger.error(f"❌ Facebook publish error: {e}")
            raise
    
    async def get_post_metrics(self, post_id: str) -> Dict[str, Any]:
        """Get engagement metrics for Facebook post"""
        try:
            access_token = self.credentials.get('access_token')
            
            url = f"{self.BASE_URL}/{post_id}"
            params = {
                'access_token': access_token,
                'fields': 'shares,likes.summary(true),comments.summary(true),reactions.summary(true)'
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                
                return {
                    'likes': data.get('reactions', {}).get('summary', {}).get('total_count', 0),
                    'comments': data.get('comments', {}).get('summary', {}).get('total_count', 0),
                    'shares': data.get('shares', {}).get('count', 0),
                    'engagement_total': (
                        data.get('reactions', {}).get('summary', {}).get('total_count', 0) +
                        data.get('comments', {}).get('summary', {}).get('total_count', 0) +
                        data.get('shares', {}).get('count', 0)
                    )
                }
            else:
                raise Exception('Failed to fetch metrics')
                
        except Exception as e:
            logger.error(f"❌ Facebook metrics error: {e}")
            return {'likes': 0, 'comments': 0, 'shares': 0, 'engagement_total': 0}


# ============================================================================
# INSTAGRAM ADAPTER
# ============================================================================

class InstagramAdapter(SocialMediaAdapter):
    """
    Instagram Graph API adapter (via Facebook)
    API Docs: https://developers.facebook.com/docs/instagram-api
    """
    
    API_VERSION = 'v19.0'
    BASE_URL = f'https://graph.facebook.com/{API_VERSION}'
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Instagram connection"""
        try:
            access_token = self.credentials.get('access_token')
            ig_account_id = self.credentials.get('instagram_business_account_id')
            
            if not access_token or not ig_account_id:
                return {
                    'connected': False,
                    'error': 'Missing access_token or instagram_business_account_id'
                }
            
            # Get Instagram account info
            url = f"{self.BASE_URL}/{ig_account_id}"
            params = {
                'access_token': access_token,
                'fields': 'id,username,name,followers_count,profile_picture_url'
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Instagram connection successful: @{data.get('username')}")
                
                return {
                    'connected': True,
                    'account_info': {
                        'id': data.get('id'),
                        'name': data.get('name'),
                        'username': data.get('username'),
                        'followers': data.get('followers_count'),
                        'profile_image': data.get('profile_picture_url')
                    }
                }
            else:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"❌ Instagram connection failed: {error_msg}")
                
                return {
                    'connected': False,
                    'error': error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ Instagram connection error: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
    
    async def publish_post(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Publish post to Instagram (2-step process: create container, then publish)
        """
        try:
            access_token = self.credentials.get('access_token')
            ig_account_id = self.credentials.get('instagram_business_account_id')
            
            # Step 1: Create media container
            create_url = f"{self.BASE_URL}/{ig_account_id}/media"
            
            media_data = {
                'access_token': access_token,
                'caption': content.get('content_text', '')
            }
            
            # Handle different media types
            if content.get('media_urls'):
                media_url = content['media_urls'][0]  # Instagram supports one image per post
                media_data['image_url'] = media_url
            
            create_response = await self.http_client.post(create_url, data=media_data)
            
            if create_response.status_code != 200:
                raise Exception('Failed to create media container')
            
            container_id = create_response.json().get('id')
            
            # Step 2: Publish the container
            publish_url = f"{self.BASE_URL}/{ig_account_id}/media_publish"
            publish_data = {
                'access_token': access_token,
                'creation_id': container_id
            }
            
            publish_response = await self.http_client.post(publish_url, data=publish_data)
            
            if publish_response.status_code == 200:
                result = publish_response.json()
                post_id = result.get('id')
                
                logger.info(f"✅ Published to Instagram: {post_id}")
                
                return {
                    'success': True,
                    'post_id': post_id,
                    'post_url': f"https://instagram.com/p/{post_id}",
                    'published_at': datetime.utcnow().isoformat()
                }
            else:
                raise Exception('Failed to publish media')
                
        except Exception as e:
            logger.error(f"❌ Instagram publish error: {e}")
            raise
    
    async def get_post_metrics(self, post_id: str) -> Dict[str, Any]:
        """Get engagement metrics for Instagram post"""
        try:
            access_token = self.credentials.get('access_token')
            
            url = f"{self.BASE_URL}/{post_id}/insights"
            params = {
                'access_token': access_token,
                'metric': 'engagement,impressions,reach,saved'
            }
            
            response = await self.http_client.get(url, params=params)
            
            if response.status_code == 200:
                data = response.json()
                insights = {item['name']: item['values'][0]['value'] for item in data.get('data', [])}
                
                return {
                    'likes': insights.get('engagement', 0),  # Instagram groups likes into engagement
                    'comments': 0,  # Requires separate API call
                    'shares': insights.get('saved', 0),
                    'views': insights.get('impressions', 0),
                    'reach': insights.get('reach', 0)
                }
            else:
                raise Exception('Failed to fetch metrics')
                
        except Exception as e:
            logger.error(f"❌ Instagram metrics error: {e}")
            return {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0}


# ============================================================================
# TWITTER/X ADAPTER
# ============================================================================

class TwitterAdapter(SocialMediaAdapter):
    """
    Twitter API v2 adapter
    API Docs: https://developer.twitter.com/en/docs/twitter-api
    """
    
    BASE_URL = 'https://api.twitter.com/2'
    
    async def test_connection(self) -> Dict[str, Any]:
        """Test Twitter connection"""
        try:
            bearer_token = self.credentials.get('bearer_token')
            
            if not bearer_token:
                return {
                    'connected': False,
                    'error': 'Missing bearer_token'
                }
            
            # Get authenticated user info
            url = f"{self.BASE_URL}/users/me"
            headers = {
                'Authorization': f'Bearer {bearer_token}'
            }
            params = {
                'user.fields': 'id,name,username,public_metrics,profile_image_url'
            }
            
            response = await self.http_client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                metrics = data.get('public_metrics', {})
                
                logger.info(f"✅ Twitter connection successful: @{data.get('username')}")
                
                return {
                    'connected': True,
                    'account_info': {
                        'id': data.get('id'),
                        'name': data.get('name'),
                        'username': data.get('username'),
                        'followers': metrics.get('followers_count', 0),
                        'profile_image': data.get('profile_image_url')
                    }
                }
            else:
                error_data = response.json()
                error_msg = error_data.get('detail', error_data.get('title', 'Unknown error'))
                logger.error(f"❌ Twitter connection failed: {error_msg}")
                
                return {
                    'connected': False,
                    'error': error_msg
                }
                
        except Exception as e:
            logger.error(f"❌ Twitter connection error: {e}")
            return {
                'connected': False,
                'error': str(e)
            }
    
    async def publish_post(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """Publish tweet to Twitter"""
        try:
            bearer_token = self.credentials.get('bearer_token')
            
            url = f"{self.BASE_URL}/tweets"
            headers = {
                'Authorization': f'Bearer {bearer_token}',
                'Content-Type': 'application/json'
            }
            
            tweet_data = {
                'text': content.get('content_text', '')
            }
            
            response = await self.http_client.post(url, headers=headers, json=tweet_data)
            
            if response.status_code == 201:
                result = response.json().get('data', {})
                tweet_id = result.get('id')
                username = self.credentials.get('username', 'user')
                
                logger.info(f"✅ Published to Twitter: {tweet_id}")
                
                return {
                    'success': True,
                    'post_id': tweet_id,
                    'post_url': f"https://twitter.com/{username}/status/{tweet_id}",
                    'published_at': datetime.utcnow().isoformat()
                }
            else:
                error = response.json()
                raise Exception(error.get('detail', 'Failed to publish'))
                
        except Exception as e:
            logger.error(f"❌ Twitter publish error: {e}")
            raise
    
    async def get_post_metrics(self, post_id: str) -> Dict[str, Any]:
        """Get engagement metrics for tweet"""
        try:
            bearer_token = self.credentials.get('bearer_token')
            
            url = f"{self.BASE_URL}/tweets/{post_id}"
            headers = {
                'Authorization': f'Bearer {bearer_token}'
            }
            params = {
                'tweet.fields': 'public_metrics'
            }
            
            response = await self.http_client.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json().get('data', {})
                metrics = data.get('public_metrics', {})
                
                return {
                    'likes': metrics.get('like_count', 0),
                    'comments': metrics.get('reply_count', 0),
                    'shares': metrics.get('retweet_count', 0),
                    'views': metrics.get('impression_count', 0)
                }
            else:
                raise Exception('Failed to fetch metrics')
                
        except Exception as e:
            logger.error(f"❌ Twitter metrics error: {e}")
            return {'likes': 0, 'comments': 0, 'shares': 0, 'views': 0}


# ============================================================================
# ADAPTER FACTORY
# ============================================================================

def get_platform_adapter(platform: str) -> type:
    """
    Get the appropriate adapter class for a platform
    
    Args:
        platform: Platform identifier
        
    Returns:
        Adapter class (not instantiated)
        
    Example:
        >>> adapter_class = get_platform_adapter('facebook')
        >>> adapter = adapter_class(credentials)
        >>> result = await adapter.test_connection()
    """
    adapters = {
        'facebook': FacebookAdapter,
        'instagram': InstagramAdapter,
        'twitter_x': TwitterAdapter,
        # Additional adapters will be added here
        # 'linkedin': LinkedInAdapter,
        # 'tiktok': TikTokAdapter,
        # 'youtube': YouTubeAdapter,
    }
    
    if platform not in adapters:
        raise ValueError(f"No adapter available for platform: {platform}")
    
    return adapters[platform]


# Note: LinkedIn, TikTok, and YouTube adapters follow same pattern
# Implement them when needed based on priority
