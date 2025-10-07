"""
Sistema de Realidad Extendida (AR/VR) para Spirit Tours
Experiencias inmersivas de tours virtuales y realidad aumentada
"""

import asyncio
import json
import uuid
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from dataclasses import dataclass
from enum import Enum
import numpy as np
from pydantic import BaseModel, Field

# AR/VR Experience Types
class ExperienceType(str, Enum):
    VIRTUAL_TOUR = "virtual_tour"
    AR_NAVIGATION = "ar_navigation"
    MIXED_REALITY = "mixed_reality"
    360_VIDEO = "360_video"
    HOLOGRAPHIC = "holographic"
    INTERACTIVE_3D = "interactive_3d"

class ContentQuality(str, Enum):
    LOW = "low"       # Mobile optimized
    MEDIUM = "medium" # Standard quality
    HIGH = "high"     # Desktop/VR headset
    ULTRA = "ultra"   # Professional VR

class DeviceType(str, Enum):
    SMARTPHONE = "smartphone"
    TABLET = "tablet"
    VR_HEADSET = "vr_headset"
    AR_GLASSES = "ar_glasses"
    DESKTOP = "desktop"
    MIXED_REALITY = "mixed_reality"

# Data Models
@dataclass
class Vector3D:
    """3D Vector for positioning"""
    x: float
    y: float
    z: float
    
    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z}
    
    def distance_to(self, other: 'Vector3D') -> float:
        """Calculate distance to another point"""
        return np.sqrt(
            (self.x - other.x) ** 2 + 
            (self.y - other.y) ** 2 + 
            (self.z - other.z) ** 2
        )

@dataclass
class Quaternion:
    """Quaternion for rotation"""
    w: float
    x: float
    y: float
    z: float
    
    def to_dict(self) -> Dict[str, float]:
        return {"w": self.w, "x": self.x, "y": self.y, "z": self.z}

class ARMarker(BaseModel):
    """AR Marker for real-world anchoring"""
    marker_id: str
    marker_type: str  # "image", "qr", "nfc", "gps"
    position: Dict[str, float]  # GPS coordinates or relative position
    content_id: str
    trigger_distance: float = 5.0  # meters
    metadata: Dict[str, Any] = {}

class VirtualObject(BaseModel):
    """3D object for AR/VR scenes"""
    object_id: str
    object_type: str  # "model", "text", "image", "video", "audio"
    asset_url: str
    position: Dict[str, float]
    rotation: Dict[str, float]
    scale: Dict[str, float]
    interactive: bool = False
    animation_url: Optional[str] = None
    audio_url: Optional[str] = None
    metadata: Dict[str, Any] = {}

class HotSpot(BaseModel):
    """Interactive hotspot in 360 content"""
    hotspot_id: str
    position: Dict[str, float]  # Spherical coordinates
    label: str
    description: str
    action_type: str  # "info", "navigate", "media", "link"
    action_data: Dict[str, Any]
    icon: Optional[str] = None
    visible_distance: float = 50.0

class Scene3D(BaseModel):
    """Complete 3D scene configuration"""
    scene_id: str
    scene_name: str
    scene_type: ExperienceType
    environment: str  # "outdoor", "indoor", "abstract"
    skybox_url: Optional[str] = None
    ground_texture_url: Optional[str] = None
    lighting_config: Dict[str, Any] = {}
    fog_config: Optional[Dict[str, Any]] = None
    objects: List[VirtualObject] = []
    hotspots: List[HotSpot] = []
    audio_ambience_url: Optional[str] = None
    spawn_point: Dict[str, float] = {"x": 0, "y": 0, "z": 0}
    boundaries: Optional[Dict[str, float]] = None

class ARExperience(BaseModel):
    """Augmented Reality experience configuration"""
    experience_id: str
    title: str
    description: str
    location: Dict[str, Any]  # GPS coordinates and address
    markers: List[ARMarker]
    virtual_objects: List[VirtualObject]
    navigation_path: Optional[List[Dict[str, float]]] = None
    audio_guide_url: Optional[str] = None
    required_permissions: List[str] = ["camera", "location"]
    min_accuracy_meters: float = 10.0
    offline_capable: bool = False

