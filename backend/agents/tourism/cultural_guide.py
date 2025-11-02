"""
Cultural Guide Agent
===================

Provides cultural insights, historical context, customs guidance,
and language tips for tourists.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

from typing import Any, Dict, List, Optional
import logging

from ..base import BaseAgent, AgentCapability, AgentTask

logger = logging.getLogger(__name__)


class CulturalGuideAgent(BaseAgent):
    """Agent providing cultural guidance and insights."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        super().__init__(
            agent_name="Cultural Guide",
            agent_type="cultural-guide",
            capabilities={
                AgentCapability.NATURAL_LANGUAGE,
                AgentCapability.CONTENT_GENERATION,
                AgentCapability.DATA_ANALYSIS,
            },
            config=config or {}
        )
        
        self.cultural_database = self._load_cultural_data()
    
    def _load_cultural_data(self) -> Dict[str, Any]:
        """Load cultural information database."""
        return {
            'israel': {
                'customs': [
                    'Dress modestly when visiting religious sites',
                    'Shabbat (Saturday) is the day of rest - many businesses closed',
                    'Tipping 10-15% is customary in restaurants',
                    'Greetings: Shalom (peace) is universal',
                ],
                'etiquette': [
                    'Remove shoes when entering homes',
                    'Ask permission before photographing people',
                    'Respect religious customs and traditions',
                    'Queue respectfully in lines',
                ],
                'language_basics': {
                    'hello': 'Shalom',
                    'goodbye': 'Lehitra\'ot',
                    'thank_you': 'Toda',
                    'please': 'Bevakasha',
                    'yes': 'Ken',
                    'no': 'Lo',
                },
                'religious_sites_rules': [
                    'Cover shoulders and knees',
                    'Women may need head covering',
                    'Remove hats for men in synagogues',
                    'No photography on Shabbat',
                ],
                'cultural_events': [
                    'Passover (Spring) - Week-long celebration',
                    'Yom Kippur (Fall) - Day of Atonement, country shuts down',
                    'Hanukkah (Winter) - Festival of Lights',
                    'Independence Day (Spring) - National celebration',
                ],
            }
        }
    
    async def process_task(self, task: AgentTask) -> Dict[str, Any]:
        """Process cultural guidance request."""
        payload = task.payload
        
        location = payload.get('location', 'israel').lower()
        query_type = payload.get('query_type', 'overview')  # overview, customs, language, events
        
        logger.info(f"Providing cultural guidance for {location}, type: {query_type}")
        
        cultural_data = self.cultural_database.get(location, {})
        
        if query_type == 'customs':
            return {'customs': cultural_data.get('customs', [])}
        elif query_type == 'language':
            return {'language_basics': cultural_data.get('language_basics', {})}
        elif query_type == 'events':
            return {'cultural_events': cultural_data.get('cultural_events', [])}
        elif query_type == 'religious_sites':
            return {'religious_sites_rules': cultural_data.get('religious_sites_rules', [])}
        else:  # overview
            return {
                'location': location,
                'customs': cultural_data.get('customs', []),
                'etiquette': cultural_data.get('etiquette', []),
                'language_basics': cultural_data.get('language_basics', {}),
                'cultural_events': cultural_data.get('cultural_events', []),
                'tips': [
                    'Learn a few basic phrases in Hebrew',
                    'Respect local customs and dress codes',
                    'Be aware of religious holidays and their impacts',
                    'Embrace the diverse cultural heritage',
                ]
            }
