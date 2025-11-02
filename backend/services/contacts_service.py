"""
Contact Management Service
Servicio completo para gestión de contactos con seguridad y sincronización
"""

import asyncio
import hashlib
import secrets
import re
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any, Tuple
from sqlalchemy import and_, or_, func, select, distinct
from sqlalchemy.orm import Session, selectinload
from sqlalchemy.exc import IntegrityError
import pandas as pd
import numpy as np
from fuzzywuzzy import fuzz
import phonenumbers
from email_validator import validate_email, EmailNotValidError

# Google Contacts API
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

# Outlook/Exchange
import requests
from O365 import Account, FileSystemTokenBackend

# WhatsApp Business API
from services.whatsapp_business_service import WhatsAppBusinessService

from models.contacts_models import (
    Contact, ContactGroup, ContactTag, ContactShare, ContactActivity,
    ContactImport, ContactExport, ContactSyncSettings, ContactDuplicateCandidate,
    ContactPermission, ContactType, ContactSource, ContactVisibility, 
    SharePermission, SyncStatus, DataSensitivity
)
from models.user_models import User, Role
from core.security import encrypt_data, decrypt_data
from core.cache import cache_result, invalidate_cache
from core.exceptions import (
    PermissionDeniedError, ValidationError, NotFoundError,
    DuplicateError, ExportLimitExceededError
)
import logging

logger = logging.getLogger(__name__)

