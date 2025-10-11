"""
Contacts API
API REST para gestión de contactos con seguridad avanzada
"""

from fastapi import APIRouter, Depends, HTTPException, Query, File, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel, EmailStr, Field, validator
import pandas as pd
import io

from backend.database import get_db
from backend.auth import get_current_user
from backend.models.user_models import User
from backend.models.contacts_models import (
    Contact, ContactGroup, ContactTag, ContactShare,
    ContactType, ContactSource, ContactVisibility,
    SharePermission, SyncStatus
)
from backend.services.contacts_service import ContactsService
from backend.core.rate_limiter import rate_limit
from backend.core.audit import audit_log
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/contacts", tags=["Contacts"])

# ===== MODELOS PYDANTIC =====

class ContactBase(BaseModel):
    type: ContactType
    first_name: str
    last_name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    mobile: Optional[str]
    whatsapp: Optional[str]
    company: Optional[str]
    job_title: Optional[str]
    address_line1: Optional[str]
    city: Optional[str]
    country: Optional[str]
    notes: Optional[str]
    visibility: ContactVisibility = ContactVisibility.COMPANY
    
    @validator('phone', 'mobile', 'whatsapp')
    def validate_phone(cls, v):
        if v and not v.startswith('+'):
            raise ValueError('Phone must include country code (e.g., +51 for Peru)')
        return v

class ContactCreate(ContactBase):
    tags: Optional[List[str]] = []
    groups: Optional[List[str]] = []
    custom_fields: Optional[Dict[str, Any]] = {}

class ContactUpdate(BaseModel):
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[EmailStr]
    phone: Optional[str]
    mobile: Optional[str]
    company: Optional[str]
    notes: Optional[str]
    visibility: Optional[ContactVisibility]
    custom_fields: Optional[Dict[str, Any]]

class ContactResponse(ContactBase):
    id: str
    full_name: str
    quality_score: int
    total_bookings: int
    lifetime_value: float
    is_verified: bool
    is_blacklisted: bool
    created_at: datetime
    updated_at: Optional[datetime]
    owner_id: str
    tags: List[str]
    groups: List[Dict]
    
    class Config:
        orm_mode = True

class ContactShareRequest(BaseModel):
    contact_ids: List[str]
    share_with_user_id: Optional[str]
    share_with_email: Optional[EmailStr]
    permission: SharePermission = SharePermission.VIEW
    can_reshare: bool = False
    expires_in_days: Optional[int] = 30
    message: Optional[str]

class ContactImportRequest(BaseModel):
    source: ContactSource
    auto_merge: bool = False
    check_duplicates: bool = True
    mapping: Optional[Dict[str, str]]

class ContactExportRequest(BaseModel):
    contact_ids: Optional[List[str]]
    filters: Optional[Dict[str, Any]]
    format: str = Field(default="csv", pattern="^(csv|xlsx|vcard)$")
    fields: Optional[List[str]]
    reason: str

class BulkOperationRequest(BaseModel):
    contact_ids: List[str]
    operation: str = Field(pattern="^(delete|tag|untag|move_group|change_owner|change_visibility)$")
    params: Dict[str, Any]

class ContactSearchRequest(BaseModel):
    query: Optional[str]
    type: Optional[ContactType]
    tags: Optional[List[str]]
    groups: Optional[List[str]]
    country: Optional[str]
    created_after: Optional[datetime]
    created_before: Optional[datetime]
    min_quality_score: Optional[int]
    is_verified: Optional[bool]
    has_email: Optional[bool]
    has_phone: Optional[bool]
    limit: int = Field(default=50, le=500)
    offset: int = Field(default=0, ge=0)

class SyncSettingsUpdate(BaseModel):
    google_sync_enabled: Optional[bool]
    outlook_sync_enabled: Optional[bool]
    whatsapp_sync_enabled: Optional[bool]
    sync_frequency: Optional[str]
    sync_direction: Optional[str]
    auto_merge_duplicates: Optional[bool]

# ===== ENDPOINTS PÚBLICOS =====