class VRExperience(BaseModel):
    """Virtual Reality experience configuration"""
    experience_id: str
    title: str
    description: str
    duration_minutes: int
    scenes: List[Scene3D]
    transitions: List[Dict[str, Any]]  # Scene transition effects
    interaction_mode: str  # "gaze", "controller", "hand_tracking"
    comfort_settings: Dict[str, Any] = {}
    quality_levels: Dict[str, str] = {}
    platform_compatibility: List[str] = []

class Experience360(BaseModel):
    """360-degree video/photo experience"""
    experience_id: str
    title: str
    media_type: str  # "video" or "photo"
    media_url: str
    duration_seconds: Optional[int] = None
    hotspots: List[HotSpot] = []
    spatial_audio: bool = False
    audio_tracks: List[Dict[str, str]] = []
    chapters: List[Dict[str, Any]] = []
    quality_variants: Dict[str, str] = {}

class UserSession(BaseModel):
    """User AR/VR session tracking"""
    session_id: str
    user_id: str
    experience_id: str
    device_type: DeviceType
    start_time: datetime
    end_time: Optional[datetime] = None
    position_history: List[Dict[str, Any]] = []
    interaction_log: List[Dict[str, Any]] = []
    performance_metrics: Dict[str, Any] = {}
    completion_percentage: float = 0.0


