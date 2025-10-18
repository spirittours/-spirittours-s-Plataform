"""
AI Chatbot para Práctica de Conversación en Capacitación
Sistema de roleplay interactivo para entrenar empleados en diferentes escenarios

Tipos de simulación:
- Conversación con sacerdotes/pastores
- Conversación con líderes de viaje
- Conversación con clientes regulares
- Técnicas de ventas
- Manejo de objeciones
- Situaciones difíciles
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
import uuid
import json
import logging

from backend.models.training_models import TrainingModule, TrainingLesson
from backend.models.rbac_models import User

logger = logging.getLogger(__name__)

# ============================================================================
# CHATBOT PERSONAS
# ============================================================================

CHATBOT_PERSONAS = {
    'priest': {
        'name': 'Padre Miguel',
        'role': 'Sacerdote Católico',
        'description': 'Sacerdote con 20 años de experiencia organizando peregrinaciones',
        'personality': [
            'Formal y respetuoso',
            'Conocedor de liturgia y lugares sagrados',
            'Preocupado por presupuesto y logística',
            'Valoriza experiencia espiritual sobre lujo',
        ],
        'system_prompt': '''Eres el Padre Miguel, un sacerdote católico con 20 años de experiencia organizando peregrinaciones.

CARACTERÍSTICAS:
- Hablas formal y respetuosamente
- Tienes profundo conocimiento de lugares sagrados
- Te preocupas por el presupuesto y la experiencia espiritual
- Priorizas la experiencia religiosa sobre el lujo
- Haces preguntas sobre misas, liturgia y momentos de oración
- Eres cauteloso con decisiones financieras

COMPORTAMIENTO:
- Usa lenguaje religioso apropiado
- Pregunta sobre acceso a iglesias y horarios de misa
- Valora hoteles sencillos pero limpios
- Se preocupa por el bienestar espiritual del grupo
- Puede ser escéptico de opciones muy caras

RESPONDE como este personaje en conversaciones sobre turismo religioso.''',
        'common_questions': [
            '¿Habrá tiempo para misas diarias en el itinerario?',
            '¿Los hoteles están cerca de las iglesias principales?',
            '¿Cuál es el presupuesto más económico que ofrecen?',
            '¿Incluyen guías especializados en historia religiosa?',
            '¿Cómo manejan las necesidades espirituales del grupo?'
        ]
    },
    
    'pastor': {
        'name': 'Pastor David',
        'role': 'Pastor Evangélico',
        'description': 'Pastor carismático que organiza viajes para su congregación',
        'personality': [
            'Entusiasta y carismático',
            'Enfocado en experiencia bíblica',
            'Valoriza momentos de adoración grupal',
            'Abierto a nuevas experiencias',
        ],
        'system_prompt': '''Eres el Pastor David, un pastor evangélico carismático que organiza viajes para su congregación de 50+ personas.

CARACTERÍSTICAS:
- Hablas con entusiasmo y energía
- Te enfocas en experiencias bíblicas y lugares mencionados en la Biblia
- Valorizas momentos de adoración y fellowship grupal
- Eres más informal que un sacerdote católico
- Te interesa que el viaje sea transformador espiritualmente

COMPORTAMIENTO:
- Usas lenguaje evangélico ("hermano", "bendición", "tiempo de adoración")
- Preguntas por espacios para reuniones grupales
- Te interesa la conexión con los lugares bíblicos
- Priorizas la unidad y el crecimiento espiritual del grupo
- Eres más flexible con rituales formales

RESPONDE como este personaje en conversaciones sobre turismo religioso.''',
        'common_questions': [
            '¿Hay espacios para que tengamos nuestros tiempos de adoración?',
            '¿Visitaremos lugares mencionados en la Biblia?',
            '¿Podemos tener flexibilidad para reuniones grupales?',
            '¿Cómo sería el itinerario para un grupo de 50 personas?',
            '¿Hay descuentos para grupos grandes de iglesias?'
        ]
    },
    
    'travel_leader': {
        'name': 'María González',
        'role': 'Líder de Grupo de Viaje',
        'description': 'Coordinadora experimentada de grupos turísticos',
        'personality': [
            'Organizada y detallista',
            'Preocupada por logística',
            'Busca mejor relación calidad-precio',
            'Responsable del grupo',
        ],
        'system_prompt': '''Eres María González, una líder de grupo de viaje con experiencia organizando tours para grupos de 20-40 personas.

CARACTERÍSTICAS:
- Eres muy organizada y detallista
- Te preocupas por cada aspecto logístico
- Buscas la mejor relación calidad-precio
- Eres responsable del bienestar de todo el grupo
- Tienes experiencia comparando proveedores

COMPORTAMIENTO:
- Haces muchas preguntas sobre detalles logísticos
- Preguntas sobre seguros, emergencias, cancelaciones
- Comparas opciones y pides cotizaciones detalladas
- Te preocupas por necesidades especiales (dietas, movilidad)
- Eres profesional pero amigable
- Negociar es parte de tu trabajo

RESPONDE como este personaje en conversaciones sobre turismo religioso.''',
        'common_questions': [
            '¿Qué incluye exactamente el paquete?',
            '¿Cuáles son las políticas de cancelación?',
            '¿Tienen seguro de viaje incluido?',
            '¿Cómo manejan emergencias médicas?',
            '¿Pueden acomodar dietas especiales o necesidades de movilidad?',
            '¿Ofrecen descuentos para grupos grandes?'
        ]
    },
    
    'regular_client': {
        'name': 'Carlos Méndez',
        'role': 'Cliente Regular',
        'description': 'Cliente interesado en turismo religioso por primera vez',
        'personality': [
            'Curioso pero sin mucho conocimiento',
            'Busca experiencia significativa',
            'Preocupado por seguridad y comodidad',
            'Compara precios',
        ],
        'system_prompt': '''Eres Carlos Méndez, un cliente regular interesado en turismo religioso por primera vez.

CARACTERÍSTICAS:
- Eres curioso pero no tienes mucha experiencia en viajes religiosos
- Buscas una experiencia significativa pero también cómoda
- Te preocupas por seguridad, calidad y precio
- Haces preguntas básicas
- Necesitas que te expliquen bien las opciones

COMPORTAMIENTO:
- Haces preguntas de principiante
- Comparas con vacaciones regulares
- Te preocupa si "vale la pena"
- Preguntas sobre qué esperar
- Puedes tener dudas o preocupaciones
- Necesitas confianza antes de decidir

RESPONDE como este personaje en conversaciones sobre turismo religioso.''',
        'common_questions': [
            '¿Es mi primera vez en un viaje religioso, qué puedo esperar?',
            '¿Es muy diferente a un tour turístico normal?',
            '¿Qué destinos recomiendan para principiantes?',
            '¿Cuánto cuesta aproximadamente?',
            '¿Es seguro viajar a estos lugares?',
            '¿Necesito ser muy religioso para disfrutarlo?'
        ]
    },
    
    'difficult_client': {
        'name': 'Señora Rodríguez',
        'role': 'Cliente Exigente',
        'description': 'Cliente con altas expectativas y muchas objeciones',
        'personality': [
            'Exigente y detallista',
            'Escéptica de promesas',
            'Ha tenido malas experiencias antes',
            'Necesita mucha persuasión',
        ],
        'system_prompt': '''Eres la Señora Rodríguez, una cliente exigente con altas expectativas y tendencia a ser escéptica.

CARACTERÍSTICAS:
- Eres muy exigente con calidad y servicio
- Has tenido malas experiencias con otras agencias
- Haces objeciones y cuestionas todo
- Necesitas pruebas y garantías
- No te convences fácilmente
- Pero si confías, puedes ser cliente leal

COMPORTAMIENTO:
- Haces objeciones frecuentes
- Cuestionas precios, calidad, experiencia de la agencia
- Mencionas competidores
- Pides referencias y testimonios
- Eres escéptica de "promesas"
- Pero valoras profesionalismo y honestidad

RESPONDE como este personaje. Sé difícil pero realista. El empleado debe aprender a manejar objeciones.''',
        'common_questions': [
            '¿Cómo sé que no es otra agencia más que promete y no cumple?',
            '¿Por qué sus precios son más altos que la competencia?',
            'He tenido malas experiencias antes, ¿qué garantías ofrecen?',
            '¿Tienen referencias verificables?',
            '¿Qué pasa si el viaje no cumple mis expectativas?',
            'La otra agencia me ofreció lo mismo más barato...'
        ]
    }
}

# ============================================================================
# CONVERSATION SCENARIOS
# ============================================================================

TRAINING_SCENARIOS = {
    'first_contact': {
        'title': 'Primer Contacto',
        'description': 'Práctica de primera interacción con cliente potencial',
        'objectives': [
            'Crear buena primera impresión',
            'Identificar necesidades del cliente',
            'Presentar servicios de manera atractiva',
            'Establecer confianza'
        ],
        'difficulty': 'beginner',
        'duration_minutes': 10
    },
    
    'needs_assessment': {
        'title': 'Evaluación de Necesidades',
        'description': 'Identificar necesidades específicas del cliente',
        'objectives': [
            'Hacer preguntas abiertas efectivas',
            'Escuchar activamente',
            'Identificar presupuesto sin ser invasivo',
            'Entender motivaciones del viaje'
        ],
        'difficulty': 'beginner',
        'duration_minutes': 15
    },
    
    'package_presentation': {
        'title': 'Presentación de Paquete',
        'description': 'Presentar opciones de viaje de manera convincente',
        'objectives': [
            'Explicar características y beneficios',
            'Adaptar presentación al tipo de cliente',
            'Destacar valor agregado',
            'Generar entusiasmo'
        ],
        'difficulty': 'intermediate',
        'duration_minutes': 20
    },
    
    'objection_handling': {
        'title': 'Manejo de Objeciones',
        'description': 'Responder a dudas y objeciones efectivamente',
        'objectives': [
            'Escuchar objeción sin interrumpir',
            'Validar preocupación del cliente',
            'Ofrecer soluciones o alternativas',
            'Mantener actitud positiva'
        ],
        'difficulty': 'advanced',
        'duration_minutes': 15
    },
    
    'closing_sale': {
        'title': 'Cierre de Venta',
        'description': 'Técnicas para cerrar la venta efectivamente',
        'objectives': [
            'Reconocer señales de compra',
            'Hacer preguntas de cierre',
            'Manejar última hesitación',
            'Confirmar detalles y próximos pasos'
        ],
        'difficulty': 'advanced',
        'duration_minutes': 15
    },
    
    'difficult_situation': {
        'title': 'Situación Difícil',
        'description': 'Manejar clientes difíciles o situaciones complejas',
        'objectives': [
            'Mantener calma y profesionalismo',
            'Empathy y validación emocional',
            'Encontrar soluciones win-win',
            'Saber cuándo escalar'
        ],
        'difficulty': 'expert',
        'duration_minutes': 20
    }
}

# ============================================================================
# AI CHATBOT SERVICE
# ============================================================================

class TrainingChatbotService:
    """Servicio de chatbot IA para práctica de conversación"""
    
    def __init__(self, db: Session, openai_api_key: Optional[str] = None):
        self.db = db
        self.openai_api_key = openai_api_key
        
        # Conversations cache (in-memory for now, should be Redis/database for production)
        self.active_conversations: Dict[str, Dict[str, Any]] = {}
    
    # ========================================================================
    # CONVERSATION MANAGEMENT
    # ========================================================================
    
    def start_conversation(
        self,
        user_id: uuid.UUID,
        persona_key: str,
        scenario_key: str,
        language: str = 'es'
    ) -> Dict[str, Any]:
        """
        Inicia una nueva conversación de práctica
        
        Args:
            user_id: ID del usuario
            persona_key: Clave del personaje (priest, pastor, etc.)
            scenario_key: Clave del escenario (first_contact, etc.)
            language: Idioma de la conversación
        
        Returns:
            Dict con información de la conversación iniciada
        """
        if persona_key not in CHATBOT_PERSONAS:
            raise ValueError(f"Invalid persona key: {persona_key}")
        
        if scenario_key not in TRAINING_SCENARIOS:
            raise ValueError(f"Invalid scenario key: {scenario_key}")
        
        persona = CHATBOT_PERSONAS[persona_key]
        scenario = TRAINING_SCENARIOS[scenario_key]
        
        conversation_id = str(uuid.uuid4())
        
        # Initialize conversation
        conversation = {
            'id': conversation_id,
            'user_id': str(user_id),
            'persona_key': persona_key,
            'scenario_key': scenario_key,
            'persona_name': persona['name'],
            'scenario_title': scenario['title'],
            'started_at': datetime.now(timezone.utc),
            'messages': [],
            'system_prompt': persona['system_prompt'],
            'objectives': scenario['objectives'],
            'status': 'active'
        }
        
        # Generate initial message from AI
        initial_message = self._generate_initial_message(persona, scenario)
        
        conversation['messages'].append({
            'role': 'assistant',
            'content': initial_message,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        # Store in cache
        self.active_conversations[conversation_id] = conversation
        
        return {
            'conversation_id': conversation_id,
            'persona': {
                'name': persona['name'],
                'role': persona['role'],
                'description': persona['description']
            },
            'scenario': {
                'title': scenario['title'],
                'description': scenario['description'],
                'objectives': scenario['objectives'],
                'difficulty': scenario['difficulty']
            },
            'initial_message': initial_message
        }
    
    def send_message(
        self,
        conversation_id: str,
        user_message: str
    ) -> Dict[str, Any]:
        """
        Envía un mensaje en la conversación y obtiene respuesta del AI
        
        Args:
            conversation_id: ID de la conversación
            user_message: Mensaje del usuario
        
        Returns:
            Dict con respuesta del AI y análisis
        """
        if conversation_id not in self.active_conversations:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        conversation = self.active_conversations[conversation_id]
        
        if conversation['status'] != 'active':
            raise ValueError("Conversation is not active")
        
        # Add user message to history
        conversation['messages'].append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        # Generate AI response
        ai_response = self._generate_ai_response(conversation, user_message)
        
        # Add AI response to history
        conversation['messages'].append({
            'role': 'assistant',
            'content': ai_response['message'],
            'timestamp': datetime.now(timezone.utc).isoformat()
        })
        
        # Analyze user performance
        analysis = self._analyze_message_quality(user_message, conversation)
        
        return {
            'ai_message': ai_response['message'],
            'analysis': analysis,
            'conversation_length': len(conversation['messages']),
            'can_continue': True
        }
    
    def end_conversation(
        self,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Finaliza una conversación y proporciona feedback completo
        
        Args:
            conversation_id: ID de la conversación
        
        Returns:
            Dict con resumen y evaluación de la conversación
        """
        if conversation_id not in self.active_conversations:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        conversation = self.active_conversations[conversation_id]
        conversation['status'] = 'completed'
        conversation['ended_at'] = datetime.now(timezone.utc)
        
        # Generate comprehensive feedback
        feedback = self._generate_conversation_feedback(conversation)
        
        # Calculate duration
        duration_seconds = (conversation['ended_at'] - conversation['started_at']).total_seconds()
        
        # TODO: Save conversation to database for future review
        
        # Remove from active conversations
        del self.active_conversations[conversation_id]
        
        return {
            'conversation_id': conversation_id,
            'duration_seconds': duration_seconds,
            'total_messages': len(conversation['messages']),
            'feedback': feedback,
            'score': feedback['overall_score'],
            'strengths': feedback['strengths'],
            'areas_for_improvement': feedback['areas_for_improvement'],
            'next_steps': feedback['next_steps']
        }
    
    # ========================================================================
    # AI RESPONSE GENERATION
    # ========================================================================
    
    def _generate_initial_message(self, persona: Dict, scenario: Dict) -> str:
        """Genera mensaje inicial del personaje según el escenario"""
        
        initial_messages = {
            'priest': {
                'first_contact': "Buenos días. Soy el Padre Miguel de la Parroquia San Juan. He oído que ustedes organizan peregrinaciones a Tierra Santa. Me gustaría información para un grupo de mi parroquia.",
                'needs_assessment': "Estamos pensando en organizar una peregrinación, pero queremos asegurarnos de que sea una experiencia verdaderamente espiritual. ¿Qué nos pueden ofrecer?",
            },
            'pastor': {
                'first_contact': "¡Hola! Soy el Pastor David. ¡Qué bendición encontrarlos! Queremos llevar a nuestra congregación a Israel. ¿Cómo podemos empezar?",
                'package_presentation': "Queremos un viaje que sea transformador para nuestros hermanos. ¿Qué paquetes tienen?",
            },
            'travel_leader': {
                'needs_assessment': "Hola, soy María González. Coordino un grupo de 35 personas interesadas en un tour religioso. Necesito información detallada sobre sus servicios.",
                'objection_handling': "He recibido otras cotizaciones y tengo algunas dudas sobre sus precios...",
            },
            'regular_client': {
                'first_contact': "Hola, vi su página web y me interesa el turismo religioso, pero nunca he hecho un viaje así. ¿Me pueden ayudar?",
                'package_presentation': "Estoy interesado, pero no estoy seguro de qué destino elegir...",
            },
            'difficult_client': {
                'objection_handling': "Mire, he tenido malas experiencias con agencias de viaje. ¿Por qué debería confiar en ustedes?",
                'difficult_situation': "Sus precios son demasiado altos comparados con otras agencias. Y además, la competencia ofrece más servicios incluidos.",
            }
        }
        
        # Get specific message or default
        persona_messages = initial_messages.get(persona_key := list(CHATBOT_PERSONAS.keys())[0], {})
        return persona_messages.get(scenario['title'].lower().replace(' ', '_'), 
                                   f"Hola, soy {persona['name']}. {persona['description']}. Cuénteme sobre sus servicios.")
    
    def _generate_ai_response(self, conversation: Dict, user_message: str) -> Dict[str, Any]:
        """
        Genera respuesta del AI usando OpenAI API o modelo local
        
        En producción, esto debería usar OpenAI, Anthropic Claude, o modelo local
        """
        # TODO: Implement actual AI API call
        # For now, return simulated responses
        
        persona_key = conversation['persona_key']
        persona = CHATBOT_PERSONAS[persona_key]
        
        # Simulated response (replace with actual AI call)
        responses = {
            'priest': [
                "Entiendo. ¿Pueden contarme más sobre los lugares que visitaríamos? Especialmente me interesa Tierra Santa.",
                "¿Y qué tal los horarios? Necesitamos tiempo para misas diarias.",
                "El presupuesto es importante para nosotros. ¿Tienen opciones económicas?"
            ],
            'pastor': [
                "¡Amén! ¿Incluyen visitas a los lugares donde Jesús predicó?",
                "¿Podríamos tener momentos de adoración en el Monte de los Olivos?",
                "¿Qué tan flexible es el itinerario para nuestro grupo?"
            ]
        }
        
        import random
        response_list = responses.get(persona_key, ["Entiendo. Cuénteme más sobre eso."])
        message = random.choice(response_list)
        
        return {
            'message': message,
            'emotion': 'neutral',
            'intent': 'inquiry'
        }
    
    def _analyze_message_quality(self, message: str, conversation: Dict) -> Dict[str, Any]:
        """
        Analiza la calidad del mensaje del empleado
        
        Returns feedback instantáneo sobre la respuesta
        """
        # Simple analysis (should be more sophisticated with NLP)
        analysis = {
            'score': 0,
            'feedback': [],
            'good_points': [],
            'improvement_points': []
        }
        
        message_lower = message.lower()
        
        # Positive indicators
        if any(word in message_lower for word in ['gracias', 'agradezco', 'aprecio']):
            analysis['good_points'].append("Buena cortesía y agradecimiento")
            analysis['score'] += 10
        
        if '?' in message:
            analysis['good_points'].append("Hace preguntas para entender mejor")
            analysis['score'] += 15
        
        if any(word in message_lower for word in ['entiendo', 'comprendo', 'claro']):
            analysis['good_points'].append("Muestra empatía y comprensión")
            analysis['score'] += 10
        
        if len(message.split()) > 20:
            analysis['good_points'].append("Respuesta detallada y completa")
            analysis['score'] += 10
        
        # Negative indicators
        if len(message.split()) < 5:
            analysis['improvement_points'].append("Respuesta muy corta, agregar más detalles")
            analysis['score'] -= 10
        
        if message.isupper():
            analysis['improvement_points'].append("Evitar mayúsculas (suena agresivo)")
            analysis['score'] -= 5
        
        # Normalize score
        analysis['score'] = max(0, min(100, 50 + analysis['score']))
        
        return analysis
    
    def _generate_conversation_feedback(self, conversation: Dict) -> Dict[str, Any]:
        """Genera feedback completo al final de la conversación"""
        
        messages_count = len([m for m in conversation['messages'] if m['role'] == 'user'])
        
        # Calculate scores
        avg_message_length = sum(
            len(m['content'].split()) 
            for m in conversation['messages'] 
            if m['role'] == 'user'
        ) / max(messages_count, 1)
        
        # Simple scoring (should be more sophisticated)
        overall_score = min(100, int(
            (messages_count * 10) +  # Participation
            (avg_message_length * 2) +  # Detail level
            50  # Base score
        ))
        
        return {
            'overall_score': overall_score,
            'strengths': [
                'Buena participación en la conversación',
                'Mantuvo profesionalismo',
            ],
            'areas_for_improvement': [
                'Podría hacer más preguntas abiertas',
                'Trabajar en técnicas de cierre',
            ],
            'next_steps': [
                'Practicar con escenario de objeciones',
                'Revisar material sobre técnicas de venta',
            ],
            'objectives_completed': len(conversation['objectives'])
        }
    
    # ========================================================================
    # UTILITY METHODS
    # ========================================================================
    
    def get_available_personas(self) -> List[Dict[str, Any]]:
        """Obtiene lista de personajes disponibles"""
        return [
            {
                'key': key,
                'name': persona['name'],
                'role': persona['role'],
                'description': persona['description'],
                'personality': persona['personality']
            }
            for key, persona in CHATBOT_PERSONAS.items()
        ]
    
    def get_available_scenarios(self) -> List[Dict[str, Any]]:
        """Obtiene lista de escenarios disponibles"""
        return [
            {
                'key': key,
                **scenario
            }
            for key, scenario in TRAINING_SCENARIOS.items()
        ]
    
    def get_conversation_history(self, conversation_id: str) -> Dict[str, Any]:
        """Obtiene historial completo de una conversación"""
        if conversation_id not in self.active_conversations:
            raise ValueError(f"Conversation not found: {conversation_id}")
        
        return self.active_conversations[conversation_id]
