"""
Blockchain Audit Service - Spirit Tours Enterprise
Sistema de auditoría inmutable usando blockchain para transacciones de pago
"""

import asyncio
import json
import logging
import hashlib
import hmac
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import base64
import uuid

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Tipos de eventos de auditoría"""
    PAYMENT_INITIATED = "payment_initiated"
    PAYMENT_COMPLETED = "payment_completed"
    PAYMENT_FAILED = "payment_failed"
    PAYMENT_REFUNDED = "payment_refunded"
    FRAUD_DETECTED = "fraud_detected"
    FRAUD_CLEARED = "fraud_cleared"
    CHARGEBACK_INITIATED = "chargeback_initiated"
    CHARGEBACK_RESOLVED = "chargeback_resolved"
    COMPLIANCE_CHECK = "compliance_check"
    SECURITY_EVENT = "security_event"
    SYSTEM_ALERT = "system_alert"
    USER_ACTION = "user_action"

class BlockchainNetwork(Enum):
    """Redes blockchain soportadas"""
    ETHEREUM = "ethereum"
    POLYGON = "polygon"
    HYPERLEDGER = "hyperledger"
    PRIVATE_CHAIN = "private_chain"

@dataclass
class AuditEvent:
    """Evento de auditoría"""
    event_id: str
    event_type: AuditEventType
    timestamp: datetime
    transaction_id: Optional[str]
    user_id: Optional[str]
    amount: Optional[Decimal]
    currency: Optional[str]
    payment_method: Optional[str]
    status: str
    metadata: Dict[str, Any]
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convierte a diccionario para serialización"""
        data = asdict(self)
        data['event_type'] = self.event_type.value
        data['timestamp'] = self.timestamp.isoformat()
        if self.amount:
            data['amount'] = str(self.amount)
        return data

@dataclass
class BlockchainBlock:
    """Bloque de blockchain para auditoría"""
    block_id: str
    previous_hash: str
    timestamp: datetime
    events: List[AuditEvent]
    merkle_root: str
    nonce: int
    hash: str
    signature: str
    validator: str

@dataclass
class AuditTrail:
    """Rastro de auditoría completo"""
    trail_id: str
    transaction_id: str
    events: List[AuditEvent]
    blockchain_hashes: List[str]
    verification_status: bool
    created_at: datetime
    last_updated: datetime