class ImmersiveExperienceEngine:
    """
    Main engine for AR/VR experiences in Spirit Tours
    """
    
    def __init__(self):
        self.active_sessions: Dict[str, UserSession] = {}
        self.experience_cache: Dict[str, Any] = {}
        self.asset_cdn_url = "https://cdn.spirittours.com/ar-vr"
        self.websocket_connections: Dict[str, Any] = {}
        
    async def create_virtual_tour(
        self,
        destination: str,
        poi_list: List[Dict[str, Any]],
        tour_style: str = "standard"
    ) -> VRExperience:
        """
        Create a complete virtual tour for a destination
        """
        experience_id = f"vr_tour_{uuid.uuid4().hex}"
        
        # Generate scenes for each POI
        scenes = []
        for i, poi in enumerate(poi_list):
            scene = await self._generate_poi_scene(poi, i)
            scenes.append(scene)
        
        # Create transitions between scenes
        transitions = self._create_scene_transitions(len(scenes))
        
        vr_experience = VRExperience(
            experience_id=experience_id,
            title=f"Virtual Tour of {destination}",
            description=f"Immersive VR experience exploring {destination}",
            duration_minutes=len(poi_list) * 5,  # 5 minutes per POI
            scenes=scenes,
            transitions=transitions,
            interaction_mode="controller",
            comfort_settings={
                "locomotion": "teleport",
                "vignette": True,
                "snap_turning": True,
                "seated_mode": True
            },
            quality_levels={
                "low": f"{self.asset_cdn_url}/quality/low",
                "medium": f"{self.asset_cdn_url}/quality/medium",
                "high": f"{self.asset_cdn_url}/quality/high",
                "ultra": f"{self.asset_cdn_url}/quality/ultra"
            },
            platform_compatibility=["oculus", "steamvr", "webxr", "cardboard"]
        )
        
        # Cache the experience
        self.experience_cache[experience_id] = vr_experience
        
        return vr_experience
    
    async def _generate_poi_scene(self, poi: Dict[str, Any], index: int) -> Scene3D:
        """Generate a 3D scene for a point of interest"""
        
        scene_id = f"scene_{uuid.uuid4().hex}"
        
        # Create virtual objects for the scene
        objects = []
        
        # Main POI model
        main_object = VirtualObject(
            object_id=f"poi_{index}",
            object_type="model",
            asset_url=f"{self.asset_cdn_url}/models/{poi.get('model_id', 'default')}.glb",
            position={"x": 0, "y": 0, "z": -5},
            rotation={"x": 0, "y": 0, "z": 0},
            scale={"x": 1, "y": 1, "z": 1},
            interactive=True,
            metadata={"poi_info": poi}
        )
        objects.append(main_object)
        
        # Information panels
        info_panel = VirtualObject(
            object_id=f"info_{index}",
            object_type="text",
            asset_url="",
            position={"x": 2, "y": 1.5, "z": -3},
            rotation={"x": 0, "y": -30, "z": 0},
            scale={"x": 1, "y": 1, "z": 1},
            interactive=True,
            metadata={
                "text": poi.get("description", ""),
                "font": "arial",
                "size": 24,
                "color": "#FFFFFF"
            }
        )
        objects.append(info_panel)
        
        # Create hotspots
        hotspots = []
        
        # Navigation hotspot
        nav_hotspot = HotSpot(
            hotspot_id=f"nav_{index}",
            position={"theta": 0, "phi": 0},
            label="Next Location",
            description="Continue to next point of interest",
            action_type="navigate",
            action_data={"target_scene": f"scene_{index + 1}"}
        )
        hotspots.append(nav_hotspot)
        
        # Information hotspot
        info_hotspot = HotSpot(
            hotspot_id=f"info_hs_{index}",
            position={"theta": 45, "phi": 0},
            label="Learn More",
            description=f"Detailed information about {poi.get('name', 'location')}",
            action_type="info",
            action_data={"content": poi.get("detailed_info", {})}
        )
        hotspots.append(info_hotspot)
        
        scene = Scene3D(
            scene_id=scene_id,
            scene_name=poi.get("name", f"Location {index + 1}"),
            scene_type=ExperienceType.VIRTUAL_TOUR,
            environment="outdoor" if poi.get("outdoor", True) else "indoor",
            skybox_url=f"{self.asset_cdn_url}/skyboxes/{poi.get('skybox', 'default')}.jpg",
            ground_texture_url=f"{self.asset_cdn_url}/textures/ground_{poi.get('ground', 'stone')}.jpg",
            lighting_config={
                "ambient": {"color": "#FFFFFF", "intensity": 0.6},
                "directional": {"color": "#FFEEAA", "intensity": 0.8, "position": {"x": 1, "y": 1, "z": 0}}
            },
            objects=objects,
            hotspots=hotspots,
            audio_ambience_url=f"{self.asset_cdn_url}/audio/ambience_{poi.get('ambience', 'nature')}.mp3",
            spawn_point={"x": 0, "y": 1.6, "z": 0},
            boundaries={"x_min": -20, "x_max": 20, "z_min": -20, "z_max": 20}
        )
        
        return scene
    
    def _create_scene_transitions(self, scene_count: int) -> List[Dict[str, Any]]:
        """Create smooth transitions between scenes"""
        
        transitions = []
        for i in range(scene_count - 1):
            transition = {
                "from_scene": i,
                "to_scene": i + 1,
                "effect": "fade",
                "duration_ms": 1000,
                "audio_url": f"{self.asset_cdn_url}/audio/transition_whoosh.mp3"
            }
            transitions.append(transition)
        
        return transitions
    
    async def create_ar_navigation(
        self,
        start_location: Tuple[float, float],
        end_location: Tuple[float, float],
        waypoints: List[Tuple[float, float]] = None
    ) -> ARExperience:
        """
        Create AR navigation experience for real-world guidance
        """
        experience_id = f"ar_nav_{uuid.uuid4().hex}"
        
        # Calculate navigation path
        navigation_path = await self._calculate_ar_path(
            start_location,
            end_location,
            waypoints
        )
        
        # Create AR markers along the path
        markers = []
        virtual_objects = []
        
        for i, point in enumerate(navigation_path):
            # Create waypoint marker
            marker = ARMarker(
                marker_id=f"waypoint_{i}",
                marker_type="gps",
                position={"lat": point[0], "lng": point[1], "alt": 0},
                content_id=f"arrow_{i}",
                trigger_distance=10.0,
                metadata={"index": i, "total": len(navigation_path)}
            )
            markers.append(marker)
            
            # Create directional arrow
            arrow = VirtualObject(
                object_id=f"arrow_{i}",
                object_type="model",
                asset_url=f"{self.asset_cdn_url}/models/navigation_arrow.glb",
                position={"x": 0, "y": 0.5, "z": 0},
                rotation={"x": 0, "y": 0, "z": 0},  # Will be calculated based on direction
                scale={"x": 1, "y": 1, "z": 1},
                interactive=False,
                animation_url=f"{self.asset_cdn_url}/animations/arrow_pulse.json",
                metadata={"type": "navigation", "index": i}
            )
            virtual_objects.append(arrow)
        
        # Add destination marker
        destination_marker = ARMarker(
            marker_id="destination",
            marker_type="gps",
            position={"lat": end_location[0], "lng": end_location[1], "alt": 0},
            content_id="destination_pin",
            trigger_distance=20.0,
            metadata={"type": "destination"}
        )
        markers.append(destination_marker)
        
        # Add destination pin
        destination_pin = VirtualObject(
            object_id="destination_pin",
            object_type="model",
            asset_url=f"{self.asset_cdn_url}/models/destination_pin.glb",
            position={"x": 0, "y": 0, "z": 0},
            rotation={"x": 0, "y": 0, "z": 0},
            scale={"x": 2, "y": 2, "z": 2},
            interactive=True,
            animation_url=f"{self.asset_cdn_url}/animations/pin_bounce.json",
            audio_url=f"{self.asset_cdn_url}/audio/destination_reached.mp3",
            metadata={"type": "destination"}
        )
        virtual_objects.append(destination_pin)
        
        ar_experience = ARExperience(
            experience_id=experience_id,
            title="AR Navigation Guide",
            description="Follow the AR markers to your destination",
            location={
                "start": {"lat": start_location[0], "lng": start_location[1]},
                "end": {"lat": end_location[0], "lng": end_location[1]}
            },
            markers=markers,
            virtual_objects=virtual_objects,
            navigation_path=[{"lat": p[0], "lng": p[1]} for p in navigation_path],
            audio_guide_url=f"{self.asset_cdn_url}/audio/navigation_guide.mp3",
            required_permissions=["camera", "location", "motion"],
            min_accuracy_meters=5.0,
            offline_capable=True
        )
        
        return ar_experience
    
    async def _calculate_ar_path(
        self,
        start: Tuple[float, float],
        end: Tuple[float, float],
        waypoints: Optional[List[Tuple[float, float]]] = None
    ) -> List[Tuple[float, float]]:
        """Calculate optimal AR navigation path"""
        
        # In production, this would use real routing API
        # For now, create a simple path
        path = [start]
        
        if waypoints:
            path.extend(waypoints)
        
        # Add intermediate points
        lat_diff = end[0] - start[0]
        lng_diff = end[1] - start[1]
        
        steps = 10  # Number of intermediate points
        for i in range(1, steps):
            lat = start[0] + (lat_diff * i / steps)
            lng = start[1] + (lng_diff * i / steps)
            path.append((lat, lng))
        
        path.append(end)
        
        return path
    
    async def create_360_experience(
        self,
        media_url: str,
        hotspots_config: List[Dict[str, Any]] = None,
        media_type: str = "video"
    ) -> Experience360:
        """
        Create a 360-degree photo/video experience
        """
        experience_id = f"360_{uuid.uuid4().hex}"
        
        # Create hotspots
        hotspots = []
        if hotspots_config:
            for hs_config in hotspots_config:
                hotspot = HotSpot(
                    hotspot_id=f"hs_{uuid.uuid4().hex}",
                    position=hs_config.get("position", {"theta": 0, "phi": 0}),
                    label=hs_config.get("label", ""),
                    description=hs_config.get("description", ""),
                    action_type=hs_config.get("action_type", "info"),
                    action_data=hs_config.get("action_data", {}),
                    icon=hs_config.get("icon"),
                    visible_distance=hs_config.get("visible_distance", 50.0)
                )
                hotspots.append(hotspot)
        
        # Generate quality variants
        quality_variants = {
            "4k": f"{media_url}?quality=4k",
            "2k": f"{media_url}?quality=2k",
            "1080p": f"{media_url}?quality=1080p",
            "720p": f"{media_url}?quality=720p",
            "mobile": f"{media_url}?quality=mobile"
        }
        
        experience = Experience360(
            experience_id=experience_id,
            title="360° Experience",
            media_type=media_type,
            media_url=media_url,
            duration_seconds=180 if media_type == "video" else None,
            hotspots=hotspots,
            spatial_audio=True,
            audio_tracks=[
                {"language": "en", "url": f"{self.asset_cdn_url}/audio/narration_en.mp3"},
                {"language": "es", "url": f"{self.asset_cdn_url}/audio/narration_es.mp3"}
            ],
            quality_variants=quality_variants
        )
        
        return experience
    
    async def start_session(
        self,
        user_id: str,
        experience_id: str,
        device_type: DeviceType
    ) -> UserSession:
        """Start a new AR/VR session for a user"""
        
        session_id = f"session_{uuid.uuid4().hex}"
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            experience_id=experience_id,
            device_type=device_type,
            start_time=datetime.utcnow(),
            position_history=[],
            interaction_log=[],
            performance_metrics={
                "fps": [],
                "latency": [],
                "packet_loss": 0
            }
        )
        
        self.active_sessions[session_id] = session
        
        # Initialize WebRTC connection for real-time streaming
        await self._initialize_webrtc_stream(session_id, device_type)
        
        return session
    
    async def _initialize_webrtc_stream(self, session_id: str, device_type: DeviceType):
        """Initialize WebRTC connection for AR/VR streaming"""
        
        # Configuration based on device type
        if device_type == DeviceType.VR_HEADSET:
            config = {
                "resolution": "2880x1700",
                "framerate": 90,
                "bitrate": 50000000,  # 50 Mbps
                "codec": "h265"
            }
        elif device_type == DeviceType.SMARTPHONE:
            config = {
                "resolution": "1920x1080",
                "framerate": 60,
                "bitrate": 10000000,  # 10 Mbps
                "codec": "h264"
            }
        else:
            config = {
                "resolution": "1920x1080",
                "framerate": 30,
                "bitrate": 5000000,  # 5 Mbps
                "codec": "h264"
            }
        
        # Store configuration for session
        if session_id in self.active_sessions:
            self.active_sessions[session_id].performance_metrics["stream_config"] = config
    
    async def update_session_position(
        self,
        session_id: str,
        position: Dict[str, float],
        rotation: Dict[str, float]
    ):
        """Update user position in AR/VR session"""
        
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.active_sessions[session_id]
        
        # Add to position history
        position_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "position": position,
            "rotation": rotation
        }
        session.position_history.append(position_entry)
        
        # Keep only last 1000 positions
        if len(session.position_history) > 1000:
            session.position_history = session.position_history[-1000:]
    
    async def log_interaction(
        self,
        session_id: str,
        interaction_type: str,
        target_object: str,
        metadata: Dict[str, Any] = None
    ):
        """Log user interaction in AR/VR session"""
        
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.active_sessions[session_id]
        
        interaction_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "type": interaction_type,
            "target": target_object,
            "metadata": metadata or {}
        }
        
        session.interaction_log.append(interaction_entry)
    
    async def end_session(self, session_id: str) -> Dict[str, Any]:
        """End an AR/VR session and return analytics"""
        
        if session_id not in self.active_sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.active_sessions[session_id]
        session.end_time = datetime.utcnow()
        
        # Calculate session analytics
        duration = (session.end_time - session.start_time).total_seconds()
        
        analytics = {
            "session_id": session_id,
            "duration_seconds": duration,
            "interactions_count": len(session.interaction_log),
            "distance_traveled": self._calculate_distance_traveled(session.position_history),
            "completion_percentage": session.completion_percentage,
            "average_fps": np.mean(session.performance_metrics.get("fps", [30])),
            "average_latency": np.mean(session.performance_metrics.get("latency", [0])),
            "engagement_score": self._calculate_engagement_score(session)
        }
        
        # Clean up session
        del self.active_sessions[session_id]
        
        return analytics
    
    def _calculate_distance_traveled(self, position_history: List[Dict[str, Any]]) -> float:
        """Calculate total distance traveled in VR space"""
        
        if len(position_history) < 2:
            return 0.0
        
        total_distance = 0.0
        for i in range(1, len(position_history)):
            prev_pos = position_history[i-1]["position"]
            curr_pos = position_history[i]["position"]
            
            # Calculate Euclidean distance
            distance = np.sqrt(
                (curr_pos["x"] - prev_pos["x"]) ** 2 +
                (curr_pos["y"] - prev_pos["y"]) ** 2 +
                (curr_pos["z"] - prev_pos["z"]) ** 2
            )
            total_distance += distance
        
        return total_distance
    
    def _calculate_engagement_score(self, session: UserSession) -> float:
        """Calculate user engagement score based on session data"""
        
        score = 0.0
        
        # Factor 1: Session duration (max 30 points)
        duration = (session.end_time - session.start_time).total_seconds() if session.end_time else 0
        duration_score = min(30, duration / 60)  # 1 point per minute, max 30
        score += duration_score
        
        # Factor 2: Interactions (max 30 points)
        interaction_score = min(30, len(session.interaction_log) * 2)  # 2 points per interaction
        score += interaction_score
        
        # Factor 3: Completion (max 20 points)
        completion_score = session.completion_percentage * 0.2
        score += completion_score
        
        # Factor 4: Movement/Exploration (max 20 points)
        distance = self._calculate_distance_traveled(session.position_history)
        movement_score = min(20, distance / 10)  # 1 point per 10 units traveled
        score += movement_score
        
        return min(100, score)
    
    async def get_recommended_experiences(
        self,
        user_id: str,
        location: Optional[Tuple[float, float]] = None,
        experience_type: Optional[ExperienceType] = None
    ) -> List[Dict[str, Any]]:
        """Get personalized AR/VR experience recommendations"""
        
        recommendations = []
        
        # Filter experiences based on criteria
        # In production, this would query a database
        
        if location:
            # Find nearby AR experiences
            nearby = {
                "experience_id": "ar_local_001",
                "title": "Historic Downtown AR Tour",
                "type": "ar_navigation",
                "distance_km": 0.5,
                "rating": 4.8,
                "duration_minutes": 45,
                "thumbnail_url": f"{self.asset_cdn_url}/thumbnails/downtown_ar.jpg"
            }
            recommendations.append(nearby)
        
        if experience_type == ExperienceType.VIRTUAL_TOUR:
            # Add VR tour recommendations
            vr_tour = {
                "experience_id": "vr_tour_001",
                "title": "Ancient Rome VR Experience",
                "type": "virtual_tour",
                "rating": 4.9,
                "duration_minutes": 30,
                "thumbnail_url": f"{self.asset_cdn_url}/thumbnails/rome_vr.jpg",
                "platform_support": ["oculus", "steamvr", "webxr"]
            }
            recommendations.append(vr_tour)
        
        # Add 360 experiences
        experience_360 = {
            "experience_id": "360_001",
            "title": "Northern Lights 360°",
            "type": "360_video",
            "rating": 4.7,
            "duration_minutes": 10,
            "thumbnail_url": f"{self.asset_cdn_url}/thumbnails/northern_lights.jpg"
        }
        recommendations.append(experience_360)
        
        return recommendations


