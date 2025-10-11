"""
Advanced Viral Mini-Games System with Social Sharing Mechanics
"""
from typing import Dict, Any, List, Optional, Tuple
import asyncio
import random
import hashlib
import json
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import redis
import cv2
import qrcode
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import logging

logger = logging.getLogger(__name__)

class GameType(Enum):
    TRIVIA = "trivia"
    MEMORY = "memory"
    PUZZLE = "puzzle"
    WORD_SEARCH = "word_search"
    SPIN_WHEEL = "spin_wheel"
    SCRATCH_CARD = "scratch_card"
    TREASURE_HUNT = "treasure_hunt"
    SOCIAL_CHALLENGE = "social_challenge"
    PREDICTION = "prediction"
    COLLECTION = "collection"
    BATTLE = "battle"
    TOURNAMENT = "tournament"

class SharePlatform(Enum):
    WHATSAPP = "whatsapp"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    TIKTOK = "tiktok"
    TWITTER = "twitter"
    TELEGRAM = "telegram"
    YOUTUBE = "youtube"
    LINKEDIN = "linkedin"

@dataclass
class GameSession:
    session_id: str
    user_id: int
    game_type: GameType
    started_at: datetime
    completed_at: Optional[datetime]
    score: int
    points_earned: int
    shares_count: int
    referrals_generated: int
    metadata: Dict[str, Any]
    is_viral: bool
    viral_chain: List[int]  # User IDs in viral chain

@dataclass
class ViralChallenge:
    challenge_id: str
    creator_id: int
    game_type: GameType
    title: str
    description: str
    target_score: int
    reward_points: int
    participants: List[int]
    deadline: datetime
    share_bonus: int
    max_participants: int
    current_leader: Optional[int]
    leaderboard: Dict[int, int]

