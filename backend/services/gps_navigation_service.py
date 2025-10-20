"""
GPS Navigation Service with Real-time Turn-by-Turn Directions
Integrates with Google Maps, Mapbox, and OpenStreetMap for comprehensive navigation
"""

import asyncio
import json
import logging
import math
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import aiohttp
from geopy.distance import geodesic
import polyline

from ..config import settings
from ..cache.redis_cache import RedisCache

logger = logging.getLogger(__name__)

class NavigationProvider(str, Enum):
    """Available navigation providers"""
    GOOGLE_MAPS = "google_maps"
    MAPBOX = "mapbox"
    OPENSTREETMAP = "osm"
    HERE_MAPS = "here"

class TravelMode(str, Enum):
    """Travel modes for navigation"""
    WALKING = "walking"
    DRIVING = "driving"
    TRANSIT = "transit"
    CYCLING = "cycling"

class NavigationInstruction(str, Enum):
    """Types of navigation instructions"""
    START = "start"
    TURN_LEFT = "turn_left"
    TURN_RIGHT = "turn_right"
    SLIGHT_LEFT = "slight_left"
    SLIGHT_RIGHT = "slight_right"
    STRAIGHT = "straight"
    MERGE = "merge"
    ROUNDABOUT = "roundabout"
    U_TURN = "u_turn"
    ARRIVAL = "arrival"
    WAYPOINT = "waypoint"

@dataclass
class NavigationStep:
    """Single navigation step with instruction"""
    instruction_type: NavigationInstruction
    instruction_text: str
    distance: float  # meters
    duration: int  # seconds
    start_location: Tuple[float, float]
    end_location: Tuple[float, float]
    polyline: Optional[str] = None
    street_name: Optional[str] = None
    maneuver: Optional[str] = None
    
@dataclass
class Route:
    """Complete route with all navigation steps"""
    steps: List[NavigationStep]
    total_distance: float  # meters
    total_duration: int  # seconds
    polyline: str
    bounds: Dict[str, Tuple[float, float]]  # NE and SW bounds
    waypoints: List[Tuple[float, float]]
    alternative_routes: Optional[List['Route']] = None