# WebXR Integration for Browser-Based AR/VR
class WebXRManager:
    """
    Manager for WebXR experiences that run directly in browsers
    """
    
    def __init__(self):
        self.webxr_scenes = {}
        self.aframe_templates = self._load_aframe_templates()
    
    def _load_aframe_templates(self) -> Dict[str, str]:
        """Load A-Frame templates for WebXR scenes"""
        
        return {
            "basic_scene": """
                <a-scene>
                    <a-sky src="{skybox_url}"></a-sky>
                    <a-entity environment="preset: {environment}"></a-entity>
                    {objects}
                    <a-camera position="0 1.6 0" look-controls wasd-controls>
                        <a-cursor></a-cursor>
                    </a-camera>
                </a-scene>
            """,
            "360_viewer": """
                <a-scene>
                    <a-sky src="{media_url}" rotation="0 -90 0"></a-sky>
                    {hotspots}
                    <a-camera>
                        <a-cursor
                            animation__click="property: scale; startEvents: click; from: 0.1 0.1 0.1; to: 1 1 1; dur: 150"
                            animation__fusing="property: scale; startEvents: fusing; from: 1 1 1; to: 0.1 0.1 0.1; dur: 1500"
                            event-set__1="_event: mouseenter; color: springgreen"
                            event-set__2="_event: mouseleave; color: black">
                        </a-cursor>
                    </a-camera>
                </a-scene>
            """,
            "ar_scene": """
                <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
                    {markers}
                    {objects}
                    <a-entity camera></a-entity>
                </a-scene>
            """
        }
    
    def generate_webxr_scene(self, scene_config: Scene3D) -> str:
        """Generate WebXR scene HTML using A-Frame"""
        
        # Generate objects HTML
        objects_html = ""
        for obj in scene_config.objects:
            if obj.object_type == "model":
                objects_html += f"""
                    <a-entity
                        gltf-model="{obj.asset_url}"
                        position="{obj.position['x']} {obj.position['y']} {obj.position['z']}"
                        rotation="{obj.rotation['x']} {obj.rotation['y']} {obj.rotation['z']}"
                        scale="{obj.scale['x']} {obj.scale['y']} {obj.scale['z']}"
                        {"animation='property: rotation; to: 0 360 0; loop: true; dur: 10000'" if obj.animation_url else ""}
                    ></a-entity>
                """
            elif obj.object_type == "text":
                text_data = obj.metadata
                objects_html += f"""
                    <a-text
                        value="{text_data.get('text', '')}"
                        position="{obj.position['x']} {obj.position['y']} {obj.position['z']}"
                        rotation="{obj.rotation['x']} {obj.rotation['y']} {obj.rotation['z']}"
                        color="{text_data.get('color', '#FFFFFF')}"
                        font="kelsonsans"
                    ></a-text>
                """
        
        # Generate scene HTML
        scene_html = self.aframe_templates["basic_scene"].format(
            skybox_url=scene_config.skybox_url or "",
            environment=scene_config.environment,
            objects=objects_html
        )
        
        return scene_html
    
    def generate_360_viewer(self, experience: Experience360) -> str:
        """Generate 360 photo/video viewer HTML"""
        
        # Generate hotspots HTML
        hotspots_html = ""
        for hotspot in experience.hotspots:
            hotspots_html += f"""
                <a-text
                    value="{hotspot.label}"
                    position="{self._spherical_to_cartesian(hotspot.position)}"
                    look-at="[camera]"
                    scale="5 5 5"
                    align="center"
                    color="#FFFFFF"
                    geometry="primitive: plane; width: auto; height: auto"
                    material="color: #333333; opacity: 0.8"
                ></a-text>
            """
        
        viewer_html = self.aframe_templates["360_viewer"].format(
            media_url=experience.media_url,
            hotspots=hotspots_html
        )
        
        return viewer_html
    
    def _spherical_to_cartesian(self, spherical: Dict[str, float], radius: float = 10) -> str:
        """Convert spherical coordinates to Cartesian for A-Frame"""
        
        theta = np.radians(spherical.get("theta", 0))
        phi = np.radians(spherical.get("phi", 0))
        
        x = radius * np.sin(phi) * np.cos(theta)
        y = radius * np.cos(phi)
        z = radius * np.sin(phi) * np.sin(theta)
        
        return f"{x} {y} {z}"


