"""
Open Source Services API Router
Exposes all free/open-source service endpoints
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Query
from typing import Dict, List, Optional, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field

from ..services.opensource.opensource_integration_manager import opensource_manager

router = APIRouter(prefix="/api/opensource", tags=["opensource"])

# Request/Response Models

class GeocodeRequest(BaseModel):
    address: str
    country: Optional[str] = None

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    mode: str = "driving"

class MessageRequest(BaseModel):
    recipient: str
    content: str
    message_type: str = "text"

class EventTrackRequest(BaseModel):
    event_name: str
    properties: Optional[Dict[str, Any]] = None
    url: Optional[str] = None

class PaymentRequest(BaseModel):
    amount: float
    currency: str = "USD"
    description: str
    crypto_currency: Optional[str] = None
    buyer_email: Optional[str] = None

class MeetingRequest(BaseModel):
    subject: str
    start_time: Optional[datetime] = None
    duration: int = 60
    enable_recording: bool = False
    enable_streaming: bool = False

class SearchRequest(BaseModel):
    query: str
    index: str = "tours"
    filters: Optional[Dict[str, Any]] = None
    limit: int = 20
    offset: int = 0

# Health & Status Endpoints

@router.get("/health")
async def health_check():
    """Check health status of all open-source services"""
    health_status = await opensource_manager.initialize_all_services()
    return {
        "status": "healthy" if all(health_status.values()) else "degraded",
        "services": health_status,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/savings")
async def get_cost_savings():
    """Get total cost savings from using open-source alternatives"""
    savings = opensource_manager.get_total_savings()
    return {
        "monthly_savings": float(savings["monthly"]),
        "annual_savings": float(savings["annual"]),
        "daily_savings": float(savings["daily"]),
        "services": [
            {
                "service": s.service,
                "replaces": s.alternative_to,
                "monthly_savings": float(s.monthly_savings),
                "features": s.features_comparison
            }
            for s in opensource_manager.cost_savings
        ]
    }

@router.get("/dashboard")
async def get_dashboard():
    """Get comprehensive dashboard with all metrics"""
    return await opensource_manager.get_dashboard_data()

# OpenStreetMap Endpoints

@router.post("/maps/geocode")
async def geocode_address(request: GeocodeRequest):
    """Convert address to coordinates using OpenStreetMap"""
    location = await opensource_manager.services["maps"].geocode(
        request.address,
        request.country
    )
    
    if location:
        return {
            "success": True,
            "location": {
                "latitude": location.latitude,
                "longitude": location.longitude,
                "address": location.address,
                "city": location.city,
                "country": location.country
            }
        }
    
    raise HTTPException(status_code=404, detail="Location not found")

@router.post("/maps/route")
async def calculate_route(request: RouteRequest):
    """Calculate route between two points"""
    route = await opensource_manager.services["maps"].get_route(
        start=(request.start_lat, request.start_lng),
        end=(request.end_lat, request.end_lng),
        mode=request.mode
    )
    
    if route:
        return {
            "success": True,
            "route": {
                "distance_meters": route.distance,
                "duration_seconds": route.duration,
                "polyline": route.polyline,
                "instructions": route.instructions
            }
        }
    
    raise HTTPException(status_code=404, detail="Route not found")

@router.get("/maps/pois")
async def search_pois(
    lat: float = Query(...),
    lng: float = Query(...),
    radius: int = Query(5000),
    category: Optional[str] = Query(None)
):
    """Search for Points of Interest nearby"""
    pois = await opensource_manager.services["maps"].search_pois(
        location=(lat, lng),
        radius=radius,
        category=category
    )
    
    return {
        "success": True,
        "count": len(pois),
        "pois": [
            {
                "name": poi.name,
                "category": poi.category,
                "distance": poi.distance,
                "location": {
                    "lat": poi.location.latitude,
                    "lng": poi.location.longitude
                }
            }
            for poi in pois
        ]
    }

# Matrix Messaging Endpoints

@router.post("/messaging/send")
async def send_message(request: MessageRequest):
    """Send message via Matrix protocol"""
    message = await opensource_manager.send_message(
        recipient=request.recipient,
        content=request.content,
        message_type=request.message_type
    )
    
    if message:
        return {
            "success": True,
            "message_id": message.message_id,
            "status": message.status.value
        }
    
    raise HTTPException(status_code=500, detail="Failed to send message")

@router.post("/messaging/room/create")
async def create_chat_room(
    name: str,
    members: List[str],
    is_encrypted: bool = True
):
    """Create new Matrix chat room"""
    room = await opensource_manager.services["messaging"].create_room(
        name=name,
        members=members,
        is_encrypted=is_encrypted
    )
    
    if room:
        return {
            "success": True,
            "room_id": room.room_id,
            "name": room.name
        }
    
    raise HTTPException(status_code=500, detail="Failed to create room")

# Plausible Analytics Endpoints

@router.post("/analytics/event")
async def track_event(request: EventTrackRequest):
    """Track custom event in Plausible Analytics"""
    success = await opensource_manager.track_event(
        event_name=request.event_name,
        properties=request.properties
    )
    
    return {
        "success": success,
        "event": request.event_name
    }

@router.get("/analytics/stats")
async def get_analytics_stats(
    period: str = Query("30d"),
    metrics: Optional[List[str]] = Query(None)
):
    """Get analytics statistics"""
    from ..services.opensource.plausible_analytics_service import Period, MetricType
    
    period_enum = Period(period)
    metric_enums = [MetricType(m) for m in metrics] if metrics else None
    
    stats = await opensource_manager.services["analytics"].get_stats(
        period=period_enum,
        metrics=metric_enums
    )
    
    return stats

@router.get("/analytics/realtime")
async def get_realtime_visitors():
    """Get current visitor count"""
    count = await opensource_manager.services["analytics"].get_realtime_visitors()
    
    return {
        "visitors": count,
        "timestamp": datetime.now().isoformat()
    }

# BTCPay Server Endpoints

@router.post("/payments/invoice")
async def create_invoice(request: PaymentRequest):
    """Create cryptocurrency payment invoice"""
    invoice = await opensource_manager.create_payment(
        amount=Decimal(str(request.amount)),
        currency=request.currency,
        description=request.description
    )
    
    if invoice:
        return {
            "success": True,
            "invoice_id": invoice.id,
            "payment_url": invoice.payment_url,
            "crypto_address": invoice.address,
            "expires_at": invoice.expires_at.isoformat()
        }
    
    raise HTTPException(status_code=500, detail="Failed to create invoice")

@router.get("/payments/invoice/{invoice_id}")
async def get_invoice_status(invoice_id: str):
    """Check payment invoice status"""
    invoice = await opensource_manager.services["payments"].get_invoice(invoice_id)
    
    if invoice:
        return {
            "invoice_id": invoice.id,
            "status": invoice.status.value,
            "amount": float(invoice.amount),
            "crypto_amount": float(invoice.crypto_amount)
        }
    
    raise HTTPException(status_code=404, detail="Invoice not found")

@router.get("/payments/rates")
async def get_exchange_rates(
    from_currency: str = Query("BTC"),
    to_currency: str = Query("USD")
):
    """Get cryptocurrency exchange rates"""
    rate = await opensource_manager.services["payments"].get_exchange_rate(
        from_currency,
        to_currency
    )
    
    if rate:
        return {
            "from": from_currency,
            "to": to_currency,
            "rate": float(rate),
            "timestamp": datetime.now().isoformat()
        }
    
    raise HTTPException(status_code=404, detail="Exchange rate not available")

# Jitsi Meet Endpoints

@router.post("/video/meeting")
async def create_meeting(request: MeetingRequest):
    """Create Jitsi video meeting"""
    meeting = await opensource_manager.create_video_meeting(
        subject=request.subject,
        duration=request.duration
    )
    
    return {
        "success": True,
        "meeting_id": meeting.meeting_id,
        "room_name": meeting.room_name,
        "join_url": opensource_manager.services["video"].get_meeting_url(meeting),
        "moderator_password": meeting.moderator_password
    }

@router.get("/video/meeting/{meeting_id}/embed")
async def get_meeting_embed(
    meeting_id: str,
    width: str = Query("100%"),
    height: str = Query("600px")
):
    """Get embeddable meeting iframe"""
    if meeting_id in opensource_manager.services["video"].meetings:
        meeting = opensource_manager.services["video"].meetings[meeting_id]
        embed_html = opensource_manager.services["video"].get_embedded_meeting(
            meeting,
            width,
            height
        )
        
        return {
            "embed_html": embed_html,
            "meeting_id": meeting_id
        }
    
    raise HTTPException(status_code=404, detail="Meeting not found")

# Meilisearch Endpoints

@router.post("/search")
async def search_content(request: SearchRequest):
    """Search content using Meilisearch"""
    response = await opensource_manager.search_content(
        query=request.query,
        index=request.index
    )
    
    if response:
        return {
            "success": True,
            "query": response.query,
            "hits": len(response.hits),
            "results": [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "document": hit.document
                }
                for hit in response.hits
            ],
            "processing_time_ms": response.processing_time_ms
        }
    
    return {
        "success": False,
        "hits": 0,
        "results": []
    }

@router.post("/search/index/{index_uid}/documents")
async def index_documents(
    index_uid: str,
    documents: List[Dict[str, Any]]
):
    """Add documents to search index"""
    task = await opensource_manager.services["search"].add_documents(
        index_uid=index_uid,
        documents=documents
    )
    
    if task:
        return {
            "success": True,
            "task_id": task.uid,
            "status": task.status,
            "documents_count": len(documents)
        }
    
    raise HTTPException(status_code=500, detail="Failed to index documents")

@router.get("/search/autocomplete")
async def autocomplete(
    query: str = Query(...),
    index: str = Query("tours"),
    limit: int = Query(5)
):
    """Get autocomplete suggestions"""
    suggestions = await opensource_manager.services["search"].autocomplete(
        index_uid=index,
        query=query,
        limit=limit
    )
    
    return {
        "query": query,
        "suggestions": suggestions
    }

# Integrated Tour Endpoints

@router.post("/tour/create-with-services")
async def create_tour_integrated(tour_data: Dict[str, Any]):
    """Create tour with all integrated services"""
    result = await opensource_manager.create_tour_with_all_services(tour_data)
    return result

@router.post("/booking/process-with-services")
async def process_booking_integrated(booking_data: Dict[str, Any]):
    """Process booking using all integrated services"""
    result = await opensource_manager.process_booking_with_services(booking_data)
    return result

# Configuration Management

@router.get("/config/export")
async def export_configuration():
    """Export all service configurations"""
    return await opensource_manager.export_configuration()

@router.post("/config/import")
async def import_configuration(config_data: Dict[str, Any]):
    """Import service configurations"""
    await opensource_manager.import_configuration(config_data)
    return {"success": True, "message": "Configuration imported successfully"}

# Service Comparison Endpoint

@router.get("/compare/{service_type}")
async def compare_with_paid_alternative(service_type: str):
    """Compare open-source service with paid alternative"""
    comparisons = {
        "maps": {
            "opensource": {
                "name": "OpenStreetMap",
                "cost": "$0/month",
                "requests": "Unlimited",
                "features": ["Geocoding", "Routing", "POIs", "Elevation", "Tiles"],
                "pros": ["100% Free", "No API limits", "Community-driven", "Privacy-focused"],
                "cons": ["Self-hosted option needed for high traffic", "Less imagery than Google"]
            },
            "paid": {
                "name": "Google Maps API",
                "cost": "$200+/month",
                "requests": "28,000 free then paid",
                "features": ["Same as OSM", "Street View", "More imagery"],
                "pros": ["Street View", "More POI data", "Better in some regions"],
                "cons": ["Expensive", "API limits", "Privacy concerns", "Vendor lock-in"]
            }
        },
        "messaging": {
            "opensource": {
                "name": "Matrix",
                "cost": "$0/month",
                "messages": "Unlimited",
                "features": ["E2E Encryption", "Federation", "Voice/Video", "File sharing"],
                "pros": ["Free forever", "Decentralized", "Open protocol", "Self-hostable"],
                "cons": ["Smaller user base", "Setup complexity"]
            },
            "paid": {
                "name": "WhatsApp Business API",
                "cost": "$49.99+/month",
                "messages": "Paid per message",
                "features": ["Business tools", "WhatsApp user base", "Templates"],
                "pros": ["Large user base", "Business features"],
                "cons": ["Expensive", "Per-message fees", "Facebook dependency", "Limited API"]
            }
        },
        "video": {
            "opensource": {
                "name": "Jitsi Meet",
                "cost": "$0/month",
                "duration": "Unlimited",
                "features": ["No time limits", "100+ participants", "Recording", "Streaming"],
                "pros": ["Completely free", "No account needed", "Open source", "Self-hostable"],
                "cons": ["Less polished UI", "Depends on server"]
            },
            "paid": {
                "name": "Zoom Pro",
                "cost": "$149.90/month",
                "duration": "30 hours max",
                "features": ["Cloud recording", "Webinars", "Admin controls"],
                "pros": ["Polished UI", "Cloud features", "Enterprise support"],
                "cons": ["Expensive", "Time limits", "Privacy concerns", "Requires accounts"]
            }
        }
    }
    
    if service_type in comparisons:
        return comparisons[service_type]
    
    raise HTTPException(status_code=404, detail="Service comparison not found")