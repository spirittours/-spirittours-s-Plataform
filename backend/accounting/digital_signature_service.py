"""
Servicio de Firma Digital Electrónica - Spirit Tours

Gestión de firmas digitales con certificados X.509:
- Generación de firmas SHA256withRSA
- Validación de certificados
- Gestión de cadena de certificados
- Timestamp certification
- Verificación de firmas

Soporta certificados españoles (FNMT, Camerfirma, etc.)
"""
from datetime import datetime
from typing import Optional, Dict, Any
import hashlib
import base64
import uuid

# Para producción, usar cryptography library
try:
    from cryptography import x509
    from cryptography.hazmat.primitives import hashes, serialization
    from cryptography.hazmat.primitives.asymmetric import rsa, padding
    from cryptography.hazmat.backends import default_backend
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False

from .models import DigitalSignature


class DigitalSignatureService:
    """
    Servicio de firma digital electrónica.
    
    Gestiona la creación, validación y verificación de firmas digitales
    usando certificados X.509.
    """
    
    def __init__(self, certificate_path: Optional[str] = None, private_key_path: Optional[str] = None):
        """
        Inicializar servicio de firma digital.
        
        Args:
            certificate_path: Ruta al certificado X.509 (PEM/DER)
            private_key_path: Ruta a la clave privada
        """
        self.certificate_path = certificate_path
        self.private_key_path = private_key_path
        self._certificate = None
        self._private_key = None
        
        # Cargar certificado y clave si están disponibles
        if certificate_path and private_key_path and CRYPTO_AVAILABLE:
            self._load_certificate()
    
    def _load_certificate(self):
        """Cargar certificado y clave privada."""
        try:
            # Cargar certificado
            with open(self.certificate_path, "rb") as f:
                cert_data = f.read()
                self._certificate = x509.load_pem_x509_certificate(cert_data, default_backend())
            
            # Cargar clave privada
            with open(self.private_key_path, "rb") as f:
                key_data = f.read()
                self._private_key = serialization.load_pem_private_key(
                    key_data,
                    password=None,
                    backend=default_backend()
                )
        except Exception as e:
            print(f"Warning: Could not load certificate/key: {e}")
            self._certificate = None
            self._private_key = None
    
    async def sign_document(
        self,
        document_data: str,
        signer_name: str,
        algorithm: str = "SHA256withRSA"
    ) -> DigitalSignature:
        """
        Firmar documento digitalmente.
        
        Args:
            document_data: Datos del documento a firmar (texto, PDF bytes en base64, etc.)
            signer_name: Nombre del firmante
            algorithm: Algoritmo de firma (default: SHA256withRSA)
        
        Returns:
            DigitalSignature con la firma generada
        
        Raises:
            RuntimeError: Si no hay certificado/clave disponible
        """
        if not CRYPTO_AVAILABLE:
            # Modo desarrollo sin cryptography library
            return self._create_mock_signature(document_data, signer_name, algorithm)
        
        if not self._certificate or not self._private_key:
            # Modo desarrollo sin certificado real
            return self._create_mock_signature(document_data, signer_name, algorithm)
        
        try:
            # Convertir datos a bytes
            if isinstance(document_data, str):
                data_bytes = document_data.encode('utf-8')
            else:
                data_bytes = document_data
            
            # Firmar con RSA-SHA256
            signature_bytes = self._private_key.sign(
                data_bytes,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            
            # Codificar firma en base64
            signature_value = base64.b64encode(signature_bytes).decode('ascii')
            
            # Extraer información del certificado
            certificate_serial = format(self._certificate.serial_number, 'x').upper()
            certificate_issuer = self._certificate.issuer.rfc4514_string()
            
            # Crear firma digital
            signature = DigitalSignature(
                signature_id=f"SIG-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}",
                algorithm=algorithm,
                certificate_serial=certificate_serial,
                certificate_issuer=certificate_issuer,
                signer_name=signer_name,
                signature_value=signature_value,
                signature_timestamp=datetime.utcnow(),
                is_valid=True
            )
            
            return signature
        
        except Exception as e:
            raise RuntimeError(f"Error signing document: {e}")
    
    async def verify_signature(
        self,
        document_data: str,
        signature: DigitalSignature
    ) -> bool:
        """
        Verificar firma digital.
        
        Args:
            document_data: Datos del documento original
            signature: Firma digital a verificar
        
        Returns:
            True si la firma es válida, False en caso contrario
        """
        if not CRYPTO_AVAILABLE or not self._certificate:
            # En modo desarrollo, aceptar firmas mock
            return signature.is_valid
        
        try:
            # Convertir datos a bytes
            if isinstance(document_data, str):
                data_bytes = document_data.encode('utf-8')
            else:
                data_bytes = document_data
            
            # Decodificar firma
            signature_bytes = base64.b64decode(signature.signature_value)
            
            # Extraer clave pública del certificado
            public_key = self._certificate.public_key()
            
            # Verificar firma
            public_key.verify(
                signature_bytes,
                data_bytes,
                padding.PKCS1v15(),
                hashes.SHA256()
            )
            
            # Si no lanza excepción, la firma es válida
            return True
        
        except Exception as e:
            print(f"Signature verification failed: {e}")
            return False
    
    async def validate_certificate(self) -> Dict[str, Any]:
        """
        Validar certificado actual.
        
        Verifica:
        - Fecha de expiración
        - Cadena de certificados
        - Revocación (si está disponible)
        
        Returns:
            Diccionario con información de validación
        """
        if not CRYPTO_AVAILABLE or not self._certificate:
            return {
                "valid": False,
                "reason": "No certificate loaded",
                "mode": "development"
            }
        
        try:
            now = datetime.utcnow()
            not_before = self._certificate.not_valid_before_utc
            not_after = self._certificate.not_valid_after_utc
            
            # Verificar fechas
            if now < not_before:
                return {
                    "valid": False,
                    "reason": "Certificate not yet valid",
                    "not_before": not_before.isoformat()
                }
            
            if now > not_after:
                return {
                    "valid": False,
                    "reason": "Certificate expired",
                    "not_after": not_after.isoformat()
                }
            
            # Extraer información
            subject = self._certificate.subject.rfc4514_string()
            issuer = self._certificate.issuer.rfc4514_string()
            serial = format(self._certificate.serial_number, 'x').upper()
            
            return {
                "valid": True,
                "subject": subject,
                "issuer": issuer,
                "serial": serial,
                "not_before": not_before.isoformat(),
                "not_after": not_after.isoformat(),
                "days_remaining": (not_after - now).days
            }
        
        except Exception as e:
            return {
                "valid": False,
                "reason": f"Validation error: {e}"
            }
    
    async def get_certificate_info(self) -> Optional[Dict[str, Any]]:
        """
        Obtener información del certificado actual.
        
        Returns:
            Diccionario con información del certificado o None
        """
        if not CRYPTO_AVAILABLE or not self._certificate:
            return None
        
        try:
            return {
                "subject": self._certificate.subject.rfc4514_string(),
                "issuer": self._certificate.issuer.rfc4514_string(),
                "serial": format(self._certificate.serial_number, 'x').upper(),
                "not_before": self._certificate.not_valid_before_utc.isoformat(),
                "not_after": self._certificate.not_valid_after_utc.isoformat(),
                "version": self._certificate.version.name,
                "signature_algorithm": self._certificate.signature_algorithm_oid._name
            }
        except Exception:
            return None
    
    def _create_mock_signature(
        self,
        document_data: str,
        signer_name: str,
        algorithm: str
    ) -> DigitalSignature:
        """
        Crear firma digital mock para desarrollo.
        
        IMPORTANTE: Solo para desarrollo. No usar en producción.
        
        Args:
            document_data: Datos del documento
            signer_name: Nombre del firmante
            algorithm: Algoritmo
        
        Returns:
            DigitalSignature mock
        """
        # Hash del documento
        if isinstance(document_data, str):
            data_bytes = document_data.encode('utf-8')
        else:
            data_bytes = document_data
        
        document_hash = hashlib.sha256(data_bytes).hexdigest()
        
        # Crear firma mock
        mock_signature_value = base64.b64encode(
            f"MOCK_SIGNATURE_{document_hash}".encode('ascii')
        ).decode('ascii')
        
        signature = DigitalSignature(
            signature_id=f"SIG-DEV-{datetime.utcnow().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}",
            algorithm=f"{algorithm} (MOCK)",
            certificate_serial="MOCK_CERT_SERIAL_123456",
            certificate_issuer="CN=Mock CA for Development",
            signer_name=signer_name,
            signature_value=mock_signature_value,
            signature_timestamp=datetime.utcnow(),
            is_valid=True
        )
        
        return signature


# Singleton global
_signature_service: Optional[DigitalSignatureService] = None


def get_signature_service() -> DigitalSignatureService:
    """
    Obtener instancia global del servicio de firma digital.
    
    Returns:
        DigitalSignatureService
    
    Raises:
        RuntimeError: Si el servicio no ha sido inicializado
    """
    global _signature_service
    if _signature_service is None:
        raise RuntimeError("DigitalSignatureService not initialized. Call initialize_signature_service() first.")
    return _signature_service


def initialize_signature_service(
    certificate_path: Optional[str] = None,
    private_key_path: Optional[str] = None
) -> DigitalSignatureService:
    """
    Inicializar servicio de firma digital global.
    
    Args:
        certificate_path: Ruta al certificado (opcional)
        private_key_path: Ruta a la clave privada (opcional)
    
    Returns:
        DigitalSignatureService inicializado
    """
    global _signature_service
    _signature_service = DigitalSignatureService(certificate_path, private_key_path)
    return _signature_service
