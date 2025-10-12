"""
Advanced Raffle System for Spirit Tours
Sistema completo de sorteos con múltiples modalidades y viral marketing
"""

import asyncio
import logging
import qrcode
import io
import base64
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
import json
import hashlib
import uuid
import random
import string
from sqlalchemy import and_, or_, desc, func
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import redis
from PIL import Image, ImageDraw, ImageFont
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import facebook
import tweepy
import requests
from barcode import EAN13
from barcode.writer import ImageWriter

logger = logging.getLogger(__name__)

class RaffleType(Enum):
    """Tipos de sorteos disponibles"""
    TRAVEL = "travel"  # Viajes gratis
    SOUVENIR = "souvenir"  # Souvenirs y regalos
    CHRISTMAS = "christmas"  # Navideño
    NEW_YEAR = "new_year"  # Fin de año
    EVENT = "event"  # Eventos con QR
    SEASONAL = "seasonal"  # Temporada
    FLASH = "flash"  # Sorteo relámpago
    MEGA = "mega"  # Mega sorteo
    VIP = "vip"  # Exclusivo VIP
    CHARITY = "charity"  # Benéfico
    PARTNERSHIP = "partnership"  # Con socios
    BIRTHDAY = "birthday"  # Cumpleaños empresa

class EntryMethod(Enum):
    """Métodos de entrada al sorteo"""
    PURCHASE = "purchase"  # Compra
    POINTS = "points"  # Con puntos
    SOCIAL_SHARE = "social_share"  # Compartir en redes
    SOCIAL_FOLLOW = "social_follow"  # Seguir en redes
    REFERRAL = "referral"  # Referencias
    QR_SCAN = "qr_scan"  # Escaneo QR en evento
    EMAIL_SIGNUP = "email_signup"  # Registro email
    APP_DOWNLOAD = "app_download"  # Descarga app
    REVIEW = "review"  # Dejar reseña
    SURVEY = "survey"  # Completar encuesta
    GAME = "game"  # Jugar mini-juego
    DAILY_CHECK = "daily_check"  # Check-in diario

class RaffleStatus(Enum):
    """Estados del sorteo"""
    DRAFT = "draft"  # Borrador
    SCHEDULED = "scheduled"  # Programado
    ACTIVE = "active"  # Activo
    PAUSED = "paused"  # Pausado
    ENDING_SOON = "ending_soon"  # Por terminar
    CLOSED = "closed"  # Cerrado
    DRAWING = "drawing"  # Seleccionando ganador
    COMPLETED = "completed"  # Completado
    CANCELLED = "cancelled"  # Cancelado

class PrizeType(Enum):
    """Tipos de premios"""
    TRIP = "trip"  # Viaje
    FLIGHT = "flight"  # Vuelo
    HOTEL = "hotel"  # Hotel
    TOUR = "tour"  # Tour
    CRUISE = "cruise"  # Crucero
    SOUVENIR = "souvenir"  # Souvenir
    VOUCHER = "voucher"  # Vale de compra
    DISCOUNT = "discount"  # Descuento
    POINTS = "points"  # Puntos
    MEMBERSHIP = "membership"  # Membresía
    EXPERIENCE = "experience"  # Experiencia
    PRODUCT = "product"  # Producto físico
    DIGITAL = "digital"  # Producto digital
    CASH = "cash"  # Dinero efectivo

