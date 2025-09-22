"""
3CX PBX Integration System
Complete telephony integration for Spirit Tours CRM
"""

import requests
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
import aiohttp
from sqlalchemy.orm import Session
from sqlalchemy import Column, String, DateTime, Integer, Boolean, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from backend.models.rbac_models import User, Base

logger = logging.getLogger(__name__)

class CallLog(Base):
    """Call logs table for audit and reporting"""
    __tablename__ = 'call_logs'
    
    id = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    call_type = Column(String, nullable=False)  # inbound, outbound, internal
    phone_number = Column(String, nullable=False)
    customer_id = Column(String, nullable=True)
    campaign_id = Column(String, nullable=True)
    call_start = Column(DateTime, nullable=False)
    call_end = Column(DateTime, nullable=True)
    call_duration = Column(Integer, nullable=True)  # seconds
    call_status = Column(String, nullable=False)  # answered, missed, busy, failed
    recording_url = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class CallCampaign(Base):
    """Marketing/Sales call campaigns"""
    __tablename__ = 'call_campaigns'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    campaign_type = Column(String, nullable=False)  # marketing, sales, support
    target_audience = Column(String, nullable=False)  # customers, agencies, operators
    script_content = Column(Text, nullable=True)
    created_by = Column(String, ForeignKey('users.id'), nullable=False)
    status = Column(String, default='draft')  # draft, active, paused, completed
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class PBX3CXManager:
    """3CX PBX Integration Manager"""
    
    def __init__(self, server_url: str, username: str, password: str):
        self.server_url = server_url.rstrip('/')
        self.username = username
        self.password = password
        self.session_id = None
        self.headers = {'Content-Type': 'application/json'}
    
    async def authenticate(self) -> bool:
        """Authenticate with 3CX server"""
        try:
            auth_data = {
                'Username': self.username,
                'Password': self.password
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/login",
                    json=auth_data,
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        self.session_id = result.get('SessionId')
                        self.headers['SessionId'] = self.session_id
                        logger.info("Successfully authenticated with 3CX PBX")
                        return True
                    else:
                        logger.error(f"3CX authentication failed: {response.status}")
                        return False
        except Exception as e:
            logger.error(f"3CX authentication error: {e}")
            return False
    
    async def make_outbound_call(self, extension: str, phone_number: str, 
                                user_id: str, customer_id: str = None) -> Dict[str, Any]:
        """Make outbound call through 3CX"""
        try:
            call_data = {
                'Extension': extension,
                'Number': phone_number,
                'CallerId': 'Spirit Tours',
                'Timeout': 30
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/activecalls/makecall",
                    json=call_data,
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        
                        # Log the call attempt
                        await self._log_call(
                            call_id=result.get('CallId', f"out_{datetime.now().timestamp()}"),
                            user_id=user_id,
                            call_type='outbound',
                            phone_number=phone_number,
                            customer_id=customer_id,
                            call_status='initiated'
                        )
                        
                        logger.info(f"Outbound call initiated: {extension} -> {phone_number}")
                        return {
                            'success': True,
                            'call_id': result.get('CallId'),
                            'message': 'Call initiated successfully'
                        }
                    else:
                        logger.error(f"Failed to make call: {response.status}")
                        return {
                            'success': False,
                            'message': f'Call failed with status {response.status}'
                        }
        except Exception as e:
            logger.error(f"Error making outbound call: {e}")
            return {
                'success': False,
                'message': f'Call error: {str(e)}'
            }
    
    async def get_active_calls(self) -> List[Dict[str, Any]]:
        """Get list of active calls"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.server_url}/api/activecalls",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        calls = await response.json()
                        return calls
                    else:
                        logger.error(f"Failed to get active calls: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error getting active calls: {e}")
            return []
    
    async def get_call_history(self, extension: str = None, 
                              days: int = 7) -> List[Dict[str, Any]]:
        """Get call history from 3CX"""
        try:
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            params = {
                'from': start_date.isoformat(),
                'to': end_date.isoformat()
            }
            
            if extension:
                params['extension'] = extension
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.server_url}/api/callhistory",
                    params=params,
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        history = await response.json()
                        return history
                    else:
                        logger.error(f"Failed to get call history: {response.status}")
                        return []
        except Exception as e:
            logger.error(f"Error getting call history: {e}")
            return []
    
    async def get_extension_status(self, extension: str) -> Dict[str, Any]:
        """Get extension status (available, busy, offline)"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.server_url}/api/extensions/{extension}/status",
                    headers=self.headers
                ) as response:
                    if response.status == 200:
                        status = await response.json()
                        return status
                    else:
                        logger.error(f"Failed to get extension status: {response.status}")
                        return {}
        except Exception as e:
            logger.error(f"Error getting extension status: {e}")
            return {}
    
    async def start_call_recording(self, call_id: str) -> bool:
        """Start recording for active call"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/activecalls/{call_id}/record",
                    headers=self.headers
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Error starting call recording: {e}")
            return False
    
    async def transfer_call(self, call_id: str, target_extension: str) -> bool:
        """Transfer call to another extension"""
        try:
            transfer_data = {
                'CallId': call_id,
                'TargetExtension': target_extension
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/activecalls/transfer",
                    json=transfer_data,
                    headers=self.headers
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Error transferring call: {e}")
            return False
    
    async def hangup_call(self, call_id: str) -> bool:
        """Hangup active call"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.server_url}/api/activecalls/{call_id}/hangup",
                    headers=self.headers
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.error(f"Error hanging up call: {e}")
            return False
    
    async def _log_call(self, call_id: str, user_id: str, call_type: str,
                       phone_number: str, call_status: str, customer_id: str = None,
                       campaign_id: str = None, call_duration: int = None):
        """Log call to database"""
        # This would be called with proper database session in production
        logger.info(f"Call logged: {call_id} - {call_type} - {phone_number} - {call_status}")

class CommunicationManager:
    """Enhanced communication manager for campaigns and mass communications"""
    
    def __init__(self, pbx_manager: PBX3CXManager, db: Session):
        self.pbx = pbx_manager
        self.db = db
    
    async def create_call_campaign(self, name: str, description: str,
                                 campaign_type: str, target_audience: str,
                                 script_content: str, created_by: str) -> str:
        """Create new call campaign"""
        try:
            campaign = CallCampaign(
                id=f"camp_{datetime.now().timestamp()}",
                name=name,
                description=description,
                campaign_type=campaign_type,
                target_audience=target_audience,
                script_content=script_content,
                created_by=created_by,
                status='draft'
            )
            
            self.db.add(campaign)
            self.db.commit()
            
            logger.info(f"Call campaign created: {campaign.id}")
            return campaign.id
        except Exception as e:
            logger.error(f"Error creating call campaign: {e}")
            raise
    
    async def start_campaign(self, campaign_id: str, phone_list: List[str],
                           assigned_agents: List[str]) -> Dict[str, Any]:
        """Start automated call campaign"""
        try:
            campaign = self.db.query(CallCampaign).filter_by(id=campaign_id).first()
            if not campaign:
                raise ValueError("Campaign not found")
            
            campaign.status = 'active'
            campaign.start_date = datetime.utcnow()
            self.db.commit()
            
            # Distribute calls among agents
            results = {
                'campaign_id': campaign_id,
                'total_numbers': len(phone_list),
                'assigned_agents': len(assigned_agents),
                'calls_initiated': 0,
                'calls_failed': 0
            }
            
            # In production, this would use a task queue (Celery, etc.)
            for i, phone_number in enumerate(phone_list):
                agent_extension = assigned_agents[i % len(assigned_agents)]
                
                try:
                    call_result = await self.pbx.make_outbound_call(
                        extension=agent_extension,
                        phone_number=phone_number,
                        user_id=campaign.created_by,
                        customer_id=None  # Would lookup customer if exists
                    )
                    
                    if call_result['success']:
                        results['calls_initiated'] += 1
                    else:
                        results['calls_failed'] += 1
                    
                    # Add delay between calls to prevent overload
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"Failed to initiate call to {phone_number}: {e}")
                    results['calls_failed'] += 1
            
            logger.info(f"Campaign {campaign_id} started: {results}")
            return results
            
        except Exception as e:
            logger.error(f"Error starting campaign: {e}")
            raise
    
    async def send_promotional_calls(self, target_type: str, 
                                   promotion_script: str) -> Dict[str, Any]:
        """Send promotional calls to agencies or tour operators"""
        try:
            # Mock data - in production, this would query actual customer database
            target_contacts = {
                'agencies': [
                    {'name': 'Travel Pro Agency', 'phone': '+1234567890', 'contact': 'John Smith'},
                    {'name': 'Global Tours Inc', 'phone': '+1234567891', 'contact': 'Mary Johnson'},
                    {'name': 'Adventure Seekers', 'phone': '+1234567892', 'contact': 'Carlos Rodriguez'}
                ],
                'tour_operators': [
                    {'name': 'Elite Tours', 'phone': '+1234567893', 'contact': 'Sarah Wilson'},
                    {'name': 'Premium Destinations', 'phone': '+1234567894', 'contact': 'Michael Brown'},
                    {'name': 'Luxury Experiences', 'phone': '+1234567895', 'contact': 'Lisa Davis'}
                ]
            }
            
            contacts = target_contacts.get(target_type, [])
            
            # Create promotional campaign
            campaign_id = await self.create_call_campaign(
                name=f"Promoción {target_type.title()} - {datetime.now().strftime('%Y-%m-%d')}",
                description=f"Campaña promocional dirigida a {target_type}",
                campaign_type='marketing',
                target_audience=target_type,
                script_content=promotion_script,
                created_by='system'  # Would be actual user ID
            )
            
            phone_numbers = [contact['phone'] for contact in contacts]
            
            # Use sales team extensions for promotional calls
            sales_extensions = ['101', '102', '103']  # Sales team extensions
            
            results = await self.start_campaign(
                campaign_id=campaign_id,
                phone_list=phone_numbers,
                assigned_agents=sales_extensions
            )
            
            return {
                'campaign_id': campaign_id,
                'target_type': target_type,
                'contacts_called': len(contacts),
                'results': results
            }
            
        except Exception as e:
            logger.error(f"Error sending promotional calls: {e}")
            raise
    
    async def get_campaign_statistics(self, campaign_id: str) -> Dict[str, Any]:
        """Get comprehensive campaign statistics"""
        try:
            campaign = self.db.query(CallCampaign).filter_by(id=campaign_id).first()
            if not campaign:
                raise ValueError("Campaign not found")
            
            # Get call logs for this campaign
            call_logs = self.db.query(CallLog).filter_by(campaign_id=campaign_id).all()
            
            stats = {
                'campaign_info': {
                    'id': campaign.id,
                    'name': campaign.name,
                    'type': campaign.campaign_type,
                    'status': campaign.status,
                    'start_date': campaign.start_date.isoformat() if campaign.start_date else None,
                    'end_date': campaign.end_date.isoformat() if campaign.end_date else None
                },
                'call_stats': {
                    'total_calls': len(call_logs),
                    'answered_calls': len([c for c in call_logs if c.call_status == 'answered']),
                    'missed_calls': len([c for c in call_logs if c.call_status == 'missed']),
                    'busy_calls': len([c for c in call_logs if c.call_status == 'busy']),
                    'failed_calls': len([c for c in call_logs if c.call_status == 'failed']),
                },
                'performance': {
                    'answer_rate': 0,
                    'average_duration': 0,
                    'conversion_rate': 0  # Would be calculated based on follow-up sales
                }
            }
            
            # Calculate performance metrics
            if stats['call_stats']['total_calls'] > 0:
                stats['performance']['answer_rate'] = round(
                    (stats['call_stats']['answered_calls'] / stats['call_stats']['total_calls']) * 100, 2
                )
            
            if stats['call_stats']['answered_calls'] > 0:
                total_duration = sum([c.call_duration or 0 for c in call_logs if c.call_status == 'answered'])
                stats['performance']['average_duration'] = round(
                    total_duration / stats['call_stats']['answered_calls'], 2
                )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting campaign statistics: {e}")
            raise

