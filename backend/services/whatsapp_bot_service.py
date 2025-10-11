"""
Advanced WhatsApp Business Bot Service with AI capabilities
"""
from typing import Dict, Any, List, Optional, Tuple
import asyncio
import aiohttp
import json
import re
from datetime import datetime, timedelta
import hashlib
import qrcode
import io
import base64
from dataclasses import dataclass
from enum import Enum
import openai
from twilio.rest import Client
import redis
import logging
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

class MessageType(Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    LOCATION = "location"
    STICKER = "sticker"
    INTERACTIVE = "interactive"
    TEMPLATE = "template"
    REACTION = "reaction"

class ConversationState(Enum):
    WELCOME = "welcome"
    MAIN_MENU = "main_menu"
    CHECKING_POINTS = "checking_points"
    PLAYING_GAME = "playing_game"
    REFERRING_FRIEND = "referring_friend"
    SHARING_CONTENT = "sharing_content"
    CLAIMING_REWARD = "claiming_reward"
    SUPPORT = "support"
    ADMIN_MODE = "admin_mode"

@dataclass
class UserSession:
    phone_number: str
    user_id: Optional[int]
    state: ConversationState
    context: Dict[str, Any]
    language: str
    last_activity: datetime
    temp_data: Dict[str, Any]
    game_in_progress: Optional[str]
    referral_pending: List[str]
    daily_interactions: int

class WhatsAppBotService:
    """Advanced WhatsApp Business Bot with AI and gamification"""
    
    def __init__(self, config: Dict[str, Any], db: Session):
        self.db = db
        self.config = config
        self.redis = redis.Redis(host='localhost', port=6379, decode_responses=True)
        
        # WhatsApp Business API configuration
        self.whatsapp_token = config.get('whatsapp_token')
        self.whatsapp_phone_id = config.get('whatsapp_phone_id')
        self.webhook_verify_token = config.get('webhook_verify_token')
        
        # Twilio fallback
        self.twilio_client = Client(
            config.get('twilio_account_sid'),
            config.get('twilio_auth_token')
        )
        self.twilio_whatsapp_number = config.get('twilio_whatsapp_number')
        
        # OpenAI for natural language processing
        openai.api_key = config.get('openai_api_key')
        
        # Sessions storage
        self.sessions: Dict[str, UserSession] = {}
        
        # Game configurations
        self.games = self._initialize_games()
        
        # Viral sharing templates
        self.viral_templates = self._load_viral_templates()
        
        # Quick replies and buttons
        self.quick_replies = self._load_quick_replies()

    def _initialize_games(self) -> Dict[str, Dict]:
        """Initialize mini-games configuration"""
        return {
            'trivia': {
                'name': '🎯 Trivia de Viajes',
                'points_per_correct': 5,
                'daily_limit': 3,
                'questions': self._load_trivia_questions()
            },
            'word_hunt': {
                'name': '🔤 Caza Palabras',
                'points_per_word': 3,
                'daily_limit': 5,
                'words': ['JERUSALEN', 'SANTIAGO', 'FATIMA', 'LOURDES', 'ROMA']
            },
            'scratch_card': {
                'name': '🎰 Rasca y Gana',
                'min_points': 1,
                'max_points': 20,
                'daily_limit': 2,
                'win_probability': 0.7
            },
            'spin_wheel': {
                'name': '🎡 Ruleta de Fortuna',
                'prizes': [0, 2, 5, 10, 15, 20, 30, 50],
                'daily_limit': 1,
                'weights': [0.3, 0.25, 0.20, 0.10, 0.08, 0.05, 0.015, 0.005]
            },
            'daily_check': {
                'name': '📅 Check-in Diario',
                'base_points': 5,
                'streak_bonus': 2,  # Extra points per consecutive day
                'max_streak': 30
            },
            'social_challenge': {
                'name': '📱 Desafío Social',
                'share_story': 10,
                'share_post': 15,
                'tag_friends': 20,
                'daily_limit': 2
            },
            'referral_race': {
                'name': '🏃 Carrera de Referencias',
                'invite_sent': 0.5,
                'friend_joined': 10,
                'friend_active': 20,
                'monthly_target': 10
            },
            'mystery_box': {
                'name': '📦 Caja Misteriosa',
                'cost_points': 50,
                'possible_rewards': [
                    {'type': 'points', 'value': 100, 'probability': 0.5},
                    {'type': 'points', 'value': 200, 'probability': 0.3},
                    {'type': 'discount', 'value': 10, 'probability': 0.15},
                    {'type': 'free_entry', 'value': 1, 'probability': 0.05}
                ]
            }
        }

    def _load_trivia_questions(self) -> List[Dict]:
        """Load trivia questions database"""
        return [
            {
                'question': '¿En qué ciudad nació Jesús?',
                'options': ['A) Jerusalén', 'B) Belén', 'C) Nazaret', 'D) Roma'],
                'correct': 'B',
                'explanation': 'Jesús nació en Belén de Judea, según los evangelios.'
            },
            {
                'question': '¿Cuál es el santuario mariano más visitado del mundo?',
                'options': ['A) Lourdes', 'B) Fátima', 'C) Guadalupe', 'D) Aparecida'],
                'correct': 'C',
                'explanation': 'La Basílica de Guadalupe en México recibe más de 20 millones de visitantes al año.'
            },
            {
                'question': '¿En qué año fueron las apariciones de Fátima?',
                'options': ['A) 1917', 'B) 1858', 'C) 1931', 'D) 1981'],
                'correct': 'A',
                'explanation': 'Las apariciones de la Virgen en Fátima ocurrieron en 1917.'
            },
            # Add more questions...
        ]

    def _load_viral_templates(self) -> Dict[str, str]:
        """Load viral sharing message templates"""
        return {
            'invite_friend': """
🎉 ¡{user_name} te invita a Spirit Tours Rewards!

🎁 Únete y gana:
• 50 puntos de bienvenida
• Participa en sorteos de viajes GRATIS
• Gana premios jugando mini-juegos

👉 Usa mi código: {referral_code}
🔗 Únete aquí: {join_link}

¡No pierdas esta oportunidad! ✈️
            """,
            
            'share_achievement': """
🏆 ¡{user_name} acaba de ganar {points} puntos en Spirit Tours!

🎮 Jugando: {game_name}
📊 Ranking: #{rank}
💎 Nivel: {tier}

¿Puedes superarlo? 
Únete ahora: {join_link}
            """,
            
            'share_raffle': """
🎫 ¡Participa en el sorteo de {prize_name}!

🗓 Finaliza: {end_date}
💰 Valor: ${prize_value}
🎯 Solo necesitas {points_required} puntos

Yo ya estoy participando! 
¿Te unes? {raffle_link}
            """,
            
            'daily_motivation': """
💪 ¡Nuevo día, nuevas oportunidades!

✅ Check-in diario: 5 puntos
🎮 Mini-juegos disponibles
📱 Comparte y gana más

Tu amigo {user_name} ya ganó {daily_points} puntos hoy.
¡No te quedes atrás!
            """,
            
            'milestone_reached': """
🎊 ¡{user_name} alcanzó {milestone}!

🏅 Logro desbloqueado: {achievement}
🎁 Recompensa: {reward}
📈 Total de puntos: {total_points}

¡Felicitaciones! 🎉
Siguiente meta: {next_goal}
            """
        }

    def _load_quick_replies(self) -> Dict[str, List[str]]:
        """Load quick reply options for different contexts"""
        return {
            'main_menu': [
                '💰 Ver mis puntos',
                '🎮 Jugar mini-juegos',
                '👥 Invitar amigos',
                '🎁 Sorteos activos',
                '📊 Mi ranking',
                '❓ Ayuda'
            ],
            'games_menu': [
                '🎯 Trivia',
                '🔤 Caza Palabras',
                '🎰 Rasca y Gana',
                '🎡 Ruleta',
                '📅 Check-in',
                '↩️ Menú principal'
            ],
            'share_menu': [
                '📱 Compartir en WhatsApp',
                '📸 Compartir en Instagram',
                '👤 Compartir en Facebook',
                '🔗 Copiar enlace',
                '↩️ Volver'
            ],
            'help_menu': [
                '❓ ¿Cómo ganar puntos?',
                '🎁 ¿Cómo participar en sorteos?',
                '👥 ¿Cómo funciona el referido?',
                '💎 ¿Qué son los niveles?',
                '📞 Contactar soporte',
                '↩️ Menú principal'
            ]
        }

    async def process_incoming_message(self, message_data: Dict) -> Dict:
        """Process incoming WhatsApp message"""
        try:
            # Extract message details
            phone = message_data.get('from')
            message_type = message_data.get('type')
            timestamp = datetime.fromtimestamp(int(message_data.get('timestamp', 0)))
            
            # Get or create session
            session = self._get_or_create_session(phone)
            
            # Update last activity
            session.last_activity = datetime.utcnow()
            session.daily_interactions += 1
            
            # Process based on message type
            if message_type == MessageType.TEXT.value:
                response = await self._process_text_message(session, message_data.get('text', {}).get('body', ''))
            elif message_type == MessageType.INTERACTIVE.value:
                response = await self._process_interactive_message(session, message_data.get('interactive', {}))
            elif message_type == MessageType.IMAGE.value:
                response = await self._process_image_message(session, message_data.get('image', {}))
            elif message_type == MessageType.LOCATION.value:
                response = await self._process_location_message(session, message_data.get('location', {}))
            else:
                response = self._create_text_response("Lo siento, no puedo procesar ese tipo de mensaje. Por favor, envía texto o usa los botones.")
            
            # Save session state
            self._save_session(session)
            
            # Send response
            await self._send_response(phone, response)
            
            # Log interaction
            self._log_interaction(session, message_data, response)
            
            return {'status': 'success', 'response_sent': True}
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            return {'status': 'error', 'message': str(e)}

    async def _process_text_message(self, session: UserSession, text: str) -> Dict:
        """Process text message with AI understanding"""
        text = text.strip().lower()
        
        # Check for commands
        if text.startswith('/'):
            return await self._process_command(session, text)
        
        # Check for quick responses
        if text in ['hola', 'hi', 'hello', 'inicio', 'start']:
            return self._handle_welcome(session)
        
        # Use AI to understand intent
        intent = await self._analyze_intent(text)
        
        # Route based on intent
        if intent == 'check_points':
            return self._handle_check_points(session)
        elif intent == 'play_game':
            return self._handle_games_menu(session)
        elif intent == 'refer_friend':
            return self._handle_referral_start(session)
        elif intent == 'share_content':
            return self._handle_share_menu(session)
        elif intent == 'claim_reward':
            return self._handle_rewards(session)
        elif intent == 'support':
            return self._handle_support(session, text)
        else:
            # Context-based response
            return await self._handle_contextual_response(session, text)

    async def _analyze_intent(self, text: str) -> str:
        """Use AI to analyze user intent"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Classify the user intent into one of these categories: check_points, play_game, refer_friend, share_content, claim_reward, support, other"},
                    {"role": "user", "content": text}
                ],
                max_tokens=10,
                temperature=0.3
            )
            
            intent = response.choices[0].message['content'].strip().lower()
            return intent if intent in ['check_points', 'play_game', 'refer_friend', 'share_content', 'claim_reward', 'support'] else 'other'
            
        except Exception as e:
            logger.error(f"AI intent analysis failed: {str(e)}")
            return 'other'

    def _handle_welcome(self, session: UserSession) -> Dict:
        """Handle welcome message"""
        user_name = self._get_user_name(session)
        
        message = f"""
🎉 ¡Bienvenido a Spirit Tours Rewards, {user_name}!

Soy tu asistente virtual 24/7 🤖

¿Qué te gustaría hacer hoy?
        """
        
        buttons = [
            {'type': 'reply', 'reply': {'id': '1', 'title': '💰 Ver mis puntos'}},
            {'type': 'reply', 'reply': {'id': '2', 'title': '🎮 Jugar'}},
            {'type': 'reply', 'reply': {'id': '3', 'title': '👥 Invitar amigos'}}
        ]
        
        session.state = ConversationState.MAIN_MENU
        
        return self._create_interactive_response(message, buttons)

    def _handle_check_points(self, session: UserSession) -> Dict:
        """Handle points checking"""
        user_data = self._get_user_data(session)
        
        if not user_data:
            return self._create_text_response("Por favor, regístrate primero enviando tu email.")
        
        # Get detailed points info
        points_info = self._get_points_details(user_data['id'])
        
        message = f"""
💎 *Tu Balance de Puntos*

📊 *Resumen:*
• Puntos totales: {points_info['total_points']} pts
• Puntos disponibles: {points_info['available_points']} pts
• Nivel: {points_info['tier']} {self._get_tier_emoji(points_info['tier'])}
• Ranking: #{points_info['rank']}

📈 *Actividad Hoy:*
• Puntos ganados: {points_info['daily_earned']}/{points_info['daily_limit']}
• Juegos jugados: {points_info['games_played']}/5
• Amigos invitados: {points_info['friends_invited']}

🎯 *Próxima Meta:*
{points_info['next_milestone']}

🔥 *Racha:* {points_info['streak']} días consecutivos
        """
        
        buttons = [
            {'type': 'reply', 'reply': {'id': 'earn_more', 'title': '💰 Ganar más puntos'}},
            {'type': 'reply', 'reply': {'id': 'history', 'title': '📜 Ver historial'}},
            {'type': 'reply', 'reply': {'id': 'menu', 'title': '↩️ Menú principal'}}
        ]
        
        return self._create_interactive_response(message, buttons)

    def _handle_games_menu(self, session: UserSession) -> Dict:
        """Show games menu"""
        message = """
🎮 *Mini-Juegos Disponibles*

Elige un juego para ganar puntos:
        """
        
        games_list = []
        for game_id, game in self.games.items():
            if game_id not in ['daily_check', 'referral_race']:  # These are not direct games
                status = self._check_game_availability(session, game_id)
                emoji = "✅" if status['available'] else "🔒"
                games_list.append(f"{emoji} {game['name']}")
                if not status['available']:
                    games_list.append(f"   ⏰ Disponible en: {status['next_available']}")
        
        message += "\n".join(games_list)
        
        # Create game buttons
        buttons = []
        for game_id, game in self.games.items():
            if game_id in ['trivia', 'word_hunt', 'scratch_card', 'spin_wheel']:
                status = self._check_game_availability(session, game_id)
                if status['available']:
                    buttons.append({
                        'type': 'reply',
                        'reply': {'id': f'play_{game_id}', 'title': game['name']}
                    })
        
        buttons.append({'type': 'reply', 'reply': {'id': 'menu', 'title': '↩️ Menú principal'}})
        
        session.state = ConversationState.PLAYING_GAME
        
        return self._create_interactive_response(message, buttons[:3])  # WhatsApp limit is 3 buttons

    async def _play_trivia_game(self, session: UserSession) -> Dict:
        """Play trivia game"""
        # Get random question
        questions = self.games['trivia']['questions']
        import random
        question = random.choice(questions)
        
        # Store question in session
        session.temp_data['current_question'] = question
        session.game_in_progress = 'trivia'
        
        message = f"""
🎯 *Trivia de Viajes*

{question['question']}

{chr(10).join(question['options'])}

Responde con la letra correcta (A, B, C o D)
        """
        
        return self._create_text_response(message)

    async def _play_scratch_card(self, session: UserSession) -> Dict:
        """Play scratch card game"""
        import random
        
        # Check if won
        won = random.random() < self.games['scratch_card']['win_probability']
        
        if won:
            points = random.randint(
                self.games['scratch_card']['min_points'],
                self.games['scratch_card']['max_points']
            )
            
            # Award points
            self._award_game_points(session, 'scratch_card', points)
            
            message = f"""
🎰 *¡GANASTE!*

🎉🎉🎉
💰 *+{points} PUNTOS*
🎉🎉🎉

¡Felicitaciones! Has ganado {points} puntos.

Tu balance actual: {self._get_user_points(session)} pts
            """
        else:
            message = """
🎰 *Rasca y Gana*

😔 Esta vez no hubo suerte...
¡Inténtalo mañana nuevamente!

💡 Tip: Invita amigos para ganar puntos garantizados
            """
        
        # Update game usage
        self._update_game_usage(session, 'scratch_card')
        
        buttons = [
            {'type': 'reply', 'reply': {'id': 'play_again', 'title': '🎮 Otro juego'}},
            {'type': 'reply', 'reply': {'id': 'share_result', 'title': '📱 Compartir'}},
            {'type': 'reply', 'reply': {'id': 'menu', 'title': '↩️ Menú'}}
        ]
        
        return self._create_interactive_response(message, buttons)

    async def _play_spin_wheel(self, session: UserSession) -> Dict:
        """Play spin wheel game"""
        import random
        import numpy as np
        
        # Select prize based on weights
        prizes = self.games['spin_wheel']['prizes']
        weights = self.games['spin_wheel']['weights']
        
        prize = np.random.choice(prizes, p=weights)
        
        # Create visual wheel
        wheel_visual = """
        🎡 *RULETA DE LA FORTUNA* 🎡
        
            ╔═══╦═══╦═══╗
            ║ 50║ 2 ║ 30║
            ╠═══╬═══╬═══╣
            ║ 5 ║ 🎯 ║ 20║
            ╠═══╬═══╬═══╣
            ║ 10║ 15║ 0 ║
            ╚═══╩═══╩═══╝
        """
        
        if prize > 0:
            self._award_game_points(session, 'spin_wheel', prize)
            
            message = f"""
{wheel_visual}

🎊 *¡La ruleta se detuvo en {prize}!*

✨ Has ganado *{prize} puntos* ✨

🏆 Balance actual: {self._get_user_points(session)} pts
            """
            
            # Check for special achievement
            if prize >= 30:
                message += "\n\n🌟 *¡PREMIO MAYOR!* Comparte para obtener 5 puntos extra"
        else:
            message = f"""
{wheel_visual}

😅 La ruleta se detuvo en 0...

¡No te preocupes! Mañana tendrás otra oportunidad.

💡 Mientras tanto, invita a un amigo para ganar puntos seguros!
            """
        
        self._update_game_usage(session, 'spin_wheel')
        
        return self._create_text_response(message)

    def _handle_referral_start(self, session: UserSession) -> Dict:
        """Start referral process"""
        user_data = self._get_user_data(session)
        referral_code = user_data.get('referral_code', 'SPIRIT2024')
        
        # Generate referral link
        referral_link = f"https://wa.me/{self.config['whatsapp_number']}?text=Hola!%20Me%20uno%20con%20el%20codigo%20{referral_code}"
        
        # Get referral stats
        stats = self._get_referral_stats(session.user_id)
        
        message = f"""
👥 *Sistema de Referidos*

Tu código único: *{referral_code}*
🔗 Tu link: {referral_link}

📊 *Tus estadísticas:*
• Invitaciones enviadas: {stats['sent']}
• Amigos unidos: {stats['joined']}
• Amigos activos: {stats['active']}
• Puntos ganados: {stats['points_earned']} pts

💰 *Recompensas:*
• Por invitar: 0.5 pts
• Amigo se une: 10 pts
• Amigo activo (5 días): 20 pts

🎯 *Meta mensual:* {stats['monthly_progress']}/10 amigos
Premio: 100 puntos bonus

¿Qué deseas hacer?
        """
        
        buttons = [
            {'type': 'reply', 'reply': {'id': 'send_invite', 'title': '📤 Enviar invitación'}},
            {'type': 'reply', 'reply': {'id': 'check_pending', 'title': '⏳ Ver pendientes'}},
            {'type': 'reply', 'reply': {'id': 'menu', 'title': '↩️ Menú'}}
        ]
        
        session.state = ConversationState.REFERRING_FRIEND
        
        return self._create_interactive_response(message, buttons)

    async def _send_referral_invitation(self, session: UserSession, contacts: List[str]) -> Dict:
        """Send referral invitations"""
        user_name = self._get_user_name(session)
        referral_code = self._get_user_data(session).get('referral_code', 'SPIRIT2024')
        
        successful = 0
        failed = 0
        
        for contact in contacts[:5]:  # Limit to 5 at a time
            try:
                # Format message
                invite_message = self.viral_templates['invite_friend'].format(
                    user_name=user_name,
                    referral_code=referral_code,
                    join_link=f"https://spirittours.com/join/{referral_code}"
                )
                
                # Send via WhatsApp
                await self._send_whatsapp_message(contact, invite_message)
                
                # Track invitation
                self._track_referral_sent(session.user_id, contact)
                
                # Award points for sending
                self._award_points(session.user_id, 0.5, "Invitación enviada")
                
                successful += 1
                
            except Exception as e:
                logger.error(f"Failed to send invite to {contact}: {str(e)}")
                failed += 1
        
        message = f"""
✅ *Invitaciones Enviadas*

• Exitosas: {successful}
• Fallidas: {failed}
• Puntos ganados: {successful * 0.5} pts

Las invitaciones han sido enviadas. 
Recibirás 10 puntos cuando se unan y 20 puntos adicionales cuando estén activos por 5 días.

🔔 Te notificaré cuando alguien use tu código!
        """
        
        return self._create_text_response(message)

    def _handle_share_menu(self, session: UserSession) -> Dict:
        """Handle sharing menu"""
        message = """
📱 *Compartir y Ganar Puntos*

Comparte nuestro contenido y gana:
• Historia de Instagram: 10 pts
• Post de Facebook: 15 pts
• Tweet con hashtag: 8 pts
• Estado de WhatsApp: 5 pts

Selecciona qué compartir:
        """
        
        share_options = [
            {
                'id': 'share_raffle',
                'title': '🎁 Sorteo actual',
                'points': 15,
                'content': 'current_raffle'
            },
            {
                'id': 'share_achievement',
                'title': '🏆 Mi logro',
                'points': 10,
                'content': 'achievement'
            },
            {
                'id': 'share_testimony',
                'title': '⭐ Mi experiencia',
                'points': 20,
                'content': 'testimony'
            },
            {
                'id': 'share_itinerary',
                'title': '✈️ Itinerario',
                'points': 12,
                'content': 'itinerary'
            }
        ]
        
        # Create share cards
        cards = []
        for option in share_options:
            cards.append({
                'title': option['title'],
                'description': f"Gana {option['points']} puntos",
                'id': option['id']
            })
        
        session.state = ConversationState.SHARING_CONTENT
        
        return self._create_carousel_response("Elige qué compartir:", cards)

    async def _process_share_verification(self, session: UserSession, platform: str, content_url: str) -> Dict:
        """Verify and reward social media sharing"""
        # Simulate verification (in production, use actual API)
        verified = await self._verify_social_share(platform, content_url, session.user_id)
        
        if verified:
            # Award points based on platform
            points = {
                'instagram_story': 10,
                'instagram_post': 12,
                'facebook_post': 15,
                'facebook_story': 8,
                'twitter': 8,
                'whatsapp_status': 5,
                'tiktok': 18
            }.get(platform, 5)
            
            self._award_points(session.user_id, points, f"Compartido en {platform}")
            
            message = f"""
✅ *¡Compartido verificado!*

Has ganado {points} puntos por compartir en {platform}.

Total de puntos: {self._get_user_points(session)} pts

🎯 Siguiente nivel en: {self._points_to_next_tier(session)} pts
            """
            
            # Bonus for multiple shares
            daily_shares = self._get_daily_shares(session.user_id)
            if daily_shares == 3:
                self._award_points(session.user_id, 10, "Bonus: 3 compartidos hoy")
                message += "\n\n🎊 *¡BONUS!* +10 puntos por 3 compartidos hoy"
            
        else:
            message = """
❌ No pudimos verificar tu publicación.

Asegúrate de:
• Hacer la publicación pública
• Usar nuestro hashtag #SpiritToursRewards
• Etiquetar @SpiritTours
• Esperar 1 minuto antes de verificar

Intenta nuevamente o contacta soporte.
            """
        
        return self._create_text_response(message)

    def _handle_daily_checkin(self, session: UserSession) -> Dict:
        """Handle daily check-in with streak bonus"""
        user_id = session.user_id
        last_checkin = self._get_last_checkin(user_id)
        today = datetime.utcnow().date()
        
        if last_checkin and last_checkin.date() == today:
            return self._create_text_response("Ya hiciste check-in hoy. ¡Vuelve mañana! ⏰")
        
        # Calculate streak
        streak = self._calculate_streak(user_id)
        if last_checkin and (today - last_checkin.date()).days == 1:
            streak += 1
        else:
            streak = 1
        
        # Calculate points
        base_points = self.games['daily_check']['base_points']
        streak_bonus = min(streak - 1, self.games['daily_check']['max_streak']) * self.games['daily_check']['streak_bonus']
        total_points = base_points + streak_bonus
        
        # Award points
        self._award_points(user_id, total_points, f"Check-in diario (racha: {streak})")
        self._update_checkin(user_id, streak)
        
        message = f"""
📅 *¡Check-in Exitoso!*

✅ Día {streak} consecutivo
🎁 Puntos base: {base_points} pts
🔥 Bonus de racha: {streak_bonus} pts
💰 *Total ganado: {total_points} pts*

        """
        
        # Add motivation based on streak
        if streak == 7:
            message += "\n🏆 *¡1 SEMANA COMPLETA!* +20 puntos bonus"
            self._award_points(user_id, 20, "Bonus: 7 días consecutivos")
        elif streak == 30:
            message += "\n👑 *¡30 DÍAS CONSECUTIVOS!* +100 puntos bonus"
            self._award_points(user_id, 100, "Bonus: 30 días consecutivos")
        
        # Add next milestone
        next_milestone = self._get_next_milestone(streak)
        if next_milestone:
            message += f"\n\n🎯 Siguiente meta: {next_milestone['days']} días ({next_milestone['reward']} pts bonus)"
        
        return self._create_text_response(message)

    async def _process_voice_message(self, session: UserSession, audio_data: Dict) -> Dict:
        """Process voice messages with speech-to-text"""
        try:
            # Download audio file
            audio_url = audio_data.get('url')
            audio_content = await self._download_media(audio_url)
            
            # Convert to text using OpenAI Whisper or similar
            text = await self._speech_to_text(audio_content)
            
            # Process as text message
            return await self._process_text_message(session, text)
            
        except Exception as e:
            logger.error(f"Voice processing error: {str(e)}")
            return self._create_text_response("No pude procesar el audio. Por favor, escribe tu mensaje.")

    def _create_interactive_response(self, text: str, buttons: List[Dict]) -> Dict:
        """Create interactive message with buttons"""
        return {
            'type': 'interactive',
            'interactive': {
                'type': 'button',
                'body': {'text': text},
                'action': {'buttons': buttons}
            }
        }

    def _create_text_response(self, text: str) -> Dict:
        """Create simple text response"""
        return {
            'type': 'text',
            'text': {'body': text}
        }

    def _create_carousel_response(self, header: str, cards: List[Dict]) -> Dict:
        """Create carousel/list response"""
        return {
            'type': 'interactive',
            'interactive': {
                'type': 'list',
                'header': {'type': 'text', 'text': header},
                'body': {'text': 'Selecciona una opción'},
                'action': {
                    'button': 'Ver opciones',
                    'sections': [{
                        'title': 'Opciones disponibles',
                        'rows': cards
                    }]
                }
            }
        }

    def _get_or_create_session(self, phone: str) -> UserSession:
        """Get or create user session"""
        if phone in self.sessions:
            return self.sessions[phone]
        
        # Try to load from Redis
        session_data = self.redis.get(f"wa_session:{phone}")
        if session_data:
            return UserSession(**json.loads(session_data))
        
        # Create new session
        session = UserSession(
            phone_number=phone,
            user_id=self._get_user_id_by_phone(phone),
            state=ConversationState.WELCOME,
            context={},
            language='es',
            last_activity=datetime.utcnow(),
            temp_data={},
            game_in_progress=None,
            referral_pending=[],
            daily_interactions=0
        )
        
        self.sessions[phone] = session
        return session

    def _save_session(self, session: UserSession):
        """Save session to Redis"""
        session_data = {
            'phone_number': session.phone_number,
            'user_id': session.user_id,
            'state': session.state.value,
            'context': session.context,
            'language': session.language,
            'last_activity': session.last_activity.isoformat(),
            'temp_data': session.temp_data,
            'game_in_progress': session.game_in_progress,
            'referral_pending': session.referral_pending,
            'daily_interactions': session.daily_interactions
        }
        
        self.redis.setex(
            f"wa_session:{session.phone_number}",
            3600 * 24,  # 24 hours
            json.dumps(session_data, default=str)
        )

    # Additional helper methods would go here...