class AdvancedRaffleSystem:
    """
    Sistema avanzado de sorteos con múltiples modalidades
    Features:
    - Sorteos de eventos con QR
    - Múltiples tipos de sorteos
    - Integración con redes sociales
    - Sistema de puntos viral
    - Analytics y predicciones ML
    """
    
    def __init__(self, db_session: Session, redis_client: redis.Redis):
        self.db = db_session
        self.redis = redis_client
        
        # Configuración
        self.config = {
            'points_per_share': 1,  # Puntos por compartir
            'points_per_like': 1,  # Puntos por like en Facebook
            'points_per_follow': 2,  # Puntos por seguir
            'points_per_referral': 5,  # Puntos por referido
            'points_per_purchase': 10,  # Puntos por compra
            'points_per_review': 3,  # Puntos por reseña
            'max_entries_per_user': 100,  # Máximo entradas por usuario
            'viral_multiplier': 1.5,  # Multiplicador viral
            'event_qr_prefix': 'EVT',  # Prefijo para códigos de evento
            'min_participants': 10,  # Mínimo participantes
            'auto_draw_delay_hours': 24,  # Delay auto sorteo
            'notification_before_end_hours': [48, 24, 6, 1],  # Notificaciones
            'fraud_detection_threshold': 0.8,
            'require_social_verification': True,
            'allow_multiple_wins': False,
            'winner_cooldown_days': 30,  # Días antes de poder ganar de nuevo
        }
        
        # Plataformas sociales
        self.social_platforms = {
            'facebook': {'enabled': True, 'api': None},
            'instagram': {'enabled': True, 'api': None},
            'twitter': {'enabled': True, 'api': None},
            'tiktok': {'enabled': True, 'api': None},
            'youtube': {'enabled': True, 'api': None},
            'linkedin': {'enabled': True, 'api': None},
            'whatsapp': {'enabled': True, 'api': None},
        }
        
        # Inicializar ML para predicciones
        self.ml_predictor = RandomForestClassifier(n_estimators=100)
        self.scaler = StandardScaler()
        self._train_ml_models()
        
        logger.info("Advanced Raffle System initialized")
    
    async def create_raffle(self, creator_id: int, raffle_data: Dict[str, Any]) -> Dict:
        """
        Crear un nuevo sorteo
        
        Args:
            creator_id: ID del creador
            raffle_data: {
                'type': RaffleType,
                'title': str,
                'description': str,
                'prizes': List[Dict],
                'entry_methods': List[str],
                'start_date': datetime,
                'end_date': datetime,
                'event_location': Optional[str],
                'event_code': Optional[str],
                'max_participants': Optional[int],
                'entry_requirements': Dict,
                'social_requirements': Dict,
                'auto_draw': bool,
                'visibility': str,  # public, private, event_only
                'tags': List[str],
                'sponsor_info': Optional[Dict]
            }
        """
        try:
            # Validar datos del sorteo
            validation = await self._validate_raffle_data(raffle_data)
            if not validation['valid']:
                return {
                    'success': False,
                    'error': validation['error']
                }
            
            # Generar ID único del sorteo
            raffle_id = self._generate_raffle_id(raffle_data['type'])
            
            # Generar código de evento si es necesario
            event_code = None
            if raffle_data['type'] == RaffleType.EVENT.value:
                event_code = raffle_data.get('event_code') or \
                           self._generate_event_code(raffle_data.get('event_name', 'EVENT'))
            
            # Calcular valor total de premios
            total_prize_value = sum(
                prize.get('value', 0) for prize in raffle_data['prizes']
            )
            
            # Crear estructura del sorteo
            raffle = {
                'id': raffle_id,
                'creator_id': creator_id,
                'type': raffle_data['type'],
                'title': raffle_data['title'],
                'description': raffle_data['description'],
                'prizes': raffle_data['prizes'],
                'total_prize_value': total_prize_value,
                'entry_methods': raffle_data['entry_methods'],
                'start_date': raffle_data['start_date'],
                'end_date': raffle_data['end_date'],
                'status': RaffleStatus.SCHEDULED.value if raffle_data['start_date'] > datetime.utcnow() else RaffleStatus.ACTIVE.value,
                'event_code': event_code,
                'event_location': raffle_data.get('event_location'),
                'max_participants': raffle_data.get('max_participants'),
                'current_participants': 0,
                'total_entries': 0,
                'entry_requirements': raffle_data.get('entry_requirements', {}),
                'social_requirements': raffle_data.get('social_requirements', {}),
                'auto_draw': raffle_data.get('auto_draw', True),
                'visibility': raffle_data.get('visibility', 'public'),
                'tags': raffle_data.get('tags', []),
                'sponsor_info': raffle_data.get('sponsor_info'),
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow(),
                
                # Estadísticas
                'analytics': {
                    'views': 0,
                    'shares': 0,
                    'conversion_rate': 0,
                    'viral_coefficient': 0,
                    'avg_entries_per_user': 0,
                    'social_reach': 0,
                    'engagement_score': 0,
                    'demographics': {},
                    'entry_methods_breakdown': {},
                    'daily_entries': [],
                    'peak_hours': [],
                },
                
                # URLs y códigos
                'urls': {
                    'landing_page': f"/raffles/{raffle_id}",
                    'share_url': f"https://spirittours.com/raffle/{raffle_id}",
                    'qr_code': None,  # Se generará después
                    'social_share_links': {}
                },
                
                # Ganadores (se llenará después del sorteo)
                'winners': [],
                'draw_date': None,
                'draw_method': None,
                'draw_video_url': None,
                'notary_verification': None,
            }
            
            # Generar QR code para el sorteo
            qr_data = await self._generate_raffle_qr(raffle)
            raffle['urls']['qr_code'] = qr_data['qr_url']
            
            # Generar enlaces de compartir para redes sociales
            raffle['urls']['social_share_links'] = await self._generate_social_share_links(raffle)
            
            # Guardar en base de datos
            self._save_raffle(raffle)
            
            # Cachear para acceso rápido
            cache_key = f"raffle:{raffle_id}"
            self.redis.setex(
                cache_key,
                3600,  # 1 hora de caché
                json.dumps(raffle, default=str)
            )
            
            # Programar notificaciones
            await self._schedule_raffle_notifications(raffle)
            
            # Si es evento, preparar sistema de registro QR
            if raffle['type'] == RaffleType.EVENT.value:
                await self._setup_event_registration_system(raffle)
            
            # Notificar a usuarios interesados
            await self._notify_interested_users(raffle)
            
            # Análisis predictivo
            predictions = await self._predict_raffle_success(raffle)
            
            return {
                'success': True,
                'raffle_id': raffle_id,
                'raffle': raffle,
                'event_code': event_code,
                'qr_code': qr_data['qr_base64'],
                'share_links': raffle['urls']['social_share_links'],
                'predictions': predictions,
                'estimated_participants': predictions['estimated_participants'],
                'viral_potential': predictions['viral_potential'],
                'success_probability': predictions['success_probability']
            }
            
        except Exception as e:
            logger.error(f"Error creating raffle: {e}")
            return {
                'success': False,
                'error': 'Failed to create raffle',
                'details': str(e)
            }
    
    async def register_event_participant(self, event_code: str, 
                                        participant_data: Dict[str, Any]) -> Dict:
        """
        Registrar participante en sorteo de evento mediante QR
        
        Args:
            event_code: Código del evento
            participant_data: {
                'name': str,
                'email': str,
                'phone': str,
                'social_profiles': Dict,
                'qr_scan_location': str,
                'device_info': Dict
            }
        """
        try:
            # Buscar sorteo por código de evento
            raffle = await self._get_raffle_by_event_code(event_code)
            if not raffle:
                return {
                    'success': False,
                    'error': 'Invalid event code'
                }
            
            # Verificar que el sorteo esté activo
            if raffle['status'] != RaffleStatus.ACTIVE.value:
                return {
                    'success': False,
                    'error': f"Raffle is {raffle['status']}"
                }
            
            # Verificar si ya está registrado
            existing = await self._check_existing_registration(
                raffle['id'],
                participant_data['email']
            )
            
            if existing:
                return {
                    'success': False,
                    'error': 'Already registered',
                    'ticket_number': existing['ticket_number']
                }
            
            # Generar número de ticket único
            ticket_number = await self._generate_ticket_number(
                raffle['event_code'],
                raffle['current_participants'] + 1
            )
            
            # Verificar requisitos sociales
            social_verified = await self._verify_social_requirements(
                participant_data,
                raffle['social_requirements']
            )
            
            if not social_verified['verified']:
                return {
                    'success': False,
                    'error': 'Social requirements not met',
                    'missing': social_verified['missing']
                }
            
            # Crear entrada del participante
            entry = {
                'id': str(uuid.uuid4()),
                'raffle_id': raffle['id'],
                'ticket_number': ticket_number,
                'participant': participant_data,
                'entry_method': EntryMethod.QR_SCAN.value,
                'entry_date': datetime.utcnow(),
                'entries_count': 1,
                'bonus_entries': 0,
                'social_shares': 0,
                'points_earned': 0,
                'verified': True,
                'qr_scan_location': participant_data.get('qr_scan_location'),
                'device_info': participant_data.get('device_info'),
                'status': 'active'
            }
            
            # Calcular entradas bonus por acciones sociales
            bonus = await self._calculate_bonus_entries(participant_data, raffle)
            entry['bonus_entries'] = bonus['total']
            entry['entries_count'] += bonus['total']
            
            # Otorgar puntos por registro
            points_earned = await self._award_registration_points(
                participant_data,
                raffle,
                bonus
            )
            entry['points_earned'] = points_earned
            
            # Guardar entrada
            self._save_raffle_entry(entry)
            
            # Actualizar estadísticas del sorteo
            raffle['current_participants'] += 1
            raffle['total_entries'] += entry['entries_count']
            raffle['analytics']['entry_methods_breakdown'][EntryMethod.QR_SCAN.value] = \
                raffle['analytics']['entry_methods_breakdown'].get(EntryMethod.QR_SCAN.value, 0) + 1
            
            self._update_raffle(raffle)
            
            # Generar ticket digital
            ticket_data = await self._generate_digital_ticket(
                ticket_number,
                participant_data,
                raffle
            )
            
            # Enviar confirmación
            await self._send_registration_confirmation(
                participant_data,
                ticket_number,
                ticket_data,
                raffle
            )
            
            # Seguimiento viral
            if bonus['social_actions']:
                await self._track_viral_spread(entry, bonus['social_actions'])
            
            return {
                'success': True,
                'ticket_number': ticket_number,
                'entry_id': entry['id'],
                'total_entries': entry['entries_count'],
                'bonus_entries': entry['bonus_entries'],
                'points_earned': points_earned,
                'digital_ticket': ticket_data['ticket_url'],
                'qr_code': ticket_data['qr_code'],
                'share_links': await self._generate_participant_share_links(
                    raffle,
                    ticket_number
                ),
                'raffle_info': {
                    'title': raffle['title'],
                    'end_date': raffle['end_date'],
                    'prizes': raffle['prizes'],
                    'total_participants': raffle['current_participants']
                }
            }
            
        except Exception as e:
            logger.error(f"Error registering event participant: {e}")
            return {
                'success': False,
                'error': 'Failed to register participant',
                'details': str(e)
            }
    
    async def add_social_entry(self, user_id: int, raffle_id: str,
                              social_action: Dict[str, Any]) -> Dict:
        """
        Añadir entrada por acción social (compartir, like, follow)
        
        Args:
            user_id: ID del usuario
            raffle_id: ID del sorteo
            social_action: {
                'platform': str,  # facebook, instagram, etc.
                'action': str,  # share, like, follow, comment
                'url': str,  # URL de la acción
                'reach': int,  # Alcance estimado
                'friends_engaged': List[str]
            }
        """
        try:
            # Obtener sorteo
            raffle = await self._get_raffle(raffle_id)
            if not raffle:
                return {
                    'success': False,
                    'error': 'Raffle not found'
                }
            
            # Verificar sorteo activo
            if raffle['status'] != RaffleStatus.ACTIVE.value:
                return {
                    'success': False,
                    'error': 'Raffle not active'
                }
            
            # Verificar acción social
            verification = await self._verify_social_action(
                user_id,
                social_action,
                raffle
            )
            
            if not verification['verified']:
                return {
                    'success': False,
                    'error': 'Social action could not be verified',
                    'details': verification.get('reason')
                }
            
            # Calcular puntos y entradas
            points = 0
            entries = 0
            
            if social_action['action'] == 'share':
                points = self.config['points_per_share']
                entries = 1
                
                # Bonus por alcance viral
                if social_action.get('reach', 0) > 100:
                    points *= self.config['viral_multiplier']
                    entries *= 2
                    
            elif social_action['action'] == 'like':
                points = self.config['points_per_like']
                entries = 1
                
            elif social_action['action'] == 'follow':
                points = self.config['points_per_follow']
                entries = 2
                
            elif social_action['action'] == 'comment':
                points = 1
                entries = 1
                
            # Bonus por amigos comprometidos
            friends_bonus = len(social_action.get('friends_engaged', []))
            points += friends_bonus * 0.5
            
            # Obtener o crear entrada del usuario
            user_entry = await self._get_or_create_user_entry(
                user_id,
                raffle_id
            )
            
            # Actualizar entrada
            user_entry['entries_count'] += entries
            user_entry['social_shares'] += 1 if social_action['action'] == 'share' else 0
            user_entry['points_earned'] += points
            
            # Registrar acción social
            social_log = {
                'entry_id': user_entry['id'],
                'platform': social_action['platform'],
                'action': social_action['action'],
                'url': social_action.get('url'),
                'reach': social_action.get('reach', 0),
                'friends_engaged': social_action.get('friends_engaged', []),
                'points_awarded': points,
                'entries_awarded': entries,
                'timestamp': datetime.utcnow()
            }
            
            self._save_social_action(social_log)
            
            # Actualizar entrada del usuario
            self._update_raffle_entry(user_entry)
            
            # Actualizar analytics del sorteo
            raffle['analytics']['shares'] += 1 if social_action['action'] == 'share' else 0
            raffle['analytics']['social_reach'] += social_action.get('reach', 0)
            raffle['total_entries'] += entries
            
            # Calcular coeficiente viral
            viral_coefficient = await self._calculate_viral_coefficient(raffle_id)
            raffle['analytics']['viral_coefficient'] = viral_coefficient
            
            self._update_raffle(raffle)
            
            # Notificar puntos ganados
            await self._notify_points_earned(
                user_id,
                points,
                f"Social action: {social_action['action']} on {social_action['platform']}"
            )
            
            # Si hay amigos comprometidos, darles crédito también
            if social_action.get('friends_engaged'):
                await self._credit_engaged_friends(
                    social_action['friends_engaged'],
                    raffle_id,
                    user_id
                )
            
            return {
                'success': True,
                'points_earned': points,
                'entries_added': entries,
                'total_entries': user_entry['entries_count'],
                'total_points': user_entry['points_earned'],
                'viral_bonus': friends_bonus > 0,
                'friends_credited': len(social_action.get('friends_engaged', [])),
                'rank': await self._get_user_rank(user_id, raffle_id),
                'next_milestone': await self._get_next_milestone(user_entry)
            }
            
        except Exception as e:
            logger.error(f"Error adding social entry: {e}")
            return {
                'success': False,
                'error': 'Failed to add social entry',
                'details': str(e)
            }
    
    async def draw_winner(self, raffle_id: str, admin_id: Optional[int] = None,
                         method: str = 'random', video_proof: bool = False) -> Dict:
        """
        Realizar sorteo y seleccionar ganador(es)
        
        Args:
            raffle_id: ID del sorteo
            admin_id: ID del admin que realiza el sorteo
            method: Método de selección (random, weighted, verified)
            video_proof: Si se requiere prueba en video
        """
        try:
            # Obtener sorteo
            raffle = await self._get_raffle(raffle_id)
            if not raffle:
                return {
                    'success': False,
                    'error': 'Raffle not found'
                }
            
            # Verificar estado
            if raffle['status'] not in [RaffleStatus.ACTIVE.value, RaffleStatus.CLOSED.value]:
                return {
                    'success': False,
                    'error': f"Cannot draw from {raffle['status']} raffle"
                }
            
            # Verificar participantes mínimos
            if raffle['current_participants'] < self.config['min_participants']:
                return {
                    'success': False,
                    'error': f"Minimum {self.config['min_participants']} participants required",
                    'current': raffle['current_participants']
                }
            
            # Actualizar estado
            raffle['status'] = RaffleStatus.DRAWING.value
            self._update_raffle(raffle)
            
            # Obtener todas las entradas
            entries = await self._get_raffle_entries(raffle_id)
            
            # Filtrar entradas válidas
            valid_entries = await self._filter_valid_entries(entries)
            
            # Detectar y excluir fraudes
            if self.config['fraud_detection_threshold']:
                valid_entries = await self._exclude_fraudulent_entries(valid_entries)
            
            # Preparar pool de selección
            selection_pool = []
            for entry in valid_entries:
                # Añadir entrada según cantidad de tickets
                for _ in range(entry['entries_count']):
                    selection_pool.append(entry)
            
            # Mezclar pool (para aleatoriedad)
            random.shuffle(selection_pool)
            
            # Seleccionar ganadores
            winners = []
            selected_entries = set()
            
            for prize in raffle['prizes']:
                if len(selection_pool) == 0:
                    break
                
                # Seleccionar ganador para este premio
                winner_entry = None
                
                if method == 'random':
                    # Selección completamente aleatoria
                    while selection_pool and winner_entry is None:
                        candidate = random.choice(selection_pool)
                        if candidate['id'] not in selected_entries:
                            winner_entry = candidate
                            selected_entries.add(candidate['id'])
                            
                elif method == 'weighted':
                    # Selección ponderada por engagement
                    winner_entry = await self._weighted_selection(
                        selection_pool,
                        selected_entries
                    )
                    
                elif method == 'verified':
                    # Solo usuarios verificados
                    verified_pool = [e for e in selection_pool if e.get('verified')]
                    if verified_pool:
                        winner_entry = random.choice(verified_pool)
                
                if winner_entry:
                    winner = {
                        'entry_id': winner_entry['id'],
                        'ticket_number': winner_entry['ticket_number'],
                        'participant': winner_entry['participant'],
                        'prize': prize,
                        'selected_at': datetime.utcnow(),
                        'notification_sent': False,
                        'prize_claimed': False,
                        'verification_code': self._generate_verification_code()
                    }
                    winners.append(winner)
                    
                    # Remover todas las entradas de este ganador del pool
                    selection_pool = [e for e in selection_pool 
                                     if e['id'] != winner_entry['id']]
            
            # Generar prueba de sorteo
            draw_proof = await self._generate_draw_proof(
                raffle,
                winners,
                method,
                len(valid_entries),
                len(selection_pool) + len(winners)
            )
            
            # Si se requiere video, iniciar grabación
            if video_proof:
                video_url = await self._record_draw_video(
                    raffle_id,
                    winners,
                    draw_proof
                )
                draw_proof['video_url'] = video_url
            
            # Actualizar sorteo con ganadores
            raffle['winners'] = winners
            raffle['draw_date'] = datetime.utcnow()
            raffle['draw_method'] = method
            raffle['draw_proof'] = draw_proof
            raffle['status'] = RaffleStatus.COMPLETED.value
            raffle['draw_admin_id'] = admin_id
            
            self._update_raffle(raffle)
            
            # Generar NFT para ganadores (si aplica)
            for winner in winners:
                if prize.get('type') in ['trip', 'tour', 'experience']:
                    nft_result = await self._mint_winner_nft(
                        winner,
                        raffle,
                        prize
                    )
                    winner['nft'] = nft_result
            
            # Notificar a ganadores
            await self._notify_winners(winners, raffle)
            
            # Notificar a todos los participantes
            await self._notify_all_participants(raffle, winners)
            
            # Publicar resultados en redes sociales
            await self._publish_results_social_media(raffle, winners)
            
            # Generar reporte del sorteo
            report = await self._generate_raffle_report(raffle, winners)
            
            return {
                'success': True,
                'raffle_id': raffle_id,
                'winners': winners,
                'total_participants': raffle['current_participants'],
                'total_entries': raffle['total_entries'],
                'draw_proof': draw_proof,
                'report_url': report['url'],
                'social_posts': report['social_posts'],
                'next_steps': self._get_winner_next_steps(winners)
            }
            
        except Exception as e:
            logger.error(f"Error drawing winner: {e}")
            return {
                'success': False,
                'error': 'Failed to draw winner',
                'details': str(e)
            }
    
    async def get_raffle_analytics(self, raffle_id: str) -> Dict:
        """
        Obtener análisis completo del sorteo
        """
        try:
            raffle = await self._get_raffle(raffle_id)
            if not raffle:
                return {
                    'success': False,
                    'error': 'Raffle not found'
                }
            
            # Análisis de participación
            participation_analysis = {
                'total_participants': raffle['current_participants'],
                'total_entries': raffle['total_entries'],
                'avg_entries_per_user': raffle['total_entries'] / max(raffle['current_participants'], 1),
                'conversion_rate': await self._calculate_conversion_rate(raffle_id),
                'dropout_rate': await self._calculate_dropout_rate(raffle_id),
            }
            
            # Análisis viral
            viral_analysis = {
                'viral_coefficient': raffle['analytics']['viral_coefficient'],
                'social_reach': raffle['analytics']['social_reach'],
                'shares_count': raffle['analytics']['shares'],
                'viral_loops': await self._analyze_viral_loops(raffle_id),
                'influencer_participants': await self._identify_influencers(raffle_id),
            }
            
            # Análisis demográfico
            demographics = await self._analyze_demographics(raffle_id)
            
            # Análisis temporal
            temporal_analysis = {
                'peak_hours': await self._identify_peak_hours(raffle_id),
                'daily_trend': await self._analyze_daily_trend(raffle_id),
                'momentum_score': await self._calculate_momentum(raffle_id),
            }
            
            # Predicciones
            predictions = {
                'estimated_final_participants': await self._predict_final_participants(raffle),
                'estimated_viral_reach': await self._predict_viral_reach(raffle),
                'success_probability': await self._calculate_success_probability(raffle),
            }
            
            # ROI y métricas de negocio
            business_metrics = {
                'estimated_revenue': await self._calculate_estimated_revenue(raffle),
                'customer_acquisition_cost': await self._calculate_cac(raffle),
                'lifetime_value_impact': await self._calculate_ltv_impact(raffle),
                'brand_value_increase': await self._estimate_brand_value_increase(raffle),
            }
            
            # Recomendaciones
            recommendations = await self._generate_recommendations(
                raffle,
                participation_analysis,
                viral_analysis,
                business_metrics
            )
            
            return {
                'success': True,
                'raffle_id': raffle_id,
                'status': raffle['status'],
                'participation': participation_analysis,
                'viral': viral_analysis,
                'demographics': demographics,
                'temporal': temporal_analysis,
                'predictions': predictions,
                'business_metrics': business_metrics,
                'recommendations': recommendations,
                'export_url': await self._generate_analytics_export(raffle_id)
            }
            
        except Exception as e:
            logger.error(f"Error getting raffle analytics: {e}")
            return {
                'success': False,
                'error': 'Failed to get analytics',
                'details': str(e)
            }
    
    # Helper methods
    
    def _generate_raffle_id(self, raffle_type: str) -> str:
        """Generar ID único para sorteo"""
        type_prefix = raffle_type[:3].upper()
        return f"{type_prefix}-{datetime.utcnow().strftime('%Y%m')}-{uuid.uuid4().hex[:8].upper()}"
    
    def _generate_event_code(self, event_name: str) -> str:
        """Generar código único para evento"""
        # Ejemplo: FITUR26 -> FITUR26
        clean_name = ''.join(e for e in event_name if e.isalnum()).upper()[:8]
        year = datetime.utcnow().strftime('%y')
        return f"{clean_name}{year}"
    
    async def _generate_ticket_number(self, event_code: str, sequence: int) -> str:
        """Generar número de ticket único"""
        # Formato: EVENTCODE.00001
        return f"{event_code}.{sequence:05d}"
    
    def _generate_verification_code(self) -> str:
        """Generar código de verificación para ganador"""
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    async def _generate_raffle_qr(self, raffle: Dict) -> Dict:
        """Generar código QR para el sorteo"""
        try:
            # Datos para el QR
            qr_data = {
                'type': 'raffle',
                'id': raffle['id'],
                'url': raffle['urls']['share_url'],
                'event_code': raffle.get('event_code')
            }
            
            # Crear QR
            qr = qrcode.QRCode(
                version=1,
                error_correction=qrcode.constants.ERROR_CORRECT_L,
                box_size=10,
                border=4,
            )
            
            qr.add_data(json.dumps(qr_data))
            qr.make(fit=True)
            
            # Generar imagen
            img = qr.make_image(fill_color="black", back_color="white")
            
            # Añadir logo de Spirit Tours
            # logo = Image.open('assets/logo.png')
            # img.paste(logo, (img.size[0]//2 - logo.size[0]//2, img.size[1]//2 - logo.size[1]//2))
            
            # Convertir a base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            # Guardar en storage
            qr_url = await self._upload_image(img_str, f"qr_{raffle['id']}.png")
            
            return {
                'qr_base64': f"data:image/png;base64,{img_str}",
                'qr_url': qr_url
            }
            
        except Exception as e:
            logger.error(f"Error generating QR: {e}")
            return {
                'qr_base64': None,
                'qr_url': None
            }
    
    async def _generate_digital_ticket(self, ticket_number: str,
                                      participant: Dict, raffle: Dict) -> Dict:
        """Generar ticket digital para participante"""
        try:
            # Crear imagen del ticket
            img = Image.new('RGB', (800, 400), color='white')
            draw = ImageDraw.Draw(img)
            
            # Añadir información del ticket
            # font = ImageFont.truetype("arial.ttf", 24)
            draw.text((50, 50), f"Spirit Tours Raffle Ticket", fill='black')
            draw.text((50, 100), f"Ticket: {ticket_number}", fill='black')
            draw.text((50, 150), f"Raffle: {raffle['title']}", fill='black')
            draw.text((50, 200), f"Name: {participant['name']}", fill='black')
            draw.text((50, 250), f"Date: {datetime.utcnow().strftime('%Y-%m-%d')}", fill='black')
            
            # Generar código de barras
            barcode_data = ticket_number.replace('.', '')
            if len(barcode_data) < 12:
                barcode_data = barcode_data.zfill(12)
            
            # Convertir a base64
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode()
            
            # Generar QR para el ticket
            qr = qrcode.QRCode(version=1, box_size=10, border=4)
            qr.add_data(ticket_number)
            qr.make(fit=True)
            qr_img = qr.make_image(fill_color="black", back_color="white")
            
            qr_buffer = io.BytesIO()
            qr_img.save(qr_buffer, format='PNG')
            qr_str = base64.b64encode(qr_buffer.getvalue()).decode()
            
            # Guardar en storage
            ticket_url = await self._upload_image(img_str, f"ticket_{ticket_number}.png")
            
            return {
                'ticket_base64': f"data:image/png;base64,{img_str}",
                'ticket_url': ticket_url,
                'qr_code': f"data:image/png;base64,{qr_str}",
                'ticket_number': ticket_number,
                'barcode': barcode_data
            }
            
        except Exception as e:
            logger.error(f"Error generating digital ticket: {e}")
            return {}
    
    async def _calculate_viral_coefficient(self, raffle_id: str) -> float:
        """Calcular coeficiente viral del sorteo"""
        try:
            # K = (Número de invitaciones enviadas por usuario) × (Tasa de conversión)
            entries = await self._get_raffle_entries(raffle_id)
            
            total_invites = sum(e.get('social_shares', 0) for e in entries)
            total_users = len(entries)
            
            if total_users == 0:
                return 0
            
            avg_invites = total_invites / total_users
            
            # Estimar tasa de conversión basada en datos históricos
            conversion_rate = 0.15  # 15% estimado
            
            viral_coefficient = avg_invites * conversion_rate
            
            return round(viral_coefficient, 2)
            
        except Exception as e:
            logger.error(f"Error calculating viral coefficient: {e}")
            return 0
    
    def _train_ml_models(self):
        """Entrenar modelos ML para predicciones"""
        try:
            # Datos sintéticos para entrenamiento (en producción usar datos reales)
            np.random.seed(42)
            n_samples = 1000
            
            # Features: days_active, social_shares, entry_method, prize_value, etc.
            X = np.random.rand(n_samples, 8)
            
            # Target: success (1) or not (0)
            y = (X[:, 0] * 0.3 + X[:, 1] * 0.4 + X[:, 3] * 0.3 + np.random.normal(0, 0.1, n_samples)) > 0.5
            y = y.astype(int)
            
            # Normalizar features
            X_scaled = self.scaler.fit_transform(X)
            
            # Entrenar modelo
            self.ml_predictor.fit(X_scaled, y)
            
            logger.info("ML models trained successfully")
            
        except Exception as e:
            logger.error(f"Error training ML models: {e}")
    
    async def _predict_raffle_success(self, raffle: Dict) -> Dict:
        """Predecir éxito del sorteo usando ML"""
        try:
            # Extraer features del sorteo
            features = [
                len(raffle['entry_methods']) / 10,  # Normalizado
                raffle['total_prize_value'] / 10000,  # Normalizado
                (raffle['end_date'] - raffle['start_date']).days / 30,  # Duración normalizada
                len(raffle['prizes']) / 5,  # Número de premios normalizado
                1 if raffle['type'] == RaffleType.TRAVEL.value else 0,
                1 if 'social_share' in raffle['entry_methods'] else 0,
                1 if raffle.get('sponsor_info') else 0,
                len(raffle.get('tags', [])) / 10,  # Tags normalizados
            ]
            
            # Escalar features
            features_scaled = self.scaler.transform([features])
            
            # Predecir probabilidad de éxito
            success_prob = self.ml_predictor.predict_proba(features_scaled)[0][1]
            
            # Estimar participantes (basado en históricos y features)
            estimated_participants = int(
                100 * (1 + features[1]) * (1 + features[2]) * (1 + success_prob)
            )
            
            # Calcular potencial viral
            viral_potential = 'high' if success_prob > 0.7 else 'medium' if success_prob > 0.4 else 'low'
            
            return {
                'success_probability': round(success_prob, 2),
                'estimated_participants': estimated_participants,
                'viral_potential': viral_potential,
                'recommended_actions': self._get_improvement_recommendations(success_prob)
            }
            
        except Exception as e:
            logger.error(f"Error predicting raffle success: {e}")
            return {
                'success_probability': 0.5,
                'estimated_participants': 100,
                'viral_potential': 'medium',
                'recommended_actions': []
            }
    
    def _get_improvement_recommendations(self, success_prob: float) -> List[str]:
        """Obtener recomendaciones para mejorar el sorteo"""
        recommendations = []
        
        if success_prob < 0.3:
            recommendations.extend([
                "Aumentar el valor de los premios",
                "Añadir más métodos de entrada gratuitos",
                "Extender la duración del sorteo",
                "Colaborar con influencers"
            ])
        elif success_prob < 0.6:
            recommendations.extend([
                "Incrementar la promoción en redes sociales",
                "Ofrecer entradas bonus por compartir",
                "Añadir premios secundarios",
                "Crear urgencia con cuenta regresiva"
            ])
        else:
            recommendations.extend([
                "Mantener el momentum actual",
                "Considerar sorteos similares en el futuro",
                "Documentar mejores prácticas"
            ])
        
        return recommendations