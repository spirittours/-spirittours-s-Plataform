"""
Emergency Assistant Agent
=========================

Provides 24/7 emergency support, medical assistance coordination,
embassy contacts, and crisis management.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from typing import Any, Dict, List, Optional
import logging

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class EmergencyAssistantAgent(BaseAgent):
    """Agent providing emergency assistance and crisis support."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            agent_name="Emergency Assistant",
            agent_type="emergency-assistant",
            capabilities={
                AgentCapability.NOTIFICATION,
                AgentCapability.NATURAL_LANGUAGE,
                AgentCapability.API_INTEGRATION,
            },
            config=config or {}
        )
        
        self.emergency_contacts = self._load_emergency_contacts()
    
    def _load_emergency_contacts(self) -> Dict[str, Any]:
        """Load emergency contact database."""
        return {
            'israel': {
                'police': '100',
                'ambulance': '101',
                'fire': '102',
                'tourist_police': '106',
                'embassies': {
                    'us': {
                        'name': 'US Embassy Jerusalem',
                        'phone': '+972-2-630-4000',
                        'address': '14 David Flusser St, Jerusalem',
                        'emergency_24h': '+972-2-630-4000',
                    },
                    'uk': {
                        'name': 'British Embassy Tel Aviv',
                        'phone': '+972-3-725-1222',
                        'address': '192 Hayarkon St, Tel Aviv',
                        'emergency_24h': '+972-3-725-1222',
                    },
                },
                'hospitals': [
                    {
                        'name': 'Hadassah Medical Center',
                        'location': 'Jerusalem',
                        'phone': '+972-2-677-7111',
                        'type': 'General',
                        'emergency_room': True,
                    },
                    {
                        'name': 'Tel Aviv Sourasky Medical Center',
                        'location': 'Tel Aviv',
                        'phone': '+972-3-697-4444',
                        'type': 'General',
                        'emergency_room': True,
                    },
                ],
            }
        }
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """Process emergency assistance request."""
        payload = task.payload
        
        emergency_type = payload.get('emergency_type', 'general')  # medical, police, fire, lost, theft
        location = payload.get('location', 'israel')
        severity = payload.get('severity', 'medium')  # low, medium, high, critical
        details = payload.get('details', '')
        
        logger.warning(f"EMERGENCY REQUEST: {emergency_type} at {location}, severity: {severity}")
        
        # Get immediate action steps
        immediate_actions = self._get_immediate_actions(emergency_type, severity)
        
        # Get relevant contacts
        contacts = self._get_relevant_contacts(location, emergency_type)
        
        # Get nearest facilities
        nearest_facilities = self._get_nearest_facilities(location, emergency_type)
        
        # Generate emergency response
        return {
            'emergency_type': emergency_type,
            'severity': severity,
            'immediate_actions': immediate_actions,
            'emergency_contacts': contacts,
            'nearest_facilities': nearest_facilities,
            'follow_up_steps': self._get_follow_up_steps(emergency_type),
            'timestamp': task.created_at.isoformat(),
        }
    
    def _get_immediate_actions(self, emergency_type: str, severity: str) -> List[str]:
        """Get immediate action steps based on emergency type."""
        actions = []
        
        if severity in ['high', 'critical']:
            actions.append('🚨 CALL EMERGENCY SERVICES IMMEDIATELY')
        
        if emergency_type == 'medical':
            actions.extend([
                'Call 101 (Ambulance) immediately if life-threatening',
                'Do not move the person if serious injury suspected',
                'Apply first aid if trained',
                'Collect medical information (allergies, medications)',
                'Contact your travel insurance provider',
            ])
        elif emergency_type == 'police':
            actions.extend([
                'Call 100 (Police) or 106 (Tourist Police)',
                'Stay in a safe location',
                'Do not confront perpetrators',
                'Document everything (photos, notes, witnesses)',
                'File a police report',
            ])
        elif emergency_type == 'fire':
            actions.extend([
                'Call 102 (Fire Department) immediately',
                'Evacuate the building',
                'Do not use elevators',
                'Stay low to avoid smoke',
                'Meet at designated assembly point',
            ])
        elif emergency_type == 'lost':
            actions.extend([
                'Stay calm and stay in your current location if safe',
                'Contact your tour guide or hotel immediately',
                'Use GPS/maps app to identify your location',
                'Ask local business for help',
                'Contact emergency contact person',
            ])
        elif emergency_type == 'theft':
            actions.extend([
                'Report to Tourist Police (106) immediately',
                'Cancel stolen credit cards',
                'Contact your embassy if passport stolen',
                'File insurance claim',
                'Change online passwords if devices stolen',
            ])
        else:  # general
            actions.extend([
                'Assess the situation calmly',
                'Ensure your safety first',
                'Contact appropriate emergency services',
                'Notify tour guide or accommodation',
                'Document the incident',
            ])
        
        return actions
    
    def _get_relevant_contacts(self, location: str, emergency_type: str) -> Dict[str, Any]:
        """Get relevant emergency contacts."""
        location_contacts = self.emergency_contacts.get(location.lower(), {})
        
        contacts = {
            'emergency_numbers': {
                'police': location_contacts.get('police'),
                'ambulance': location_contacts.get('ambulance'),
                'fire': location_contacts.get('fire'),
                'tourist_police': location_contacts.get('tourist_police'),
            },
            'spirit_tours_24h': '+972-50-123-4567',  # 24/7 support line
        }
        
        if emergency_type in ['lost', 'theft', 'legal']:
            contacts['embassies'] = location_contacts.get('embassies', {})
        
        return contacts
    
    def _get_nearest_facilities(self, location: str, emergency_type: str) -> List[Dict[str, Any]]:
        """Get nearest emergency facilities."""
        location_data = self.emergency_contacts.get(location.lower(), {})
        
        if emergency_type == 'medical':
            return location_data.get('hospitals', [])
        elif emergency_type == 'police':
            return [
                {
                    'name': 'Jerusalem Police Station',
                    'address': 'Jaffa Rd, Jerusalem',
                    'phone': '100',
                },
            ]
        else:
            return []
    
    def _get_follow_up_steps(self, emergency_type: str) -> List[str]:
        """Get follow-up steps after immediate response."""
        return [
            'Document all expenses for insurance claim',
            'Keep all receipts and medical documents',
            'Contact travel insurance within 24 hours',
            'Notify Spirit Tours of the incident',
            'Follow up with medical treatment if needed',
            'Update emergency contacts with your status',
            'Request incident report copies',
        ]