@router.get("/search", response_model=Dict)
@rate_limit(calls=60, period=60)
async def search_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    query: Optional[str] = Query(None),
    type: Optional[ContactType] = Query(None),
    country: Optional[str] = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0)
):
    """
    Buscar contactos con control de permisos
    
    - Solo devuelve contactos que el usuario puede ver
    - Límite máximo de 500 resultados
    - Soporta búsqueda por texto, tipo, país
    """
    service = ContactsService(db)
    
    contacts, total = service.search_contacts(
        user=current_user,
        query=query,
        contact_type=type,
        country=country,
        limit=limit,
        offset=offset
    )
    
    return {
        "contacts": [ContactResponse.from_orm(c) for c in contacts],
        "total": total,
        "limit": limit,
        "offset": offset
    }

@router.post("/advanced-search", response_model=Dict)
@rate_limit(calls=30, period=60)
async def advanced_search(
    request: ContactSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Búsqueda avanzada con múltiples filtros
    """
    service = ContactsService(db)
    
    # Aplicar filtros adicionales
    filters = {}
    if request.min_quality_score:
        filters['min_quality_score'] = request.min_quality_score
    if request.is_verified is not None:
        filters['is_verified'] = request.is_verified
    if request.has_email:
        filters['has_email'] = True
    if request.has_phone:
        filters['has_phone'] = True
    
    contacts, total = service.search_contacts(
        user=current_user,
        query=request.query,
        contact_type=request.type,
        tags=request.tags,
        groups=request.groups,
        country=request.country,
        created_after=request.created_after,
        created_before=request.created_before,
        limit=request.limit,
        offset=request.offset,
        **filters
    )
    
    return {
        "contacts": [ContactResponse.from_orm(c) for c in contacts],
        "total": total,
        "limit": request.limit,
        "offset": request.offset
    }

@router.get("/{contact_id}", response_model=ContactResponse)
@rate_limit(calls=100, period=60)
async def get_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener un contacto específico
    """
    service = ContactsService(db)
    
    try:
        contact = service.get_contact(current_user, contact_id)
        return ContactResponse.from_orm(contact)
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="No tienes permiso para ver este contacto")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