class ViralGamesService:
    """Advanced viral games system with social mechanics"""
    
    def __init__(self, db: Session, redis_client: redis.Redis):
        self.db = db
        self.redis = redis_client
        self.games_config = self._initialize_games()
        self.viral_multipliers = self._load_viral_multipliers()
        self.share_templates = self._load_share_templates()
        
    def _initialize_games(self) -> Dict:
        """Initialize all mini-games configuration"""
        return {
            'trivia_mundial': {
                'name': '🌍 Trivia Mundial Spirit Tours',
                'description': 'Demuestra tu conocimiento sobre destinos sagrados',
                'base_points': 5,
                'viral_bonus': 2,
                'share_platforms': ['whatsapp', 'facebook', 'instagram'],
                'questions': self._load_trivia_questions(),
                'difficulty_multiplier': {'easy': 1, 'medium': 1.5, 'hard': 2},
                'time_bonus': True,
                'perfect_streak_bonus': 20
            },
            
            'memory_lugares': {
                'name': '🧠 Memoria de Lugares Sagrados',
                'description': 'Encuentra pares de lugares santos',
                'base_points': 3,
                'viral_bonus': 1,
                'grid_sizes': {'easy': '4x4', 'medium': '6x6', 'hard': '8x8'},
                'time_limits': {'easy': 120, 'medium': 180, 'hard': 240},
                'perfect_bonus': 15
            },
            
            'puzzle_jerusalen': {
                'name': '🧩 Puzzle de Jerusalén',
                'description': 'Arma la imagen del Santo Sepulcro',
                'base_points': 8,
                'viral_bonus': 3,
                'pieces': {'easy': 9, 'medium': 25, 'hard': 49},
                'images': self._load_puzzle_images(),
                'hint_cost': 2,
                'completion_bonus': 10
            },
            
            'busca_palabras': {
                'name': '🔤 Busca Palabras Sagradas',
                'description': 'Encuentra palabras relacionadas con peregrinaciones',
                'base_points': 4,
                'viral_bonus': 2,
                'words': self._load_word_list(),
                'grid_size': 15,
                'categories': ['santos', 'lugares', 'oraciones', 'milagros'],
                'category_bonus': 5
            },
            
            'ruleta_fortunata': {
                'name': '🎡 Ruleta Fortunata',
                'description': 'Gira y gana puntos instantáneos',
                'base_points': 0,
                'prizes': [0, 2, 5, 10, 15, 20, 30, 50, 100],
                'probabilities': [0.2, 0.25, 0.20, 0.15, 0.10, 0.05, 0.03, 0.015, 0.005],
                'daily_spins': 3,
                'share_for_extra_spin': 5,
                'jackpot_chance': 0.001,
                'jackpot_value': 500
            },
            
            'raspadito_virtual': {
                'name': '🎰 Raspadito Virtual',
                'description': 'Rasca y descubre premios ocultos',
                'base_points': 0,
                'win_probability': 0.6,
                'prize_range': {'min': 1, 'max': 30},
                'special_prizes': [
                    {'type': 'double_points', 'probability': 0.05},
                    {'type': 'free_raffle_entry', 'probability': 0.02},
                    {'type': 'instant_50', 'probability': 0.01}
                ],
                'daily_cards': 2,
                'cost_per_extra': 10
            },
            
            'caza_tesoros': {
                'name': '🗺️ Caza del Tesoro Espiritual',
                'description': 'Encuentra tesoros ocultos en el mapa',
                'base_points': 10,
                'viral_bonus': 5,
                'locations': self._load_treasure_locations(),
                'clues': self._generate_clues(),
                'time_limit': 300,
                'helper_friend_bonus': 15,
                'perfect_hunt_bonus': 50
            },
            
            'desafio_social': {
                'name': '📱 Desafío Social Viral',
                'description': 'Completa retos sociales para ganar puntos',
                'challenges': [
                    {
                        'id': 'share_story',
                        'name': 'Comparte en tu historia',
                        'points': 10,
                        'platforms': ['instagram', 'facebook', 'whatsapp'],
                        'verification': 'screenshot'
                    },
                    {
                        'id': 'tag_friends',
                        'name': 'Etiqueta 3 amigos',
                        'points': 15,
                        'min_friends': 3,
                        'verification': 'api'
                    },
                    {
                        'id': 'create_reel',
                        'name': 'Crea un Reel/TikTok',
                        'points': 30,
                        'min_duration': 15,
                        'must_include': ['@spirittours', '#SpiritToursRewards'],
                        'verification': 'manual'
                    },
                    {
                        'id': 'review_google',
                        'name': 'Deja una reseña en Google',
                        'points': 25,
                        'min_stars': 4,
                        'min_words': 50,
                        'verification': 'api'
                    }
                ]
            },
            
            'prediccion_viajes': {
                'name': '🔮 Predicción de Destinos',
                'description': 'Predice el próximo destino más popular',
                'base_points': 5,
                'correct_prediction_bonus': 50,
                'participation_points': 5,
                'destinations': ['Tierra Santa', 'Fátima', 'Lourdes', 'Santiago', 'Roma'],
                'voting_period': 7,  # days
                'reveal_date': 'monthly'
            },
            
            'coleccion_estampas': {
                'name': '📖 Colección de Estampas Sagradas',
                'description': 'Colecciona estampas de santos y lugares',
                'base_points': 2,
                'complete_set_bonus': 100,
                'stamps': self._load_stamps_collection(),
                'rarity_levels': {'common': 0.6, 'rare': 0.3, 'epic': 0.08, 'legendary': 0.02},
                'trade_enabled': True,
                'duplicate_exchange_rate': 3  # 3 duplicates = 1 new random
            },
            
            'batalla_conocimiento': {
                'name': '⚔️ Batalla de Conocimiento',
                'description': 'Desafía a otro jugador en tiempo real',
                'base_points': 10,
                'winner_bonus': 20,
                'draw_points': 5,
                'rounds': 5,
                'time_per_question': 15,
                'categories': ['historia', 'geografia', 'cultura', 'religion'],
                'ranking_points': True
            },
            
            'torneo_semanal': {
                'name': '🏆 Torneo Semanal Spirit',
                'description': 'Compite por el primer lugar de la semana',
                'entry_points': 0,
                'prizes': {
                    1: 500,
                    2: 300,
                    3: 200,
                    'top_10': 100,
                    'top_50': 50,
                    'participation': 10
                },
                'games_included': ['trivia', 'memory', 'puzzle'],
                'min_games_to_qualify': 10,
                'leaderboard_update': 'realtime'
            }
        }

    def _load_viral_multipliers(self) -> Dict:
        """Load viral sharing multipliers"""
        return {
            'first_share': 1.0,
            'second_share': 1.2,
            'third_share': 1.5,
            'viral_threshold': 10,  # shares to go viral
            'viral_multiplier': 2.0,
            'super_viral_threshold': 50,
            'super_viral_multiplier': 3.0,
            'friend_plays_multiplier': 0.1,  # 10% bonus per friend who plays
            'max_friend_bonus': 2.0,  # Max 200% bonus
            'chain_bonus': 0.05,  # 5% for each person in chain
            'max_chain_length': 20
        }

    async def create_game_session(self, user_id: int, game_type: str, 
                                 challenge_id: Optional[str] = None) -> GameSession:
        """Create a new game session"""
        session_id = self._generate_session_id()
        
        session = GameSession(
            session_id=session_id,
            user_id=user_id,
            game_type=GameType(game_type),
            started_at=datetime.utcnow(),
            completed_at=None,
            score=0,
            points_earned=0,
            shares_count=0,
            referrals_generated=0,
            metadata={'challenge_id': challenge_id} if challenge_id else {},
            is_viral=False,
            viral_chain=[]
        )
        
        # Store in Redis with TTL
        self.redis.setex(
            f"game_session:{session_id}",
            3600,  # 1 hour TTL
            json.dumps(self._session_to_dict(session))
        )
        
        # Track active sessions
        self.redis.sadd(f"active_sessions:{user_id}", session_id)
        
        logger.info(f"Created game session {session_id} for user {user_id}")
        
        return session

    async def play_trivia_mundial(self, session: GameSession, answer: str) -> Dict:
        """Play trivia game with viral mechanics"""
        current_question_idx = session.metadata.get('current_question', 0)
        questions = self.games_config['trivia_mundial']['questions']
        
        if current_question_idx >= len(questions):
            return await self._complete_game(session)
        
        question = questions[current_question_idx]
        is_correct = answer.upper() == question['correct']
        
        # Calculate points
        difficulty = question.get('difficulty', 'medium')
        base_points = self.games_config['trivia_mundial']['base_points']
        difficulty_mult = self.games_config['trivia_mundial']['difficulty_multiplier'][difficulty]
        
        if is_correct:
            points = int(base_points * difficulty_mult)
            
            # Time bonus
            time_taken = (datetime.utcnow() - session.started_at).seconds
            if time_taken < 10:
                points *= 1.5
            
            # Streak bonus
            streak = session.metadata.get('streak', 0) + 1
            if streak >= 5:
                points += self.games_config['trivia_mundial']['perfect_streak_bonus']
            
            session.metadata['streak'] = streak
            session.score += points
            session.points_earned += points
            
            response = {
                'correct': True,
                'points_earned': points,
                'explanation': question['explanation'],
                'streak': streak,
                'next_question': current_question_idx < len(questions) - 1
            }
        else:
            session.metadata['streak'] = 0
            response = {
                'correct': False,
                'correct_answer': question['correct'],
                'explanation': question['explanation'],
                'next_question': current_question_idx < len(questions) - 1
            }
        
        # Move to next question
        session.metadata['current_question'] = current_question_idx + 1
        
        # Save session
        await self._save_session(session)
        
        # Check for viral trigger
        if session.metadata.get('streak', 0) >= 10:
            await self._trigger_viral_event(session, 'perfect_streak')
        
        return response

    async def play_memory_game(self, session: GameSession, card_positions: List[int]) -> Dict:
        """Play memory matching game"""
        if len(card_positions) != 2:
            return {'error': 'Debe seleccionar exactamente 2 cartas'}
        
        # Initialize board if first turn
        if 'board' not in session.metadata:
            session.metadata['board'] = self._generate_memory_board(
                session.metadata.get('difficulty', 'medium')
            )
            session.metadata['revealed'] = []
            session.metadata['attempts'] = 0
        
        board = session.metadata['board']
        pos1, pos2 = card_positions
        
        # Check if positions are valid
        if pos1 >= len(board) or pos2 >= len(board):
            return {'error': 'Posición inválida'}
        
        # Check if already revealed
        if pos1 in session.metadata['revealed'] or pos2 in session.metadata['revealed']:
            return {'error': 'Carta ya revelada'}
        
        # Check for match
        is_match = board[pos1] == board[pos2]
        session.metadata['attempts'] += 1
        
        if is_match:
            session.metadata['revealed'].extend([pos1, pos2])
            points = self.games_config['memory_lugares']['base_points']
            
            # Bonus for fewer attempts
            if session.metadata['attempts'] <= len(board) // 2:
                points *= 2
            
            session.score += points
            session.points_earned += points
            
            # Check if game complete
            if len(session.metadata['revealed']) == len(board):
                return await self._complete_game(session)
            
            response = {
                'match': True,
                'points_earned': points,
                'cards_remaining': (len(board) - len(session.metadata['revealed'])) // 2,
                'revealed_cards': session.metadata['revealed']
            }
        else:
            response = {
                'match': False,
                'card1': board[pos1],
                'card2': board[pos2],
                'attempts': session.metadata['attempts']
            }
        
        await self._save_session(session)
        return response

    async def play_spin_wheel(self, session: GameSession) -> Dict:
        """Play spin wheel with viral jackpot"""
        config = self.games_config['ruleta_fortunata']
        
        # Check daily limit
        daily_spins = await self._get_daily_spins(session.user_id)
        if daily_spins >= config['daily_spins']:
            return {
                'error': 'Límite diario alcanzado',
                'next_spin': 'mañana',
                'share_for_spin': True
            }
        
        # Check for jackpot
        if random.random() < config['jackpot_chance']:
            prize = config['jackpot_value']
            is_jackpot = True
            
            # Trigger viral event for jackpot
            await self._trigger_viral_event(session, 'jackpot_won', {'amount': prize})
        else:
            # Normal spin
            prizes = config['prizes']
            probabilities = config['probabilities']
            prize = np.random.choice(prizes, p=probabilities)
            is_jackpot = False
        
        # Award points
        if prize > 0:
            session.points_earned += prize
            await self._award_points(session.user_id, prize, f'Ruleta: {prize} puntos')
        
        # Update daily count
        await self._increment_daily_spins(session.user_id)
        
        # Generate wheel animation data
        wheel_data = self._generate_wheel_animation(prize, is_jackpot)
        
        response = {
            'prize': prize,
            'is_jackpot': is_jackpot,
            'animation': wheel_data,
            'total_points': session.points_earned,
            'spins_remaining': config['daily_spins'] - daily_spins - 1,
            'share_bonus_available': True
        }
        
        await self._save_session(session)
        return response

    async def create_viral_challenge(self, creator_id: int, game_type: str,
                                   title: str, description: str,
                                   target_score: int, reward_points: int,
                                   deadline_hours: int = 24) -> ViralChallenge:
        """Create a viral challenge for others to beat"""
        challenge_id = self._generate_challenge_id()
        
        challenge = ViralChallenge(
            challenge_id=challenge_id,
            creator_id=creator_id,
            game_type=GameType(game_type),
            title=title,
            description=description,
            target_score=target_score,
            reward_points=reward_points,
            participants=[creator_id],
            deadline=datetime.utcnow() + timedelta(hours=deadline_hours),
            share_bonus=int(reward_points * 0.1),  # 10% for sharing
            max_participants=100,
            current_leader=creator_id,
            leaderboard={creator_id: target_score}
        )
        
        # Store in Redis
        self.redis.setex(
            f"challenge:{challenge_id}",
            deadline_hours * 3600,
            json.dumps(self._challenge_to_dict(challenge))
        )
        
        # Add to active challenges
        self.redis.zadd(
            "active_challenges",
            {challenge_id: challenge.deadline.timestamp()}
        )
        
        # Create shareable content
        share_content = await self._create_challenge_share_content(challenge)
        
        logger.info(f"Created viral challenge {challenge_id} by user {creator_id}")
        
        return {
            'challenge': challenge,
            'share_content': share_content
        }

    async def join_viral_challenge(self, user_id: int, challenge_id: str) -> Dict:
        """Join an existing viral challenge"""
        challenge_data = self.redis.get(f"challenge:{challenge_id}")
        if not challenge_data:
            return {'error': 'Challenge not found or expired'}
        
        challenge = self._dict_to_challenge(json.loads(challenge_data))
        
        if user_id in challenge.participants:
            return {'error': 'Already participating in this challenge'}
        
        if len(challenge.participants) >= challenge.max_participants:
            return {'error': 'Challenge is full'}
        
        if datetime.utcnow() > challenge.deadline:
            return {'error': 'Challenge has ended'}
        
        # Add participant
        challenge.participants.append(user_id)
        
        # Award share bonus to inviter (if referred)
        referrer = self._get_referrer_for_challenge(user_id, challenge_id)
        if referrer:
            await self._award_points(
                referrer,
                challenge.share_bonus,
                f'Bonus por compartir desafío {challenge_id}'
            )
        
        # Save updated challenge
        self.redis.setex(
            f"challenge:{challenge_id}",
            int((challenge.deadline - datetime.utcnow()).total_seconds()),
            json.dumps(self._challenge_to_dict(challenge))
        )
        
        # Create game session for the challenge
        session = await self.create_game_session(
            user_id,
            challenge.game_type.value,
            challenge_id
        )
        
        return {
            'success': True,
            'session_id': session.session_id,
            'challenge': challenge,
            'current_leader': challenge.current_leader,
            'target_score': challenge.target_score
        }

    async def track_social_share(self, user_id: int, session_id: str, 
                                platform: str, content_type: str,
                                reach_estimate: int = 0) -> Dict:
        """Track and reward social media shares"""
        session = await self._get_session(session_id)
        if not session:
            return {'error': 'Session not found'}
        
        platform_enum = SharePlatform(platform.lower())
        
        # Calculate share value
        base_value = {
            SharePlatform.WHATSAPP: 5,
            SharePlatform.FACEBOOK: 8,
            SharePlatform.INSTAGRAM: 10,
            SharePlatform.TIKTOK: 15,
            SharePlatform.TWITTER: 6,
            SharePlatform.TELEGRAM: 5,
            SharePlatform.YOUTUBE: 20,
            SharePlatform.LINKEDIN: 7
        }.get(platform_enum, 5)
        
        # Apply viral multipliers
        session.shares_count += 1
        multiplier = self._calculate_viral_multiplier(session.shares_count)
        
        # Bonus for reach
        reach_bonus = min(reach_estimate // 100, 10)  # 1 point per 100 reach, max 10
        
        total_points = int((base_value + reach_bonus) * multiplier)
        
        # Award points
        await self._award_points(
            user_id,
            total_points,
            f'Compartido en {platform}: {content_type}'
        )
        
        session.points_earned += total_points
        
        # Check for viral status
        if session.shares_count >= self.viral_multipliers['viral_threshold']:
            session.is_viral = True
            await self._trigger_viral_event(session, 'content_viral')
        
        # Track share analytics
        self._track_share_analytics(user_id, platform, content_type, reach_estimate)
        
        await self._save_session(session)
        
        return {
            'points_earned': total_points,
            'total_shares': session.shares_count,
            'viral_status': session.is_viral,
            'multiplier': multiplier,
            'next_milestone': self._get_next_share_milestone(session.shares_count)
        }

    async def process_referral_play(self, referrer_id: int, referred_id: int,
                                   session_id: str) -> Dict:
        """Process when a referred friend plays a game"""
        session = await self._get_session(session_id)
        if not session:
            return {'error': 'Session not found'}
        
        # Check if not already in viral chain
        if referred_id in session.viral_chain:
            return {'already_in_chain': True}
        
        # Add to viral chain
        session.viral_chain.append(referred_id)
        
        # Calculate chain bonus
        chain_length = len(session.viral_chain)
        chain_bonus = min(
            chain_length * self.viral_multipliers['chain_bonus'],
            self.viral_multipliers['max_chain_length'] * self.viral_multipliers['chain_bonus']
        )
        
        points = int(session.points_earned * chain_bonus)
        
        # Award points to referrer
        await self._award_points(
            referrer_id,
            points,
            f'Amigo jugó: +{points} puntos (cadena de {chain_length})'
        )
        
        # Award smaller bonus to referred
        friend_bonus = int(points * 0.3)
        await self._award_points(
            referred_id,
            friend_bonus,
            f'Bonus por jugar juego de amigo'
        )
        
        session.referrals_generated += 1
        
        # Check for viral achievements
        if chain_length >= 5:
            await self._trigger_viral_event(session, 'viral_chain_5')
        if chain_length >= 10:
            await self._trigger_viral_event(session, 'viral_chain_10')
        
        await self._save_session(session)
        
        return {
            'chain_bonus': points,
            'friend_bonus': friend_bonus,
            'chain_length': chain_length,
            'total_referrals': session.referrals_generated
        }

    async def generate_share_content(self, session_id: str, platform: str) -> Dict:
        """Generate optimized share content for each platform"""
        session = await self._get_session(session_id)
        if not session:
            return {'error': 'Session not found'}
        
        user_data = await self._get_user_data(session.user_id)
        game_config = self.games_config.get(session.game_type.value, {})
        
        # Generate platform-specific content
        if platform == 'instagram':
            content = await self._generate_instagram_story(session, user_data, game_config)
        elif platform == 'facebook':
            content = await self._generate_facebook_post(session, user_data, game_config)
        elif platform == 'tiktok':
            content = await self._generate_tiktok_script(session, user_data, game_config)
        elif platform == 'whatsapp':
            content = await self._generate_whatsapp_message(session, user_data, game_config)
        else:
            content = await self._generate_generic_share(session, user_data, game_config)
        
        # Add tracking parameters
        content['tracking_url'] = self._create_tracking_url(
            session_id,
            platform,
            session.user_id
        )
        
        # Add viral incentive
        content['incentive_text'] = self._get_viral_incentive_text(
            platform,
            session.shares_count
        )
        
        return content

    async def _generate_instagram_story(self, session: GameSession, 
                                       user_data: Dict, game_config: Dict) -> Dict:
        """Generate Instagram Story content"""
        # Create visually appealing story image
        image = await self._create_story_image(
            background=self._get_game_background(session.game_type),
            score=session.score,
            user_name=user_data['name'],
            game_name=game_config.get('name', 'Mini-juego'),
            achievement=self._get_achievement_text(session)
        )
        
        return {
            'type': 'story',
            'image': image,
            'stickers': [
                {'type': 'mention', 'username': '@spirittours'},
                {'type': 'hashtag', 'tag': '#SpiritToursRewards'},
                {'type': 'poll', 'question': '¿Puedes superar mi puntaje?', 'options': ['Sí 💪', 'No 😅']},
                {'type': 'link', 'url': f'spirittours.com/game/{session.session_id}'}
            ],
            'music': {'track': 'epic_adventure.mp3', 'start_time': 5}
        }

    async def _create_story_image(self, background: str, score: int, 
                                 user_name: str, game_name: str,
                                 achievement: str) -> str:
        """Create story image with PIL"""
        # Create base image
        img = Image.new('RGB', (1080, 1920), color=(73, 109, 137))
        draw = ImageDraw.Draw(img)
        
        # Add background
        if background:
            bg_img = Image.open(background)
            bg_img = bg_img.resize((1080, 1920))
            img.paste(bg_img, (0, 0))
        
        # Add overlay
        overlay = Image.new('RGBA', (1080, 1920), (0, 0, 0, 180))
        img.paste(overlay, (0, 0), overlay)
        
        # Add text
        try:
            title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 80)
            score_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 120)
            text_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 50)
        except:
            title_font = ImageFont.load_default()
            score_font = ImageFont.load_default()
            text_font = ImageFont.load_default()
        
        # Draw game name
        draw.text((540, 400), game_name, font=title_font, fill=(255, 255, 255), anchor="mm")
        
        # Draw score
        draw.text((540, 600), str(score), font=score_font, fill=(255, 215, 0), anchor="mm")
        draw.text((540, 720), "PUNTOS", font=text_font, fill=(255, 255, 255), anchor="mm")
        
        # Draw user name
        draw.text((540, 900), user_name, font=text_font, fill=(255, 255, 255), anchor="mm")
        
        # Draw achievement
        if achievement:
            draw.text((540, 1000), achievement, font=text_font, fill=(0, 255, 0), anchor="mm")
        
        # Draw call to action
        draw.text((540, 1600), "¿Puedes superarme?", font=title_font, fill=(255, 255, 255), anchor="mm")
        draw.text((540, 1700), "Juega en Spirit Tours Rewards", font=text_font, fill=(255, 255, 255), anchor="mm")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"

    def _calculate_viral_multiplier(self, shares_count: int) -> float:
        """Calculate points multiplier based on viral activity"""
        if shares_count >= self.viral_multipliers['super_viral_threshold']:
            return self.viral_multipliers['super_viral_multiplier']
        elif shares_count >= self.viral_multipliers['viral_threshold']:
            return self.viral_multipliers['viral_multiplier']
        elif shares_count >= 3:
            return self.viral_multipliers['third_share']
        elif shares_count >= 2:
            return self.viral_multipliers['second_share']
        else:
            return self.viral_multipliers['first_share']

    async def _trigger_viral_event(self, session: GameSession, event_type: str,
                                  data: Optional[Dict] = None):
        """Trigger special viral event with rewards"""
        viral_rewards = {
            'perfect_streak': 50,
            'jackpot_won': 100,
            'content_viral': 75,
            'viral_chain_5': 30,
            'viral_chain_10': 60,
            'challenge_completed': 40,
            'tournament_winner': 200
        }
        
        reward = viral_rewards.get(event_type, 25)
        
        # Award viral bonus
        await self._award_points(
            session.user_id,
            reward,
            f'Evento viral: {event_type}'
        )
        
        # Create viral notification
        await self._send_viral_notification(session.user_id, event_type, reward, data)
        
        # Update leaderboards
        self._update_viral_leaderboard(session.user_id, event_type, reward)
        
        logger.info(f"Viral event triggered: {event_type} for user {session.user_id}")

    # Helper methods
    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        return hashlib.sha256(
            f"{datetime.utcnow().isoformat()}:{random.random()}".encode()
        ).hexdigest()[:16]
    
    def _generate_challenge_id(self) -> str:
        """Generate unique challenge ID"""
        return f"CH{random.randint(100000, 999999)}"
    
    # Additional helper methods continue...