class GPSNavigationService:
    """Advanced GPS Navigation Service with Real-time Guidance"""
    
    def __init__(self):
        self.cache = RedisCache()
        self.google_api_key = settings.GOOGLE_MAPS_API_KEY
        self.mapbox_token = settings.MAPBOX_ACCESS_TOKEN
        self.here_api_key = settings.HERE_MAPS_API_KEY
        self.active_navigations: Dict[str, 'NavigationSession'] = {}
        
    async def get_turn_by_turn_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]] = None,
        mode: TravelMode = TravelMode.WALKING,
        provider: NavigationProvider = NavigationProvider.GOOGLE_MAPS,
        avoid: Optional[List[str]] = None,
        language: str = "en"
    ) -> Route:
        """Get detailed turn-by-turn navigation instructions"""
        
        # Check cache first
        cache_key = f"nav:{provider}:{origin}:{destination}:{mode}"
        cached = await self.cache.get(cache_key)
        if cached:
            return Route(**json.loads(cached))
        
        # Get route based on provider
        if provider == NavigationProvider.GOOGLE_MAPS:
            route = await self._google_maps_directions(
                origin, destination, waypoints, mode, avoid, language
            )
        elif provider == NavigationProvider.MAPBOX:
            route = await self._mapbox_directions(
                origin, destination, waypoints, mode, language
            )
        elif provider == NavigationProvider.HERE_MAPS:
            route = await self._here_maps_directions(
                origin, destination, waypoints, mode, avoid, language
            )
        else:
            route = await self._osm_directions(
                origin, destination, waypoints, mode
            )
        
        # Cache the result
        await self.cache.set(
            cache_key,
            json.dumps(route.__dict__),
            expire=3600  # 1 hour
        )
        
        return route
    
    async def _google_maps_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]],
        mode: TravelMode,
        avoid: Optional[List[str]],
        language: str
    ) -> Route:
        """Get directions from Google Maps API"""
        
        url = "https://maps.googleapis.com/maps/api/directions/json"
        
        params = {
            "origin": f"{origin[0]},{origin[1]}",
            "destination": f"{destination[0]},{destination[1]}",
            "mode": mode.value,
            "key": self.google_api_key,
            "language": language,
            "alternatives": "true"
        }
        
        if waypoints:
            params["waypoints"] = "|".join([f"{w[0]},{w[1]}" for w in waypoints])
        
        if avoid:
            params["avoid"] = "|".join(avoid)
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                data = await response.json()
        
        if data["status"] != "OK":
            logger.error(f"Google Maps API error: {data}")
            raise Exception(f"Navigation error: {data.get('status')}")
        
        # Parse the main route
        main_route = data["routes"][0]
        steps = []
        
        for leg in main_route["legs"]:
            for step in leg["steps"]:
                nav_step = NavigationStep(
                    instruction_type=self._parse_maneuver(step.get("maneuver", "straight")),
                    instruction_text=step["html_instructions"],
                    distance=step["distance"]["value"],
                    duration=step["duration"]["value"],
                    start_location=(
                        step["start_location"]["lat"],
                        step["start_location"]["lng"]
                    ),
                    end_location=(
                        step["end_location"]["lat"],
                        step["end_location"]["lng"]
                    ),
                    polyline=step["polyline"]["points"],
                    maneuver=step.get("maneuver")
                )
                steps.append(nav_step)
        
        # Create route object
        route = Route(
            steps=steps,
            total_distance=sum(leg["distance"]["value"] for leg in main_route["legs"]),
            total_duration=sum(leg["duration"]["value"] for leg in main_route["legs"]),
            polyline=main_route["overview_polyline"]["points"],
            bounds={
                "northeast": (
                    main_route["bounds"]["northeast"]["lat"],
                    main_route["bounds"]["northeast"]["lng"]
                ),
                "southwest": (
                    main_route["bounds"]["southwest"]["lat"],
                    main_route["bounds"]["southwest"]["lng"]
                )
            },
            waypoints=waypoints or []
        )
        
        # Add alternative routes if available
        if len(data["routes"]) > 1:
            route.alternative_routes = []
            for alt_route_data in data["routes"][1:3]:  # Max 2 alternatives
                # Parse alternative route similarly
                pass  # Simplified for brevity
        
        return route
    
    async def _mapbox_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]],
        mode: TravelMode,
        language: str
    ) -> Route:
        """Get directions from Mapbox API"""
        
        mode_map = {
            TravelMode.DRIVING: "driving",
            TravelMode.WALKING: "walking",
            TravelMode.CYCLING: "cycling",
            TravelMode.TRANSIT: "driving"  # Mapbox doesn't have transit
        }
        
        # Build coordinates string
        coords = [f"{origin[1]},{origin[0]}"]
        if waypoints:
            coords.extend([f"{w[1]},{w[0]}" for w in waypoints])
        coords.append(f"{destination[1]},{destination[0]}")
        coords_str = ";".join(coords)
        
        url = f"https://api.mapbox.com/directions/v5/mapbox/{mode_map[mode]}/{coords_str}"
        
        params = {
            "access_token": self.mapbox_token,
            "steps": "true",
            "geometries": "polyline",
            "overview": "full",
            "language": language,
            "alternatives": "true"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                data = await response.json()
        
        if "routes" not in data or not data["routes"]:
            raise Exception("No route found")
        
        # Parse route
        route_data = data["routes"][0]
        steps = []
        
        for leg in route_data["legs"]:
            for step in leg["steps"]:
                nav_step = NavigationStep(
                    instruction_type=self._parse_mapbox_maneuver(step["maneuver"]["type"]),
                    instruction_text=step["maneuver"]["instruction"],
                    distance=step["distance"],
                    duration=step["duration"],
                    start_location=tuple(step["maneuver"]["location"][::-1]),
                    end_location=tuple(step["intersections"][-1]["location"][::-1]) if step["intersections"] else tuple(step["maneuver"]["location"][::-1]),
                    street_name=step.get("name")
                )
                steps.append(nav_step)
        
        return Route(
            steps=steps,
            total_distance=route_data["distance"],
            total_duration=route_data["duration"],
            polyline=route_data["geometry"],
            bounds=self._calculate_bounds([origin, destination] + (waypoints or [])),
            waypoints=waypoints or []
        )
    
    async def start_navigation_session(
        self,
        user_id: str,
        route: Route,
        guide_personality: Optional[str] = None
    ) -> 'NavigationSession':
        """Start a real-time navigation session"""
        
        session = NavigationSession(
            session_id=f"nav_{user_id}_{datetime.utcnow().timestamp()}",
            user_id=user_id,
            route=route,
            guide_personality=guide_personality,
            service=self
        )
        
        await session.initialize()
        self.active_navigations[session.session_id] = session
        
        return session
    
    def _parse_maneuver(self, maneuver: str) -> NavigationInstruction:
        """Parse Google maneuver to instruction type"""
        maneuver_map = {
            "turn-left": NavigationInstruction.TURN_LEFT,
            "turn-right": NavigationInstruction.TURN_RIGHT,
            "turn-slight-left": NavigationInstruction.SLIGHT_LEFT,
            "turn-slight-right": NavigationInstruction.SLIGHT_RIGHT,
            "straight": NavigationInstruction.STRAIGHT,
            "merge": NavigationInstruction.MERGE,
            "roundabout-left": NavigationInstruction.ROUNDABOUT,
            "roundabout-right": NavigationInstruction.ROUNDABOUT,
            "uturn-left": NavigationInstruction.U_TURN,
            "uturn-right": NavigationInstruction.U_TURN,
        }
        return maneuver_map.get(maneuver, NavigationInstruction.STRAIGHT)
    
    def _parse_mapbox_maneuver(self, maneuver: str) -> NavigationInstruction:
        """Parse Mapbox maneuver to instruction type"""
        maneuver_map = {
            "turn left": NavigationInstruction.TURN_LEFT,
            "turn right": NavigationInstruction.TURN_RIGHT,
            "slight left": NavigationInstruction.SLIGHT_LEFT,
            "slight right": NavigationInstruction.SLIGHT_RIGHT,
            "continue": NavigationInstruction.STRAIGHT,
            "merge": NavigationInstruction.MERGE,
            "roundabout": NavigationInstruction.ROUNDABOUT,
            "arrive": NavigationInstruction.ARRIVAL,
            "depart": NavigationInstruction.START,
        }
        
        for key, value in maneuver_map.items():
            if key in maneuver.lower():
                return value
        
        return NavigationInstruction.STRAIGHT
    
    def _calculate_bounds(self, points: List[Tuple[float, float]]) -> Dict:
        """Calculate bounds for a set of points"""
        lats = [p[0] for p in points]
        lngs = [p[1] for p in points]
        
        return {
            "northeast": (max(lats), max(lngs)),
            "southwest": (min(lats), min(lngs))
        }
    
    async def _here_maps_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]],
        mode: TravelMode,
        avoid: Optional[List[str]],
        language: str
    ) -> Route:
        """Get directions from HERE Maps API"""
        # Implementation for HERE Maps
        pass  # Simplified for brevity
    
    async def _osm_directions(
        self,
        origin: Tuple[float, float],
        destination: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]],
        mode: TravelMode
    ) -> Route:
        """Get directions from OpenStreetMap/OSRM"""
        # Implementation for OpenStreetMap
        pass  # Simplified for brevity

