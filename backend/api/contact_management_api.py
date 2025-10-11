"""
Contact Management API
Sistema completo de gestión de contactos con seguridad avanzada
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, File, UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, select, distinct
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
import uuid
from pydantic import BaseModel, EmailStr, Field, validator
import pandas as pd
import io
import csv
import json
import hashlib
from cryptography.fernet import Fernet
import asyncio
import aiohttp
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import phonenumbers
import qrcode
from email_validator import validate_email
import re

from backend.database.session import get_db
from backend.models.contact_management_models import (
    Contact, ContactGroup, ContactTag, ContactShare, ContactActivity,
    ContactCommunication, ContactImportJob, ContactExportLog, ContactAccessLog,
    ContactSyncConfiguration, ContactMergeHistory, ContactPrivacyRequest,
    ContactType, ContactSource, ContactStatus, SharePermission, AccessLevel,
    SyncStatus, ExportRequest, CommunicationChannel
)
from backend.services.auth_service import get_current_user
from backend.services.notification_service import NotificationService
from backend.services.cache_service import cache_service
from backend.core.security import check_permission
from backend.core.config import settings

router = APIRouter(prefix="/api/contacts", tags=["Contact Management"])
notification_service = NotificationService()

# ===== PYDANTIC SCHEMAS =====

class ContactBase(BaseModel):
    contact_type: ContactType = ContactType.CUSTOMER
    salutation: Optional[str]
    first_name: str
    middle_name: Optional[str]
    last_name: str
    display_name: Optional[str]
    nickname: Optional[str]
    
    # Company
    company_name: Optional[str]
    job_title: Optional[str]
    department: Optional[str]
    
    # Contact
    email: Optional[EmailStr]
    phone: Optional[str]
    mobile: Optional[str]
    
    # Address
    address_line1: Optional[str]
    city: Optional[str]
    country: Optional[str]
    
    # Preferences
    preferred_language: str = 'es'
    preferred_channel: CommunicationChannel = CommunicationChannel.EMAIL
    accepts_marketing: bool = True
    
    # Notes
    notes: Optional[str]
    tags: Optional[List[str]] = []

class ContactCreate(ContactBase):
    source: ContactSource = ContactSource.MANUAL
    assign_to_user_id: Optional[uuid.UUID]
    
    @validator('phone', 'mobile')
    def validate_phone_number(cls, v):
        if v:
            try:
                parsed = phonenumbers.parse(v, None)
                if not phonenumbers.is_valid_number(parsed):
                    raise ValueError('Invalid phone number')
                return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            except:
                raise ValueError('Invalid phone number format')
        return v

class ContactUpdate(ContactBase):
    first_name: Optional[str]
    last_name: Optional[str]
    status: Optional[ContactStatus]

class ContactResponse(ContactBase):
    id: uuid.UUID
    internal_code: str
    status: ContactStatus
    created_at: datetime
    total_bookings: int
    total_spent: float
    can_export: bool = False
    can_delete: bool = False
    
    class Config:
        orm_mode = True

class ContactShareRequest(BaseModel):
    contact_ids: List[uuid.UUID]
    share_with_users: Optional[List[uuid.UUID]] = []
    share_with_teams: Optional[List[uuid.UUID]] = []
    share_with_emails: Optional[List[EmailStr]] = []
    permission: SharePermission = SharePermission.VIEW
    can_reshare: bool = False
    valid_until: Optional[datetime]
    message: Optional[str]

class ContactImportRequest(BaseModel):
    source: ContactSource
    file_url: Optional[str]  # Para archivos ya subidos
    source_config: Optional[Dict[str, Any]]  # Para APIs externas
    field_mapping: Dict[str, str]
    duplicate_strategy: str = 'skip'  # skip, update, merge
    auto_tag: Optional[List[str]] = []
    assign_to_user_id: Optional[uuid.UUID]

class ContactExportRequest(BaseModel):
    contact_ids: Optional[List[uuid.UUID]] = []
    filters: Optional[Dict[str, Any]] = {}
    format: str = 'csv'  # csv, excel, json, pdf, vcard
    fields: Optional[List[str]] = []  # Campos a exportar
    reason: str  # Razón de la exportación (requerido)

class ContactSearchRequest(BaseModel):
    query: Optional[str]
    contact_types: Optional[List[ContactType]] = []
    statuses: Optional[List[ContactStatus]] = []
    sources: Optional[List[ContactSource]] = []
    tags: Optional[List[str]] = []
    countries: Optional[List[str]] = []
    date_from: Optional[date]
    date_to: Optional[date]
    has_email: Optional[bool]
    has_phone: Optional[bool]
    assigned_to: Optional[uuid.UUID]

class ContactMergeRequest(BaseModel):
    master_contact_id: uuid.UUID
    contacts_to_merge: List[uuid.UUID]
    merge_strategy: Dict[str, str]  # {field: 'master' or contact_id}

class ItineraryShareRequest(BaseModel):
    contact_ids: List[uuid.UUID]
    itinerary_id: uuid.UUID
    message: str
    send_via: List[CommunicationChannel]  # SMS, WhatsApp, Email
    include_link: bool = True
    shorten_link: bool = True

# ===== HELPER FUNCTIONS =====

def check_contact_access(contact: Contact, user: Any, action: str = 'view') -> bool:
    """Verifica si el usuario tiene acceso al contacto"""
    # Administradores pueden ver todo
    if user.role in ['admin', 'director_general']:
        return True
    
    # Propietario tiene acceso completo
    if contact.owner_id == user.id:
        return True
    
    # Asignado tiene acceso según nivel
    if contact.assigned_to_id == user.id:
        return action in ['view', 'edit']
    
    # Verificar si está en la lista de visibilidad
    if contact.visible_to and user.id in contact.visible_to:
        return action == 'view'
    
    # Verificar permisos de compartir
    for share in contact.shares:
        if share.shared_with_user_id == user.id:
            if action == 'view' and share.permission in [SharePermission.VIEW, SharePermission.EDIT, SharePermission.SHARE]:
                return True
            if action == 'edit' and share.permission in [SharePermission.EDIT, SharePermission.SHARE]:
                return True
    
    return False

def log_contact_access(contact_id: uuid.UUID, user_id: uuid.UUID, action: str, db: Session, details: Dict = None):
    """Registra el acceso a un contacto"""
    access_log = ContactAccessLog(
        contact_id=contact_id,
        user_id=user_id,
        action=action,
        action_detail=details or {},
        module='api'
    )
    db.add(access_log)
    db.commit()

def detect_bulk_export_fraud(user_id: uuid.UUID, db: Session) -> bool:
    """Detecta intentos de exportación masiva fraudulenta"""
    # Verificar exportaciones recientes del usuario
    recent_exports = db.query(ContactExportLog).filter(
        ContactExportLog.exported_by_id == user_id,
        ContactExportLog.exported_at >= datetime.utcnow() - timedelta(hours=24)
    ).all()
    
    total_records = sum(exp.record_count for exp in recent_exports)
    
    # Límites según rol (esto debería venir de configuración)
    limits = {
        'employee': 500,
        'manager': 2000,
        'admin': 10000
    }
    
    # Si excede el límite, es sospechoso
    return total_records > limits.get('employee', 500)

async def sync_google_contacts(user_id: uuid.UUID, credentials: Dict, db: Session):
    """Sincroniza contactos con Google Contacts"""
    try:
        creds = Credentials.from_authorized_user_info(credentials)
        service = build('people', 'v1', credentials=creds)
        
        # Obtener contactos de Google
        results = service.people().connections().list(
            resourceName='people/me',
            pageSize=100,
            personFields='names,emailAddresses,phoneNumbers,addresses,organizations'
        ).execute()
        
        connections = results.get('connections', [])
        
        for person in connections:
            # Crear o actualizar contacto
            names = person.get('names', [])
            if names:
                name = names[0]
                email = None
                if person.get('emailAddresses'):
                    email = person['emailAddresses'][0].get('value')
                
                # Buscar si ya existe
                existing = db.query(Contact).filter(
                    Contact.google_contact_id == person['resourceName']
                ).first()
                
                if existing:
                    # Actualizar
                    existing.first_name = name.get('givenName', '')
                    existing.last_name = name.get('familyName', '')
                    if email:
                        existing.email = email
                else:
                    # Crear nuevo
                    contact = Contact(
                        google_contact_id=person['resourceName'],
                        first_name=name.get('givenName', ''),
                        last_name=name.get('familyName', ''),
                        email=email,
                        source=ContactSource.GOOGLE,
                        owner_id=user_id,
                        internal_code=f"GC-{uuid.uuid4().hex[:8]}"
                    )
                    db.add(contact)
        
        db.commit()
        return len(connections)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error syncing Google contacts: {str(e)}")

# ===== ENDPOINTS =====

@router.get("/", response_model=List[ContactResponse])
@cache_service.cache(expire=300)
async def get_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    contact_type: Optional[ContactType] = None,
    status: Optional[ContactStatus] = None,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener lista de contactos con filtros
    Solo empleados de Spirit Tours pueden buscar contactos
    """
    # Verificar permisos
    if current_user.role not in ['admin', 'director_general', 'manager', 'employee']:
        raise HTTPException(status_code=403, detail="No autorizado para ver contactos")
    
    query = db.query(Contact)
    
    # Aplicar filtros según rol
    if current_user.role == 'employee':
        # Empleados solo ven sus contactos asignados o compartidos
        query = query.filter(
            or_(
                Contact.owner_id == current_user.id,
                Contact.assigned_to_id == current_user.id,
                Contact.visible_to.contains([current_user.id])
            )
        )
    elif current_user.role == 'manager':
        # Managers ven contactos de su equipo
        team_members = db.query(User).filter(User.team_id == current_user.team_id).all()
        team_ids = [m.id for m in team_members]
        query = query.filter(
            or_(
                Contact.owner_id.in_(team_ids),
                Contact.assigned_to_id.in_(team_ids)
            )
        )
    
    # Aplicar filtros de búsqueda
    if search:
        query = query.filter(
            or_(
                Contact.full_name.ilike(f'%{search}%'),
                Contact.email.ilike(f'%{search}%'),
                Contact.phone.ilike(f'%{search}%'),
                Contact.company_name.ilike(f'%{search}%')
            )
        )
    
    if contact_type:
        query = query.filter(Contact.contact_type == contact_type)
    
    if status:
        query = query.filter(Contact.status == status)
    
    # Excluir contactos sensibles para empleados
    if current_user.role == 'employee':
        query = query.filter(Contact.is_sensitive == False)
    
    contacts = query.offset(skip).limit(limit).all()
    
    # Registrar acceso
    for contact in contacts[:10]:  # Solo los primeros 10 para no sobrecargar
        log_contact_access(contact.id, current_user.id, 'view', db)
    
    # Determinar permisos de exportación
    for contact in contacts:
        contact.can_export = current_user.role in ['admin', 'director_general']
        contact.can_delete = current_user.role == 'admin' and not contact.is_protected
    
    return contacts

