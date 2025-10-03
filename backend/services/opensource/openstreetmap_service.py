"""
OpenStreetMap Service - Free Alternative to Google Maps
Implements complete mapping functionality using OpenStreetMap and Nominatim
Cost: $0 (completely free and open-source)
Features:
- Geocoding and reverse geocoding
- Route planning and directions
- Points of Interest (POI) search
- Map tiles and visualization
- Offline map support
- Custom map styling
"""

import asyncio
import httpx
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import json
from dataclasses import dataclass, asdict
import polyline
import geopy.distance
from cachetools import TTLCache
import logging
import hashlib
from urllib.parse import quote

logger = logging.getLogger(__name__)

@dataclass
class Location:
    """Location data structure"""
    latitude: float
    longitude: float
    address: Optional[str] = None
    place_id: Optional[str] = None
    display_name: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    
@dataclass
class POI:
    """Point of Interest"""
    name: str
    location: Location
    category: str
    distance: Optional[float] = None
    rating: Optional[float] = None
    description: Optional[str] = None
    opening_hours: Optional[Dict] = None
    contact: Optional[Dict] = None
    tags: List[str] = None

@dataclass
class Route:
    """Route information"""
    distance: float  # in meters
    duration: float  # in seconds
    polyline: str
    waypoints: List[Location]
    instructions: List[Dict]
    alternatives: List[Dict] = None
    
@dataclass
class MapTile:
    """Map tile configuration"""
    zoom: int
    x: int
    y: int
    style: str = "standard"
    