@router.post("/", response_model=ContactResponse)
@rate_limit(calls=30, period=60)
@audit_log(action="contact_create")
async def create_contact(
    contact_data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crear nuevo contacto
    
    - Detecta automáticamente duplicados
    - Valida email y teléfono
    - Asigna score de calidad
    """
    service = ContactsService(db)
    
    try:
        contact = service.create_contact(
            user=current_user,
            data=contact_data.dict(exclude_unset=True),
            check_duplicates=True
        )
        return ContactResponse.from_orm(contact)
    except DuplicateError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{contact_id}", response_model=ContactResponse)
@rate_limit(calls=60, period=60)
@audit_log(action="contact_update")
async def update_contact(
    contact_id: str,
    contact_data: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualizar contacto existente
    """
    service = ContactsService(db)
    
    try:
        contact = service.update_contact(
            user=current_user,
            contact_id=contact_id,
            data=contact_data.dict(exclude_unset=True)
        )
        return ContactResponse.from_orm(contact)
    except PermissionDeniedError:
        raise HTTPException(status_code=403, detail="No tienes permiso para editar este contacto")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")

@router.delete("/{contact_id}")
@rate_limit(calls=30, period=60)
@audit_log(action="contact_delete")
async def delete_contact(
    contact_id: str,
    hard_delete: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Eliminar contacto (soft delete por defecto)
    
    - Solo el propietario o admin puede eliminar
    - Hard delete requiere permisos de admin
    """
    service = ContactsService(db)
    
    try:
        success = service.delete_contact(
            user=current_user,
            contact_id=contact_id,
            hard_delete=hard_delete
        )
        return {"success": success, "message": "Contacto eliminado exitosamente"}
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ===== OPERACIONES MASIVAS =====

@router.post("/bulk", response_model=Dict)
@rate_limit(calls=10, period=60)
@audit_log(action="contact_bulk_operation")
async def bulk_operation(
    request: BulkOperationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Operaciones masivas sobre múltiples contactos
    
    - Requiere permisos sobre cada contacto
    - Máximo 100 contactos por operación
    """
    if len(request.contact_ids) > 100:
        raise HTTPException(status_code=400, detail="Máximo 100 contactos por operación")
    
    service = ContactsService(db)
    results = {"success": [], "failed": []}
    
    for contact_id in request.contact_ids:
        try:
            if request.operation == "delete":
                service.delete_contact(current_user, contact_id)
            elif request.operation == "tag":
                service.add_tags(current_user, contact_id, request.params.get("tags", []))
            elif request.operation == "change_visibility":
                service.update_contact(
                    current_user, 
                    contact_id, 
                    {"visibility": request.params.get("visibility")}
                )
            results["success"].append(contact_id)
        except Exception as e:
            results["failed"].append({"contact_id": contact_id, "error": str(e)})
    
    return results

# ===== IMPORTACIÓN Y EXPORTACIÓN =====

@router.post("/import", response_model=Dict)
@rate_limit(calls=5, period=60)
@audit_log(action="contact_import")
async def import_contacts(
    background_tasks: BackgroundTasks,
    source: ContactSource = Query(...),
    file: Optional[UploadFile] = File(None),
    auto_merge: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importar contactos desde diferentes fuentes
    
    - Google Contacts
    - Outlook/Exchange  
    - CSV/Excel
    - WhatsApp
    """
    service = ContactsService(db)
    
    if source == ContactSource.CSV_IMPORT:
        if not file:
            raise HTTPException(status_code=400, detail="Se requiere archivo CSV")
        
        # Guardar archivo temporalmente
        temp_path = f"/tmp/import_{current_user.id}_{datetime.now().timestamp()}.csv"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        
        # Procesar en background
        background_tasks.add_task(
            service.import_from_csv,
            user=current_user,
            file_path=temp_path,
            mapping={"nombre": "first_name", "apellido": "last_name", "correo": "email"},
            check_duplicates=True
        )
        
        return {"message": "Importación iniciada, recibirás una notificación cuando termine"}
    
    elif source == ContactSource.GOOGLE_SYNC:
        background_tasks.add_task(
            service.import_google_contacts,
            user=current_user,
            auto_merge=auto_merge
        )
        return {"message": "Sincronización con Google iniciada"}
    
    elif source == ContactSource.OUTLOOK_SYNC:
        background_tasks.add_task(
            service.sync_outlook_contacts,
            user=current_user
        )
        return {"message": "Sincronización con Outlook iniciada"}
    
    else:
        raise HTTPException(status_code=400, detail=f"Fuente no soportada: {source}")

@router.post("/export", response_model=Dict)
@rate_limit(calls=10, period=60)
@audit_log(action="contact_export")
async def export_contacts(
    request: ContactExportRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exportar contactos con control de seguridad
    
    - Requiere razón de exportación
    - Límites según rol del usuario
    - Registro de auditoría completo
    """
    service = ContactsService(db)
    
    # Admin requiere confirmación para exportaciones masivas
    if len(request.contact_ids or []) > 1000 and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Solo administradores pueden exportar más de 1000 contactos"
        )
    
    try:
        export_record = service.export_contacts(
            user=current_user,
            contact_ids=request.contact_ids or [],
            format=request.format,
            fields=request.fields,
            reason=request.reason
        )
        
        return {
            "export_id": str(export_record.id),
            "download_url": f"/api/contacts/export/download/{export_record.id}",
            "expires_at": export_record.expires_at,
            "contact_count": export_record.contact_count
        }
    except ExportLimitExceededError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.get("/export/download/{export_id}")
async def download_export(
    export_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Descargar archivo de exportación
    """
    export = db.query(ContactExport).filter(
        ContactExport.id == export_id,
        ContactExport.exported_by == current_user.id
    ).first()
    
    if not export:
        raise HTTPException(status_code=404, detail="Exportación no encontrada")
    
    if export.expires_at and export.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="El archivo ha expirado")
    
    # Incrementar contador de descargas
    export.download_count += 1
    db.commit()
    
    return FileResponse(
        export.file_path,
        media_type='application/octet-stream',
        filename=f"contacts_{export.export_format}_{export_id}.{export.export_format}"
    )

# ===== COMPARTIR CONTACTOS =====

@router.post("/share", response_model=Dict)
@rate_limit(calls=20, period=60)
@audit_log(action="contact_share")
async def share_contacts(
    request: ContactShareRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compartir contactos con otros usuarios
    
    - Interno: con usuarios del sistema
    - Externo: vía email con token temporal
    """
    service = ContactsService(db)
    shares_created = []
    
    for contact_id in request.contact_ids:
        try:
            share_with = {}
            if request.share_with_user_id:
                share_with['user_id'] = request.share_with_user_id
            elif request.share_with_email:
                share_with['email'] = request.share_with_email
            
            share = service.share_contact(
                user=current_user,
                contact_id=contact_id,
                share_with=share_with,
                permission=request.permission,
                message=request.message,
                expires_in_days=request.expires_in_days
            )
            shares_created.append(str(share.id))
        except PermissionDeniedError:
            continue
    
    return {
        "shares_created": len(shares_created),
        "share_ids": shares_created,
        "message": f"Compartido {len(shares_created)} contactos exitosamente"
    }

@router.post("/share/itinerary/{contact_id}")
@rate_limit(calls=10, period=60)
async def share_itinerary_sms(
    contact_id: str,
    itinerary_id: str,
    message: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compartir itinerario vía SMS/WhatsApp
    """
    service = ContactsService(db)
    
    try:
        success = service.share_itinerary_via_sms(
            user=current_user,
            contact_id=contact_id,
            itinerary_id=itinerary_id,
            custom_message=message
        )
        return {"success": success, "message": "Itinerario enviado exitosamente"}
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ===== DUPLICADOS =====

@router.get("/duplicates/candidates", response_model=List[Dict])
@rate_limit(calls=10, period=60)
async def get_duplicate_candidates(
    threshold: float = Query(0.8, ge=0.5, le=1.0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buscar posibles contactos duplicados
    
    - Solo admin puede buscar en todos los contactos
    - Otros usuarios solo en sus contactos
    """
    if not current_user.is_admin and not current_user.role == 'manager':
        raise HTTPException(
            status_code=403,
            detail="Solo administradores y managers pueden buscar duplicados"
        )
    
    service = ContactsService(db)
    candidates = service.find_duplicate_candidates(current_user, threshold)
    
    return [
        {
            "id": str(c.id),
            "contact1": {"id": str(c.contact1_id), "name": c.contact1.full_name},
            "contact2": {"id": str(c.contact2_id), "name": c.contact2.full_name},
            "similarity_score": c.similarity_score,
            "confidence_level": c.confidence_level,
            "matching_fields": c.matching_fields
        }
        for c in candidates
    ]

@router.post("/duplicates/merge")
@audit_log(action="contact_merge")
async def merge_duplicates(
    primary_id: str,
    secondary_id: str,
    strategy: str = Query("keep_primary", pattern="^(keep_primary|keep_newest|manual)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Fusionar contactos duplicados
    """
    service = ContactsService(db)
    
    try:
        merged = service.merge_contacts(
            user=current_user,
            primary_id=primary_id,
            secondary_id=secondary_id,
            merge_strategy=strategy
        )
        return {
            "success": True,
            "merged_contact_id": str(merged.id),
            "message": "Contactos fusionados exitosamente"
        }
    except PermissionDeniedError as e:
        raise HTTPException(status_code=403, detail=str(e))

# ===== SINCRONIZACIÓN =====

@router.get("/sync/settings", response_model=Dict)
async def get_sync_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener configuración de sincronización
    """
    settings = db.query(ContactSyncSettings).filter(
        ContactSyncSettings.user_id == current_user.id
    ).first()
    
    if not settings:
        return {
            "google_sync_enabled": False,
            "outlook_sync_enabled": False,
            "whatsapp_sync_enabled": False,
            "sync_frequency": "manual"
        }
    
    return {
        "google_sync_enabled": settings.google_sync_enabled,
        "google_account": settings.google_account,
        "google_last_sync": settings.google_last_sync,
        "outlook_sync_enabled": settings.outlook_sync_enabled,
        "outlook_account": settings.outlook_account,
        "outlook_last_sync": settings.outlook_last_sync,
        "whatsapp_sync_enabled": settings.whatsapp_sync_enabled,
        "sync_frequency": settings.sync_frequency,
        "sync_direction": settings.sync_direction,
        "auto_merge_duplicates": settings.auto_merge_duplicates
    }

@router.put("/sync/settings")
@audit_log(action="sync_settings_update")
async def update_sync_settings(
    settings: SyncSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualizar configuración de sincronización
    """
    sync_settings = db.query(ContactSyncSettings).filter(
        ContactSyncSettings.user_id == current_user.id
    ).first()
    
    if not sync_settings:
        sync_settings = ContactSyncSettings(user_id=current_user.id)
        db.add(sync_settings)
    
    for key, value in settings.dict(exclude_unset=True).items():
        setattr(sync_settings, key, value)
    
    db.commit()
    
    return {"success": True, "message": "Configuración actualizada"}

# ===== ESTADÍSTICAS =====

@router.get("/stats/overview", response_model=Dict)
@rate_limit(calls=30, period=60)
async def get_contacts_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Estadísticas generales de contactos
    """
    # Solo contar contactos que el usuario puede ver
    service = ContactsService(db)
    contacts, total = service.search_contacts(current_user, limit=1, offset=0)
    
    stats = {
        "total_contacts": total,
        "by_type": {},
        "by_country": {},
        "verified_count": 0,
        "with_email": 0,
        "with_phone": 0,
        "average_quality_score": 0
    }
    
    # Calcular estadísticas si es admin o manager
    if current_user.is_admin or current_user.role == 'manager':
        # Query más eficiente para estadísticas
        type_stats = db.query(
            Contact.type,
            func.count(Contact.id)
        ).filter(
            Contact.deleted_at.is_(None)
        ).group_by(Contact.type).all()
        
        stats["by_type"] = {t.value: c for t, c in type_stats}
        
        # Más estadísticas...
    
    return stats

# ===== GRUPOS Y ETIQUETAS =====

@router.get("/groups", response_model=List[Dict])
async def get_contact_groups(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener grupos de contactos del usuario
    """
    groups = db.query(ContactGroup).filter(
        or_(
            ContactGroup.owner_id == current_user.id,
            ContactGroup.visibility == ContactVisibility.COMPANY
        )
    ).all()
    
    return [
        {
            "id": str(g.id),
            "name": g.name,
            "description": g.description,
            "contact_count": g.contact_count,
            "color": g.color,
            "is_smart": g.is_smart
        }
        for g in groups
    ]

@router.post("/groups", response_model=Dict)
async def create_contact_group(
    name: str,
    description: Optional[str] = None,
    color: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crear nuevo grupo de contactos
    """
    group = ContactGroup(
        name=name,
        description=description,
        color=color,
        owner_id=current_user.id
    )
    
    db.add(group)
    db.commit()
    
    return {
        "id": str(group.id),
        "name": group.name,
        "message": "Grupo creado exitosamente"
    }

@router.get("/tags", response_model=List[Dict])
async def get_all_tags(
    db: Session = Depends(get_db)
):
    """
    Obtener todas las etiquetas disponibles
    """
    tags = db.query(ContactTag).order_by(ContactTag.usage_count.desc()).limit(100).all()
    
    return [
        {
            "id": str(t.id),
            "name": t.name,
            "color": t.color,
            "category": t.category,
            "usage_count": t.usage_count
        }
        for t in tags
    ]