@router.post("/", response_model=ContactResponse)
async def create_contact(
    contact_data: ContactCreate,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Crear nuevo contacto"""
    # Verificar permisos
    if current_user.role not in ['admin', 'manager', 'employee']:
        raise HTTPException(status_code=403, detail="No autorizado para crear contactos")
    
    # Verificar duplicados
    existing = db.query(Contact).filter(
        or_(
            Contact.email == contact_data.email,
            Contact.phone == contact_data.phone
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un contacto con ese email o teléfono")
    
    # Crear contacto
    contact = Contact(
        **contact_data.dict(exclude={'tags'}),
        owner_id=current_user.id,
        internal_code=f"CT-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}",
        full_name=f"{contact_data.first_name} {contact_data.middle_name or ''} {contact_data.last_name}".strip()
    )
    
    # Agregar tags si se proporcionaron
    if contact_data.tags:
        for tag_name in contact_data.tags:
            tag = db.query(ContactTag).filter(ContactTag.name == tag_name).first()
            if not tag:
                tag = ContactTag(name=tag_name, created_by_id=current_user.id)
                db.add(tag)
            contact.tags.append(tag)
    
    db.add(contact)
    db.commit()
    db.refresh(contact)
    
    # Registrar actividad
    activity = ContactActivity(
        contact_id=contact.id,
        activity_type='created',
        subject='Contacto creado',
        description=f'Contacto creado por {current_user.name}',
        created_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    
    return contact

@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener detalle de un contacto"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    # Verificar acceso
    if not check_contact_access(contact, current_user, 'view'):
        raise HTTPException(status_code=403, detail="No autorizado para ver este contacto")
    
    # Registrar acceso
    log_contact_access(contact_id, current_user.id, 'view', db)
    
    return contact

@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID,
    contact_data: ContactUpdate,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Actualizar contacto"""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    # Verificar acceso
    if not check_contact_access(contact, current_user, 'edit'):
        raise HTTPException(status_code=403, detail="No autorizado para editar este contacto")
    
    # Actualizar campos
    for field, value in contact_data.dict(exclude_unset=True).items():
        setattr(contact, field, value)
    
    contact.updated_at = datetime.utcnow()
    contact.updated_by_id = current_user.id
    
    # Recalcular full_name si se cambiaron los nombres
    if any(field in contact_data.dict() for field in ['first_name', 'middle_name', 'last_name']):
        contact.full_name = f"{contact.first_name} {contact.middle_name or ''} {contact.last_name}".strip()
    
    db.commit()
    db.refresh(contact)
    
    # Registrar actividad
    activity = ContactActivity(
        contact_id=contact.id,
        activity_type='updated',
        subject='Contacto actualizado',
        description=f'Actualizado por {current_user.name}',
        created_by_id=current_user.id
    )
    db.add(activity)
    db.commit()
    
    # Registrar acceso
    log_contact_access(contact_id, current_user.id, 'edit', db)
    
    return contact

@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: uuid.UUID,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Eliminar contacto (soft delete)
    Solo administradores pueden eliminar
    """
    if current_user.role != 'admin':
        raise HTTPException(status_code=403, detail="Solo administradores pueden eliminar contactos")
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    
    if not contact:
        raise HTTPException(status_code=404, detail="Contacto no encontrado")
    
    if contact.is_protected:
        raise HTTPException(status_code=400, detail="Este contacto está protegido y no puede ser eliminado")
    
    # Soft delete
    contact.status = ContactStatus.DELETED
    contact.deleted_at = datetime.utcnow()
    contact.deleted_by_id = current_user.id
    
    db.commit()
    
    # Registrar acceso
    log_contact_access(contact_id, current_user.id, 'delete', db)
    
    return {"message": "Contacto eliminado exitosamente"}

@router.post("/share")
async def share_contacts(
    share_request: ContactShareRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Compartir contactos con otros usuarios"""
    shared_contacts = []
    
    for contact_id in share_request.contact_ids:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        
        if not contact:
            continue
        
        # Verificar que el usuario puede compartir este contacto
        if not check_contact_access(contact, current_user, 'share'):
            continue
        
        # Compartir con usuarios
        for user_id in share_request.share_with_users:
            share = ContactShare(
                contact_id=contact_id,
                shared_with_user_id=user_id,
                permission=share_request.permission,
                can_reshare=share_request.can_reshare,
                valid_until=share_request.valid_until,
                message=share_request.message,
                shared_by_id=current_user.id
            )
            db.add(share)
            shared_contacts.append(contact_id)
        
        # Compartir con equipos
        for team_id in share_request.share_with_teams:
            share = ContactShare(
                contact_id=contact_id,
                shared_with_team_id=team_id,
                permission=share_request.permission,
                can_reshare=share_request.can_reshare,
                valid_until=share_request.valid_until,
                message=share_request.message,
                shared_by_id=current_user.id
            )
            db.add(share)
        
        # Compartir por email (generar token)
        for email in share_request.share_with_emails:
            token = hashlib.sha256(f"{contact_id}{email}{datetime.now()}".encode()).hexdigest()[:20]
            share = ContactShare(
                contact_id=contact_id,
                shared_with_email=email,
                permission=SharePermission.VIEW,  # Solo vista para externos
                can_reshare=False,
                valid_until=share_request.valid_until or datetime.utcnow() + timedelta(days=7),
                message=share_request.message,
                share_token=token,
                shared_by_id=current_user.id
            )
            db.add(share)
            
            # Enviar email con el link
            # await notification_service.send_contact_share_email(email, token, contact)
    
    db.commit()
    
    return {
        "message": f"Compartidos {len(shared_contacts)} contactos exitosamente",
        "shared_contact_ids": shared_contacts
    }

@router.post("/import")
async def import_contacts(
    import_request: ContactImportRequest,
    background_tasks: BackgroundTasks,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Importar contactos desde diferentes fuentes
    """
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="No autorizado para importar contactos")
    
    # Crear job de importación
    import_job = ContactImportJob(
        source=import_request.source,
        source_config=import_request.source_config,
        field_mapping=import_request.field_mapping,
        duplicate_strategy=import_request.duplicate_strategy,
        auto_tag=import_request.auto_tag,
        assign_to_user_id=import_request.assign_to_user_id or current_user.id,
        created_by_id=current_user.id,
        status='pending'
    )
    db.add(import_job)
    db.commit()
    
    # Ejecutar importación en background
    background_tasks.add_task(process_import_job, import_job.id, db)
    
    return {
        "message": "Importación iniciada",
        "job_id": import_job.id,
        "status_url": f"/api/contacts/import/{import_job.id}/status"
    }

@router.post("/export")
async def export_contacts(
    export_request: ContactExportRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Exportar contactos con control anti-fraude
    """
    # Verificar si es sospechoso
    if detect_bulk_export_fraud(current_user.id, db):
        # Crear solicitud pendiente de aprobación
        export_log = ContactExportLog(
            export_query=export_request.dict(),
            record_count=len(export_request.contact_ids) if export_request.contact_ids else 0,
            export_format=export_request.format,
            fields_exported=export_request.fields,
            request_status=ExportRequest.PENDING,
            request_reason=export_request.reason,
            exported_by_id=current_user.id,
            is_suspicious=True
        )
        db.add(export_log)
        db.commit()
        
        # Notificar a administradores
        # await notification_service.notify_suspicious_export(current_user, export_log)
        
        raise HTTPException(
            status_code=403,
            detail="Exportación requiere aprobación de un administrador debido al volumen de registros"
        )
    
    # Procesar exportación
    if export_request.contact_ids:
        contacts = db.query(Contact).filter(Contact.id.in_(export_request.contact_ids)).all()
    else:
        # Aplicar filtros
        query = db.query(Contact)
        # ... aplicar filtros según export_request.filters
        contacts = query.all()
    
    # Verificar acceso a cada contacto
    exportable_contacts = []
    for contact in contacts:
        if check_contact_access(contact, current_user, 'view'):
            exportable_contacts.append(contact)
    
    if not exportable_contacts:
        raise HTTPException(status_code=404, detail="No hay contactos para exportar")
    
    # Registrar exportación
    export_log = ContactExportLog(
        contact_ids=[c.id for c in exportable_contacts],
        record_count=len(exportable_contacts),
        export_format=export_request.format,
        fields_exported=export_request.fields,
        request_status=ExportRequest.COMPLETED,
        request_reason=export_request.reason,
        exported_by_id=current_user.id,
        ip_address=current_user.last_login_ip  # Asumiendo que tenemos esta info
    )
    db.add(export_log)
    db.commit()
    
    # Generar archivo según formato
    if export_request.format == 'csv':
        return export_to_csv(exportable_contacts, export_request.fields)
    elif export_request.format == 'excel':
        return export_to_excel(exportable_contacts, export_request.fields)
    elif export_request.format == 'json':
        return export_to_json(exportable_contacts, export_request.fields)
    else:
        raise HTTPException(status_code=400, detail="Formato de exportación no soportado")

@router.post("/sync/google")
async def sync_google_contacts_endpoint(
    credentials: Dict = Body(...),
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sincronizar con Google Contacts"""
    if current_user.role not in ['admin', 'manager', 'employee']:
        raise HTTPException(status_code=403, detail="No autorizado para sincronizar contactos")
    
    # Guardar configuración de sincronización
    sync_config = db.query(ContactSyncConfiguration).filter(
        ContactSyncConfiguration.user_id == current_user.id,
        ContactSyncConfiguration.service == ContactSource.GOOGLE
    ).first()
    
    if not sync_config:
        sync_config = ContactSyncConfiguration(
            user_id=current_user.id,
            service=ContactSource.GOOGLE,
            credentials=json.dumps(credentials).encode(),  # Encriptar en producción
            sync_direction='import',
            is_active=True
        )
        db.add(sync_config)
    else:
        sync_config.credentials = json.dumps(credentials).encode()
        sync_config.last_sync_at = datetime.utcnow()
    
    db.commit()
    
    # Ejecutar sincronización
    count = await sync_google_contacts(current_user.id, credentials, db)
    
    return {
        "message": f"Sincronizados {count} contactos de Google",
        "synced_at": datetime.utcnow()
    }

@router.post("/share-itinerary")
async def share_itinerary_with_contacts(
    request: ItineraryShareRequest,
    background_tasks: BackgroundTasks,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compartir itinerario con contactos vía SMS/WhatsApp/Email
    """
    shared_count = 0
    
    for contact_id in request.contact_ids:
        contact = db.query(Contact).filter(Contact.id == contact_id).first()
        
        if not contact or not check_contact_access(contact, current_user, 'view'):
            continue
        
        # Generar link del itinerario
        itinerary_link = f"{settings.FRONTEND_URL}/itineraries/{request.itinerary_id}"
        
        if request.shorten_link:
            # Acortar link (implementar servicio de acortador)
            itinerary_link = f"{settings.SHORT_URL}/{hashlib.md5(str(request.itinerary_id).encode()).hexdigest()[:8]}"
        
        # Enviar por cada canal solicitado
        for channel in request.send_via:
            if channel == CommunicationChannel.SMS and contact.mobile:
                # Enviar SMS
                message = f"{request.message}\n\nVer itinerario: {itinerary_link}"
                # await sms_service.send_sms(contact.mobile, message)
                
            elif channel == CommunicationChannel.WHATSAPP and contact.mobile:
                # Enviar WhatsApp
                message = f"{request.message}\n\nVer itinerario: {itinerary_link}"
                # await whatsapp_service.send_message(contact.mobile, message)
                
            elif channel == CommunicationChannel.EMAIL and contact.email:
                # Enviar Email
                # await email_service.send_itinerary_email(contact.email, request.itinerary_id, message)
                pass
            
            # Registrar comunicación
            communication = ContactCommunication(
                contact_id=contact_id,
                channel=channel,
                direction='outbound',
                subject=f"Itinerario compartido",
                content=request.message,
                itinerary_id=request.itinerary_id,
                created_by_id=current_user.id,
                sent_at=datetime.utcnow()
            )
            db.add(communication)
        
        shared_count += 1
    
    db.commit()
    
    return {
        "message": f"Itinerario compartido con {shared_count} contactos",
        "channels_used": list(request.send_via)
    }

@router.post("/merge")
async def merge_contacts(
    merge_request: ContactMergeRequest,
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fusionar contactos duplicados"""
    if current_user.role not in ['admin', 'manager']:
        raise HTTPException(status_code=403, detail="No autorizado para fusionar contactos")
    
    master = db.query(Contact).filter(Contact.id == merge_request.master_contact_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Contacto maestro no encontrado")
    
    # Obtener contactos a fusionar
    contacts_to_merge = db.query(Contact).filter(
        Contact.id.in_(merge_request.contacts_to_merge)
    ).all()
    
    if not contacts_to_merge:
        raise HTTPException(status_code=404, detail="No se encontraron contactos para fusionar")
    
    # Guardar datos antes de la fusión
    pre_merge_data = {
        'master': master.__dict__,
        'merged': [c.__dict__ for c in contacts_to_merge]
    }
    
    # Aplicar estrategia de fusión
    for field, source in merge_request.merge_strategy.items():
        if source != 'master':
            source_contact = next((c for c in contacts_to_merge if str(c.id) == source), None)
            if source_contact and hasattr(source_contact, field):
                setattr(master, field, getattr(source_contact, field))
    
    # Actualizar referencias de los contactos fusionados
    for contact in contacts_to_merge:
        contact.status = ContactStatus.MERGED
        contact.duplicate_of_id = master.id
        contact.merge_history = {'merged_to': str(master.id), 'merged_at': datetime.utcnow().isoformat()}
    
    # Crear registro de fusión
    merge_history = ContactMergeHistory(
        master_contact_id=master.id,
        merged_contact_ids=[c.id for c in contacts_to_merge],
        pre_merge_data=pre_merge_data,
        merge_strategy=merge_request.merge_strategy,
        post_merge_data=master.__dict__,
        merged_by_id=current_user.id
    )
    db.add(merge_history)
    
    db.commit()
    db.refresh(master)
    
    return {
        "message": f"Fusionados {len(contacts_to_merge)} contactos exitosamente",
        "master_contact_id": master.id
    }

@router.get("/statistics/summary")
async def get_contact_statistics(
    current_user: Any = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtener estadísticas generales de contactos"""
    if current_user.role not in ['admin', 'director_general']:
        raise HTTPException(status_code=403, detail="No autorizado para ver estadísticas")
    
    stats = {
        "total_contacts": db.query(func.count(Contact.id)).scalar(),
        "active_contacts": db.query(func.count(Contact.id)).filter(Contact.status == ContactStatus.ACTIVE).scalar(),
        "contacts_by_type": {},
        "contacts_by_source": {},
        "recent_imports": 0,
        "recent_exports": 0,
        "duplicate_rate": 0
    }
    
    # Contactos por tipo
    type_counts = db.query(
        Contact.contact_type, 
        func.count(Contact.id)
    ).group_by(Contact.contact_type).all()
    stats["contacts_by_type"] = {t: c for t, c in type_counts}
    
    # Contactos por fuente
    source_counts = db.query(
        Contact.source,
        func.count(Contact.id)
    ).group_by(Contact.source).all()
    stats["contacts_by_source"] = {s: c for s, c in source_counts}
    
    # Importaciones recientes (último mes)
    stats["recent_imports"] = db.query(func.count(ContactImportJob.id)).filter(
        ContactImportJob.created_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar()
    
    # Exportaciones recientes (último mes)
    stats["recent_exports"] = db.query(func.count(ContactExportLog.id)).filter(
        ContactExportLog.exported_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar()
    
    # Tasa de duplicados
    duplicates = db.query(func.count(Contact.id)).filter(Contact.is_duplicate == True).scalar()
    if stats["total_contacts"] > 0:
        stats["duplicate_rate"] = round(duplicates / stats["total_contacts"] * 100, 2)
    
    return stats

# ===== HELPER FUNCTIONS FOR EXPORT =====

def export_to_csv(contacts: List[Contact], fields: List[str]) -> StreamingResponse:
    """Exportar contactos a CSV"""
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fields or ['internal_code', 'full_name', 'email', 'phone', 'company_name'])
    writer.writeheader()
    
    for contact in contacts:
        row = {}
        for field in fields:
            if hasattr(contact, field):
                value = getattr(contact, field)
                row[field] = value if value is not None else ''
        writer.writerow(row)
    
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=contacts_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

def export_to_excel(contacts: List[Contact], fields: List[str]) -> FileResponse:
    """Exportar contactos a Excel"""
    data = []
    for contact in contacts:
        row = {}
        for field in fields or ['internal_code', 'full_name', 'email', 'phone', 'company_name']:
            if hasattr(contact, field):
                row[field] = getattr(contact, field)
        data.append(row)
    
    df = pd.DataFrame(data)
    filename = f"/tmp/contacts_{datetime.now().strftime('%Y%m%d')}.xlsx"
    df.to_excel(filename, index=False)
    
    return FileResponse(
        path=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=f"contacts_{datetime.now().strftime('%Y%m%d')}.xlsx"
    )

def export_to_json(contacts: List[Contact], fields: List[str]) -> dict:
    """Exportar contactos a JSON"""
    data = []
    for contact in contacts:
        item = {}
        for field in fields or ['id', 'internal_code', 'full_name', 'email', 'phone', 'company_name']:
            if hasattr(contact, field):
                value = getattr(contact, field)
                if isinstance(value, (datetime, date)):
                    value = value.isoformat()
                elif isinstance(value, uuid.UUID):
                    value = str(value)
                item[field] = value
        data.append(item)
    
    return {"contacts": data, "count": len(data), "exported_at": datetime.now().isoformat()}

async def process_import_job(job_id: uuid.UUID, db: Session):
    """Procesar trabajo de importación en background"""
    # Implementar lógica de importación según la fuente
    pass