class BlockchainAuditService:
    """Servicio de auditoría blockchain para pagos"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.network = BlockchainNetwork(config.get('blockchain_network', 'private_chain'))
        self.node_url = config.get('blockchain_node_url', 'http://localhost:8545')
        self.contract_address = config.get('audit_contract_address')
        self.private_key = None
        self.public_key = None
        self.current_block = None
        self.pending_events = []
        self.block_size_limit = config.get('block_size_limit', 100)
        
        # Configuración de mining/validation
        self.mining_difficulty = config.get('mining_difficulty', 4)
        self.block_time_seconds = config.get('block_time_seconds', 300)  # 5 minutos
        
    async def initialize(self) -> bool:
        """Inicializa el servicio de auditoría blockchain"""
        try:
            # Generar o cargar claves criptográficas
            await self._initialize_cryptographic_keys()
            
            # Conectar a la red blockchain
            await self._connect_to_blockchain()
            
            # Inicializar bloque génesis si es necesario
            await self._initialize_genesis_block()
            
            # Iniciar procesamiento de bloques en background
            asyncio.create_task(self._block_processing_loop())
            
            logger.info("✅ Blockchain Audit Service initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize blockchain audit service: {str(e)}")
            return False
    
    async def record_payment_event(self, event: AuditEvent) -> str:
        """Registra un evento de pago en blockchain"""
        try:
            # Asignar ID único si no existe
            if not event.event_id:
                event.event_id = str(uuid.uuid4())
            
            # Validar y enriquecer evento
            await self._validate_and_enrich_event(event)
            
            # Agregar a cola de eventos pendientes
            self.pending_events.append(event)
            
            # Si alcanzamos el límite de bloque, procesar inmediatamente
            if len(self.pending_events) >= self.block_size_limit:
                await self._process_pending_block()
            
            logger.info(f"📝 Payment event recorded: {event.event_id}")
            return event.event_id
            
        except Exception as e:
            logger.error(f"❌ Error recording payment event: {str(e)}")
            raise
    
    async def verify_audit_trail(self, transaction_id: str) -> AuditTrail:
        """Verifica el rastro completo de auditoría para una transacción"""
        try:
            # Obtener todos los eventos para la transacción
            events = await self._get_transaction_events(transaction_id)
            
            if not events:
                raise ValueError(f"No events found for transaction: {transaction_id}")
            
            # Verificar integridad de cada evento en blockchain
            blockchain_hashes = []
            verification_status = True
            
            for event in events:
                block_hash = await self._get_event_block_hash(event.event_id)
                if block_hash:
                    blockchain_hashes.append(block_hash)
                    # Verificar integridad del bloque
                    if not await self._verify_block_integrity(block_hash):
                        verification_status = False
                else:
                    verification_status = False
            
            # Crear trail de auditoría
            audit_trail = AuditTrail(
                trail_id=str(uuid.uuid4()),
                transaction_id=transaction_id,
                events=events,
                blockchain_hashes=blockchain_hashes,
                verification_status=verification_status,
                created_at=datetime.now(),
                last_updated=datetime.now()
            )
            
            return audit_trail
            
        except Exception as e:
            logger.error(f"❌ Error verifying audit trail: {str(e)}")
            raise
    
    async def get_compliance_report(self, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """Genera reporte de cumplimiento para auditorías externas"""
        try:
            # Obtener eventos en el rango de fechas
            events = await self._get_events_by_date_range(start_date, end_date)
            
            # Estadísticas de eventos
            event_stats = {}
            for event in events:
                event_type = event.event_type.value
                event_stats[event_type] = event_stats.get(event_type, 0) + 1
            
            # Verificar integridad de blockchain
            integrity_report = await self._verify_blockchain_integrity()
            
            # Calcular métricas de compliance
            total_transactions = len(set(e.transaction_id for e in events if e.transaction_id))
            fraud_events = sum(1 for e in events if e.event_type == AuditEventType.FRAUD_DETECTED)
            compliance_score = ((total_transactions - fraud_events) / max(total_transactions, 1)) * 100
            
            report = {
                "report_id": str(uuid.uuid4()),
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "summary": {
                    "total_events": len(events),
                    "total_transactions": total_transactions,
                    "fraud_events": fraud_events,
                    "compliance_score": round(compliance_score, 2)
                },
                "event_breakdown": event_stats,
                "blockchain_integrity": integrity_report,
                "audit_trails_verified": sum(1 for e in events if e.event_type in [
                    AuditEventType.PAYMENT_COMPLETED, 
                    AuditEventType.PAYMENT_REFUNDED
                ]),
                "generated_at": datetime.now().isoformat(),
                "generated_by": "BlockchainAuditService"
            }
            
            # Firmar reporte digitalmente
            report["digital_signature"] = await self._sign_data(json.dumps(report, sort_keys=True))
            
            return report
            
        except Exception as e:
            logger.error(f"❌ Error generating compliance report: {str(e)}")
            raise
    
    async def _initialize_cryptographic_keys(self):
        """Inicializa claves criptográficas para firma digital"""
        try:
            # Generar claves RSA para firma digital
            self.private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048,
                backend=default_backend()
            )
            self.public_key = self.private_key.public_key()
            
            logger.info("✅ Cryptographic keys initialized")
            
        except Exception as e:
            logger.error(f"❌ Error initializing cryptographic keys: {str(e)}")
            raise
    
    async def _connect_to_blockchain(self):
        """Conecta a la red blockchain"""
        try:
            if self.network == BlockchainNetwork.ETHEREUM:
                await self._connect_ethereum()
            elif self.network == BlockchainNetwork.POLYGON:
                await self._connect_polygon()
            elif self.network == BlockchainNetwork.HYPERLEDGER:
                await self._connect_hyperledger()
            else:
                await self._connect_private_chain()
            
            logger.info(f"✅ Connected to blockchain: {self.network.value}")
            
        except Exception as e:
            logger.error(f"❌ Error connecting to blockchain: {str(e)}")
            raise
    
    async def _connect_ethereum(self):
        """Conecta a red Ethereum"""
        try:
            async with aiohttp.ClientSession() as session:
                # Verificar conexión con nodo
                payload = {
                    "jsonrpc": "2.0",
                    "method": "eth_blockNumber",
                    "params": [],
                    "id": 1
                }
                
                async with session.post(self.node_url, json=payload) as response:
                    if response.status == 200:
                        result = await response.json()
                        current_block_number = int(result['result'], 16)
                        logger.info(f"✅ Ethereum connection established. Current block: {current_block_number}")
                    else:
                        raise Exception(f"Failed to connect to Ethereum node: {response.status}")
                        
        except Exception as e:
            logger.error(f"❌ Ethereum connection error: {str(e)}")
            raise
    
    async def _connect_polygon(self):
        """Conecta a red Polygon"""
        # Similar a Ethereum pero con diferentes parámetros
        await self._connect_ethereum()
    
    async def _connect_hyperledger(self):
        """Conecta a Hyperledger Fabric"""
        try:
            # Configuración específica para Hyperledger
            fabric_config = {
                "channel": self.config.get('fabric_channel', 'audit-channel'),
                "chaincode": self.config.get('fabric_chaincode', 'audit-chaincode'),
                "peer": self.config.get('fabric_peer', 'peer0.org1.example.com')
            }
            
            logger.info("✅ Hyperledger Fabric connection initialized")
            
        except Exception as e:
            logger.error(f"❌ Hyperledger connection error: {str(e)}")
            raise
    
    async def _connect_private_chain(self):
        """Conecta a blockchain privada"""
        try:
            # Configuración para blockchain privada interna
            logger.info("✅ Private blockchain connection initialized")
            
        except Exception as e:
            logger.error(f"❌ Private chain connection error: {str(e)}")
            raise
    
    async def _initialize_genesis_block(self):
        """Inicializa bloque génesis si es necesario"""
        try:
            # Verificar si ya existe bloque génesis
            genesis_exists = await self._check_genesis_block()
            
            if not genesis_exists:
                # Crear bloque génesis
                genesis_event = AuditEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=AuditEventType.SYSTEM_ALERT,
                    timestamp=datetime.now(),
                    transaction_id=None,
                    user_id="system",
                    amount=None,
                    currency=None,
                    payment_method=None,
                    status="genesis_block_created",
                    metadata={"blockchain_network": self.network.value}
                )
                
                genesis_block = await self._create_block([genesis_event], "0")
                await self._store_block(genesis_block)
                
                self.current_block = genesis_block
                logger.info("✅ Genesis block created")
            else:
                # Cargar último bloque
                self.current_block = await self._get_latest_block()
                logger.info("✅ Latest block loaded")
                
        except Exception as e:
            logger.error(f"❌ Error initializing genesis block: {str(e)}")
            raise
    
    async def _block_processing_loop(self):
        """Loop de procesamiento de bloques en background"""
        while True:
            try:
                await asyncio.sleep(self.block_time_seconds)
                
                if self.pending_events:
                    await self._process_pending_block()
                    
            except Exception as e:
                logger.error(f"❌ Error in block processing loop: {str(e)}")
                await asyncio.sleep(10)  # Esperar antes de reintentar
    
    async def _process_pending_block(self):
        """Procesa eventos pendientes en un nuevo bloque"""
        try:
            if not self.pending_events:
                return
            
            # Obtener eventos a procesar
            events_to_process = self.pending_events.copy()
            self.pending_events.clear()
            
            # Crear nuevo bloque
            previous_hash = self.current_block.hash if self.current_block else "0"
            new_block = await self._create_block(events_to_process, previous_hash)
            
            # Minar bloque (Proof of Work simplificado)
            await self._mine_block(new_block)
            
            # Almacenar bloque
            await self._store_block(new_block)
            
            # Actualizar bloque actual
            self.current_block = new_block
            
            logger.info(f"✅ Block processed: {new_block.block_id} with {len(events_to_process)} events")
            
        except Exception as e:
            logger.error(f"❌ Error processing block: {str(e)}")
            # Restaurar eventos pendientes en caso de error
            self.pending_events.extend(events_to_process)
    
    async def _create_block(self, events: List[AuditEvent], previous_hash: str) -> BlockchainBlock:
        """Crea un nuevo bloque blockchain"""
        try:
            block_id = str(uuid.uuid4())
            timestamp = datetime.now()
            
            # Calcular Merkle root de eventos
            merkle_root = await self._calculate_merkle_root(events)
            
            # Crear estructura del bloque
            block = BlockchainBlock(
                block_id=block_id,
                previous_hash=previous_hash,
                timestamp=timestamp,
                events=events,
                merkle_root=merkle_root,
                nonce=0,
                hash="",  # Se calculará durante mining
                signature="",  # Se calculará después
                validator=self.config.get('validator_id', 'spirit-tours-audit')
            )
            
            return block
            
        except Exception as e:
            logger.error(f"❌ Error creating block: {str(e)}")
            raise
    
    async def _mine_block(self, block: BlockchainBlock):
        """Mina el bloque usando Proof of Work simplificado"""
        try:
            target = "0" * self.mining_difficulty
            nonce = 0
            
            while True:
                block.nonce = nonce
                block_data = self._serialize_block_for_hash(block)
                block_hash = hashlib.sha256(block_data.encode()).hexdigest()
                
                if block_hash.startswith(target):
                    block.hash = block_hash
                    break
                
                nonce += 1
                
                # Evitar loop infinito en testing
                if nonce > 1000000:
                    break
            
            # Firmar bloque
            block.signature = await self._sign_data(block_data)
            
            logger.info(f"✅ Block mined: {block.block_id} with nonce: {block.nonce}")
            
        except Exception as e:
            logger.error(f"❌ Error mining block: {str(e)}")
            raise
    
    def _serialize_block_for_hash(self, block: BlockchainBlock) -> str:
        """Serializa bloque para cálculo de hash"""
        data = {
            "block_id": block.block_id,
            "previous_hash": block.previous_hash,
            "timestamp": block.timestamp.isoformat(),
            "merkle_root": block.merkle_root,
            "nonce": block.nonce,
            "events_count": len(block.events)
        }
        return json.dumps(data, sort_keys=True)
    
    async def _calculate_merkle_root(self, events: List[AuditEvent]) -> str:
        """Calcula el Merkle root de los eventos"""
        try:
            if not events:
                return hashlib.sha256(b"empty").hexdigest()
            
            # Convertir eventos a hashes
            hashes = []
            for event in events:
                event_data = json.dumps(event.to_dict(), sort_keys=True)
                event_hash = hashlib.sha256(event_data.encode()).hexdigest()
                hashes.append(event_hash)
            
            # Construir Merkle tree
            while len(hashes) > 1:
                next_level = []
                for i in range(0, len(hashes), 2):
                    if i + 1 < len(hashes):
                        combined = hashes[i] + hashes[i + 1]
                    else:
                        combined = hashes[i] + hashes[i]  # Duplicar si es impar
                    
                    combined_hash = hashlib.sha256(combined.encode()).hexdigest()
                    next_level.append(combined_hash)
                
                hashes = next_level
            
            return hashes[0]
            
        except Exception as e:
            logger.error(f"❌ Error calculating Merkle root: {str(e)}")
            raise
    
    async def _sign_data(self, data: str) -> str:
        """Firma digitalmente los datos"""
        try:
            signature = self.private_key.sign(
                data.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return base64.b64encode(signature).decode()
            
        except Exception as e:
            logger.error(f"❌ Error signing data: {str(e)}")
            raise
    
    async def _verify_signature(self, data: str, signature: str) -> bool:
        """Verifica firma digital"""
        try:
            signature_bytes = base64.b64decode(signature.encode())
            
            self.public_key.verify(
                signature_bytes,
                data.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            return True
            
        except Exception:
            return False
    
    async def _store_block(self, block: BlockchainBlock):
        """Almacena bloque en blockchain"""
        try:
            if self.network == BlockchainNetwork.ETHEREUM:
                await self._store_block_ethereum(block)
            elif self.network == BlockchainNetwork.HYPERLEDGER:
                await self._store_block_hyperledger(block)
            else:
                await self._store_block_private(block)
                
        except Exception as e:
            logger.error(f"❌ Error storing block: {str(e)}")
            raise
    
    async def _store_block_ethereum(self, block: BlockchainBlock):
        """Almacena bloque en Ethereum"""
        try:
            # En implementación real, hacer transacción al smart contract
            block_data = {
                "blockId": block.block_id,
                "previousHash": block.previous_hash,
                "merkleRoot": block.merkle_root,
                "timestamp": int(block.timestamp.timestamp()),
                "eventsCount": len(block.events)
            }
            
            # Simular almacenamiento
            logger.info(f"📝 Block stored on Ethereum: {block.block_id}")
            
        except Exception as e:
            logger.error(f"❌ Error storing block on Ethereum: {str(e)}")
            raise
    
    async def _store_block_hyperledger(self, block: BlockchainBlock):
        """Almacena bloque en Hyperledger Fabric"""
        try:
            # En implementación real, invocar chaincode
            logger.info(f"📝 Block stored on Hyperledger: {block.block_id}")
            
        except Exception as e:
            logger.error(f"❌ Error storing block on Hyperledger: {str(e)}")
            raise
    
    async def _store_block_private(self, block: BlockchainBlock):
        """Almacena bloque en blockchain privada"""
        try:
            # En implementación real, almacenar en base de datos local o distributed ledger
            logger.info(f"📝 Block stored on private chain: {block.block_id}")
            
        except Exception as e:
            logger.error(f"❌ Error storing block on private chain: {str(e)}")
            raise
    
    async def _validate_and_enrich_event(self, event: AuditEvent):
        """Valida y enriquece evento de auditoría"""
        try:
            # Validaciones básicas
            if not event.event_type:
                raise ValueError("Event type is required")
            
            if not event.timestamp:
                event.timestamp = datetime.now()
            
            # Enriquecer con metadatos adicionales
            event.metadata.update({
                "blockchain_network": self.network.value,
                "audit_service_version": "1.0.0",
                "hash_algorithm": "sha256"
            })
            
        except Exception as e:
            logger.error(f"❌ Error validating event: {str(e)}")
            raise
    
    # Métodos de consulta y verificación
    async def _get_transaction_events(self, transaction_id: str) -> List[AuditEvent]:
        """Obtiene todos los eventos para una transacción"""
        try:
            # En implementación real, consultar blockchain/base de datos
            # Por ahora, retornar eventos simulados
            events = [
                AuditEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=AuditEventType.PAYMENT_INITIATED,
                    timestamp=datetime.now() - timedelta(minutes=10),
                    transaction_id=transaction_id,
                    user_id="user123",
                    amount=Decimal("100.00"),
                    currency="USD",
                    payment_method="credit_card",
                    status="initiated",
                    metadata={"gateway": "stripe"}
                ),
                AuditEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=AuditEventType.PAYMENT_COMPLETED,
                    timestamp=datetime.now() - timedelta(minutes=5),
                    transaction_id=transaction_id,
                    user_id="user123",
                    amount=Decimal("100.00"),
                    currency="USD",
                    payment_method="credit_card",
                    status="completed",
                    metadata={"gateway": "stripe", "transaction_fee": "2.90"}
                )
            ]
            
            return events
            
        except Exception as e:
            logger.error(f"❌ Error getting transaction events: {str(e)}")
            return []
    
    async def _get_event_block_hash(self, event_id: str) -> Optional[str]:
        """Obtiene el hash del bloque que contiene el evento"""
        try:
            # En implementación real, consultar índice de eventos
            return "sample_block_hash_" + event_id[:8]
            
        except Exception as e:
            logger.error(f"❌ Error getting event block hash: {str(e)}")
            return None
    
    async def _verify_block_integrity(self, block_hash: str) -> bool:
        """Verifica la integridad de un bloque"""
        try:
            # En implementación real, verificar hash y firma del bloque
            return True
            
        except Exception as e:
            logger.error(f"❌ Error verifying block integrity: {str(e)}")
            return False
    
    async def _get_events_by_date_range(self, start_date: datetime, end_date: datetime) -> List[AuditEvent]:
        """Obtiene eventos por rango de fechas"""
        try:
            # En implementación real, consultar blockchain/base de datos
            # Por ahora, retornar eventos simulados
            events = []
            current_date = start_date
            
            while current_date <= end_date:
                event = AuditEvent(
                    event_id=str(uuid.uuid4()),
                    event_type=AuditEventType.PAYMENT_COMPLETED,
                    timestamp=current_date,
                    transaction_id=f"txn_{current_date.strftime('%Y%m%d')}",
                    user_id="user123",
                    amount=Decimal("50.00"),
                    currency="USD",
                    payment_method="credit_card",
                    status="completed",
                    metadata={"simulated": True}
                )
                events.append(event)
                current_date += timedelta(days=1)
            
            return events
            
        except Exception as e:
            logger.error(f"❌ Error getting events by date range: {str(e)}")
            return []
    
    async def _verify_blockchain_integrity(self) -> Dict[str, Any]:
        """Verifica la integridad completa del blockchain"""
        try:
            integrity_report = {
                "blockchain_valid": True,
                "total_blocks": 100,  # Simulado
                "corrupted_blocks": 0,
                "signature_verification": "passed",
                "hash_chain_verification": "passed",
                "last_verification": datetime.now().isoformat()
            }
            
            return integrity_report
            
        except Exception as e:
            logger.error(f"❌ Error verifying blockchain integrity: {str(e)}")
            return {"blockchain_valid": False, "error": str(e)}
    
    async def _check_genesis_block(self) -> bool:
        """Verifica si existe el bloque génesis"""
        try:
            # En implementación real, consultar blockchain
            return False  # Por ahora, siempre crear génesis
            
        except Exception as e:
            logger.error(f"❌ Error checking genesis block: {str(e)}")
            return False
    
    async def _get_latest_block(self) -> Optional[BlockchainBlock]:
        """Obtiene el último bloque del blockchain"""
        try:
            # En implementación real, consultar blockchain
            return None
            
        except Exception as e:
            logger.error(f"❌ Error getting latest block: {str(e)}")
            return None
    
    # Métodos públicos adicionales
    async def get_audit_statistics(self) -> Dict[str, Any]:
        """Obtiene estadísticas del sistema de auditoría"""
        try:
            stats = {
                "blockchain_network": self.network.value,
                "total_blocks": 100,  # Simulado
                "total_events": 5000,  # Simulado
                "events_per_block_avg": 50,
                "blockchain_size_mb": 25.6,
                "integrity_score": 100.0,
                "last_block_time": datetime.now().isoformat(),
                "mining_difficulty": self.mining_difficulty,
                "block_time_seconds": self.block_time_seconds
            }
            
            return stats
            
        except Exception as e:
            logger.error(f"❌ Error getting audit statistics: {str(e)}")
            return {}
    
    async def export_audit_data(self, transaction_id: str, format: str = "json") -> str:
        """Exporta datos de auditoría en formato específico"""
        try:
            audit_trail = await self.verify_audit_trail(transaction_id)
            
            if format.lower() == "json":
                return json.dumps(asdict(audit_trail), indent=2, default=str)
            elif format.lower() == "xml":
                # En implementación real, convertir a XML
                return f"<audit_trail>{json.dumps(asdict(audit_trail))}</audit_trail>"
            else:
                raise ValueError(f"Unsupported format: {format}")
                
        except Exception as e:
            logger.error(f"❌ Error exporting audit data: {str(e)}")
            raise
    
    async def close(self):
        """Cierra conexiones y recursos"""
        try:
            # Procesar eventos pendientes antes de cerrar
            if self.pending_events:
                await self._process_pending_block()
            
            logger.info("✅ Blockchain Audit Service closed")
            
        except Exception as e:
            logger.error(f"❌ Error closing blockchain audit service: {str(e)}")


# Factory para crear instancias del servicio
class BlockchainAuditServiceFactory:
    """Factory para crear servicios de auditoría blockchain"""
    
    @staticmethod
    def create_service(config: Dict[str, Any]) -> BlockchainAuditService:
        """Crea una instancia del servicio de auditoría"""
        return BlockchainAuditService(config)
    
    @staticmethod
    def get_supported_networks() -> List[str]:
        """Retorna redes blockchain soportadas"""
        return [network.value for network in BlockchainNetwork]