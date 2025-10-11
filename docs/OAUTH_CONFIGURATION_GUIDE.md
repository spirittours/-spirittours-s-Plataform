# 📋 Guía Completa de Configuración OAuth y APIs

## 1. 🔷 Google Cloud Console - Configuración Completa

### Paso 1: Crear Proyecto en Google Cloud
1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Click en "Select a project" → "New Project"
3. Nombre del proyecto: `spirit-tours-contacts`
4. Organization: Seleccionar tu organización
5. Location: Dejar por defecto
6. Click "Create"

### Paso 2: Habilitar APIs Necesarias
```bash
# Habilitar People API (para contactos)
gcloud services enable people.googleapis.com

# Habilitar Gmail API (para importar desde correos)
gcloud services enable gmail.googleapis.com

# Habilitar Calendar API (para sincronizar eventos)
gcloud services enable calendar.googleapis.com

# Habilitar Drive API (para adjuntos)
gcloud services enable drive.googleapis.com
```

### Paso 3: Crear Credenciales OAuth 2.0

1. **Navegar a Credenciales:**
   - Ir a "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"

2. **Configurar OAuth Consent Screen:**
   ```json
   {
     "application_name": "Spirit Tours Contact Manager",
     "support_email": "support@spirittours.com",
     "authorized_domains": ["spirittours.com"],
     "scopes": [
       "https://www.googleapis.com/auth/contacts",
       "https://www.googleapis.com/auth/contacts.readonly",
       "https://www.googleapis.com/auth/userinfo.email",
       "https://www.googleapis.com/auth/userinfo.profile"
     ],
     "application_logo": "https://spirittours.com/logo.png",
     "application_homepage": "https://spirittours.com",
     "application_privacy_policy": "https://spirittours.com/privacy",
     "application_terms_of_service": "https://spirittours.com/terms"
   }
   ```

3. **Crear OAuth Client ID:**
   - Application type: "Web application"
   - Name: "Spirit Tours Web Client"
   - Authorized JavaScript origins:
     ```
     https://spirittours.com
     https://www.spirittours.com
     https://app.spirittours.com
     http://localhost:3000 (desarrollo)
     ```
   - Authorized redirect URIs:
     ```
     https://spirittours.com/api/auth/google/callback
     https://app.spirittours.com/api/auth/google/callback
     http://localhost:3000/api/auth/google/callback
     ```

4. **Descargar Credenciales:**
   - Click en el cliente creado
   - Download JSON
   - Guardar como `google_oauth_credentials.json`

### Paso 4: Configurar en el Sistema

```python
# backend/config/google_oauth.py
import json
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow

class GoogleOAuthConfig:
    """Configuración de OAuth para Google"""
    
    # Cargar credenciales desde archivo o variables de entorno
    if os.path.exists('google_oauth_credentials.json'):
        with open('google_oauth_credentials.json', 'r') as f:
            credentials = json.load(f)
    else:
        credentials = {
            "web": {
                "client_id": os.getenv('GOOGLE_CLIENT_ID'),
                "client_secret": os.getenv('GOOGLE_CLIENT_SECRET'),
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [os.getenv('GOOGLE_REDIRECT_URI')]
            }
        }
    
    # Scopes necesarios
    SCOPES = [
        'https://www.googleapis.com/auth/contacts',
        'https://www.googleapis.com/auth/contacts.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/gmail.readonly',  # Para importar desde Gmail
        'https://www.googleapis.com/auth/calendar.events'  # Para eventos
    ]
    
    @classmethod
    def get_flow(cls, redirect_uri: str = None):
        """Crear flujo de OAuth"""
        flow = Flow.from_client_config(
            cls.credentials,
            scopes=cls.SCOPES
        )
        flow.redirect_uri = redirect_uri or cls.credentials['web']['redirect_uris'][0]
        return flow
    
    @classmethod
    def get_authorization_url(cls, state: str = None):
        """Obtener URL de autorización"""
        flow = cls.get_flow()
        authorization_url, state = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'  # Siempre pedir consentimiento para obtener refresh token
        )
        return authorization_url, state
    
    @classmethod
    def exchange_code_for_tokens(cls, code: str, redirect_uri: str):
        """Intercambiar código por tokens"""
        flow = cls.get_flow(redirect_uri)
        flow.fetch_token(code=code)
        return flow.credentials
```

