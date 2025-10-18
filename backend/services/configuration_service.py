"""
Configuration Service
Servicio para gestión completa de configuración del sistema

Funcionalidades:
- Gestión de configuración SMTP
- Gestión de proveedores de IA
- Wizard de configuración inicial
- Testing de conexiones
- Encriptación de datos sensibles
- Audit logging
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import uuid
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging
import json
from cryptography.fernet import Fernet
import os
import base64

from backend.models.system_configuration_models import (
    SystemConfiguration, SMTPConfiguration, AIProviderConfiguration,
    ConfigurationWizardProgress, ConfigurationAuditLog,
    ConfigurationCategory, AIProvider, ConfigurationStatus, WizardStep,
    AI_PROVIDER_TEMPLATES
)
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

# ============================================================================
# ENCRYPTION UTILITIES
# ============================================================================

class EncryptionService:
    """Servicio para encriptar/desencriptar datos sensibles"""
    
    def __init__(self):
        # Get encryption key from environment or generate one
        key = os.getenv('ENCRYPTION_KEY')
        if not key:
            # Generate a key (in production, this should be stored securely)
            key = Fernet.generate_key()
            logger.warning("No ENCRYPTION_KEY found, generated temporary key")
        
        if isinstance(key, str):
            key = key.encode()
        
        self.cipher = Fernet(key)
    
    def encrypt(self, data: str) -> str:
        """Encripta un string"""
        if not data:
            return ""
        encrypted = self.cipher.encrypt(data.encode())
        return base64.b64encode(encrypted).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        """Desencripta un string"""
        if not encrypted_data:
            return ""
        try:
            decoded = base64.b64decode(encrypted_data.encode())
            decrypted = self.cipher.decrypt(decoded)
            return decrypted.decode()
        except Exception as e:
            logger.error(f"Error decrypting data: {e}")
            return ""

# ============================================================================
# CONFIGURATION SERVICE
# ============================================================================

class ConfigurationService:
    """Servicio principal de configuración"""
    
    def __init__(self, db: Session):
        self.db = db
        self.encryption = EncryptionService()
    
    # ========================================================================
    # SMTP CONFIGURATION
    # ========================================================================
    
    def create_smtp_config(
        self,
        name: str,
        host: str,
        port: int,
        username: str,
        password: str,
        from_email: str,
        **kwargs
    ) -> SMTPConfiguration:
        """Crea una configuración SMTP"""
        
        # Encrypt password
        encrypted_password = self.encryption.encrypt(password)
        
        smtp_config = SMTPConfiguration(
            name=name,
            host=host,
            port=port,
            username=username,
            password_encrypted=encrypted_password,
            from_email=from_email,
            from_name=kwargs.get('from_name', 'Spirit Tours'),
            reply_to_email=kwargs.get('reply_to_email'),
            use_tls=kwargs.get('use_tls', True),
            use_ssl=kwargs.get('use_ssl', False),
            max_emails_per_hour=kwargs.get('max_emails_per_hour', 100),
            max_emails_per_day=kwargs.get('max_emails_per_day', 1000),
            is_active=kwargs.get('is_active', False),
            is_default=kwargs.get('is_default', False)
        )
        
        self.db.add(smtp_config)
        self.db.commit()
        self.db.refresh(smtp_config)
        
        # Log the creation
        self._log_configuration_change(
            configuration_key=f"smtp_{smtp_config.id}",
            category=ConfigurationCategory.SMTP,
            action="created",
            new_value={'name': name, 'host': host, 'port': port},
            user_id=None
        )
        
        return smtp_config
    
    def update_smtp_config(
        self,
        config_id: uuid.UUID,
        **updates
    ) -> SMTPConfiguration:
        """Actualiza una configuración SMTP"""
        
        config = self.db.query(SMTPConfiguration).filter(
            SMTPConfiguration.id == config_id
        ).first()
        
        if not config:
            raise ValueError(f"SMTP configuration not found: {config_id}")
        
        old_value = {
            'name': config.name,
            'host': config.host,
            'port': config.port
        }
        
        # Update fields
        for key, value in updates.items():
            if key == 'password' and value:
                config.password_encrypted = self.encryption.encrypt(value)
            elif hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(config)
        
        # Log the update
        self._log_configuration_change(
            configuration_key=f"smtp_{config_id}",
            category=ConfigurationCategory.SMTP,
            action="updated",
            old_value=old_value,
            new_value={k: v for k, v in updates.items() if k != 'password'},
            user_id=None
        )
        
        return config
    
    def get_smtp_config(self, config_id: uuid.UUID) -> SMTPConfiguration:
        """Obtiene una configuración SMTP"""
        return self.db.query(SMTPConfiguration).filter(
            SMTPConfiguration.id == config_id
        ).first()
    
    def list_smtp_configs(self) -> List[SMTPConfiguration]:
        """Lista todas las configuraciones SMTP"""
        return self.db.query(SMTPConfiguration).all()
    
    def get_default_smtp_config(self) -> Optional[SMTPConfiguration]:
        """Obtiene la configuración SMTP por defecto"""
        return self.db.query(SMTPConfiguration).filter(
            SMTPConfiguration.is_default == True,
            SMTPConfiguration.is_active == True
        ).first()
    
    def test_smtp_connection(
        self,
        config_id: uuid.UUID,
        test_email: Optional[str] = None
    ) -> Dict[str, Any]:
        """Prueba una conexión SMTP"""
        
        config = self.get_smtp_config(config_id)
        if not config:
            return {
                'success': False,
                'message': 'Configuration not found',
                'details': {}
            }
        
        # Decrypt password
        password = self.encryption.decrypt(config.password_encrypted)
        
        try:
            # Connect to SMTP server
            if config.use_ssl:
                server = smtplib.SMTP_SSL(config.host, config.port, timeout=10)
            else:
                server = smtplib.SMTP(config.host, config.port, timeout=10)
            
            if config.use_tls and not config.use_ssl:
                server.starttls()
            
            # Login
            server.login(config.username, password)
            
            # Send test email if requested
            if test_email:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = 'SMTP Configuration Test - Spirit Tours'
                msg['From'] = f"{config.from_name} <{config.from_email}>"
                msg['To'] = test_email
                
                html = """
                <html>
                <body>
                    <h2>SMTP Configuration Test</h2>
                    <p>This is a test email to verify SMTP configuration.</p>
                    <p><strong>Configuration:</strong> {}</p>
                    <p>If you received this email, your SMTP configuration is working correctly!</p>
                </body>
                </html>
                """.format(config.name)
                
                msg.attach(MIMEText(html, 'html'))
                server.send_message(msg)
            
            server.quit()
            
            # Update test result
            config.status = ConfigurationStatus.ACTIVE
            config.last_test_result = {
                'success': True,
                'message': 'Connection successful',
                'timestamp': datetime.now(timezone.utc).isoformat(),
                'test_email_sent': test_email is not None
            }
            config.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return {
                'success': True,
                'message': 'SMTP connection successful',
                'details': {
                    'host': config.host,
                    'port': config.port,
                    'test_email_sent': test_email is not None
                }
            }
        
        except Exception as e:
            logger.error(f"SMTP test failed: {e}")
            
            # Update test result
            config.status = ConfigurationStatus.ERROR
            config.last_test_result = {
                'success': False,
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            config.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return {
                'success': False,
                'message': f'SMTP connection failed: {str(e)}',
                'details': {
                    'host': config.host,
                    'port': config.port,
                    'error': str(e)
                }
            }
    
    def delete_smtp_config(self, config_id: uuid.UUID):
        """Elimina una configuración SMTP"""
        config = self.get_smtp_config(config_id)
        if config:
            self.db.delete(config)
            self.db.commit()
            
            self._log_configuration_change(
                configuration_key=f"smtp_{config_id}",
                category=ConfigurationCategory.SMTP,
                action="deleted",
                old_value={'name': config.name},
                user_id=None
            )
    
    # ========================================================================
    # AI PROVIDER CONFIGURATION
    # ========================================================================
    
    def create_ai_provider_config(
        self,
        provider: str,
        name: str,
        api_key: str,
        default_model: str,
        **kwargs
    ) -> AIProviderConfiguration:
        """Crea una configuración de proveedor de IA"""
        
        # Validate provider
        try:
            provider_enum = AIProvider(provider)
        except ValueError:
            raise ValueError(f"Invalid AI provider: {provider}")
        
        # Encrypt API key
        encrypted_api_key = self.encryption.encrypt(api_key)
        
        # Get template defaults
        template = AI_PROVIDER_TEMPLATES.get(provider_enum, {})
        
        ai_config = AIProviderConfiguration(
            provider=provider_enum,
            name=name,
            description=kwargs.get('description', template.get('description')),
            api_key_encrypted=encrypted_api_key,
            api_endpoint=kwargs.get('api_endpoint', template.get('api_endpoint')),
            organization_id=kwargs.get('organization_id'),
            project_id=kwargs.get('project_id'),
            default_model=default_model,
            available_models=kwargs.get('available_models', template.get('available_models', [])),
            model_settings=kwargs.get('model_settings', template.get('model_settings', {})),
            max_tokens_per_request=kwargs.get('max_tokens_per_request', 4000),
            max_requests_per_minute=kwargs.get('max_requests_per_minute', 60),
            monthly_budget_usd=kwargs.get('monthly_budget_usd'),
            supports_streaming=kwargs.get('supports_streaming', template.get('supports_streaming', True)),
            supports_functions=kwargs.get('supports_functions', template.get('supports_functions', False)),
            supports_vision=kwargs.get('supports_vision', template.get('supports_vision', False)),
            supports_audio=kwargs.get('supports_audio', template.get('supports_audio', False)),
            priority=kwargs.get('priority', 0),
            is_active=kwargs.get('is_active', False),
            is_default=kwargs.get('is_default', False)
        )
        
        self.db.add(ai_config)
        self.db.commit()
        self.db.refresh(ai_config)
        
        # Log the creation
        self._log_configuration_change(
            configuration_key=f"ai_provider_{ai_config.id}",
            category=ConfigurationCategory.AI_PROVIDER,
            action="created",
            new_value={'provider': provider, 'name': name, 'model': default_model},
            user_id=None
        )
        
        return ai_config
    
    def update_ai_provider_config(
        self,
        config_id: uuid.UUID,
        **updates
    ) -> AIProviderConfiguration:
        """Actualiza una configuración de proveedor de IA"""
        
        config = self.db.query(AIProviderConfiguration).filter(
            AIProviderConfiguration.id == config_id
        ).first()
        
        if not config:
            raise ValueError(f"AI provider configuration not found: {config_id}")
        
        # Update fields
        for key, value in updates.items():
            if key == 'api_key' and value:
                config.api_key_encrypted = self.encryption.encrypt(value)
            elif hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(config)
        
        return config
    
    def get_ai_provider_config(self, config_id: uuid.UUID) -> AIProviderConfiguration:
        """Obtiene una configuración de proveedor de IA"""
        return self.db.query(AIProviderConfiguration).filter(
            AIProviderConfiguration.id == config_id
        ).first()
    
    def list_ai_provider_configs(
        self,
        provider: Optional[str] = None,
        active_only: bool = False
    ) -> List[AIProviderConfiguration]:
        """Lista configuraciones de proveedores de IA"""
        query = self.db.query(AIProviderConfiguration)
        
        if provider:
            try:
                provider_enum = AIProvider(provider)
                query = query.filter(AIProviderConfiguration.provider == provider_enum)
            except ValueError:
                pass
        
        if active_only:
            query = query.filter(AIProviderConfiguration.is_active == True)
        
        return query.order_by(AIProviderConfiguration.priority.desc()).all()
    
    def get_default_ai_provider(self) -> Optional[AIProviderConfiguration]:
        """Obtiene el proveedor de IA por defecto"""
        return self.db.query(AIProviderConfiguration).filter(
            AIProviderConfiguration.is_default == True,
            AIProviderConfiguration.is_active == True
        ).first()
    
    def test_ai_provider_connection(
        self,
        config_id: uuid.UUID,
        test_prompt: str = "Hello, this is a test. Please respond with 'Test successful.'"
    ) -> Dict[str, Any]:
        """Prueba una conexión con proveedor de IA"""
        
        config = self.get_ai_provider_config(config_id)
        if not config:
            return {
                'success': False,
                'message': 'Configuration not found',
                'details': {}
            }
        
        # Decrypt API key
        api_key = self.encryption.decrypt(config.api_key_encrypted)
        
        try:
            # Test based on provider
            if config.provider == AIProvider.OPENAI:
                response = self._test_openai(api_key, config, test_prompt)
            elif config.provider == AIProvider.GOOGLE:
                response = self._test_google(api_key, config, test_prompt)
            elif config.provider == AIProvider.ANTHROPIC:
                response = self._test_anthropic(api_key, config, test_prompt)
            else:
                response = {
                    'success': False,
                    'message': f'Testing not implemented for {config.provider.value}'
                }
            
            # Update test result
            if response['success']:
                config.status = ConfigurationStatus.ACTIVE
            else:
                config.status = ConfigurationStatus.ERROR
            
            config.last_test_result = {
                **response,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            config.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return response
        
        except Exception as e:
            logger.error(f"AI provider test failed: {e}")
            
            config.status = ConfigurationStatus.ERROR
            config.last_test_result = {
                'success': False,
                'message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            config.updated_at = datetime.now(timezone.utc)
            self.db.commit()
            
            return {
                'success': False,
                'message': f'Test failed: {str(e)}',
                'details': {'error': str(e)}
            }
    
    def _test_openai(self, api_key: str, config: AIProviderConfiguration, prompt: str) -> Dict[str, Any]:
        """Test OpenAI connection"""
        try:
            import openai
            openai.api_key = api_key
            
            if config.api_endpoint:
                openai.api_base = config.api_endpoint
            
            response = openai.ChatCompletion.create(
                model=config.default_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50
            )
            
            return {
                'success': True,
                'message': 'OpenAI connection successful',
                'details': {
                    'model': config.default_model,
                    'response': response.choices[0].message.content,
                    'tokens_used': response.usage.total_tokens
                }
            }
        except Exception as e:
            return {
                'success': False,
                'message': str(e),
                'details': {}
            }
    
    def _test_google(self, api_key: str, config: AIProviderConfiguration, prompt: str) -> Dict[str, Any]:
        """Test Google Gemini connection"""
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            model = genai.GenerativeModel(config.default_model)
            response = model.generate_content(prompt)
            
            return {
                'success': True,
                'message': 'Google Gemini connection successful',
                'details': {
                    'model': config.default_model,
                    'response': response.text[:100]
                }
            }
        except Exception as e:
            return {
                'success': False,
                'message': str(e),
                'details': {}
            }
    
    def _test_anthropic(self, api_key: str, config: AIProviderConfiguration, prompt: str) -> Dict[str, Any]:
        """Test Anthropic Claude connection"""
        try:
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            
            response = client.messages.create(
                model=config.default_model,
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )
            
            return {
                'success': True,
                'message': 'Anthropic Claude connection successful',
                'details': {
                    'model': config.default_model,
                    'response': response.content[0].text[:100]
                }
            }
        except Exception as e:
            return {
                'success': False,
                'message': str(e),
                'details': {}
            }
    
    # ========================================================================
    # CONFIGURATION WIZARD
    # ========================================================================
    
    def get_wizard_progress(self, user_id: uuid.UUID) -> ConfigurationWizardProgress:
        """Obtiene el progreso del wizard"""
        progress = self.db.query(ConfigurationWizardProgress).filter(
            ConfigurationWizardProgress.user_id == user_id
        ).first()
        
        if not progress:
            # Create new wizard progress
            progress = ConfigurationWizardProgress(
                user_id=user_id,
                current_step=WizardStep.WELCOME
            )
            self.db.add(progress)
            self.db.commit()
            self.db.refresh(progress)
        
        return progress
    
    def update_wizard_step(
        self,
        user_id: uuid.UUID,
        step: WizardStep,
        step_data: Optional[Dict[str, Any]] = None
    ) -> ConfigurationWizardProgress:
        """Actualiza el paso del wizard"""
        progress = self.get_wizard_progress(user_id)
        
        # Mark current step as completed
        if progress.current_step.value not in progress.completed_steps:
            progress.completed_steps.append(progress.current_step.value)
        
        # Update to new step
        progress.current_step = step
        
        # Save step data
        if step_data:
            if not progress.wizard_data:
                progress.wizard_data = {}
            progress.wizard_data.update(step_data)
        
        progress.updated_at = datetime.now(timezone.utc)
        
        # Check if wizard is complete
        if step == WizardStep.COMPLETE:
            progress.is_completed = True
            progress.completed_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(progress)
        
        return progress
    
    def check_wizard_requirements(self) -> Dict[str, bool]:
        """Verifica los requisitos del wizard"""
        return {
            'smtp_configured': self.db.query(SMTPConfiguration).filter(
                SMTPConfiguration.is_active == True
            ).count() > 0,
            'ai_provider_configured': self.db.query(AIProviderConfiguration).filter(
                AIProviderConfiguration.is_active == True
            ).count() > 0,
            'has_training_modules': False,  # TODO: Check training modules
        }
    
    # ========================================================================
    # AUDIT LOGGING
    # ========================================================================
    
    def _log_configuration_change(
        self,
        configuration_key: str,
        category: ConfigurationCategory,
        action: str,
        new_value: Optional[Dict[str, Any]] = None,
        old_value: Optional[Dict[str, Any]] = None,
        user_id: Optional[uuid.UUID] = None,
        change_reason: Optional[str] = None
    ):
        """Registra un cambio de configuración"""
        
        user_info = {}
        if user_id:
            user = self.db.query(User).filter(User.id == user_id).first()
            if user:
                user_info = {
                    'user_name': user.full_name or user.username,
                    'user_email': user.email
                }
        
        log = ConfigurationAuditLog(
            configuration_key=configuration_key,
            category=category,
            action=action,
            old_value=old_value,
            new_value=new_value,
            change_reason=change_reason,
            user_id=user_id,
            **user_info
        )
        
        self.db.add(log)
        self.db.commit()
    
    def get_configuration_audit_log(
        self,
        category: Optional[ConfigurationCategory] = None,
        limit: int = 100
    ) -> List[ConfigurationAuditLog]:
        """Obtiene el audit log de configuraciones"""
        query = self.db.query(ConfigurationAuditLog)
        
        if category:
            query = query.filter(ConfigurationAuditLog.category == category)
        
        return query.order_by(
            ConfigurationAuditLog.created_at.desc()
        ).limit(limit).all()
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def get_provider_templates(self) -> Dict[str, Any]:
        """Obtiene los templates de proveedores de IA"""
        return {
            provider.value: {
                **template,
                'provider_key': provider.value
            }
            for provider, template in AI_PROVIDER_TEMPLATES.items()
        }
    
    def get_system_status(self) -> Dict[str, Any]:
        """Obtiene el estado general del sistema"""
        return {
            'smtp': {
                'total_configs': self.db.query(SMTPConfiguration).count(),
                'active_configs': self.db.query(SMTPConfiguration).filter(
                    SMTPConfiguration.is_active == True
                ).count(),
                'has_default': self.get_default_smtp_config() is not None
            },
            'ai_providers': {
                'total_configs': self.db.query(AIProviderConfiguration).count(),
                'active_configs': self.db.query(AIProviderConfiguration).filter(
                    AIProviderConfiguration.is_active == True
                ).count(),
                'has_default': self.get_default_ai_provider() is not None,
                'providers_configured': [
                    config.provider.value
                    for config in self.list_ai_provider_configs(active_only=True)
                ]
            },
            'wizard_completed': self.db.query(ConfigurationWizardProgress).filter(
                ConfigurationWizardProgress.is_completed == True
            ).count() > 0
        }
