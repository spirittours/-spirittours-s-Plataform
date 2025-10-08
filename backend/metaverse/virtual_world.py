"""
Sistema de Metaverso para Spirit Tours
Mundo virtual, avatares personalizados, eventos virtuales y economía digital
"""

import asyncio
import json
import uuid
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass
import numpy as np
from pydantic import BaseModel, Field
import websockets

# 3D and Graphics imports
try:
    import trimesh
    import pyglet
    from PIL import Image
    GRAPHICS_AVAILABLE = True
except ImportError:
    GRAPHICS_AVAILABLE = False
    print("Graphics libraries not available. Install with: pip install trimesh pyglet pillow")

# Enums
class WorldZone(str, Enum):
    WELCOME_PLAZA = "welcome_plaza"
    TRAVEL_DISTRICT = "travel_district"
    CULTURAL_QUARTER = "cultural_quarter"
    ADVENTURE_ZONE = "adventure_zone"
    RELAXATION_GARDENS = "relaxation_gardens"
    SHOPPING_BOULEVARD = "shopping_boulevard"
    EVENT_ARENA = "event_arena"
    SOCIAL_HUB = "social_hub"
    EDUCATION_CENTER = "education_center"
    NFT_GALLERY = "nft_gallery"

class AvatarType(str, Enum):
    HUMANOID = "humanoid"
    STYLIZED = "stylized"
    FANTASY = "fantasy"
    ROBOT = "robot"
    ANIMAL = "animal"
    CUSTOM = "custom"

class EventType(str, Enum):
    CONCERT = "concert"
    CONFERENCE = "conference"
    EXHIBITION = "exhibition"
    PARTY = "party"
    WORKSHOP = "workshop"
    TOUR = "tour"
    COMPETITION = "competition"
    MEETUP = "meetup"

class ItemCategory(str, Enum):
    CLOTHING = "clothing"
    ACCESSORY = "accessory"
    VEHICLE = "vehicle"
    PROPERTY = "property"
    DECORATION = "decoration"
    CONSUMABLE = "consumable"
    TOOL = "tool"
    COLLECTIBLE = "collectible"

# Data Models
@dataclass
class Vector3D:
    """3D Vector for positioning"""
    x: float
    y: float
    z: float
    
    def distance_to(self, other: 'Vector3D') -> float:
        return np.sqrt(
            (self.x - other.x) ** 2 + 
            (self.y - other.y) ** 2 + 
            (self.z - other.z) ** 2
        )
    
    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y, "z": self.z}

@dataclass
class Avatar:
    """User avatar in metaverse"""
    avatar_id: str
    user_id: str
    name: str
    avatar_type: AvatarType
    model_url: str
    position: Vector3D
    rotation: Vector3D
    scale: float
    customization: Dict[str, Any]
    inventory: List[str]
    level: int
    experience_points: int
    achievements: List[str]
    social_status: Dict[str, Any]
    created_at: datetime
    last_active: datetime

class VirtualProperty(BaseModel):
    """Virtual property in metaverse"""
    property_id: str
    owner_id: str
    zone: WorldZone
    position: Dict[str, float]
    size: Dict[str, float]
    property_type: str  # "land", "building", "shop", "gallery"
    build_permissions: List[str]
    visitor_permissions: List[str]
    rental_price: Optional[float] = None
    for_sale: bool = False
    sale_price: Optional[float] = None
    decorations: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}

class VirtualEvent(BaseModel):
    """Virtual event in metaverse"""
    event_id: str
    host_id: str
    event_type: EventType
    title: str
    description: str
    zone: WorldZone
    location: Dict[str, float]
    start_time: datetime
    end_time: datetime
    max_attendees: int
    current_attendees: List[str] = []
    ticket_price: float = 0
    is_public: bool = True
    featured: bool = False
    streaming_url: Optional[str] = None
    rewards: List[Dict[str, Any]] = []

class VirtualItem(BaseModel):
    """Virtual item in metaverse"""
    item_id: str
    name: str
    category: ItemCategory
    rarity: str  # "common", "rare", "epic", "legendary"
    model_url: str
    thumbnail_url: str
    description: str
    properties: Dict[str, Any]
    tradeable: bool = True
    price: Optional[float] = None
    owner_id: Optional[str] = None
    created_by: str
    created_at: datetime

