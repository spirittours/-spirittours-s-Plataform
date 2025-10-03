"""
Plausible Analytics Service - Free Alternative to Google Analytics / Mixpanel
Implements privacy-focused, lightweight analytics without cookies
Cost: $0 (self-hosted) or $9/month (cloud)
Features:
- No cookies, GDPR compliant by default
- Real-time visitor tracking
- Custom events and goals
- Conversion funnels
- UTM campaign tracking
- API access for custom dashboards
- Lightweight script (< 1KB)
- No personal data collection
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, date
from dataclasses import dataclass, asdict
import json
import hashlib
from enum import Enum
import logging
from urllib.parse import urlparse, parse_qs

logger = logging.getLogger(__name__)

class MetricType(Enum):
    VISITORS = "visitors"
    PAGEVIEWS = "pageviews"
    BOUNCE_RATE = "bounce_rate"
    VISIT_DURATION = "visit_duration"
    EVENTS = "events"
    CONVERSIONS = "conversions"

class Period(Enum):
    REALTIME = "realtime"
    DAY = "day"
    DAYS_7 = "7d"
    DAYS_30 = "30d"
    MONTH = "month"
    MONTHS_6 = "6mo"
    MONTHS_12 = "12mo"
    CUSTOM = "custom"

@dataclass
class Visitor:
    """Visitor information"""
    visitor_id: str
    first_seen: datetime
    last_seen: datetime
    page_views: int
    visit_duration: int  # seconds
    referrer: Optional[str] = None
    country: Optional[str] = None
    device: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    
@dataclass
class PageView:
    """Page view data"""
    url: str
    title: str
    visitors: int
    pageviews: int
    bounce_rate: float
    avg_duration: int  # seconds
    entry_pages: int
    exit_pages: int
    
@dataclass
class Event:
    """Custom event"""
    name: str
    count: int
    unique_visitors: int
    properties: Dict[str, Any]
    conversion_rate: Optional[float] = None
    
@dataclass
class Goal:
    """Conversion goal"""
    name: str
    event_name: str
    page_path: Optional[str] = None
    completions: int = 0
    conversion_rate: float = 0.0
    
@dataclass
class Source:
    """Traffic source"""
    name: str
    visitors: int
    bounce_rate: float
    visit_duration: int
    medium: Optional[str] = None
    campaign: Optional[str] = None
    
class PlausibleAnalyticsService:
    """
    Complete Plausible Analytics integration
    Privacy-focused, cookie-free analytics
    """
    
    def __init__(
        self,
        site_domain: str,
        api_key: Optional[str] = None,
        server_url: str = None
    ):
        # Configuration
        self.site_domain = site_domain
        self.api_key = api_key
        
        # Use self-hosted or cloud instance
        self.server_url = server_url or "https://plausible.io"
        self.api_url = f"{self.server_url}/api/v1"
        
        # Tracking script URL
        self.script_url = f"{self.server_url}/js/script.js"
        
        # Session management
        self.active_visitors: Dict[str, Visitor] = {}
        
        # Goals and funnels
        self.goals: Dict[str, Goal] = {}
        self.funnels: Dict[str, List[str]] = {}
        
        # Cache for analytics data
        self.cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5 minutes
        
    def get_tracking_script(self, 
                           extensions: List[str] = None,
                           custom_domain: Optional[str] = None) -> str:
        """
        Get Plausible tracking script tag
        Extensions: outbound-links, file-downloads, tagged-events, revenue
        """
        # Build script filename with extensions
        script_name = "script"
        if extensions:
            script_name = f"script.{'.'.join(extensions)}"
            
        script_src = f"{self.server_url}/js/{script_name}.js"
        
        # Use custom domain if provided
        if custom_domain:
            script_src = f"https://{custom_domain}/{script_name}.js"
            
        return f"""
        <script defer data-domain="{self.site_domain}" src="{script_src}"></script>
        """
        
    async def track_pageview(
        self,
        url: str,
        referrer: Optional[str] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Track page view server-side
        Useful for API endpoints, server-rendered pages
        """
        try:
            # Hash IP for privacy (Plausible doesn't store raw IPs)
            visitor_id = hashlib.sha256(
                f"{ip_address}{user_agent}{date.today()}".encode()
            ).hexdigest()[:16]
            
            event_data = {
                "name": "pageview",
                "url": url,
                "domain": self.site_domain,
                "referrer": referrer,
                "screen_width": 1920  # Default for server-side
            }
            
            headers = {
                "User-Agent": user_agent or "SpiritTours/1.0",
                "X-Forwarded-For": ip_address
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.server_url}/api/event",
                    json=event_data,
                    headers=headers
                )
                
                return response.status_code == 202
                
        except Exception as e:
            logger.error(f"Track pageview error: {e}")
            
        return False
        
    async def track_event(
        self,
        name: str,
        props: Optional[Dict[str, Any]] = None,
        url: Optional[str] = None,
        revenue: Optional[float] = None,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """
        Track custom event
        Examples: signup, purchase, download, video_play
        """
        try:
            event_data = {
                "name": name,
                "url": url or f"https://{self.site_domain}/",
                "domain": self.site_domain,
                "props": props or {}
            }
            
            # Add revenue tracking if provided
            if revenue:
                event_data["revenue"] = {
                    "currency": "USD",
                    "amount": revenue
                }
                
            headers = {
                "User-Agent": user_agent or "SpiritTours/1.0"
            }
            
            if ip_address:
                headers["X-Forwarded-For"] = ip_address
                
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.server_url}/api/event",
                    json=event_data,
                    headers=headers
                )
                
                # Check if event matches any goals
                await self._check_goal_completion(name, props)
                
                return response.status_code == 202
                
        except Exception as e:
            logger.error(f"Track event error: {e}")
            
        return False
        
    async def get_stats(
        self,
        period: Period = Period.DAYS_30,
        metrics: List[MetricType] = None,
        filters: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated stats
        """
        cache_key = f"stats_{period.value}_{metrics}_{filters}"
        
        # Check cache
        if cache_key in self.cache:
            cached = self.cache[cache_key]
            if cached["expires"] > datetime.now():
                return cached["data"]
                
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value
            }
            
            if metrics:
                params["metrics"] = ",".join([m.value for m in metrics])
                
            if filters:
                params["filters"] = json.dumps(filters)
                
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/aggregate",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    # Cache result
                    self.cache[cache_key] = {
                        "data": data,
                        "expires": datetime.now() + timedelta(seconds=self.cache_ttl)
                    }
                    
                    return data
                    
        except Exception as e:
            logger.error(f"Get stats error: {e}")
            
        return {}
        
    async def get_realtime_visitors(self) -> int:
        """
        Get current visitor count
        """
        try:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/realtime/visitors",
                    params={"site_id": self.site_domain},
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.json().get("visitors", 0)
                    
        except Exception as e:
            logger.error(f"Get realtime visitors error: {e}")
            
        return 0
        
    async def get_top_pages(
        self,
        period: Period = Period.DAYS_30,
        limit: int = 10
    ) -> List[PageView]:
        """
        Get most visited pages
        """
        pages = []
        
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "property": "event:page",
                "limit": limit
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        pages.append(PageView(
                            url=item.get("page"),
                            title=item.get("page"),  # Title would need separate tracking
                            visitors=item.get("visitors", 0),
                            pageviews=item.get("pageviews", 0),
                            bounce_rate=item.get("bounce_rate", 0),
                            avg_duration=item.get("visit_duration", 0),
                            entry_pages=item.get("entries", 0),
                            exit_pages=item.get("exits", 0)
                        ))
                        
        except Exception as e:
            logger.error(f"Get top pages error: {e}")
            
        return pages
        
    async def get_sources(
        self,
        period: Period = Period.DAYS_30,
        limit: int = 10
    ) -> List[Source]:
        """
        Get traffic sources
        """
        sources = []
        
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "property": "visit:source",
                "limit": limit
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        sources.append(Source(
                            name=item.get("source", "Direct"),
                            visitors=item.get("visitors", 0),
                            bounce_rate=item.get("bounce_rate", 0),
                            visit_duration=item.get("visit_duration", 0)
                        ))
                        
        except Exception as e:
            logger.error(f"Get sources error: {e}")
            
        return sources
        
    async def get_devices(
        self,
        period: Period = Period.DAYS_30
    ) -> Dict[str, Any]:
        """
        Get device breakdown
        """
        devices = {
            "desktop": 0,
            "mobile": 0,
            "tablet": 0,
            "browsers": {},
            "operating_systems": {}
        }
        
        try:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            # Get device types
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params={
                        "site_id": self.site_domain,
                        "period": period.value,
                        "property": "visit:device"
                    },
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        device = item.get("device", "").lower()
                        if device in devices:
                            devices[device] = item.get("visitors", 0)
                            
                # Get browsers
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params={
                        "site_id": self.site_domain,
                        "period": period.value,
                        "property": "visit:browser"
                    },
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        browser = item.get("browser")
                        devices["browsers"][browser] = item.get("visitors", 0)
                        
                # Get operating systems
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params={
                        "site_id": self.site_domain,
                        "period": period.value,
                        "property": "visit:os"
                    },
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        os = item.get("os")
                        devices["operating_systems"][os] = item.get("visitors", 0)
                        
        except Exception as e:
            logger.error(f"Get devices error: {e}")
            
        return devices
        
    async def get_countries(
        self,
        period: Period = Period.DAYS_30,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get visitor countries
        """
        countries = []
        
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "property": "visit:country",
                "limit": limit
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        countries.append({
                            "country": item.get("country"),
                            "country_code": item.get("country_code"),
                            "visitors": item.get("visitors", 0),
                            "percentage": item.get("percentage", 0)
                        })
                        
        except Exception as e:
            logger.error(f"Get countries error: {e}")
            
        return countries
        
    def create_goal(
        self,
        name: str,
        event_name: str,
        page_path: Optional[str] = None
    ) -> Goal:
        """
        Create conversion goal
        """
        goal = Goal(
            name=name,
            event_name=event_name,
            page_path=page_path
        )
        
        self.goals[name] = goal
        return goal
        
    async def get_goal_conversions(
        self,
        goal_name: str,
        period: Period = Period.DAYS_30
    ) -> Dict[str, Any]:
        """
        Get goal conversion data
        """
        if goal_name not in self.goals:
            return {}
            
        goal = self.goals[goal_name]
        
        try:
            # Get event data for goal
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "filters": json.dumps({
                    "event:name": goal.event_name
                })
            }
            
            if goal.page_path:
                params["filters"] = json.dumps({
                    "event:name": goal.event_name,
                    "event:page": goal.page_path
                })
                
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                # Get total visitors
                visitors_response = await client.get(
                    f"{self.api_url}/stats/aggregate",
                    params={
                        "site_id": self.site_domain,
                        "period": period.value,
                        "metrics": "visitors"
                    },
                    headers=headers
                )
                
                # Get conversions
                conversions_response = await client.get(
                    f"{self.api_url}/stats/aggregate",
                    params=params,
                    headers=headers
                )
                
                if visitors_response.status_code == 200 and conversions_response.status_code == 200:
                    visitors_data = visitors_response.json()
                    conversions_data = conversions_response.json()
                    
                    total_visitors = visitors_data.get("results", {}).get("visitors", {}).get("value", 1)
                    conversions = conversions_data.get("results", {}).get("events", {}).get("value", 0)
                    
                    return {
                        "goal_name": goal_name,
                        "conversions": conversions,
                        "conversion_rate": (conversions / total_visitors) * 100 if total_visitors > 0 else 0,
                        "total_visitors": total_visitors
                    }
                    
        except Exception as e:
            logger.error(f"Get goal conversions error: {e}")
            
        return {}
        
    def create_funnel(
        self,
        name: str,
        steps: List[str]
    ) -> Dict[str, Any]:
        """
        Create conversion funnel
        Steps are page paths or event names
        """
        self.funnels[name] = steps
        
        return {
            "name": name,
            "steps": steps,
            "created": datetime.now()
        }
        
    async def get_funnel_analysis(
        self,
        funnel_name: str,
        period: Period = Period.DAYS_30
    ) -> Dict[str, Any]:
        """
        Analyze funnel conversion rates
        """
        if funnel_name not in self.funnels:
            return {}
            
        steps = self.funnels[funnel_name]
        funnel_data = {
            "name": funnel_name,
            "steps": [],
            "overall_conversion": 0
        }
        
        try:
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                previous_visitors = None
                
                for i, step in enumerate(steps):
                    # Determine if step is page or event
                    if step.startswith("/"):
                        # Page path
                        filters = {"event:page": step}
                    else:
                        # Event name
                        filters = {"event:name": step}
                        
                    params = {
                        "site_id": self.site_domain,
                        "period": period.value,
                        "filters": json.dumps(filters),
                        "metrics": "visitors"
                    }
                    
                    response = await client.get(
                        f"{self.api_url}/stats/aggregate",
                        params=params,
                        headers=headers
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        visitors = data.get("results", {}).get("visitors", {}).get("value", 0)
                        
                        step_data = {
                            "step": step,
                            "visitors": visitors,
                            "drop_off": 0,
                            "conversion_rate": 100
                        }
                        
                        if previous_visitors is not None:
                            drop_off = previous_visitors - visitors
                            step_data["drop_off"] = drop_off
                            step_data["conversion_rate"] = (visitors / previous_visitors * 100) if previous_visitors > 0 else 0
                            
                        funnel_data["steps"].append(step_data)
                        previous_visitors = visitors
                        
                # Calculate overall conversion
                if funnel_data["steps"]:
                    first_step = funnel_data["steps"][0]["visitors"]
                    last_step = funnel_data["steps"][-1]["visitors"]
                    
                    if first_step > 0:
                        funnel_data["overall_conversion"] = (last_step / first_step) * 100
                        
        except Exception as e:
            logger.error(f"Get funnel analysis error: {e}")
            
        return funnel_data
        
    async def get_utm_campaigns(
        self,
        period: Period = Period.DAYS_30
    ) -> List[Dict[str, Any]]:
        """
        Get UTM campaign performance
        """
        campaigns = []
        
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "property": "visit:utm_campaign",
                "limit": 50
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        campaigns.append({
                            "campaign": item.get("utm_campaign"),
                            "visitors": item.get("visitors", 0),
                            "bounce_rate": item.get("bounce_rate", 0),
                            "visit_duration": item.get("visit_duration", 0),
                            "pageviews": item.get("pageviews", 0)
                        })
                        
        except Exception as e:
            logger.error(f"Get UTM campaigns error: {e}")
            
        return campaigns
        
    async def get_custom_dimension(
        self,
        dimension: str,
        period: Period = Period.DAYS_30,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get custom dimension breakdown
        Example dimensions: author, category, product_id
        """
        results = []
        
        try:
            params = {
                "site_id": self.site_domain,
                "period": period.value,
                "property": f"event:props:{dimension}",
                "limit": limit
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/breakdown",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for item in data.get("results", []):
                        results.append({
                            dimension: item.get(dimension),
                            "visitors": item.get("visitors", 0),
                            "events": item.get("events", 0),
                            "conversion_rate": item.get("conversion_rate", 0)
                        })
                        
        except Exception as e:
            logger.error(f"Get custom dimension error: {e}")
            
        return results
        
    async def export_data(
        self,
        start_date: date,
        end_date: date,
        format: str = "json"
    ) -> Optional[bytes]:
        """
        Export analytics data
        Formats: json, csv
        """
        try:
            params = {
                "site_id": self.site_domain,
                "period": "custom",
                "date": f"{start_date},{end_date}",
                "format": format
            }
            
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
                
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.api_url}/stats/export",
                    params=params,
                    headers=headers
                )
                
                if response.status_code == 200:
                    return response.content
                    
        except Exception as e:
            logger.error(f"Export data error: {e}")
            
        return None
        
    def get_dashboard_embed(
        self,
        theme: str = "light",
        width: int = 100,
        height: int = 600
    ) -> str:
        """
        Get embeddable dashboard iframe
        """
        return f"""
        <iframe 
            plausible-embed
            src="{self.server_url}/share/{self.site_domain}?auth=SHARED_LINK_AUTH&theme={theme}"
            scrolling="no"
            frameborder="0"
            loading="lazy"
            style="width: {width}%; height: {height}px;">
        </iframe>
        <script async src="{self.server_url}/js/embed.host.js"></script>
        """
        
    async def _check_goal_completion(
        self,
        event_name: str,
        props: Optional[Dict[str, Any]] = None
    ):
        """
        Check if event completes any goals
        """
        for goal in self.goals.values():
            if goal.event_name == event_name:
                goal.completions += 1
                
                # Calculate conversion rate
                # This would need total visitor count from API
                
    def generate_tracking_code(
        self,
        enable_custom_events: bool = True,
        enable_outbound_links: bool = True,
        enable_file_downloads: bool = True,
        enable_404_tracking: bool = True,
        enable_revenue: bool = True
    ) -> str:
        """
        Generate complete tracking code with all features
        """
        extensions = []
        
        if enable_custom_events:
            extensions.append("tagged-events")
        if enable_outbound_links:
            extensions.append("outbound-links")
        if enable_file_downloads:
            extensions.append("file-downloads")
        if enable_404_tracking:
            extensions.append("404")
        if enable_revenue:
            extensions.append("revenue")
            
        script_name = "script"
        if extensions:
            script_name = f"script.{'.'.join(extensions)}"
            
        tracking_code = f"""
<!-- Plausible Analytics -->
<script defer data-domain="{self.site_domain}" src="{self.server_url}/js/{script_name}.js"></script>
"""
        
        if enable_custom_events:
            tracking_code += """
<script>
    // Custom event tracking helper
    window.plausible = window.plausible || function() {{ 
        (window.plausible.q = window.plausible.q || []).push(arguments) 
    }}
    
    // Example: Track form submission
    document.addEventListener('submit', function(e) {{
        if (e.target.matches('form')) {{
            plausible('FormSubmit', {{
                props: {{
                    form_id: e.target.id,
                    form_name: e.target.name
                }}
            }});
        }}
    }});
    
    // Example: Track scroll depth
    let maxScroll = 0;
    window.addEventListener('scroll', function() {{
        const scrollPercent = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        if (scrollPercent > maxScroll) {{
            maxScroll = scrollPercent;
            if (scrollPercent === 25 || scrollPercent === 50 || scrollPercent === 75 || scrollPercent === 100) {{
                plausible('ScrollDepth', {{ props: {{ depth: scrollPercent }} }});
            }}
        }}
    }});
</script>
"""
        
        return tracking_code
        

# Export service
plausible_service = PlausibleAnalyticsService(
    site_domain="spirittours.com"
)