class ContactsService:
    """
    Servicio principal para gestión de contactos
    """
    
    def __init__(self, db: Session):
        self.db = db
        self.whatsapp_service = WhatsAppBusinessService()
        
    # ===== BÚSQUEDA Y LISTADO =====
    
    @cache_result(ttl=300)
    def search_contacts(
        self,
        user: User,
        query: Optional[str] = None,
        contact_type: Optional[ContactType] = None,
        tags: Optional[List[str]] = None,
        groups: Optional[List[str]] = None,
        country: Optional[str] = None,
        created_after: Optional[datetime] = None,
        created_before: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        include_shared: bool = True,
        exclude_blacklisted: bool = True
    ) -> Tuple[List[Contact], int]:
        """
        Búsqueda avanzada de contactos con control de permisos
        """
        # Verificar permisos especiales
        can_view_all = self._check_permission(user, 'can_view_all')
        
        # Query base
        query_obj = self.db.query(Contact)
        
        # Filtros de seguridad
        if not can_view_all:
            # Solo contactos propios o compartidos
            visibility_filter = or_(
                Contact.owner_id == user.id,
                Contact.visibility == ContactVisibility.PUBLIC,
                Contact.visibility == ContactVisibility.COMPANY
            )
            
            if user.department_id:
                visibility_filter = or_(
                    visibility_filter,
                    and_(
                        Contact.visibility == ContactVisibility.DEPARTMENT,
                        Contact.owner.has(department_id=user.department_id)
                    )
                )
            
            if include_shared:
                # Incluir contactos compartidos
                shared_subquery = self.db.query(ContactShare.contact_id).filter(
                    or_(
                        ContactShare.shared_with_user_id == user.id,
                        ContactShare.shared_with_group_id.in_(user.group_ids)
                    ),
                    or_(
                        ContactShare.expires_at.is_(None),
                        ContactShare.expires_at > datetime.utcnow()
                    )
                ).subquery()
                
                visibility_filter = or_(
                    visibility_filter,
                    Contact.id.in_(select([shared_subquery]))
                )
            
            query_obj = query_obj.filter(visibility_filter)
        
        # Excluir blacklist
        if exclude_blacklisted:
            query_obj = query_obj.filter(Contact.is_blacklisted == False)
        
        # Búsqueda de texto
        if query:
            search_filter = or_(
                Contact.full_name.ilike(f'%{query}%'),
                Contact.email.ilike(f'%{query}%'),
                Contact.phone.ilike(f'%{query}%'),
                Contact.company.ilike(f'%{query}%'),
                Contact.notes.ilike(f'%{query}%')
            )
            query_obj = query_obj.filter(search_filter)
        
        # Filtros adicionales
        if contact_type:
            query_obj = query_obj.filter(Contact.type == contact_type)
        
        if country:
            query_obj = query_obj.filter(Contact.country == country)
        
        if created_after:
            query_obj = query_obj.filter(Contact.created_at >= created_after)
        
        if created_before:
            query_obj = query_obj.filter(Contact.created_at <= created_before)
        
        if tags:
            query_obj = query_obj.join(Contact.tags).filter(ContactTag.name.in_(tags))
        
        if groups:
            query_obj = query_obj.join(Contact.groups).filter(ContactGroup.id.in_(groups))
        
        # Registrar actividad de búsqueda
        self._log_activity(user, None, 'search', {
            'query': query,
            'filters': {
                'type': contact_type.value if contact_type else None,
                'tags': tags,
                'groups': groups,
                'country': country
            }
        })
        
        # Total count
        total = query_obj.count()
        
        # Paginación
        contacts = query_obj.order_by(Contact.full_name).offset(offset).limit(limit).all()
        
        return contacts, total
    
    def get_contact(self, user: User, contact_id: str, log_view: bool = True) -> Contact:
        """
        Obtener un contacto específico con verificación de permisos
        """
        contact = self.db.query(Contact).filter(Contact.id == contact_id).first()
        
        if not contact:
            raise NotFoundError(f"Contact {contact_id} not found")
        
        # Verificar permisos
        if not self._can_access_contact(user, contact):
            raise PermissionDeniedError("You don't have permission to view this contact")
        
        # Registrar vista
        if log_view:
            self._log_activity(user, contact, 'view')
        
        return contact
    
    # ===== CREACIÓN Y EDICIÓN =====
    
    def create_contact(
        self,
        user: User,
        data: Dict[str, Any],
        check_duplicates: bool = True
    ) -> Contact:
        """
        Crear nuevo contacto con validación y detección de duplicados
        """
        # Validar datos
        self._validate_contact_data(data)
        
        # Verificar duplicados
        if check_duplicates:
            duplicates = self._find_duplicates(data)
            if duplicates:
                raise DuplicateError(
                    f"Possible duplicate contacts found: {[d.id for d in duplicates]}"
                )
        
        # Crear contacto
        contact = Contact(
            **data,
            owner_id=user.id,
            created_by=user.id,
            full_name=f"{data.get('first_name', '')} {data.get('last_name', '')}".strip()
        )
        
        # Calcular score de calidad
        contact.quality_score = self._calculate_quality_score(contact)
        
        self.db.add(contact)
        self.db.commit()
        
        # Registrar actividad
        self._log_activity(user, contact, 'create')
        
        # Invalidar caché
        invalidate_cache(f"contacts_search_{user.id}")
        
        return contact
    
    def update_contact(
        self,
        user: User,
        contact_id: str,
        data: Dict[str, Any]
    ) -> Contact:
        """
        Actualizar contacto con control de permisos
        """
        contact = self.get_contact(user, contact_id, log_view=False)
        
        # Verificar permisos de edición
        if not self._can_edit_contact(user, contact):
            raise PermissionDeniedError("You don't have permission to edit this contact")
        
        # Validar datos
        self._validate_contact_data(data, is_update=True)
        
        # Guardar cambios anteriores para auditoría
        old_data = {
            key: getattr(contact, key) 
            for key in data.keys() 
            if hasattr(contact, key)
        }
        
        # Actualizar campos
        for key, value in data.items():
            if hasattr(contact, key):
                setattr(contact, key, value)
        
        # Actualizar full_name si cambió nombre
        if 'first_name' in data or 'last_name' in data:
            contact.full_name = f"{contact.first_name} {contact.last_name}".strip()
        
        # Recalcular score
        contact.quality_score = self._calculate_quality_score(contact)
        contact.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        # Registrar actividad con detalles de cambios
        self._log_activity(user, contact, 'edit', {
            'changes': {k: {'old': old_data[k], 'new': v} for k, v in data.items()}
        })
        
        # Invalidar caché
        invalidate_cache(f"contact_{contact_id}")
        
        return contact
    
    def delete_contact(
        self,
        user: User,
        contact_id: str,
        hard_delete: bool = False
    ) -> bool:
        """
        Eliminar contacto (soft o hard delete)
        """
        contact = self.get_contact(user, contact_id, log_view=False)
        
        # Verificar permisos
        if not self._can_delete_contact(user, contact):
            raise PermissionDeniedError("You don't have permission to delete this contact")
        
        if contact.is_protected:
            raise PermissionDeniedError("This contact is protected and cannot be deleted")
        
        if hard_delete:
            # Eliminación permanente (solo admin)
            if not user.is_admin:
                raise PermissionDeniedError("Only administrators can permanently delete contacts")
            
            self.db.delete(contact)
            self._log_activity(user, None, 'hard_delete', {'contact_id': contact_id})
        else:
            # Soft delete
            contact.deleted_at = datetime.utcnow()
            contact.deleted_by = user.id
            self._log_activity(user, contact, 'soft_delete')
        
        self.db.commit()
        invalidate_cache(f"contact_{contact_id}")
        
        return True
    
    # ===== IMPORTACIÓN Y SINCRONIZACIÓN =====
    
    async def import_google_contacts(
        self,
        user: User,
        auto_merge: bool = False
    ) -> ContactImport:
        """
        Importar contactos desde Google Contacts
        """
        settings = self._get_sync_settings(user)
        
        if not settings.google_sync_enabled:
            raise ValidationError("Google sync is not enabled")
        
        # Crear registro de importación
        import_record = ContactImport(
            source=ContactSource.GOOGLE_SYNC,
            imported_by=user.id,
            status=SyncStatus.SYNCING
        )
        self.db.add(import_record)
        self.db.commit()
        
        try:
            # Autenticar con Google
            creds = Credentials(
                token=None,
                refresh_token=decrypt_data(settings.google_refresh_token),
                token_uri='https://oauth2.googleapis.com/token',
                client_id=os.getenv('GOOGLE_CLIENT_ID'),
                client_secret=os.getenv('GOOGLE_CLIENT_SECRET')
            )
            
            if creds.expired:
                creds.refresh(Request())
                settings.google_refresh_token = encrypt_data(creds.refresh_token)
                self.db.commit()
            
            # Conectar a People API
            service = build('people', 'v1', credentials=creds)
            
            # Obtener contactos
            results = service.people().connections().list(
                resourceName='people/me',
                pageSize=1000,
                personFields='names,emailAddresses,phoneNumbers,organizations,addresses,birthdays'
            ).execute()
            
            connections = results.get('connections', [])
            
            imported = 0
            updated = 0
            failed = 0
            duplicates = 0
            
            for person in connections:
                try:
                    contact_data = self._parse_google_contact(person)
                    
                    # Buscar duplicado por google_contact_id
                    existing = self.db.query(Contact).filter(
                        Contact.google_contact_id == person['resourceName']
                    ).first()
                    
                    if existing:
                        # Actualizar contacto existente
                        for key, value in contact_data.items():
                            if value and not getattr(existing, key):
                                setattr(existing, key, value)
                        updated += 1
                    else:
                        # Buscar duplicados por otros campos
                        potential_duplicates = self._find_duplicates(contact_data)
                        
                        if potential_duplicates and not auto_merge:
                            # Registrar como candidato a duplicado
                            for dup in potential_duplicates:
                                self._register_duplicate_candidate(
                                    contact_data, dup, 'google_import'
                                )
                            duplicates += 1
                        else:
                            # Crear nuevo contacto
                            new_contact = Contact(
                                **contact_data,
                                owner_id=user.id,
                                created_by=user.id,
                                source=ContactSource.GOOGLE_SYNC,
                                google_contact_id=person['resourceName']
                            )
                            self.db.add(new_contact)
                            imported += 1
                            
                            if potential_duplicates and auto_merge:
                                # Auto-merge si está habilitado
                                self._merge_contacts(new_contact, potential_duplicates[0])
                    
                except Exception as e:
                    logger.error(f"Error importing Google contact: {e}")
                    failed += 1
            
            # Actualizar registro de importación
            import_record.status = SyncStatus.COMPLETED
            import_record.total_contacts = len(connections)
            import_record.imported_contacts = imported
            import_record.updated_contacts = updated
            import_record.failed_contacts = failed
            import_record.duplicate_contacts = duplicates
            import_record.completed_at = datetime.utcnow()
            
            # Actualizar última sincronización
            settings.google_last_sync = datetime.utcnow()
            
            self.db.commit()
            
            return import_record
            
        except Exception as e:
            import_record.status = SyncStatus.FAILED
            import_record.error_log = {'error': str(e)}
            self.db.commit()
            raise
    
    async def sync_outlook_contacts(self, user: User) -> ContactImport:
        """
        Sincronizar con Outlook/Exchange
        """
        settings = self._get_sync_settings(user)
        
        if not settings.outlook_sync_enabled:
            raise ValidationError("Outlook sync is not enabled")
        
        # Similar implementation to Google sync
        # Using O365 library for Outlook integration
        pass
    
    def import_from_csv(
        self,
        user: User,
        file_path: str,
        mapping: Dict[str, str],
        check_duplicates: bool = True
    ) -> ContactImport:
        """
        Importar contactos desde archivo CSV
        """
        import_record = ContactImport(
            source=ContactSource.CSV_IMPORT,
            imported_by=user.id,
            status=SyncStatus.SYNCING,
            source_details={'file': file_path}
        )
        self.db.add(import_record)
        self.db.commit()
        
        try:
            # Leer CSV
            df = pd.read_csv(file_path, encoding='utf-8-sig')
            
            imported = 0
            failed = 0
            duplicates = 0
            
            for _, row in df.iterrows():
                try:
                    # Mapear campos
                    contact_data = {}
                    for csv_field, db_field in mapping.items():
                        if csv_field in row and pd.notna(row[csv_field]):
                            contact_data[db_field] = str(row[csv_field])
                    
                    # Validar y crear contacto
                    self._validate_contact_data(contact_data)
                    
                    if check_duplicates:
                        dups = self._find_duplicates(contact_data)
                        if dups:
                            duplicates += 1
                            continue
                    
                    contact = Contact(
                        **contact_data,
                        owner_id=user.id,
                        created_by=user.id,
                        source=ContactSource.CSV_IMPORT
                    )
                    self.db.add(contact)
                    imported += 1
                    
                except Exception as e:
                    logger.error(f"Error importing CSV row: {e}")
                    failed += 1
            
            import_record.status = SyncStatus.COMPLETED
            import_record.total_contacts = len(df)
            import_record.imported_contacts = imported
            import_record.failed_contacts = failed
            import_record.duplicate_contacts = duplicates
            import_record.completed_at = datetime.utcnow()
            
            self.db.commit()
            return import_record
            
        except Exception as e:
            import_record.status = SyncStatus.FAILED
            import_record.error_log = {'error': str(e)}
            self.db.commit()
            raise
    
    # ===== COMPARTIR CONTACTOS =====
    
    def share_contact(
        self,
        user: User,
        contact_id: str,
        share_with: Dict[str, Any],
        permission: SharePermission = SharePermission.VIEW,
        message: Optional[str] = None,
        expires_in_days: Optional[int] = None
    ) -> ContactShare:
        """
        Compartir contacto con otro usuario o externamente
        """
        contact = self.get_contact(user, contact_id, log_view=False)
        
        # Verificar permisos para compartir
        if not self._can_share_contact(user, contact):
            raise PermissionDeniedError("You don't have permission to share this contact")
        
        # Crear compartición
        share = ContactShare(
            contact_id=contact_id,
            shared_by=user.id,
            permission=permission,
            message=message
        )
        
        if expires_in_days:
            share.expires_at = datetime.utcnow() + timedelta(days=expires_in_days)
        
        # Determinar destinatario
        if 'user_id' in share_with:
            share.shared_with_user_id = share_with['user_id']
        elif 'group_id' in share_with:
            share.shared_with_group_id = share_with['group_id']
        elif 'email' in share_with:
            # Compartir externamente
            share.shared_with_email = share_with['email']
            share.share_token = secrets.token_urlsafe(32)
            
            # Enviar email con link
            self._send_share_email(
                share_with['email'],
                contact,
                share.share_token,
                message
            )
        
        self.db.add(share)
        self.db.commit()
        
        # Registrar actividad
        self._log_activity(user, contact, 'share', {
            'shared_with': share_with,
            'permission': permission.value
        })
        
        return share
    
    def share_itinerary_via_sms(
        self,
        user: User,
        contact_id: str,
        itinerary_id: str,
        custom_message: Optional[str] = None
    ) -> bool:
        """
        Compartir itinerario vía SMS con link
        """
        contact = self.get_contact(user, contact_id)
        
        if not contact.mobile and not contact.whatsapp:
            raise ValidationError("Contact doesn't have a mobile number")
        
        # Generar link único para el itinerario
        token = secrets.token_urlsafe(16)
        itinerary_url = f"https://spirittours.com/itinerary/{itinerary_id}?token={token}"
        
        # Mensaje
        message = custom_message or f"Hola {contact.first_name}, aquí está tu itinerario de Spirit Tours: {itinerary_url}"
        
        # Enviar por WhatsApp si está disponible
        if contact.whatsapp:
            success = self.whatsapp_service.send_message(
                contact.whatsapp,
                message,
                template_name='itinerary_share'
            )
        else:
            # Enviar SMS tradicional
            # Implementar con Twilio o similar
            pass
        
        # Registrar actividad
        self._log_activity(user, contact, 'share_itinerary', {
            'itinerary_id': itinerary_id,
            'method': 'sms/whatsapp'
        })
        
        return True
    
    # ===== EXPORTACIÓN CON CONTROL =====
    
    def export_contacts(
        self,
        user: User,
        contact_ids: List[str],
        format: str = 'csv',
        fields: Optional[List[str]] = None,
        reason: str = None
    ) -> ContactExport:
        """
        Exportar contactos con control de seguridad
        """
        # Verificar permisos de exportación
        if not self._check_permission(user, 'can_export_all'):
            # Verificar límites
            max_limit = self._get_export_limit(user)
            if len(contact_ids) > max_limit:
                raise ExportLimitExceededError(
                    f"Export limit is {max_limit} contacts. You tried to export {len(contact_ids)}"
                )
        
        # Verificar que puede acceder a todos los contactos
        contacts = []
        for contact_id in contact_ids:
            contact = self.get_contact(user, contact_id, log_view=False)
            contacts.append(contact)
        
        # Crear registro de exportación
        export_record = ContactExport(
            exported_by=user.id,
            export_format=format,
            contact_count=len(contacts),
            contact_ids=contact_ids,
            fields_exported=fields or self._get_default_export_fields(user),
            export_reason=reason or "Manual export",
            ip_address=user.last_ip_address
        )
        
        # Generar archivo
        if format == 'csv':
            file_path = self._export_to_csv(contacts, fields)
        elif format == 'xlsx':
            file_path = self._export_to_excel(contacts, fields)
        elif format == 'vcard':
            file_path = self._export_to_vcard(contacts)
        else:
            raise ValidationError(f"Unsupported export format: {format}")
        
        export_record.file_path = file_path
        export_record.file_size = os.path.getsize(file_path)
        export_record.file_hash = self._calculate_file_hash(file_path)
        export_record.expires_at = datetime.utcnow() + timedelta(days=7)
        
        self.db.add(export_record)
        self.db.commit()
        
        # Registrar actividad para cada contacto
        for contact in contacts:
            self._log_activity(user, contact, 'export', {
                'format': format,
                'export_id': export_record.id
            })
        
        return export_record
    
    # ===== DETECCIÓN DE DUPLICADOS =====
    
    def find_duplicate_candidates(
        self,
        user: User,
        threshold: float = 0.8
    ) -> List[ContactDuplicateCandidate]:
        """
        Encontrar posibles contactos duplicados
        """
        # Solo administradores pueden buscar duplicados globalmente
        if user.is_admin:
            contacts = self.db.query(Contact).filter(Contact.deleted_at.is_(None)).all()
        else:
            contacts = self.search_contacts(user, limit=1000)[0]
        
        candidates = []
        
        for i, contact1 in enumerate(contacts):
            for contact2 in contacts[i+1:]:
                similarity = self._calculate_similarity(contact1, contact2)
                
                if similarity >= threshold:
                    # Verificar si ya existe el candidato
                    existing = self.db.query(ContactDuplicateCandidate).filter(
                        or_(
                            and_(
                                ContactDuplicateCandidate.contact1_id == contact1.id,
                                ContactDuplicateCandidate.contact2_id == contact2.id
                            ),
                            and_(
                                ContactDuplicateCandidate.contact1_id == contact2.id,
                                ContactDuplicateCandidate.contact2_id == contact1.id
                            )
                        ),
                        ContactDuplicateCandidate.status == 'pending'
                    ).first()
                    
                    if not existing:
                        candidate = ContactDuplicateCandidate(
                            contact1_id=contact1.id,
                            contact2_id=contact2.id,
                            similarity_score=similarity,
                            matching_fields=self._get_matching_fields(contact1, contact2),
                            confidence_level=self._get_confidence_level(similarity)
                        )
                        candidates.append(candidate)
                        self.db.add(candidate)
        
        self.db.commit()
        return candidates
    
    def merge_contacts(
        self,
        user: User,
        primary_id: str,
        secondary_id: str,
        merge_strategy: str = 'keep_primary'
    ) -> Contact:
        """
        Fusionar dos contactos duplicados
        """
        primary = self.get_contact(user, primary_id)
        secondary = self.get_contact(user, secondary_id)
        
        # Verificar permisos
        if not self._can_edit_contact(user, primary) or not self._can_edit_contact(user, secondary):
            raise PermissionDeniedError("You don't have permission to merge these contacts")
        
        # Aplicar estrategia de fusión
        if merge_strategy == 'keep_primary':
            # Mantener datos del primario, llenar vacíos con secundario
            for field in Contact.__table__.columns:
                if field.name not in ['id', 'created_at', 'updated_at']:
                    primary_value = getattr(primary, field.name)
                    if not primary_value:
                        secondary_value = getattr(secondary, field.name)
                        if secondary_value:
                            setattr(primary, field.name, secondary_value)
        
        elif merge_strategy == 'keep_newest':
            # Mantener el dato más reciente
            for field in Contact.__table__.columns:
                if field.name not in ['id', 'created_at', 'updated_at']:
                    if secondary.updated_at > primary.updated_at:
                        secondary_value = getattr(secondary, field.name)
                        if secondary_value:
                            setattr(primary, field.name, secondary_value)
        
        # Transferir relaciones
        for share in secondary.shares:
            share.contact_id = primary.id
        
        for activity in secondary.activities:
            activity.contact_id = primary.id
        
        # Marcar secundario como eliminado
        secondary.deleted_at = datetime.utcnow()
        secondary.deleted_by = user.id
        secondary.notes = f"Merged into contact {primary.id} on {datetime.utcnow()}"
        
        # Actualizar candidato de duplicado
        candidate = self.db.query(ContactDuplicateCandidate).filter(
            or_(
                and_(
                    ContactDuplicateCandidate.contact1_id == primary_id,
                    ContactDuplicateCandidate.contact2_id == secondary_id
                ),
                and_(
                    ContactDuplicateCandidate.contact1_id == secondary_id,
                    ContactDuplicateCandidate.contact2_id == primary_id
                )
            )
        ).first()
        
        if candidate:
            candidate.status = 'merged'
            candidate.merged_to_id = primary.id
            candidate.reviewed_by = user.id
            candidate.reviewed_at = datetime.utcnow()
        
        self.db.commit()
        
        # Registrar actividad
        self._log_activity(user, primary, 'merge', {
            'merged_from': secondary_id,
            'strategy': merge_strategy
        })
        
        return primary
    
    # ===== MÉTODOS AUXILIARES PRIVADOS =====
    
    def _check_permission(self, user: User, permission_type: str) -> bool:
        """
        Verificar si el usuario tiene un permiso especial
        """
        # Admin tiene todos los permisos
        if user.is_admin:
            return True
        
        # Verificar permisos específicos
        permission = self.db.query(ContactPermission).filter(
            or_(
                ContactPermission.user_id == user.id,
                ContactPermission.role_id.in_([r.id for r in user.roles])
            ),
            getattr(ContactPermission, permission_type) == True,
            or_(
                ContactPermission.valid_until.is_(None),
                ContactPermission.valid_until > datetime.utcnow()
            ),
            ContactPermission.revoked_at.is_(None)
        ).first()
        
        return permission is not None
    
    def _can_access_contact(self, user: User, contact: Contact) -> bool:
        """
        Verificar si el usuario puede ver el contacto
        """
        # Propietario siempre puede ver
        if contact.owner_id == user.id:
            return True
        
        # Admin puede ver todo
        if self._check_permission(user, 'can_view_all'):
            return True
        
        # Verificar visibilidad
        if contact.visibility == ContactVisibility.PUBLIC:
            return True
        
        if contact.visibility == ContactVisibility.COMPANY:
            return True  # Todos los empleados
        
        if contact.visibility == ContactVisibility.DEPARTMENT:
            return user.department_id == contact.owner.department_id
        
        # Verificar si está compartido
        share = self.db.query(ContactShare).filter(
            ContactShare.contact_id == contact.id,
            or_(
                ContactShare.shared_with_user_id == user.id,
                ContactShare.shared_with_group_id.in_(user.group_ids) if user.group_ids else False
            ),
            or_(
                ContactShare.expires_at.is_(None),
                ContactShare.expires_at > datetime.utcnow()
            )
        ).first()
        
        return share is not None
    
    def _can_edit_contact(self, user: User, contact: Contact) -> bool:
        """
        Verificar si el usuario puede editar el contacto
        """
        # Propietario puede editar
        if contact.owner_id == user.id:
            return True
        
        # Admin puede editar
        if user.is_admin:
            return True
        
        # Verificar compartición con permisos de edición
        share = self.db.query(ContactShare).filter(
            ContactShare.contact_id == contact.id,
            ContactShare.shared_with_user_id == user.id,
            ContactShare.permission.in_([SharePermission.EDIT, SharePermission.FULL])
        ).first()
        
        return share is not None
    
    def _can_delete_contact(self, user: User, contact: Contact) -> bool:
        """
        Verificar si el usuario puede eliminar el contacto
        """
        # Solo propietario y admin pueden eliminar
        return contact.owner_id == user.id or user.is_admin
    
    def _can_share_contact(self, user: User, contact: Contact) -> bool:
        """
        Verificar si el usuario puede compartir el contacto
        """
        # Propietario puede compartir
        if contact.owner_id == user.id:
            return True
        
        # Verificar permisos de compartición
        share = self.db.query(ContactShare).filter(
            ContactShare.contact_id == contact.id,
            ContactShare.shared_with_user_id == user.id,
            ContactShare.permission.in_([SharePermission.SHARE, SharePermission.FULL]),
            ContactShare.can_reshare == True
        ).first()
        
        return share is not None
    
    def _get_export_limit(self, user: User) -> int:
        """
        Obtener límite de exportación del usuario
        """
        permission = self.db.query(ContactPermission).filter(
            or_(
                ContactPermission.user_id == user.id,
                ContactPermission.role_id.in_([r.id for r in user.roles])
            ),
            ContactPermission.max_export_limit.isnot(None)
        ).first()
        
        if permission:
            return permission.max_export_limit
        
        # Límite por defecto según rol
        if user.is_admin:
            return 10000
        elif user.role == 'manager':
            return 1000
        else:
            return 100
    
    def _validate_contact_data(
        self,
        data: Dict[str, Any],
        is_update: bool = False
    ) -> None:
        """
        Validar datos del contacto
        """
        # Validar email
        if 'email' in data and data['email']:
            try:
                valid = validate_email(data['email'])
                data['email'] = valid.email
            except EmailNotValidError as e:
                raise ValidationError(f"Invalid email: {str(e)}")
        
        # Validar teléfono
        for phone_field in ['phone', 'mobile', 'whatsapp']:
            if phone_field in data and data[phone_field]:
                try:
                    parsed = phonenumbers.parse(data[phone_field], 'PE')  # Default Peru
                    if not phonenumbers.is_valid_number(parsed):
                        raise ValidationError(f"Invalid {phone_field}: {data[phone_field]}")
                    data[phone_field] = phonenumbers.format_number(
                        parsed,
                        phonenumbers.PhoneNumberFormat.E164
                    )
                except Exception as e:
                    raise ValidationError(f"Invalid {phone_field}: {str(e)}")
        
        # Validar campos requeridos
        if not is_update:
            if not data.get('first_name') or not data.get('last_name'):
                raise ValidationError("First name and last name are required")
            
            if not data.get('type'):
                data['type'] = ContactType.CUSTOMER
    
    def _find_duplicates(
        self,
        contact_data: Dict[str, Any],
        threshold: float = 0.7
    ) -> List[Contact]:
        """
        Buscar posibles duplicados de un contacto
        """
        duplicates = []
        
        # Buscar por email exacto
        if contact_data.get('email'):
            email_matches = self.db.query(Contact).filter(
                Contact.email == contact_data['email'],
                Contact.deleted_at.is_(None)
            ).all()
            duplicates.extend(email_matches)
        
        # Buscar por teléfono
        if contact_data.get('phone') or contact_data.get('mobile'):
            phone = contact_data.get('phone') or contact_data.get('mobile')
            phone_matches = self.db.query(Contact).filter(
                or_(Contact.phone == phone, Contact.mobile == phone),
                Contact.deleted_at.is_(None)
            ).all()
            duplicates.extend(phone_matches)
        
        # Buscar por nombre similar
        if contact_data.get('first_name') and contact_data.get('last_name'):
            full_name = f"{contact_data['first_name']} {contact_data['last_name']}"
            
            # Obtener contactos con nombres similares
            all_contacts = self.db.query(Contact).filter(
                Contact.deleted_at.is_(None)
            ).limit(1000).all()
            
            for contact in all_contacts:
                if contact not in duplicates:
                    similarity = fuzz.ratio(full_name.lower(), contact.full_name.lower()) / 100
                    if similarity >= threshold:
                        duplicates.append(contact)
        
        return list(set(duplicates))  # Eliminar duplicados
    
    def _calculate_similarity(
        self,
        contact1: Contact,
        contact2: Contact
    ) -> float:
        """
        Calcular similitud entre dos contactos
        """
        scores = []
        
        # Similitud de nombre
        if contact1.full_name and contact2.full_name:
            name_score = fuzz.ratio(contact1.full_name.lower(), contact2.full_name.lower()) / 100
            scores.append(name_score * 0.3)  # 30% peso
        
        # Email exacto
        if contact1.email and contact2.email:
            if contact1.email == contact2.email:
                scores.append(0.3)  # 30% peso
        
        # Teléfono exacto
        if (contact1.phone and contact2.phone and contact1.phone == contact2.phone) or \
           (contact1.mobile and contact2.mobile and contact1.mobile == contact2.mobile):
            scores.append(0.2)  # 20% peso
        
        # Empresa
        if contact1.company and contact2.company:
            company_score = fuzz.ratio(contact1.company.lower(), contact2.company.lower()) / 100
            scores.append(company_score * 0.1)  # 10% peso
        
        # Dirección
        if contact1.address_line1 and contact2.address_line1:
            address_score = fuzz.ratio(contact1.address_line1.lower(), contact2.address_line1.lower()) / 100
            scores.append(address_score * 0.1)  # 10% peso
        
        return sum(scores)
    
    def _calculate_quality_score(self, contact: Contact) -> int:
        """
        Calcular score de calidad del contacto (0-100)
        """
        score = 0
        
        # Campos básicos (40 puntos)
        if contact.first_name and contact.last_name:
            score += 10
        if contact.email:
            score += 10
        if contact.phone or contact.mobile:
            score += 10
        if contact.company or contact.job_title:
            score += 10
        
        # Dirección (20 puntos)
        if contact.address_line1 and contact.city and contact.country:
            score += 20
        
        # Información adicional (20 puntos)
        if contact.birthdate:
            score += 5
        if contact.website:
            score += 5
        if contact.linkedin or contact.facebook:
            score += 5
        if contact.notes:
            score += 5
        
        # Verificación (20 puntos)
        if contact.is_verified:
            score += 20
        
        return min(score, 100)
    
    def _log_activity(
        self,
        user: User,
        contact: Optional[Contact],
        activity_type: str,
        details: Optional[Dict] = None
    ) -> None:
        """
        Registrar actividad sobre contacto
        """
        if contact:
            activity = ContactActivity(
                contact_id=contact.id,
                activity_type=activity_type,
                activity_detail=details or {},
                performed_by=user.id,
                ip_address=user.last_ip_address,
                user_agent=user.last_user_agent
            )
            self.db.add(activity)
            self.db.commit()
    
    def _get_sync_settings(self, user: User) -> ContactSyncSettings:
        """
        Obtener configuración de sincronización del usuario
        """
        settings = self.db.query(ContactSyncSettings).filter(
            ContactSyncSettings.user_id == user.id
        ).first()
        
        if not settings:
            settings = ContactSyncSettings(user_id=user.id)
            self.db.add(settings)
            self.db.commit()
        
        return settings