# Cloud Rendering Service Integration
class CloudRenderingService:
    """
    Integration with cloud rendering services for high-quality VR streaming
    """
    
    def __init__(self):
        self.rendering_nodes = []
        self.gpu_pool = {}
    
    async def request_rendering_session(
        self,
        experience_id: str,
        quality: ContentQuality,
        device_type: DeviceType
    ) -> Dict[str, Any]:
        """Request a cloud rendering session for VR content"""
        
        # Select optimal rendering node based on load and location
        node = await self._select_rendering_node()
        
        # Configure rendering settings
        render_config = {
            "experience_id": experience_id,
            "quality": quality.value,
            "device_type": device_type.value,
            "resolution": self._get_resolution_for_device(device_type),
            "framerate": self._get_framerate_for_quality(quality),
            "encoding": "h265" if quality in [ContentQuality.HIGH, ContentQuality.ULTRA] else "h264"
        }
        
        # Initialize streaming session
        session_info = {
            "session_id": f"render_{uuid.uuid4().hex}",
            "node_url": node,
            "stream_url": f"wss://{node}/stream/{experience_id}",
            "render_config": render_config,
            "estimated_latency_ms": 20
        }
        
        return session_info
    
    async def _select_rendering_node(self) -> str:
        """Select optimal rendering node"""
        # In production, this would check real node availability
        return "render-node-01.spirittours.com"
    
    def _get_resolution_for_device(self, device_type: DeviceType) -> str:
        """Get optimal resolution for device type"""
        resolutions = {
            DeviceType.VR_HEADSET: "2880x1700",
            DeviceType.AR_GLASSES: "1920x1080",
            DeviceType.SMARTPHONE: "1920x1080",
            DeviceType.TABLET: "2048x1536",
            DeviceType.DESKTOP: "2560x1440"
        }
        return resolutions.get(device_type, "1920x1080")
    
    def _get_framerate_for_quality(self, quality: ContentQuality) -> int:
        """Get framerate based on quality setting"""
        framerates = {
            ContentQuality.LOW: 30,
            ContentQuality.MEDIUM: 60,
            ContentQuality.HIGH: 90,
            ContentQuality.ULTRA: 120
        }
        return framerates.get(quality, 60)