# Configuration class for 3CX integration
class PBXConfig:
    """3CX PBX Configuration"""
    
    def __init__(self):
        self.server_url = "https://your-3cx-server.com"  # Configure with actual 3CX server
        self.username = "api_user"  # Configure with actual API user
        self.password = "api_password"  # Configure with actual password
        self.extensions = {
            # Map user roles to extensions
            'sales.director': '100',
            'sales.manager': '101', 
            'sales.senior': '102',
            'callcenter.director': '200',
            'callcenter.supervisor': '201',
            'agent.senior': '202',
            'support.supervisor': '300',
            'support.agent': '301'
        }
    
    def get_user_extension(self, username: str) -> Optional[str]:
        """Get extension for user"""
        return self.extensions.get(username)

# Factory function to create PBX manager
def create_pbx_manager() -> PBX3CXManager:
    """Create and configure PBX manager"""
    config = PBXConfig()
    return PBX3CXManager(
        server_url=config.server_url,
        username=config.username,
        password=config.password
    )

# Example usage functions
async def demo_promotional_campaign():
    """Demo function showing promotional campaign to agencies"""
    pbx = create_pbx_manager()
    await pbx.authenticate()
    
    # Mock database session
    comm_manager = CommunicationManager(pbx, None)
    
    promotion_script = """
    ¡Hola! Soy [NOMBRE] de Spirit Tours. 
    
    Te llamo para informarte sobre nuestras nuevas promociones especiales para agencias:
    
    - 15% de descuento en todos nuestros paquetes
    - Comisiones preferenciales del 12% 
    - Soporte 24/7 con nuestros 25 agentes AI especializados
    - Sistema CRM gratuito para gestionar tus clientes
    
    ¿Tienes 5 minutos para que te cuente los detalles?
    """
    
    results = await comm_manager.send_promotional_calls(
        target_type='agencies',
        promotion_script=promotion_script
    )
    
    print(f"Promotional campaign results: {results}")

if __name__ == "__main__":
    # Run demo
    asyncio.run(demo_promotional_campaign())