### Paso 5: Implementar Endpoints de OAuth

```python
# backend/api/google_oauth_api.py
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import RedirectResponse
import secrets
from backend.config.google_oauth import GoogleOAuthConfig
from backend.services.contacts_service import ContactsService

router = APIRouter(prefix="/api/auth/google", tags=["Google OAuth"])

# Almacenar estados temporalmente (usar Redis en producción)
oauth_states = {}

@router.get("/authorize")
async def google_authorize(
    current_user: User = Depends(get_current_user)
):
    """Iniciar flujo de autorización de Google"""
    # Generar estado único para prevenir CSRF
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "user_id": str(current_user.id),
        "timestamp": datetime.utcnow()
    }
    
    # Obtener URL de autorización
    auth_url, _ = GoogleOAuthConfig.get_authorization_url(state)
    
    return {
        "authorization_url": auth_url,
        "state": state
    }

@router.get("/callback")
async def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Callback de Google OAuth"""
    # Verificar estado
    if state not in oauth_states:
        raise HTTPException(status_code=400, detail="Invalid state")
    
    user_data = oauth_states.pop(state)
    user_id = user_data["user_id"]
    
    # Intercambiar código por tokens
    redirect_uri = f"{os.getenv('API_BASE_URL')}/api/auth/google/callback"
    credentials = GoogleOAuthConfig.exchange_code_for_tokens(code, redirect_uri)
    
    # Guardar tokens en la base de datos (encriptados)
    user = db.query(User).filter(User.id == user_id).first()
    sync_settings = db.query(ContactSyncSettings).filter(
        ContactSyncSettings.user_id == user_id
    ).first()
    
    if not sync_settings:
        sync_settings = ContactSyncSettings(user_id=user_id)
        db.add(sync_settings)
    
    # Encriptar y guardar tokens
    from backend.core.security import encrypt_data
    sync_settings.google_refresh_token = encrypt_data(credentials.refresh_token)
    sync_settings.google_sync_enabled = True
    sync_settings.google_account = credentials.token.get('email', '')
    
    db.commit()
    
    # Iniciar sincronización inicial
    service = ContactsService(db)
    asyncio.create_task(service.import_google_contacts(user))
    
    return RedirectResponse(url="/contacts?google_connected=true")

@router.post("/sync")
async def sync_google_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sincronizar manualmente contactos de Google"""
    service = ContactsService(db)
    import_record = await service.import_google_contacts(current_user)
    
    return {
        "success": True,
        "imported": import_record.imported_contacts,
        "updated": import_record.updated_contacts,
        "failed": import_record.failed_contacts
    }

@router.delete("/disconnect")
async def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Desconectar cuenta de Google"""
    sync_settings = db.query(ContactSyncSettings).filter(
        ContactSyncSettings.user_id == current_user.id
    ).first()
    
    if sync_settings:
        sync_settings.google_sync_enabled = False
        sync_settings.google_refresh_token = None
        sync_settings.google_account = None
        db.commit()
    
    return {"success": True, "message": "Google account disconnected"}
```

## 2. 🔵 Azure AD - Configuración para Outlook/Exchange

### Paso 1: Registrar Aplicación en Azure