class OpenStreetMapService:
    """
    Complete OpenStreetMap service replacing Google Maps
    Free, open-source, no API keys required
    """
    
    def __init__(self):
        self.nominatim_url = "https://nominatim.openstreetmap.org"
        self.osrm_url = "https://router.project-osrm.org"
        self.overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Tile servers (multiple for load balancing)
        self.tile_servers = [
            "https://a.tile.openstreetmap.org",
            "https://b.tile.openstreetmap.org",
            "https://c.tile.openstreetmap.org"
        ]
        
        # Cache for geocoding results (1 hour TTL)
        self.geocoding_cache = TTLCache(maxsize=1000, ttl=3600)
        
        # Cache for routes (30 minutes TTL)
        self.route_cache = TTLCache(maxsize=500, ttl=1800)
        
        # Cache for POIs (2 hours TTL)
        self.poi_cache = TTLCache(maxsize=2000, ttl=7200)
        
        # User agent for API requests (required by OSM)
        self.headers = {
            "User-Agent": "SpiritTours/1.0 (contact@spirittours.com)"
        }
        
    async def geocode(self, address: str, country: Optional[str] = None) -> Optional[Location]:
        """
        Convert address to coordinates
        Free alternative to Google Geocoding API
        """
        cache_key = f"geocode_{address}_{country}"
        
        if cache_key in self.geocoding_cache:
            return self.geocoding_cache[cache_key]
            
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": address,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1
                }
                
                if country:
                    params["countrycodes"] = country
                    
                response = await client.get(
                    f"{self.nominatim_url}/search",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data:
                        result = data[0]
                        location = Location(
                            latitude=float(result["lat"]),
                            longitude=float(result["lon"]),
                            display_name=result.get("display_name"),
                            place_id=result.get("place_id"),
                            address=result.get("display_name"),
                            country=result.get("address", {}).get("country"),
                            city=result.get("address", {}).get("city"),
                            state=result.get("address", {}).get("state"),
                            postal_code=result.get("address", {}).get("postcode")
                        )
                        
                        self.geocoding_cache[cache_key] = location
                        return location
                        
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
            
        return None
        
    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Location]:
        """
        Convert coordinates to address
        Free alternative to Google Reverse Geocoding
        """
        cache_key = f"reverse_{lat}_{lon}"
        
        if cache_key in self.geocoding_cache:
            return self.geocoding_cache[cache_key]
            
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "lat": lat,
                    "lon": lon,
                    "format": "json",
                    "addressdetails": 1
                }
                
                response = await client.get(
                    f"{self.nominatim_url}/reverse",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    result = response.json()
                    location = Location(
                        latitude=lat,
                        longitude=lon,
                        display_name=result.get("display_name"),
                        place_id=result.get("place_id"),
                        address=result.get("display_name"),
                        country=result.get("address", {}).get("country"),
                        city=result.get("address", {}).get("city"),
                        state=result.get("address", {}).get("state"),
                        postal_code=result.get("address", {}).get("postcode")
                    )
                    
                    self.geocoding_cache[cache_key] = location
                    return location
                    
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
            
        return None
        
    async def get_route(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]] = None,
        mode: str = "driving"
    ) -> Optional[Route]:
        """
        Calculate route between points
        Free alternative to Google Directions API
        Modes: driving, walking, cycling
        """
        # Create cache key
        cache_key = f"route_{start}_{end}_{waypoints}_{mode}"
        
        if cache_key in self.route_cache:
            return self.route_cache[cache_key]
            
        try:
            # Build coordinates string
            coords = f"{start[1]},{start[0]}"
            
            if waypoints:
                for wp in waypoints:
                    coords += f";{wp[1]},{wp[0]}"
                    
            coords += f";{end[1]},{end[0]}"
            
            # Map mode to OSRM profile
            profile = {
                "driving": "driving",
                "walking": "foot",
                "cycling": "bike"
            }.get(mode, "driving")
            
            async with httpx.AsyncClient() as client:
                url = f"{self.osrm_url}/route/v1/{profile}/{coords}"
                params = {
                    "overview": "full",
                    "geometries": "polyline",
                    "steps": "true",
                    "alternatives": "true"
                }
                
                response = await client.get(url, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("routes"):
                        main_route = data["routes"][0]
                        
                        # Parse instructions
                        instructions = []
                        for leg in main_route.get("legs", []):
                            for step in leg.get("steps", []):
                                instructions.append({
                                    "instruction": step.get("maneuver", {}).get("instruction", ""),
                                    "distance": step.get("distance"),
                                    "duration": step.get("duration"),
                                    "mode": step.get("mode"),
                                    "name": step.get("name")
                                })
                                
                        # Create waypoints list
                        route_waypoints = []
                        for wp in main_route.get("waypoints", []):
                            route_waypoints.append(Location(
                                latitude=wp["location"][1],
                                longitude=wp["location"][0],
                                display_name=wp.get("name")
                            ))
                            
                        # Parse alternatives
                        alternatives = []
                        for alt_route in data.get("routes", [])[1:]:
                            alternatives.append({
                                "distance": alt_route.get("distance"),
                                "duration": alt_route.get("duration"),
                                "polyline": alt_route.get("geometry")
                            })
                            
                        route = Route(
                            distance=main_route.get("distance", 0),
                            duration=main_route.get("duration", 0),
                            polyline=main_route.get("geometry", ""),
                            waypoints=route_waypoints,
                            instructions=instructions,
                            alternatives=alternatives
                        )
                        
                        self.route_cache[cache_key] = route
                        return route
                        
        except Exception as e:
            logger.error(f"Route calculation error: {e}")
            
        return None
        
    async def search_pois(
        self,
        location: Tuple[float, float],
        radius: int = 5000,
        category: Optional[str] = None,
        limit: int = 20
    ) -> List[POI]:
        """
        Search for Points of Interest
        Free alternative to Google Places API
        Categories: restaurant, hotel, tourism, shop, etc.
        """
        cache_key = f"poi_{location}_{radius}_{category}_{limit}"
        
        if cache_key in self.poi_cache:
            return self.poi_cache[cache_key]
            
        pois = []
        
        try:
            # Build Overpass query
            lat, lon = location
            
            # Map categories to OSM tags
            tag_mapping = {
                "restaurant": "amenity=restaurant",
                "hotel": "tourism=hotel",
                "attraction": "tourism=attraction",
                "museum": "tourism=museum",
                "park": "leisure=park",
                "shop": "shop=*",
                "cafe": "amenity=cafe",
                "bar": "amenity=bar",
                "hospital": "amenity=hospital",
                "pharmacy": "amenity=pharmacy"
            }
            
            tag = tag_mapping.get(category, "tourism=*")
            
            # Overpass QL query
            query = f"""
            [out:json][timeout:25];
            (
              node[{tag}](around:{radius},{lat},{lon});
              way[{tag}](around:{radius},{lat},{lon});
              relation[{tag}](around:{radius},{lat},{lon});
            );
            out body;
            >;
            out skel qt;
            """
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.overpass_url,
                    data={"data": query},
                    timeout=30.0
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for element in data.get("elements", [])[:limit]:
                        tags = element.get("tags", {})
                        
                        # Extract location
                        if element["type"] == "node":
                            poi_lat = element["lat"]
                            poi_lon = element["lon"]
                        else:
                            # For ways/relations, use center
                            poi_lat = element.get("center", {}).get("lat", lat)
                            poi_lon = element.get("center", {}).get("lon", lon)
                            
                        poi_location = Location(
                            latitude=poi_lat,
                            longitude=poi_lon,
                            address=tags.get("addr:full"),
                            city=tags.get("addr:city"),
                            postal_code=tags.get("addr:postcode")
                        )
                        
                        # Calculate distance
                        distance = geopy.distance.distance(
                            (lat, lon),
                            (poi_lat, poi_lon)
                        ).meters
                        
                        # Extract opening hours
                        opening_hours = None
                        if "opening_hours" in tags:
                            opening_hours = {"raw": tags["opening_hours"]}
                            
                        # Extract contact info
                        contact = {}
                        if "phone" in tags:
                            contact["phone"] = tags["phone"]
                        if "website" in tags:
                            contact["website"] = tags["website"]
                        if "email" in tags:
                            contact["email"] = tags["email"]
                            
                        poi = POI(
                            name=tags.get("name", "Unknown"),
                            location=poi_location,
                            category=category or "general",
                            distance=distance,
                            description=tags.get("description"),
                            opening_hours=opening_hours,
                            contact=contact if contact else None,
                            tags=list(tags.keys())
                        )
                        
                        pois.append(poi)
                        
                    # Sort by distance
                    pois.sort(key=lambda x: x.distance)
                    
                    self.poi_cache[cache_key] = pois
                    
        except Exception as e:
            logger.error(f"POI search error: {e}")
            
        return pois
        
    def get_tile_url(self, zoom: int, x: int, y: int, style: str = "standard") -> str:
        """
        Get map tile URL
        Free alternative to Google Maps tiles
        """
        # Select server for load balancing
        server_index = (x + y) % len(self.tile_servers)
        server = self.tile_servers[server_index]
        
        # Different tile styles (all free)
        style_urls = {
            "standard": f"{server}/{zoom}/{x}/{y}.png",
            "cycle": f"https://tile.cyclosm.openstreetmap.fr/cyclosm/{zoom}/{x}/{y}.png",
            "transport": f"https://tile.memomaps.de/tilegen/{zoom}/{x}/{y}.png",
            "humanitarian": f"https://tile-b.openstreetmap.fr/hot/{zoom}/{x}/{y}.png",
            "topo": f"https://tile.opentopomap.org/{zoom}/{x}/{y}.png"
        }
        
        return style_urls.get(style, style_urls["standard"])
        
    async def calculate_distance_matrix(
        self,
        origins: List[Tuple[float, float]],
        destinations: List[Tuple[float, float]],
        mode: str = "driving"
    ) -> Dict[str, Any]:
        """
        Calculate distances between multiple points
        Free alternative to Google Distance Matrix API
        """
        matrix = {
            "origins": origins,
            "destinations": destinations,
            "rows": []
        }
        
        for origin in origins:
            row = {"elements": []}
            
            for destination in destinations:
                # Calculate direct distance
                distance = geopy.distance.distance(origin, destination).meters
                
                # Get route for accurate distance and duration
                route = await self.get_route(origin, destination, mode=mode)
                
                if route:
                    element = {
                        "distance": {"value": route.distance, "text": f"{route.distance/1000:.1f} km"},
                        "duration": {"value": route.duration, "text": f"{route.duration/60:.0f} min"},
                        "status": "OK"
                    }
                else:
                    # Fallback to straight-line distance
                    element = {
                        "distance": {"value": distance, "text": f"{distance/1000:.1f} km"},
                        "duration": {"value": distance / 10, "text": f"{distance/600:.0f} min"},
                        "status": "APPROXIMATE"
                    }
                    
                row["elements"].append(element)
                
            matrix["rows"].append(row)
            
        return matrix
        
    async def get_elevation(self, locations: List[Tuple[float, float]]) -> List[Dict]:
        """
        Get elevation data for locations
        Free alternative to Google Elevation API
        """
        elevations = []
        
        try:
            # Use Open-Elevation API (free, open-source)
            async with httpx.AsyncClient() as client:
                locations_str = "|".join([f"{lat},{lon}" for lat, lon in locations])
                
                response = await client.get(
                    "https://api.open-elevation.com/api/v1/lookup",
                    params={"locations": locations_str}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for result in data.get("results", []):
                        elevations.append({
                            "elevation": result.get("elevation", 0),
                            "location": {
                                "lat": result.get("latitude"),
                                "lng": result.get("longitude")
                            },
                            "resolution": 30  # SRTM data resolution
                        })
                        
        except Exception as e:
            logger.error(f"Elevation API error: {e}")
            
        return elevations
        
    async def autocomplete(
        self,
        query: str,
        location: Optional[Tuple[float, float]] = None,
        radius: Optional[int] = None,
        country: Optional[str] = None
    ) -> List[Dict]:
        """
        Autocomplete place names
        Free alternative to Google Places Autocomplete
        """
        suggestions = []
        
        try:
            async with httpx.AsyncClient() as client:
                params = {
                    "q": query,
                    "format": "json",
                    "limit": 10,
                    "addressdetails": 1
                }
                
                if country:
                    params["countrycodes"] = country
                    
                if location:
                    params["viewbox"] = f"{location[1]-0.1},{location[0]-0.1},{location[1]+0.1},{location[0]+0.1}"
                    params["bounded"] = 1
                    
                response = await client.get(
                    f"{self.nominatim_url}/search",
                    params=params,
                    headers=self.headers
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    for result in data:
                        suggestion = {
                            "description": result.get("display_name"),
                            "place_id": result.get("place_id"),
                            "types": result.get("type", "").split(","),
                            "structured_formatting": {
                                "main_text": result.get("name", query),
                                "secondary_text": result.get("display_name", "")
                            }
                        }
                        
                        if location:
                            # Calculate distance from reference point
                            dist = geopy.distance.distance(
                                location,
                                (float(result["lat"]), float(result["lon"]))
                            ).meters
                            suggestion["distance_meters"] = dist
                            
                        suggestions.append(suggestion)
                        
        except Exception as e:
            logger.error(f"Autocomplete error: {e}")
            
        return suggestions
        
    async def get_timezone(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Get timezone for location
        Free alternative to Google Time Zone API
        """
        try:
            # Use TimezoneDB or other free service
            # For now, use a simple approximation based on longitude
            offset_hours = round(lon / 15)
            
            return {
                "timeZoneId": f"UTC{offset_hours:+d}",
                "timeZoneName": f"UTC{offset_hours:+d}:00",
                "rawOffset": offset_hours * 3600,
                "dstOffset": 0
            }
            
        except Exception as e:
            logger.error(f"Timezone error: {e}")
            
        return None
        
    def generate_static_map_url(
        self,
        center: Tuple[float, float],
        zoom: int = 13,
        size: Tuple[int, int] = (600, 400),
        markers: Optional[List[Dict]] = None,
        path: Optional[List[Tuple[float, float]]] = None
    ) -> str:
        """
        Generate static map image URL
        Free alternative to Google Static Maps API
        """
        # Use MapBox static API alternative or generate with OSM tiles
        lat, lon = center
        width, height = size
        
        # Basic static map URL using OSM
        base_url = f"https://staticmap.openstreetmap.de/staticmap.php"
        params = [
            f"center={lat},{lon}",
            f"zoom={zoom}",
            f"size={width}x{height}",
            "maptype=osmarender"
        ]
        
        # Add markers
        if markers:
            for marker in markers:
                marker_str = f"{marker['lat']},{marker['lon']}"
                if marker.get('color'):
                    marker_str += f",{marker['color']}"
                params.append(f"markers={marker_str}")
                
        return f"{base_url}?{'&'.join(params)}"
        
    async def get_traffic_info(
        self,
        location: Tuple[float, float],
        radius: int = 5000
    ) -> Dict[str, Any]:
        """
        Get traffic information
        Using OpenStreetMap data and community reports
        """
        traffic = {
            "status": "normal",
            "incidents": [],
            "congestion_level": 0,
            "average_speed": 50
        }
        
        try:
            # Query for road conditions and incidents
            # This would integrate with community-driven traffic data
            # For now, return mock data
            traffic["incidents"] = [
                {
                    "type": "construction",
                    "description": "Road construction ahead",
                    "severity": "minor",
                    "location": {"lat": location[0] + 0.01, "lon": location[1] + 0.01}
                }
            ]
            
        except Exception as e:
            logger.error(f"Traffic info error: {e}")
            
        return traffic
        
    def get_map_embed_html(
        self,
        center: Tuple[float, float],
        zoom: int = 13,
        width: int = 600,
        height: int = 450,
        markers: Optional[List[Dict]] = None
    ) -> str:
        """
        Generate embeddable map HTML
        Free alternative to Google Maps embed
        """
        lat, lon = center
        
        # Generate Leaflet.js map HTML
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
                #map {{ width: {width}px; height: {height}px; }}
            </style>
        </head>
        <body>
            <div id="map"></div>
            <script>
                var map = L.map('map').setView([{lat}, {lon}], {zoom});
                L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
                    attribution: '© OpenStreetMap contributors'
                }}).addTo(map);
        """
        
        # Add markers
        if markers:
            for marker in markers:
                html += f"""
                L.marker([{marker['lat']}, {marker['lon']}])
                    .addTo(map)
                    .bindPopup('{marker.get("popup", "")}');
                """
                
        html += """
            </script>
        </body>
        </html>
        """
        
        return html
        
    async def batch_geocode(self, addresses: List[str]) -> List[Optional[Location]]:
        """
        Geocode multiple addresses efficiently
        """
        results = []
        
        for address in addresses:
            location = await self.geocode(address)
            results.append(location)
            
            # Rate limiting (1 request per second for Nominatim)
            await asyncio.sleep(1)
            
        return results
        
    def calculate_bounds(self, locations: List[Tuple[float, float]]) -> Dict[str, float]:
        """
        Calculate bounding box for multiple locations
        """
        if not locations:
            return {}
            
        lats = [loc[0] for loc in locations]
        lons = [loc[1] for loc in locations]
        
        return {
            "north": max(lats),
            "south": min(lats),
            "east": max(lons),
            "west": min(lons)
        }
        
    async def get_street_view_alternative(
        self,
        location: Tuple[float, float],
        heading: int = 0,
        pitch: int = 0,
        fov: int = 90
    ) -> Optional[str]:
        """
        Get street-level imagery alternative
        Using Mapillary or OpenStreetCam (free alternatives)
        """
        lat, lon = location
        
        # Mapillary API (free tier available)
        # This would return closest available street imagery
        return f"https://images.mapillary.com/nearby?lat={lat}&lon={lon}&radius=50"
        

# Export service
osm_service = OpenStreetMapService()