class Transaction(BaseModel):
    """Virtual economy transaction"""
    transaction_id: str
    from_user: str
    to_user: str
    amount: float
    currency: str  # "SPIRIT", "COINS", "GEMS"
    item_id: Optional[str] = None
    transaction_type: str  # "purchase", "transfer", "reward", "rental"
    timestamp: datetime
    metadata: Dict[str, Any] = {}


class SpiritToursMetaverse:
    """
    Main Metaverse System for Spirit Tours
    """
    
    def __init__(self):
        self.world_map = self._initialize_world()
        self.active_users: Dict[str, Avatar] = {}
        self.properties: Dict[str, VirtualProperty] = {}
        self.events: Dict[str, VirtualEvent] = {}
        self.marketplace: Dict[str, VirtualItem] = {}
        self.economy = VirtualEconomy()
        self.social_graph = SocialGraph()
        self.render_engine = RenderEngine() if GRAPHICS_AVAILABLE else None
    
    def _initialize_world(self) -> Dict[WorldZone, Dict[str, Any]]:
        """Initialize the virtual world map"""
        
        world = {
            WorldZone.WELCOME_PLAZA: {
                "name": "Welcome Plaza",
                "description": "The grand entrance to Spirit Tours Metaverse",
                "size": {"x": 500, "y": 100, "z": 500},
                "spawn_point": {"x": 0, "y": 0, "z": 0},
                "features": ["fountain", "information_kiosks", "teleporters"],
                "capacity": 500,
                "theme": "modern"
            },
            WorldZone.TRAVEL_DISTRICT: {
                "name": "Travel District",
                "description": "Explore virtual destinations from around the world",
                "size": {"x": 1000, "y": 200, "z": 1000},
                "spawn_point": {"x": 500, "y": 0, "z": 500},
                "features": ["virtual_tours", "booking_offices", "destination_portals"],
                "capacity": 1000,
                "theme": "global"
            },
            WorldZone.CULTURAL_QUARTER: {
                "name": "Cultural Quarter",
                "description": "Experience diverse cultures and traditions",
                "size": {"x": 800, "y": 150, "z": 800},
                "spawn_point": {"x": -400, "y": 0, "z": 400},
                "features": ["museums", "art_galleries", "performance_spaces"],
                "capacity": 800,
                "theme": "multicultural"
            },
            WorldZone.ADVENTURE_ZONE: {
                "name": "Adventure Zone",
                "description": "Thrilling virtual adventures and challenges",
                "size": {"x": 1200, "y": 300, "z": 1200},
                "spawn_point": {"x": 0, "y": 0, "z": -600},
                "features": ["obstacle_courses", "quest_areas", "competition_arenas"],
                "capacity": 600,
                "theme": "adventure"
            },
            WorldZone.RELAXATION_GARDENS: {
                "name": "Relaxation Gardens",
                "description": "Peaceful virtual spaces for meditation and relaxation",
                "size": {"x": 600, "y": 50, "z": 600},
                "spawn_point": {"x": -300, "y": 0, "z": -300},
                "features": ["zen_gardens", "meditation_pods", "spa_facilities"],
                "capacity": 300,
                "theme": "zen"
            },
            WorldZone.SHOPPING_BOULEVARD: {
                "name": "Shopping Boulevard",
                "description": "Virtual marketplace for digital goods and NFTs",
                "size": {"x": 800, "y": 100, "z": 400},
                "spawn_point": {"x": 400, "y": 0, "z": -200},
                "features": ["shops", "auction_house", "trading_posts"],
                "capacity": 400,
                "theme": "commercial"
            },
            WorldZone.EVENT_ARENA: {
                "name": "Event Arena",
                "description": "Grand venue for virtual events and performances",
                "size": {"x": 400, "y": 200, "z": 400},
                "spawn_point": {"x": 200, "y": 0, "z": 200},
                "features": ["main_stage", "seating_areas", "backstage"],
                "capacity": 2000,
                "theme": "entertainment"
            },
            WorldZone.SOCIAL_HUB: {
                "name": "Social Hub",
                "description": "Meet and connect with travelers from around the world",
                "size": {"x": 500, "y": 100, "z": 500},
                "spawn_point": {"x": -250, "y": 0, "z": 250},
                "features": ["lounges", "meeting_rooms", "party_spaces"],
                "capacity": 500,
                "theme": "social"
            },
            WorldZone.EDUCATION_CENTER: {
                "name": "Education Center",
                "description": "Learn about travel, cultures, and languages",
                "size": {"x": 600, "y": 150, "z": 600},
                "spawn_point": {"x": 300, "y": 0, "z": 300},
                "features": ["classrooms", "library", "workshop_spaces"],
                "capacity": 400,
                "theme": "academic"
            },
            WorldZone.NFT_GALLERY: {
                "name": "NFT Gallery",
                "description": "Showcase your travel NFTs and digital collectibles",
                "size": {"x": 400, "y": 100, "z": 400},
                "spawn_point": {"x": -200, "y": 0, "z": -200},
                "features": ["exhibition_halls", "auction_rooms", "vip_lounges"],
                "capacity": 300,
                "theme": "artistic"
            }
        }
        
        return world
    
    async def create_avatar(
        self,
        user_id: str,
        name: str,
        avatar_type: AvatarType = AvatarType.HUMANOID,
        customization: Dict[str, Any] = None
    ) -> Avatar:
        """Create a new avatar for user"""
        
        avatar = Avatar(
            avatar_id=f"avatar_{uuid.uuid4().hex}",
            user_id=user_id,
            name=name,
            avatar_type=avatar_type,
            model_url=self._get_avatar_model_url(avatar_type),
            position=Vector3D(0, 0, 0),
            rotation=Vector3D(0, 0, 0),
            scale=1.0,
            customization=customization or self._default_customization(avatar_type),
            inventory=[],
            level=1,
            experience_points=0,
            achievements=[],
            social_status={
                "friends": [],
                "followers": 0,
                "reputation": 0
            },
            created_at=datetime.now(),
            last_active=datetime.now()
        )
        
        # Give welcome items
        welcome_items = await self._create_welcome_items(avatar.avatar_id)
        avatar.inventory.extend([item.item_id for item in welcome_items])
        
        return avatar
    
    def _get_avatar_model_url(self, avatar_type: AvatarType) -> str:
        """Get 3D model URL for avatar type"""
        
        models = {
            AvatarType.HUMANOID: "/models/avatars/humanoid_base.glb",
            AvatarType.STYLIZED: "/models/avatars/stylized_base.glb",
            AvatarType.FANTASY: "/models/avatars/fantasy_base.glb",
            AvatarType.ROBOT: "/models/avatars/robot_base.glb",
            AvatarType.ANIMAL: "/models/avatars/animal_base.glb",
            AvatarType.CUSTOM: "/models/avatars/custom_base.glb"
        }
        
        return models.get(avatar_type, models[AvatarType.HUMANOID])
    
    def _default_customization(self, avatar_type: AvatarType) -> Dict[str, Any]:
        """Get default customization options"""
        
        return {
            "skin_color": "#FFD4A3",
            "hair_style": "default",
            "hair_color": "#4A3C28",
            "eye_color": "#5B7C99",
            "clothing": "starter_outfit",
            "accessories": []
        }
    
    async def _create_welcome_items(self, avatar_id: str) -> List[VirtualItem]:
        """Create welcome items for new avatar"""
        
        items = [
            VirtualItem(
                item_id=f"item_{uuid.uuid4().hex}",
                name="Explorer's Backpack",
                category=ItemCategory.ACCESSORY,
                rarity="common",
                model_url="/models/items/backpack.glb",
                thumbnail_url="/thumbs/backpack.png",
                description="A sturdy backpack for your virtual adventures",
                properties={"storage_bonus": 10},
                owner_id=avatar_id,
                created_by="system",
                created_at=datetime.now()
            ),
            VirtualItem(
                item_id=f"item_{uuid.uuid4().hex}",
                name="Welcome Badge",
                category=ItemCategory.COLLECTIBLE,
                rarity="common",
                model_url="/models/items/badge.glb",
                thumbnail_url="/thumbs/badge.png",
                description="Welcome to Spirit Tours Metaverse!",
                properties={"achievement": "first_login"},
                owner_id=avatar_id,
                created_by="system",
                created_at=datetime.now()
            )
        ]
        
        return items
    
    async def enter_world(
        self,
        avatar: Avatar,
        zone: WorldZone = WorldZone.WELCOME_PLAZA
    ) -> Dict[str, Any]:
        """Enter the metaverse world"""
        
        # Set spawn position
        spawn_point = self.world_map[zone]["spawn_point"]
        avatar.position = Vector3D(
            spawn_point["x"] + np.random.uniform(-5, 5),
            spawn_point["y"],
            spawn_point["z"] + np.random.uniform(-5, 5)
        )
        
        # Add to active users
        self.active_users[avatar.avatar_id] = avatar
        avatar.last_active = datetime.now()
        
        # Get nearby users
        nearby_users = self._get_nearby_users(avatar, radius=50)
        
        # Get zone information
        zone_info = self.world_map[zone]
        
        return {
            "success": True,
            "avatar_id": avatar.avatar_id,
            "position": avatar.position.to_dict(),
            "zone": zone.value,
            "zone_info": zone_info,
            "nearby_users": [
                {
                    "avatar_id": u.avatar_id,
                    "name": u.name,
                    "position": u.position.to_dict()
                }
                for u in nearby_users
            ],
            "websocket_url": f"ws://metaverse.spirittours.com/world/{avatar.avatar_id}"
        }
    
    def _get_nearby_users(self, avatar: Avatar, radius: float = 50) -> List[Avatar]:
        """Get users within radius of avatar"""
        
        nearby = []
        
        for other_avatar in self.active_users.values():
            if other_avatar.avatar_id != avatar.avatar_id:
                distance = avatar.position.distance_to(other_avatar.position)
                if distance <= radius:
                    nearby.append(other_avatar)
        
        return nearby
    
    async def move_avatar(
        self,
        avatar_id: str,
        new_position: Dict[str, float],
        animation: str = "walk"
    ) -> Dict[str, Any]:
        """Move avatar to new position"""
        
        avatar = self.active_users.get(avatar_id)
        if not avatar:
            return {"error": "Avatar not found"}
        
        # Update position
        avatar.position = Vector3D(
            new_position["x"],
            new_position["y"],
            new_position["z"]
        )
        
        # Broadcast to nearby users
        await self._broadcast_movement(avatar, animation)
        
        # Check for zone change
        new_zone = self._get_zone_at_position(avatar.position)
        
        return {
            "success": True,
            "position": avatar.position.to_dict(),
            "zone": new_zone.value if new_zone else None,
            "animation": animation
        }
    
    async def _broadcast_movement(self, avatar: Avatar, animation: str):
        """Broadcast avatar movement to nearby users"""
        
        nearby = self._get_nearby_users(avatar, radius=100)
        
        message = {
            "type": "avatar_moved",
            "avatar_id": avatar.avatar_id,
            "position": avatar.position.to_dict(),
            "animation": animation
        }
        
        # In production, send via WebSocket to nearby users
        for user in nearby:
            # await send_websocket_message(user.avatar_id, message)
            pass
    
    def _get_zone_at_position(self, position: Vector3D) -> Optional[WorldZone]:
        """Get zone at given position"""
        
        for zone, info in self.world_map.items():
            zone_pos = info["spawn_point"]
            zone_size = info["size"]
            
            if (abs(position.x - zone_pos["x"]) <= zone_size["x"] / 2 and
                abs(position.z - zone_pos["z"]) <= zone_size["z"] / 2):
                return zone
        
        return None
    
    async def create_event(
        self,
        host_id: str,
        event_type: EventType,
        title: str,
        description: str,
        zone: WorldZone,
        start_time: datetime,
        duration_hours: int = 2,
        max_attendees: int = 100,
        ticket_price: float = 0
    ) -> VirtualEvent:
        """Create a virtual event"""
        
        event = VirtualEvent(
            event_id=f"event_{uuid.uuid4().hex}",
            host_id=host_id,
            event_type=event_type,
            title=title,
            description=description,
            zone=zone,
            location=self.world_map[zone]["spawn_point"],
            start_time=start_time,
            end_time=start_time + timedelta(hours=duration_hours),
            max_attendees=max_attendees,
            ticket_price=ticket_price
        )
        
        self.events[event.event_id] = event
        
        # Announce event
        await self._announce_event(event)
        
        return event
    
    async def _announce_event(self, event: VirtualEvent):
        """Announce event to all users"""
        
        announcement = {
            "type": "event_announcement",
            "event": {
                "id": event.event_id,
                "title": event.title,
                "type": event.event_type.value,
                "zone": event.zone.value,
                "start_time": event.start_time.isoformat(),
                "ticket_price": event.ticket_price
            }
        }
        
        # Broadcast to all active users
        for avatar in self.active_users.values():
            # await send_notification(avatar.user_id, announcement)
            pass
    
    async def attend_event(
        self,
        avatar_id: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Attend a virtual event"""
        
        avatar = self.active_users.get(avatar_id)
        event = self.events.get(event_id)
        
        if not avatar or not event:
            return {"error": "Avatar or event not found"}
        
        # Check capacity
        if len(event.current_attendees) >= event.max_attendees:
            return {"error": "Event is full"}
        
        # Process payment if required
        if event.ticket_price > 0:
            payment_success = await self.economy.process_payment(
                avatar.user_id,
                event.host_id,
                event.ticket_price,
                "COINS"
            )
            
            if not payment_success:
                return {"error": "Payment failed"}
        
        # Add to attendees
        event.current_attendees.append(avatar_id)
        
        # Teleport avatar to event
        avatar.position = Vector3D(
            event.location["x"],
            event.location["y"],
            event.location["z"]
        )
        
        return {
            "success": True,
            "event": event.dict(),
            "position": avatar.position.to_dict()
        }
    
    async def purchase_property(
        self,
        buyer_id: str,
        zone: WorldZone,
        size: str = "small"
    ) -> VirtualProperty:
        """Purchase virtual property"""
        
        # Property sizes and prices
        property_sizes = {
            "small": {"size": {"x": 50, "y": 50, "z": 50}, "price": 1000},
            "medium": {"size": {"x": 100, "y": 100, "z": 100}, "price": 5000},
            "large": {"size": {"x": 200, "y": 200, "z": 200}, "price": 20000}
        }
        
        prop_config = property_sizes[size]
        
        # Process payment
        payment_success = await self.economy.process_payment(
            buyer_id,
            "system",
            prop_config["price"],
            "COINS"
        )
        
        if not payment_success:
            raise ValueError("Insufficient funds")
        
        # Find available location
        position = self._find_available_property_location(zone, prop_config["size"])
        
        # Create property
        property = VirtualProperty(
            property_id=f"prop_{uuid.uuid4().hex}",
            owner_id=buyer_id,
            zone=zone,
            position=position,
            size=prop_config["size"],
            property_type="land",
            build_permissions=[buyer_id],
            visitor_permissions=["all"]
        )
        
        self.properties[property.property_id] = property
        
        return property
    
    def _find_available_property_location(
        self,
        zone: WorldZone,
        size: Dict[str, float]
    ) -> Dict[str, float]:
        """Find available location for property"""
        
        # Simplified - would use spatial indexing in production
        zone_info = self.world_map[zone]
        
        return {
            "x": zone_info["spawn_point"]["x"] + np.random.uniform(-200, 200),
            "y": 0,
            "z": zone_info["spawn_point"]["z"] + np.random.uniform(-200, 200)
        }
    
    async def create_marketplace_listing(
        self,
        item: VirtualItem,
        price: float,
        currency: str = "COINS"
    ) -> Dict[str, Any]:
        """List item on marketplace"""
        
        if not item.tradeable:
            return {"error": "Item is not tradeable"}
        
        item.price = price
        self.marketplace[item.item_id] = item
        
        return {
            "success": True,
            "listing_id": item.item_id,
            "price": price,
            "currency": currency
        }
    
    async def purchase_item(
        self,
        buyer_id: str,
        item_id: str
    ) -> Dict[str, Any]:
        """Purchase item from marketplace"""
        
        item = self.marketplace.get(item_id)
        if not item:
            return {"error": "Item not found"}
        
        # Process payment
        payment_success = await self.economy.process_payment(
            buyer_id,
            item.owner_id,
            item.price,
            "COINS"
        )
        
        if not payment_success:
            return {"error": "Payment failed"}
        
        # Transfer ownership
        item.owner_id = buyer_id
        
        # Remove from marketplace
        del self.marketplace[item_id]
        
        # Add to buyer's inventory
        buyer_avatar = next(
            (a for a in self.active_users.values() if a.user_id == buyer_id),
            None
        )
        if buyer_avatar:
            buyer_avatar.inventory.append(item_id)
        
        return {
            "success": True,
            "item": item.dict()
        }


class VirtualEconomy:
    """
    Virtual economy system for metaverse
    """
    
    def __init__(self):
        self.wallets: Dict[str, Dict[str, float]] = {}
        self.exchange_rates = {
            "SPIRIT": 1.0,     # Base currency
            "COINS": 100.0,    # 1 SPIRIT = 100 COINS
            "GEMS": 0.1        # 1 SPIRIT = 0.1 GEMS
        }
        self.transaction_history: List[Transaction] = []
    
    async def create_wallet(self, user_id: str) -> Dict[str, float]:
        """Create wallet for new user"""
        
        self.wallets[user_id] = {
            "SPIRIT": 0.0,
            "COINS": 1000.0,  # Welcome bonus
            "GEMS": 5.0       # Welcome bonus
        }
        
        return self.wallets[user_id]
    
    async def get_balance(self, user_id: str) -> Dict[str, float]:
        """Get user balance"""
        
        if user_id not in self.wallets:
            await self.create_wallet(user_id)
        
        return self.wallets[user_id]
    
    async def process_payment(
        self,
        from_user: str,
        to_user: str,
        amount: float,
        currency: str
    ) -> bool:
        """Process payment between users"""
        
        # Check balance
        balance = await self.get_balance(from_user)
        
        if balance[currency] < amount:
            return False
        
        # Make transfer
        self.wallets[from_user][currency] -= amount
        
        if to_user != "system":
            if to_user not in self.wallets:
                await self.create_wallet(to_user)
            self.wallets[to_user][currency] += amount
        
        # Record transaction
        transaction = Transaction(
            transaction_id=f"tx_{uuid.uuid4().hex}",
            from_user=from_user,
            to_user=to_user,
            amount=amount,
            currency=currency,
            transaction_type="transfer",
            timestamp=datetime.now()
        )
        
        self.transaction_history.append(transaction)
        
        return True
    
    async def exchange_currency(
        self,
        user_id: str,
        from_currency: str,
        to_currency: str,
        amount: float
    ) -> Dict[str, Any]:
        """Exchange between currencies"""
        
        balance = await self.get_balance(user_id)
        
        if balance[from_currency] < amount:
            return {"error": "Insufficient funds"}
        
        # Calculate exchange
        from_rate = self.exchange_rates[from_currency]
        to_rate = self.exchange_rates[to_currency]
        exchanged_amount = (amount * from_rate) / to_rate
        
        # Apply exchange fee (2%)
        fee = exchanged_amount * 0.02
        final_amount = exchanged_amount - fee
        
        # Make exchange
        self.wallets[user_id][from_currency] -= amount
        self.wallets[user_id][to_currency] += final_amount
        
        return {
            "success": True,
            "exchanged": final_amount,
            "fee": fee,
            "rate": exchanged_amount / amount
        }
    
    async def reward_user(
        self,
        user_id: str,
        amount: float,
        currency: str,
        reason: str
    ) -> Dict[str, Any]:
        """Reward user with currency"""
        
        balance = await self.get_balance(user_id)
        self.wallets[user_id][currency] += amount
        
        # Record transaction
        transaction = Transaction(
            transaction_id=f"reward_{uuid.uuid4().hex}",
            from_user="system",
            to_user=user_id,
            amount=amount,
            currency=currency,
            transaction_type="reward",
            timestamp=datetime.now(),
            metadata={"reason": reason}
        )
        
        self.transaction_history.append(transaction)
        
        return {
            "success": True,
            "new_balance": self.wallets[user_id][currency],
            "reward": amount,
            "reason": reason
        }


class SocialGraph:
    """
    Social connections in metaverse
    """
    
    def __init__(self):
        self.friendships: Dict[str, List[str]] = {}
        self.followers: Dict[str, List[str]] = {}
        self.blocked: Dict[str, List[str]] = {}
        self.groups: Dict[str, Dict[str, Any]] = {}
    
    async def add_friend(self, user1: str, user2: str) -> bool:
        """Add friendship connection"""
        
        if user1 not in self.friendships:
            self.friendships[user1] = []
        if user2 not in self.friendships:
            self.friendships[user2] = []
        
        self.friendships[user1].append(user2)
        self.friendships[user2].append(user1)
        
        return True
    
    async def follow_user(self, follower: str, followed: str) -> bool:
        """Follow another user"""
        
        if followed not in self.followers:
            self.followers[followed] = []
        
        if follower not in self.followers[followed]:
            self.followers[followed].append(follower)
        
        return True
    
    async def create_group(
        self,
        creator: str,
        name: str,
        description: str,
        is_public: bool = True
    ) -> Dict[str, Any]:
        """Create social group"""
        
        group_id = f"group_{uuid.uuid4().hex}"
        
        group = {
            "id": group_id,
            "name": name,
            "description": description,
            "creator": creator,
            "admins": [creator],
            "members": [creator],
            "is_public": is_public,
            "created_at": datetime.now().isoformat()
        }
        
        self.groups[group_id] = group
        
        return group
    
    async def get_social_stats(self, user_id: str) -> Dict[str, Any]:
        """Get social statistics for user"""
        
        return {
            "friends": len(self.friendships.get(user_id, [])),
            "followers": len(self.followers.get(user_id, [])),
            "following": sum(1 for f in self.followers.values() if user_id in f),
            "groups": sum(1 for g in self.groups.values() if user_id in g["members"])
        }


class RenderEngine:
    """
    3D rendering engine for metaverse (simplified)
    """
    
    def __init__(self):
        self.scene_objects = []
        self.lights = []
        self.cameras = []
    
    async def load_zone(self, zone: WorldZone) -> Dict[str, Any]:
        """Load 3D assets for zone"""
        
        # In production, this would load actual 3D models
        return {
            "zone": zone.value,
            "assets_loaded": True,
            "object_count": 50,
            "texture_count": 100
        }
    
    async def render_frame(
        self,
        camera_position: Vector3D,
        camera_rotation: Vector3D,
        viewport_size: Tuple[int, int]
    ) -> bytes:
        """Render a frame from camera perspective"""
        
        # In production, this would render actual 3D scene
        # For now, return placeholder
        
        if GRAPHICS_AVAILABLE:
            # Create simple image
            img = Image.new('RGB', viewport_size, color='skyblue')
            import io
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            return buffer.getvalue()
        else:
            return b"RENDERED_FRAME_DATA"
    
    async def optimize_performance(
        self,
        quality_level: str = "medium"
    ) -> Dict[str, Any]:
        """Optimize rendering performance"""
        
        settings = {
            "low": {
                "texture_quality": 0.5,
                "shadow_quality": 0,
                "particle_effects": False,
                "draw_distance": 100
            },
            "medium": {
                "texture_quality": 0.75,
                "shadow_quality": 0.5,
                "particle_effects": True,
                "draw_distance": 200
            },
            "high": {
                "texture_quality": 1.0,
                "shadow_quality": 1.0,
                "particle_effects": True,
                "draw_distance": 500
            }
        }
        
        return settings.get(quality_level, settings["medium"])