1. **Ir a Azure Portal:**
   - [Azure Portal](https://portal.azure.com)
   - Navegar a "Azure Active Directory" → "App registrations"
   - Click "New registration"

2. **Configurar Aplicación:**
   ```json
   {
     "name": "Spirit Tours Contact Sync",
     "supported_account_types": "Accounts in any organizational directory and personal Microsoft accounts",
     "redirect_uri": {
       "platform": "Web",
       "url": "https://spirittours.com/api/auth/outlook/callback"
     }
   }
   ```

3. **Obtener IDs:**
   - Application (client) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Directory (tenant) ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### Paso 2: Configurar Permisos de API

```yaml
# Permisos necesarios (Microsoft Graph)
Delegated Permissions:
  - Contacts.Read
  - Contacts.ReadWrite
  - User.Read
  - Mail.Read
  - Calendar.Read
  - Files.Read.All
  - offline_access  # Para refresh token

Application Permissions (para sync automático):
  - Contacts.Read
  - Contacts.ReadWrite
  - User.Read.All
```

### Paso 3: Crear Client Secret

1. Ir a "Certificates & secrets"
2. Click "New client secret"
3. Description: "Spirit Tours OAuth Secret"
4. Expires: "24 months"
5. Copiar el valor del secret inmediatamente

### Paso 4: Implementar Integración con Outlook

```python
# backend/config/outlook_oauth.py
from O365 import Account, FileSystemTokenBackend
import os

class OutlookOAuthConfig:
    """Configuración de OAuth para Outlook/Exchange"""
    
    CLIENT_ID = os.getenv('AZURE_CLIENT_ID')
    CLIENT_SECRET = os.getenv('AZURE_CLIENT_SECRET')
    TENANT_ID = os.getenv('AZURE_TENANT_ID', 'common')  # 'common' para cuentas personales y de trabajo
    
    # Scopes necesarios
    SCOPES = [
        'Contacts.Read',
        'Contacts.ReadWrite',
        'User.Read',
        'Mail.Read',
        'Calendar.Read',
        'offline_access'
    ]
    
    @classmethod
    def get_account(cls, token_backend=None):
        """Crear cuenta de O365"""
        credentials = (cls.CLIENT_ID, cls.CLIENT_SECRET)
        
        if not token_backend:
            token_backend = FileSystemTokenBackend(
                token_path='/tmp/o365_tokens',
                token_filename='token.txt'
            )
        
        account = Account(
            credentials,
            token_backend=token_backend,
            scopes=cls.SCOPES,
            tenant_id=cls.TENANT_ID
        )
        
        return account
    
    @classmethod
    def get_authorization_url(cls, redirect_uri: str, state: str = None):
        """Obtener URL de autorización"""
        account = cls.get_account()
        
        url, state = account.connection.get_authorization_url(
            redirect_uri=redirect_uri,
            state=state,
            response_type='code'
        )
        
        return url, state
    
    @classmethod
    def authenticate_with_code(cls, code: str, redirect_uri: str):
        """Autenticar con código de autorización"""
        account = cls.get_account()
        
        result = account.connection.request_token(
            authorization_code=code,
            redirect_uri=redirect_uri
        )
        
        if account.authenticate():
            return account
        else:
            raise Exception("Failed to authenticate with Outlook")
```

```python
# backend/services/outlook_sync_service.py
from O365 import Account
from backend.models.contacts_models import Contact, ContactSource
import logging

logger = logging.getLogger(__name__)

class OutlookSyncService:
    """Servicio de sincronización con Outlook"""
    
    def __init__(self, account: Account):
        self.account = account
        
    async def sync_contacts(self, user, db):
        """Sincronizar contactos de Outlook"""
        import_record = ContactImport(
            source=ContactSource.OUTLOOK_SYNC,
            imported_by=user.id,
            status=SyncStatus.SYNCING
        )
        db.add(import_record)
        db.commit()
        
        try:
            # Obtener contactos
            contacts = self.account.contacts()
            outlook_contacts = contacts.get_contacts()
            
            imported = 0
            updated = 0
            failed = 0
            
            for outlook_contact in outlook_contacts:
                try:
                    contact_data = self._parse_outlook_contact(outlook_contact)
                    
                    # Buscar si ya existe
                    existing = db.query(Contact).filter(
                        Contact.outlook_contact_id == outlook_contact.object_id
                    ).first()
                    
                    if existing:
                        # Actualizar
                        for key, value in contact_data.items():
                            if value and not getattr(existing, key):
                                setattr(existing, key, value)
                        updated += 1
                    else:
                        # Crear nuevo
                        new_contact = Contact(
                            **contact_data,
                            owner_id=user.id,
                            source=ContactSource.OUTLOOK_SYNC,
                            outlook_contact_id=outlook_contact.object_id
                        )
                        db.add(new_contact)
                        imported += 1
                        
                except Exception as e:
                    logger.error(f"Error importing Outlook contact: {e}")
                    failed += 1
            
            import_record.status = SyncStatus.COMPLETED
            import_record.imported_contacts = imported
            import_record.updated_contacts = updated
            import_record.failed_contacts = failed
            import_record.completed_at = datetime.utcnow()
            
            db.commit()
            return import_record
            
        except Exception as e:
            import_record.status = SyncStatus.FAILED
            import_record.error_log = {'error': str(e)}
            db.commit()
            raise
    
    def _parse_outlook_contact(self, outlook_contact):
        """Parsear contacto de Outlook"""
        return {
            'first_name': outlook_contact.given_name or '',
            'last_name': outlook_contact.surname or '',
            'display_name': outlook_contact.display_name,
            'email': outlook_contact.email_addresses[0].address if outlook_contact.email_addresses else None,
            'phone': outlook_contact.business_phones[0] if outlook_contact.business_phones else None,
            'mobile': outlook_contact.mobile_phone,
            'company': outlook_contact.company_name,
            'job_title': outlook_contact.job_title,
            'department': outlook_contact.department,
            'address_line1': outlook_contact.business_address.street if outlook_contact.business_address else None,
            'city': outlook_contact.business_address.city if outlook_contact.business_address else None,
            'state': outlook_contact.business_address.state if outlook_contact.business_address else None,
            'country': outlook_contact.business_address.country_or_region if outlook_contact.business_address else None,
            'postal_code': outlook_contact.business_address.postal_code if outlook_contact.business_address else None,
            'birthdate': outlook_contact.birthday,
            'notes': outlook_contact.personal_notes
        }
```

## 3. 📱 WhatsApp Business API - Configuración Completa

### Paso 1: Registrar en Meta for Developers

1. **Crear App en Meta:**
   - Ir a [Meta for Developers](https://developers.facebook.com)
   - My Apps → Create App
   - Type: "Business"
   - App Name: "Spirit Tours WhatsApp Integration"
   - App Contact Email: "dev@spirittours.com"
   - Business Account: Seleccionar o crear

2. **Agregar WhatsApp Product:**
   - En el dashboard, buscar "WhatsApp"
   - Click "Set up"
   - Seguir el wizard de configuración

### Paso 2: Configurar WhatsApp Business Account

```bash
# Obtener Phone Number ID y Token
WHATSAPP_BUSINESS_ACCOUNT_ID="xxxxxxxxxx"
WHATSAPP_PHONE_NUMBER_ID="xxxxxxxxxx"
WHATSAPP_ACCESS_TOKEN="EAxxxxxxxxxx..."
WHATSAPP_VERIFY_TOKEN="spirit_tours_verify_2024"
```

### Paso 3: Configurar Webhooks

```python
# backend/api/whatsapp_webhooks.py
from fastapi import APIRouter, Request, Response, HTTPException
import hmac
import hashlib
import json

router = APIRouter(prefix="/api/webhooks/whatsapp", tags=["WhatsApp Webhooks"])

VERIFY_TOKEN = os.getenv('WHATSAPP_VERIFY_TOKEN')
APP_SECRET = os.getenv('WHATSAPP_APP_SECRET')

@router.get("/")
async def verify_webhook(
    hub_mode: str = Query(alias="hub.mode"),
    hub_challenge: str = Query(alias="hub.challenge"),
    hub_verify_token: str = Query(alias="hub.verify_token")
):
    """Verificar webhook de WhatsApp"""
    if hub_mode == "subscribe" and hub_verify_token == VERIFY_TOKEN:
        return Response(content=hub_challenge, media_type="text/plain")
    else:
        raise HTTPException(status_code=403, detail="Verification failed")

@router.post("/")
async def receive_webhook(request: Request, db: Session = Depends(get_db)):
    """Recibir notificaciones de WhatsApp"""
    # Verificar firma
    signature = request.headers.get('X-Hub-Signature-256', '')
    body = await request.body()
    
    expected_signature = hmac.new(
        APP_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    
    if not hmac.compare_digest(signature.replace('sha256=', ''), expected_signature):
        raise HTTPException(status_code=403, detail="Invalid signature")
    
    # Procesar webhook
    data = json.loads(body)
    
    for entry in data.get('entry', []):
        for change in entry.get('changes', []):
            if change['field'] == 'messages':
                await process_message(change['value'], db)
            elif change['field'] == 'contacts':
                await process_contact_update(change['value'], db)
    
    return {"status": "ok"}

async def process_message(value: dict, db: Session):
    """Procesar mensaje recibido"""
    messages = value.get('messages', [])
    
    for message in messages:
        from_number = message['from']
        message_type = message['type']
        
        if message_type == 'text':
            text = message['text']['body']
            
            # Buscar o crear contacto
            contact = db.query(Contact).filter(
                Contact.whatsapp == from_number
            ).first()
            
            if not contact:
                # Crear nuevo contacto desde WhatsApp
                profile = await get_whatsapp_profile(from_number)
                contact = Contact(
                    first_name=profile.get('name', 'WhatsApp'),
                    last_name='User',
                    whatsapp=from_number,
                    source=ContactSource.WHATSAPP,
                    owner_id=get_default_owner_id()  # Asignar a un usuario por defecto
                )
                db.add(contact)
                db.commit()
            
            # Registrar actividad
            activity = ContactActivity(
                contact_id=contact.id,
                activity_type='whatsapp_message',
                activity_detail={
                    'message': text,
                    'timestamp': message['timestamp']
                },
                performed_by=get_system_user_id()
            )
            db.add(activity)
            db.commit()
            
            # Responder automáticamente si es necesario
            if text.lower() in ['hola', 'info', 'ayuda']:
                await send_whatsapp_template(from_number, 'welcome_message')

async def get_whatsapp_profile(phone_number: str):
    """Obtener perfil de WhatsApp"""
    url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_NUMBER_ID}/contacts"
    headers = {
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    data = {
        "blocking": "wait",
        "contacts": [f"+{phone_number}"],
        "force_check": True
    }
    
    response = requests.post(url, headers=headers, json=data)
    if response.status_code == 200:
        result = response.json()
        if result['contacts']:
            return result['contacts'][0]
    return {}
```

### Paso 4: Implementar Templates de Mensajes

```python
# backend/services/whatsapp_templates.py
class WhatsAppTemplateService:
    """Servicio de templates de WhatsApp"""
    
    TEMPLATES = {
        'welcome_message': {
            'name': 'welcome_spirit_tours',
            'language': 'es',
            'components': [
                {
                    'type': 'header',
                    'parameters': [
                        {'type': 'text', 'text': '{{1}}'}  # Nombre del cliente
                    ]
                },
                {
                    'type': 'body',
                    'parameters': [
                        {'type': 'text', 'text': '{{1}}'},  # Destino
                        {'type': 'text', 'text': '{{2}}'}   # Fecha
                    ]
                }
            ]
        },
        'itinerary_share': {
            'name': 'share_itinerary',
            'language': 'es',
            'components': [
                {
                    'type': 'header',
                    'parameters': [
                        {'type': 'document', 'document': {'link': '{{1}}'}}
                    ]
                },
                {
                    'type': 'body',
                    'parameters': [
                        {'type': 'text', 'text': '{{1}}'},  # Nombre
                        {'type': 'text', 'text': '{{2}}'},  # Destino
                        {'type': 'text', 'text': '{{3}}'}   # Link
                    ]
                },
                {
                    'type': 'button',
                    'sub_type': 'url',
                    'index': '0',
                    'parameters': [
                        {'type': 'text', 'text': '{{1}}'}  # Token único
                    ]
                }
            ]
        }
    }
    
    @classmethod
    async def send_template(cls, to_number: str, template_key: str, params: dict):
        """Enviar template de WhatsApp"""
        template = cls.TEMPLATES.get(template_key)
        if not template:
            raise ValueError(f"Template {template_key} not found")
        
        url = f"https://graph.facebook.com/v18.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Construir componentes con parámetros
        components = []
        for component in template['components']:
            comp = {'type': component['type']}
            if 'parameters' in component:
                comp['parameters'] = []
                for param in component['parameters']:
                    if '{{' in str(param.get('text', '')):
                        # Reemplazar placeholder con valor real
                        key = param['text'].strip('{}')
                        param['text'] = params.get(key, '')
                    comp['parameters'].append(param)
            components.append(comp)
        
        data = {
            "messaging_product": "whatsapp",
            "to": to_number,
            "type": "template",
            "template": {
                "name": template['name'],
                "language": {"code": template['language']},
                "components": components
            }
        }
        
        response = requests.post(url, headers=headers, json=data)
        return response.json()
```

## 4. 📋 Variables de Entorno Necesarias

```bash
# .env file
# Google OAuth
GOOGLE_CLIENT_ID=xxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxx
GOOGLE_REDIRECT_URI=https://spirittours.com/api/auth/google/callback

# Azure/Outlook OAuth
AZURE_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
AZURE_CLIENT_SECRET=xxxxxxxxxx
AZURE_TENANT_ID=common

# WhatsApp Business
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx
WHATSAPP_ACCESS_TOKEN=EAxxxxxxxxxx
WHATSAPP_VERIFY_TOKEN=spirit_tours_verify_2024
WHATSAPP_APP_SECRET=xxxxxxxxxx

# API Base URL
API_BASE_URL=https://api.spirittours.com
FRONTEND_URL=https://app.spirittours.com

# Encryption Key para tokens
ENCRYPTION_KEY=xxxxxxxxxx  # Generar con: openssl rand -hex 32
```

## 5. 🚀 Script de Configuración Automática

```python
# setup_oauth_services.py
#!/usr/bin/env python3
"""
Script de configuración automática de servicios OAuth
"""

import os
import json
import requests
from dotenv import load_dotenv
import subprocess

load_dotenv()

def setup_google_oauth():
    """Configurar Google OAuth"""
    print("🔷 Configurando Google OAuth...")
    
    # Verificar credenciales
    if not os.getenv('GOOGLE_CLIENT_ID'):
        print("❌ GOOGLE_CLIENT_ID no configurado")
        print("📋 Instrucciones:")
        print("1. Ir a https://console.cloud.google.com")
        print("2. Crear nuevo proyecto o seleccionar existente")
        print("3. Habilitar People API")
        print("4. Crear credenciales OAuth 2.0")
        print("5. Agregar las credenciales al archivo .env")
        return False
    
    # Verificar People API
    try:
        subprocess.run([
            'gcloud', 'services', 'enable', 
            'people.googleapis.com',
            '--project', os.getenv('GOOGLE_PROJECT_ID')
        ], check=True)
        print("✅ People API habilitada")
    except:
        print("⚠️  No se pudo verificar People API automáticamente")
    
    return True

def setup_azure_oauth():
    """Configurar Azure OAuth"""
    print("\n🔵 Configurando Azure OAuth...")
    
    if not os.getenv('AZURE_CLIENT_ID'):
        print("❌ AZURE_CLIENT_ID no configurado")
        print("📋 Instrucciones:")
        print("1. Ir a https://portal.azure.com")
        print("2. Registrar nueva aplicación en Azure AD")
        print("3. Configurar permisos de Microsoft Graph")
        print("4. Crear client secret")
        print("5. Agregar las credenciales al archivo .env")
        return False
    
    print("✅ Azure OAuth configurado")
    return True

def setup_whatsapp_business():
    """Configurar WhatsApp Business"""
    print("\n📱 Configurando WhatsApp Business...")
    
    if not os.getenv('WHATSAPP_ACCESS_TOKEN'):
        print("❌ WHATSAPP_ACCESS_TOKEN no configurado")
        print("📋 Instrucciones:")
        print("1. Ir a https://developers.facebook.com")
        print("2. Crear app de tipo Business")
        print("3. Agregar producto WhatsApp")
        print("4. Obtener Phone Number ID y Access Token")
        print("5. Configurar webhook URL")
        print("6. Agregar las credenciales al archivo .env")
        return False
    
    # Verificar webhook
    webhook_url = f"{os.getenv('API_BASE_URL')}/api/webhooks/whatsapp"
    print(f"📍 Webhook URL: {webhook_url}")
    print("⚠️  Asegúrate de configurar esta URL en Meta for Developers")
    
    return True

def test_connections():
    """Probar conexiones"""
    print("\n🧪 Probando conexiones...")
    
    # Test Google
    if os.getenv('GOOGLE_CLIENT_ID'):
        print("🔷 Google: Configurado ✅")
    else:
        print("🔷 Google: No configurado ❌")
    
    # Test Azure
    if os.getenv('AZURE_CLIENT_ID'):
        print("🔵 Azure: Configurado ✅")
    else:
        print("🔵 Azure: No configurado ❌")
    
    # Test WhatsApp
    if os.getenv('WHATSAPP_ACCESS_TOKEN'):
        # Intentar obtener info de la cuenta
        url = f"https://graph.facebook.com/v18.0/{os.getenv('WHATSAPP_BUSINESS_ACCOUNT_ID')}"
        headers = {"Authorization": f"Bearer {os.getenv('WHATSAPP_ACCESS_TOKEN')}"}
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                print("📱 WhatsApp: Conectado ✅")
            else:
                print(f"📱 WhatsApp: Error de conexión ({response.status_code}) ❌")
        except:
            print("📱 WhatsApp: No se pudo verificar ⚠️")
    else:
        print("📱 WhatsApp: No configurado ❌")

if __name__ == "__main__":
    print("🚀 Spirit Tours - Configuración de Servicios OAuth")
    print("=" * 50)
    
    # Configurar cada servicio
    google_ok = setup_google_oauth()
    azure_ok = setup_azure_oauth()
    whatsapp_ok = setup_whatsapp_business()
    
    # Probar conexiones
    test_connections()
    
    print("\n" + "=" * 50)
    if google_ok and azure_ok and whatsapp_ok:
        print("✅ Todos los servicios configurados correctamente")
    else:
        print("⚠️  Algunos servicios necesitan configuración manual")
        print("📖 Consulta la documentación en /docs/OAUTH_CONFIGURATION_GUIDE.md")
```

## 6. 🔒 Consideraciones de Seguridad

### Almacenamiento Seguro de Tokens

```python
# backend/core/security.py
from cryptography.fernet import Fernet
import os

class TokenEncryption:
    """Encriptación de tokens sensibles"""
    
    # Generar clave: Fernet.generate_key()
    KEY = os.getenv('ENCRYPTION_KEY').encode()
    cipher_suite = Fernet(KEY)
    
    @classmethod
    def encrypt_token(cls, token: str) -> str:
        """Encriptar token"""
        return cls.cipher_suite.encrypt(token.encode()).decode()
    
    @classmethod
    def decrypt_token(cls, encrypted_token: str) -> str:
        """Desencriptar token"""
        return cls.cipher_suite.decrypt(encrypted_token.encode()).decode()
```

### Rate Limiting para APIs

```python
# backend/core/rate_limiter.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute"]
)

# Límites específicos para OAuth
oauth_limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["10 per minute"]  # Más restrictivo para OAuth
)
```

## 7. 📊 Monitoreo y Logs

```python
# backend/core/oauth_monitoring.py
import logging
from datetime import datetime

class OAuthMonitor:
    """Monitoreo de operaciones OAuth"""
    
    @staticmethod
    def log_oauth_event(service: str, event: str, user_id: str, success: bool):
        """Registrar evento OAuth"""
        logger = logging.getLogger(f"oauth.{service}")
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "service": service,
            "event": event,
            "user_id": user_id,
            "success": success
        }
        
        if success:
            logger.info(json.dumps(log_data))
        else:
            logger.error(json.dumps(log_data))
        
        # También guardar en base de datos para auditoría
        # ...
```

## 8. ✅ Checklist de Configuración

- [ ] **Google OAuth**
  - [ ] Proyecto creado en Google Cloud Console
  - [ ] People API habilitada
  - [ ] Credenciales OAuth 2.0 creadas
  - [ ] URIs de redirección configuradas
  - [ ] Variables de entorno agregadas

- [ ] **Azure/Outlook OAuth**
  - [ ] App registrada en Azure AD
  - [ ] Permisos de Microsoft Graph configurados
  - [ ] Client Secret creado
  - [ ] Variables de entorno agregadas

- [ ] **WhatsApp Business**
  - [ ] App creada en Meta for Developers
  - [ ] WhatsApp Business Account configurada
  - [ ] Webhook URL configurado
  - [ ] Templates de mensajes creados
  - [ ] Variables de entorno agregadas

- [ ] **Seguridad**
  - [ ] Clave de encriptación generada
  - [ ] HTTPS configurado
  - [ ] Rate limiting implementado
  - [ ] Logs configurados

- [ ] **Testing**
  - [ ] Flujo de Google OAuth probado
  - [ ] Flujo de Outlook OAuth probado
  - [ ] Webhooks de WhatsApp probados
  - [ ] Sincronización de contactos probada