class NavigationSession:
    """Real-time navigation session with location tracking"""
    
    def __init__(
        self,
        session_id: str,
        user_id: str,
        route: Route,
        guide_personality: Optional[str],
        service: GPSNavigationService
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.route = route
        self.guide_personality = guide_personality
        self.service = service
        
        # Navigation state
        self.current_step_index = 0
        self.current_location: Optional[Tuple[float, float]] = None
        self.heading: Optional[float] = None
        self.speed: Optional[float] = None
        self.distance_to_next_turn = 0
        self.off_route = False
        self.recalculation_needed = False
        
        # History
        self.location_history: List[Tuple[float, float, datetime]] = []
        self.completed_steps: List[int] = []
        
    async def initialize(self):
        """Initialize navigation session"""
        self.current_location = self.route.steps[0].start_location
        self.distance_to_next_turn = self.route.steps[0].distance
        
    async def update_location(
        self,
        location: Tuple[float, float],
        heading: Optional[float] = None,
        speed: Optional[float] = None,
        accuracy: Optional[float] = None
    ) -> Dict[str, Any]:
        """Update current location and get navigation instruction"""
        
        self.current_location = location
        self.heading = heading
        self.speed = speed
        
        # Add to history
        self.location_history.append((location[0], location[1], datetime.utcnow()))
        
        # Check if on route
        if not await self._is_on_route(location):
            self.off_route = True
            self.recalculation_needed = True
            return await self._handle_off_route()
        
        self.off_route = False
        
        # Get current step
        current_step = self.route.steps[self.current_step_index]
        
        # Calculate distance to next turn
        self.distance_to_next_turn = geodesic(
            location,
            current_step.end_location
        ).meters
        
        # Check if arrived at current step destination
        if self.distance_to_next_turn < 20:  # Within 20 meters
            await self._complete_step()
        
        # Generate instruction
        instruction = await self._generate_instruction()
        
        return {
            "current_location": location,
            "current_step": self.current_step_index,
            "instruction": instruction,
            "distance_to_turn": self.distance_to_next_turn,
            "estimated_arrival": self._estimate_arrival(),
            "off_route": self.off_route,
            "total_distance_remaining": self._calculate_remaining_distance(),
            "speed": speed,
            "heading": heading
        }
    
    async def _is_on_route(self, location: Tuple[float, float]) -> bool:
        """Check if current location is on route"""
        
        # Decode polyline for current step
        current_step = self.route.steps[self.current_step_index]
        if current_step.polyline:
            route_points = polyline.decode(current_step.polyline)
            
            # Check distance to route line
            min_distance = float('inf')
            for i in range(len(route_points) - 1):
                dist = self._point_to_line_distance(
                    location,
                    route_points[i],
                    route_points[i + 1]
                )
                min_distance = min(min_distance, dist)
            
            # If more than 50 meters from route, considered off-route
            return min_distance < 50
        
        # Fallback: check distance to end of current step
        return geodesic(location, current_step.end_location).meters < 100
    
    def _point_to_line_distance(
        self,
        point: Tuple[float, float],
        line_start: Tuple[float, float],
        line_end: Tuple[float, float]
    ) -> float:
        """Calculate distance from point to line segment"""
        
        # Vector from start to end
        dx = line_end[1] - line_start[1]
        dy = line_end[0] - line_start[0]
        
        # Vector from start to point
        px = point[1] - line_start[1]
        py = point[0] - line_start[0]
        
        # Dot product
        dot = px * dx + py * dy
        len_sq = dx * dx + dy * dy
        
        # Parameter of projection
        if len_sq != 0:
            param = dot / len_sq
        else:
            param = -1
        
        # Find nearest point on line segment
        if param < 0:
            nearest = line_start
        elif param > 1:
            nearest = line_end
        else:
            nearest = (
                line_start[0] + param * dy,
                line_start[1] + param * dx
            )
        
        # Return distance in meters
        return geodesic(point, nearest).meters
    
    async def _handle_off_route(self) -> Dict[str, Any]:
        """Handle when user is off route"""
        
        # Request recalculation
        if self.recalculation_needed:
            # Get new route from current location to destination
            remaining_waypoints = []
            for i in range(self.current_step_index + 1, len(self.route.steps)):
                remaining_waypoints.append(self.route.steps[i].end_location)
            
            new_route = await self.service.get_turn_by_turn_directions(
                self.current_location,
                self.route.steps[-1].end_location,
                waypoints=remaining_waypoints[:2]  # Next 2 waypoints
            )
            
            # Update route
            self.route = new_route
            self.current_step_index = 0
            self.recalculation_needed = False
            
            return {
                "status": "recalculated",
                "message": "Route recalculated. Follow new directions.",
                "new_route": new_route
            }
        
        return {
            "status": "off_route",
            "message": "You are off route. Please return to the highlighted path."
        }
    
    async def _complete_step(self):
        """Mark current step as completed and move to next"""
        
        self.completed_steps.append(self.current_step_index)
        
        if self.current_step_index < len(self.route.steps) - 1:
            self.current_step_index += 1
            self.distance_to_next_turn = self.route.steps[self.current_step_index].distance
        else:
            # Arrived at destination
            await self._handle_arrival()
    
    async def _handle_arrival(self):
        """Handle arrival at destination"""
        logger.info(f"Navigation session {self.session_id} completed")
        # Trigger arrival events
    
    async def _generate_instruction(self) -> Dict[str, Any]:
        """Generate current navigation instruction"""
        
        current_step = self.route.steps[self.current_step_index]
        
        # Determine instruction based on distance
        if self.distance_to_next_turn > 200:
            instruction_text = f"Continue for {int(self.distance_to_next_turn)} meters"
            instruction_type = "continue"
        elif self.distance_to_next_turn > 50:
            instruction_text = f"In {int(self.distance_to_next_turn)} meters, {current_step.instruction_text}"
            instruction_type = "prepare"
        else:
            instruction_text = current_step.instruction_text
            instruction_type = "execute"
        
        return {
            "text": instruction_text,
            "type": instruction_type,
            "maneuver": current_step.instruction_type.value,
            "distance": self.distance_to_next_turn,
            "street_name": current_step.street_name
        }
    
    def _estimate_arrival(self) -> datetime:
        """Estimate arrival time based on current speed"""
        
        remaining_distance = self._calculate_remaining_distance()
        
        if self.speed and self.speed > 0:
            # Use current speed
            time_seconds = remaining_distance / self.speed
        else:
            # Use average walking speed (1.4 m/s)
            time_seconds = remaining_distance / 1.4
        
        return datetime.utcnow() + timedelta(seconds=time_seconds)
    
    def _calculate_remaining_distance(self) -> float:
        """Calculate total remaining distance"""
        
        remaining = self.distance_to_next_turn
        
        for i in range(self.current_step_index + 1, len(self.route.steps)):
            remaining += self.route.steps[i].distance
        
        return remaining

class PointOfInterestDetector:
    """Detect and announce nearby points of interest during navigation"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.announced_pois = set()
    
    async def detect_nearby_pois(
        self,
        location: Tuple[float, float],
        radius: float = 100,
        categories: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Detect POIs near current location"""
        
        # Query database for nearby POIs
        # Implementation would query PostGIS or similar
        
        pois = []
        
        # Filter out already announced POIs
        new_pois = [p for p in pois if p['id'] not in self.announced_pois]
        
        # Mark as announced
        for poi in new_pois:
            self.announced_pois.add(poi['id'])
        
        return new_pois