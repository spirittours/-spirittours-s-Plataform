"""
P2P Points Marketplace Service for Spirit Tours
Allows users to trade, buy, and sell points with each other
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from enum import Enum
import json
import hashlib
import uuid
from sqlalchemy import and_, or_, desc, asc
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
import redis
import stripe
from web3 import Web3
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

class ListingStatus(Enum):
    """Status for marketplace listings"""
    ACTIVE = "active"
    PENDING = "pending"
    SOLD = "sold"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    IN_ESCROW = "in_escrow"

class OfferStatus(Enum):
    """Status for trading offers"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COUNTER_OFFERED = "counter_offered"
    EXPIRED = "expired"
    WITHDRAWN = "withdrawn"

class TransactionType(Enum):
    """Types of marketplace transactions"""
    DIRECT_SALE = "direct_sale"
    AUCTION = "auction"
    EXCHANGE = "exchange"
    BUNDLE = "bundle"
    SUBSCRIPTION = "subscription"

class PaymentMethod(Enum):
    """Supported payment methods"""
    CREDIT_CARD = "credit_card"
    PAYPAL = "paypal"
    CRYPTO = "crypto"
    BANK_TRANSFER = "bank_transfer"
    PLATFORM_CREDIT = "platform_credit"

class PointsMarketplaceService:
    """
    P2P Marketplace for Points Trading
    Features:
    - List points for sale
    - Buy/sell points between users
    - Automated escrow system
    - Price discovery and market analytics
    - Fraud prevention
    - Smart contract integration for large transactions
    """
    
    def __init__(self, db_session: Session, redis_client: redis.Redis):
        self.db = db_session
        self.redis = redis_client
        self.stripe = stripe
        self.web3 = None  # Initialize when needed
        
        # Configuration
        self.config = {
            'min_points_per_listing': 10,
            'max_points_per_listing': 10000,
            'min_price_per_point': 0.01,  # USD
            'max_price_per_point': 10.00,  # USD
            'platform_fee_percentage': 5,  # 5% platform fee
            'escrow_duration_hours': 24,
            'listing_duration_days': 30,
            'max_active_listings_per_user': 10,
            'max_pending_offers_per_user': 20,
            'price_alert_threshold': 0.20,  # 20% price change alert
            'fraud_score_threshold': 0.7,
            'min_account_age_days': 7,
            'max_daily_transaction_limit': 5000,  # USD
            'kyc_required_amount': 500,  # USD - requires KYC
            'smart_contract_threshold': 1000,  # Use blockchain for transactions > $1000
        }
        
        # Market metrics cache
        self.market_cache_ttl = 300  # 5 minutes
        
        # Initialize ML models for price prediction
        self.price_predictor = LinearRegression()
        self.scaler = StandardScaler()
        self._train_price_model()
        
        logger.info("Points Marketplace Service initialized")
    
    async def create_listing(self, user_id: int, listing_data: Dict[str, Any]) -> Dict:
        """
        Create a new points listing
        
        Args:
            user_id: ID of the seller
            listing_data: {
                'points_amount': int,
                'price_per_point': float,
                'currency': str,
                'description': str,
                'auto_accept': bool,
                'min_purchase': int,
                'max_purchase': int,
                'expires_at': datetime,
                'payment_methods': List[str],
                'bundle_discount': Optional[Dict],
                'tags': List[str]
            }
        """
        try:
            # Validate user eligibility
            validation = await self._validate_seller(user_id, listing_data['points_amount'])
            if not validation['eligible']:
                return {
                    'success': False,
                    'error': validation['reason'],
                    'requirements': validation.get('requirements', {})
                }
            
            # Validate listing parameters
            if listing_data['points_amount'] < self.config['min_points_per_listing']:
                return {
                    'success': False,
                    'error': f"Minimum {self.config['min_points_per_listing']} points required"
                }
            
            if listing_data['points_amount'] > self.config['max_points_per_listing']:
                return {
                    'success': False,
                    'error': f"Maximum {self.config['max_points_per_listing']} points allowed"
                }
            
            # Check price limits
            price_per_point = listing_data['price_per_point']
            if price_per_point < self.config['min_price_per_point']:
                return {
                    'success': False,
                    'error': f"Minimum price ${self.config['min_price_per_point']} per point"
                }
            
            if price_per_point > self.config['max_price_per_point']:
                return {
                    'success': False,
                    'error': f"Maximum price ${self.config['max_price_per_point']} per point"
                }
            
            # Lock seller's points in escrow
            escrow_result = await self._lock_points_in_escrow(
                user_id, 
                listing_data['points_amount']
            )
            
            if not escrow_result['success']:
                return {
                    'success': False,
                    'error': "Failed to lock points in escrow",
                    'details': escrow_result.get('error')
                }
            
            # Calculate fees and totals
            total_price = listing_data['points_amount'] * price_per_point
            platform_fee = total_price * (self.config['platform_fee_percentage'] / 100)
            seller_receives = total_price - platform_fee
            
            # Generate listing ID
            listing_id = self._generate_listing_id()
            
            # Set expiration
            expires_at = listing_data.get('expires_at') or \
                        datetime.utcnow() + timedelta(days=self.config['listing_duration_days'])
            
            # Create listing record
            listing = {
                'id': listing_id,
                'seller_id': user_id,
                'points_amount': listing_data['points_amount'],
                'points_remaining': listing_data['points_amount'],
                'price_per_point': price_per_point,
                'currency': listing_data.get('currency', 'USD'),
                'total_price': total_price,
                'platform_fee': platform_fee,
                'seller_receives': seller_receives,
                'description': listing_data.get('description', ''),
                'status': ListingStatus.ACTIVE.value,
                'auto_accept': listing_data.get('auto_accept', True),
                'min_purchase': listing_data.get('min_purchase', 1),
                'max_purchase': listing_data.get('max_purchase', listing_data['points_amount']),
                'payment_methods': listing_data.get('payment_methods', ['credit_card']),
                'bundle_discount': listing_data.get('bundle_discount'),
                'tags': listing_data.get('tags', []),
                'escrow_id': escrow_result['escrow_id'],
                'created_at': datetime.utcnow(),
                'expires_at': expires_at,
                'views': 0,
                'watchers': [],
                'analytics': {
                    'price_history': [(datetime.utcnow().isoformat(), price_per_point)],
                    'view_history': [],
                    'offer_count': 0
                }
            }
            
            # Store in database
            self._save_listing(listing)
            
            # Update market analytics
            await self._update_market_analytics('listing_created', listing)
            
            # Notify potential buyers
            await self._notify_price_watchers(listing)
            
            # Cache for quick access
            cache_key = f"marketplace:listing:{listing_id}"
            self.redis.setex(
                cache_key,
                self.market_cache_ttl,
                json.dumps(listing, default=str)
            )
            
            return {
                'success': True,
                'listing_id': listing_id,
                'listing': listing,
                'estimated_sale_time': await self._estimate_sale_time(listing),
                'market_price': await self._get_market_price(),
                'visibility_score': await self._calculate_visibility_score(listing)
            }
            
        except Exception as e:
            logger.error(f"Error creating listing: {e}")
            return {
                'success': False,
                'error': 'Failed to create listing',
                'details': str(e)
            }
    
    async def buy_points(self, buyer_id: int, listing_id: str, 
                         purchase_data: Dict[str, Any]) -> Dict:
        """
        Buy points from a listing
        
        Args:
            buyer_id: ID of the buyer
            listing_id: ID of the listing
            purchase_data: {
                'points_amount': int,
                'payment_method': str,
                'payment_token': str,
                'shipping_address': Optional[Dict]
            }
        """
        try:
            # Get listing
            listing = await self._get_listing(listing_id)
            if not listing:
                return {
                    'success': False,
                    'error': 'Listing not found'
                }
            
            # Check listing status
            if listing['status'] != ListingStatus.ACTIVE.value:
                return {
                    'success': False,
                    'error': f"Listing is {listing['status']}"
                }
            
            # Validate buyer
            buyer_validation = await self._validate_buyer(
                buyer_id, 
                listing['seller_id'],
                purchase_data['points_amount'] * listing['price_per_point']
            )
            
            if not buyer_validation['eligible']:
                return {
                    'success': False,
                    'error': buyer_validation['reason']
                }
            
            # Check availability
            if purchase_data['points_amount'] > listing['points_remaining']:
                return {
                    'success': False,
                    'error': f"Only {listing['points_remaining']} points available"
                }
            
            # Check purchase limits
            if purchase_data['points_amount'] < listing['min_purchase']:
                return {
                    'success': False,
                    'error': f"Minimum purchase is {listing['min_purchase']} points"
                }
            
            if purchase_data['points_amount'] > listing['max_purchase']:
                return {
                    'success': False,
                    'error': f"Maximum purchase is {listing['max_purchase']} points"
                }
            
            # Calculate pricing
            base_price = purchase_data['points_amount'] * listing['price_per_point']
            
            # Apply bundle discount if applicable
            discount = 0
            if listing.get('bundle_discount'):
                discount = self._calculate_bundle_discount(
                    purchase_data['points_amount'],
                    listing['bundle_discount']
                )
            
            total_price = base_price - discount
            platform_fee = total_price * (self.config['platform_fee_percentage'] / 100)
            seller_receives = total_price - platform_fee
            
            # Process payment
            payment_result = await self._process_payment(
                buyer_id,
                total_price,
                purchase_data['payment_method'],
                purchase_data.get('payment_token'),
                {
                    'type': 'points_purchase',
                    'listing_id': listing_id,
                    'points': purchase_data['points_amount']
                }
            )
            
            if not payment_result['success']:
                return {
                    'success': False,
                    'error': 'Payment failed',
                    'details': payment_result.get('error')
                }
            
            # Create transaction record
            transaction_id = self._generate_transaction_id()
            
            transaction = {
                'id': transaction_id,
                'type': TransactionType.DIRECT_SALE.value,
                'listing_id': listing_id,
                'seller_id': listing['seller_id'],
                'buyer_id': buyer_id,
                'points_amount': purchase_data['points_amount'],
                'price_per_point': listing['price_per_point'],
                'base_price': base_price,
                'discount': discount,
                'total_price': total_price,
                'platform_fee': platform_fee,
                'seller_receives': seller_receives,
                'payment_method': purchase_data['payment_method'],
                'payment_reference': payment_result['payment_id'],
                'status': 'pending_delivery',
                'created_at': datetime.utcnow(),
                'escrow_release_at': datetime.utcnow() + timedelta(
                    hours=self.config['escrow_duration_hours']
                )
            }
            
            # Use smart contract for large transactions
            if total_price >= self.config['smart_contract_threshold']:
                contract_result = await self._create_smart_contract_transaction(transaction)
                transaction['smart_contract'] = contract_result
            
            # Save transaction
            self._save_transaction(transaction)
            
            # Update listing
            listing['points_remaining'] -= purchase_data['points_amount']
            if listing['points_remaining'] == 0:
                listing['status'] = ListingStatus.SOLD.value
            
            listing['analytics']['offer_count'] += 1
            self._update_listing(listing)
            
            # Transfer points from escrow to buyer
            transfer_result = await self._transfer_points_from_escrow(
                listing['escrow_id'],
                buyer_id,
                purchase_data['points_amount']
            )
            
            if transfer_result['success']:
                transaction['status'] = 'completed'
                transaction['completed_at'] = datetime.utcnow()
                self._update_transaction(transaction)
                
                # Release payment to seller
                await self._release_payment_to_seller(
                    listing['seller_id'],
                    seller_receives,
                    transaction_id
                )
            
            # Update analytics
            await self._update_market_analytics('purchase_completed', {
                'transaction': transaction,
                'listing': listing
            })
            
            # Send notifications
            await self._send_transaction_notifications(transaction)
            
            # Update user ratings
            await self._update_user_ratings(transaction)
            
            return {
                'success': True,
                'transaction_id': transaction_id,
                'transaction': transaction,
                'points_received': purchase_data['points_amount'],
                'amount_paid': total_price,
                'receipt': self._generate_receipt(transaction),
                'next_steps': self._get_post_purchase_actions(transaction)
            }
            
        except Exception as e:
            logger.error(f"Error buying points: {e}")
            return {
                'success': False,
                'error': 'Failed to complete purchase',
                'details': str(e)
            }
    
    async def create_offer(self, offerer_id: int, listing_id: str,
                          offer_data: Dict[str, Any]) -> Dict:
        """
        Create an offer on a listing
        
        Args:
            offerer_id: ID of the person making the offer
            listing_id: ID of the listing
            offer_data: {
                'points_amount': int,
                'price_per_point': float,
                'expires_in_hours': int,
                'message': str,
                'conditions': List[str]
            }
        """
        try:
            # Get listing
            listing = await self._get_listing(listing_id)
            if not listing:
                return {
                    'success': False,
                    'error': 'Listing not found'
                }
            
            # Check if auto-accept is enabled
            if listing['auto_accept']:
                return {
                    'success': False,
                    'error': 'This listing only accepts direct purchases',
                    'action': 'use_buy_points'
                }
            
            # Validate offerer
            validation = await self._validate_buyer(
                offerer_id,
                listing['seller_id'],
                offer_data['points_amount'] * offer_data['price_per_point']
            )
            
            if not validation['eligible']:
                return {
                    'success': False,
                    'error': validation['reason']
                }
            
            # Check existing offers
            existing_offers = await self._get_user_offers(offerer_id, listing_id)
            if len(existing_offers) >= 3:
                return {
                    'success': False,
                    'error': 'Maximum 3 offers per listing allowed'
                }
            
            # Generate offer ID
            offer_id = self._generate_offer_id()
            
            # Create offer
            offer = {
                'id': offer_id,
                'listing_id': listing_id,
                'seller_id': listing['seller_id'],
                'offerer_id': offerer_id,
                'points_amount': offer_data['points_amount'],
                'original_price': listing['price_per_point'],
                'offered_price': offer_data['price_per_point'],
                'total_offer': offer_data['points_amount'] * offer_data['price_per_point'],
                'discount_percentage': (
                    (listing['price_per_point'] - offer_data['price_per_point']) / 
                    listing['price_per_point'] * 100
                ),
                'message': offer_data.get('message', ''),
                'conditions': offer_data.get('conditions', []),
                'status': OfferStatus.PENDING.value,
                'created_at': datetime.utcnow(),
                'expires_at': datetime.utcnow() + timedelta(
                    hours=offer_data.get('expires_in_hours', 24)
                ),
                'counter_offers': []
            }
            
            # Save offer
            self._save_offer(offer)
            
            # Notify seller
            await self._notify_seller_of_offer(offer)
            
            # Update listing analytics
            listing['analytics']['offer_count'] += 1
            self._update_listing(listing)
            
            return {
                'success': True,
                'offer_id': offer_id,
                'offer': offer,
                'acceptance_probability': await self._calculate_offer_acceptance_probability(offer),
                'suggested_price': await self._suggest_optimal_price(listing, offer_data['points_amount'])
            }
            
        except Exception as e:
            logger.error(f"Error creating offer: {e}")
            return {
                'success': False,
                'error': 'Failed to create offer',
                'details': str(e)
            }
    
    async def accept_offer(self, seller_id: int, offer_id: str) -> Dict:
        """Accept an offer and complete the transaction"""
        try:
            # Get offer
            offer = await self._get_offer(offer_id)
            if not offer:
                return {
                    'success': False,
                    'error': 'Offer not found'
                }
            
            # Verify seller
            if offer['seller_id'] != seller_id:
                return {
                    'success': False,
                    'error': 'Unauthorized to accept this offer'
                }
            
            # Check offer status
            if offer['status'] != OfferStatus.PENDING.value:
                return {
                    'success': False,
                    'error': f"Offer is {offer['status']}"
                }
            
            # Check expiration
            if datetime.utcnow() > offer['expires_at']:
                offer['status'] = OfferStatus.EXPIRED.value
                self._update_offer(offer)
                return {
                    'success': False,
                    'error': 'Offer has expired'
                }
            
            # Process payment from offerer
            payment_result = await self._process_payment(
                offer['offerer_id'],
                offer['total_offer'],
                'platform_credit',  # Use platform credit for offers
                None,
                {
                    'type': 'offer_acceptance',
                    'offer_id': offer_id
                }
            )
            
            if not payment_result['success']:
                return {
                    'success': False,
                    'error': 'Payment processing failed',
                    'details': payment_result.get('error')
                }
            
            # Transfer points
            listing = await self._get_listing(offer['listing_id'])
            transfer_result = await self._transfer_points_from_escrow(
                listing['escrow_id'],
                offer['offerer_id'],
                offer['points_amount']
            )
            
            if not transfer_result['success']:
                # Refund payment
                await self._refund_payment(payment_result['payment_id'])
                return {
                    'success': False,
                    'error': 'Points transfer failed',
                    'details': transfer_result.get('error')
                }
            
            # Update offer status
            offer['status'] = OfferStatus.ACCEPTED.value
            offer['accepted_at'] = datetime.utcnow()
            self._update_offer(offer)
            
            # Create transaction record
            transaction_id = self._generate_transaction_id()
            platform_fee = offer['total_offer'] * (self.config['platform_fee_percentage'] / 100)
            
            transaction = {
                'id': transaction_id,
                'type': TransactionType.DIRECT_SALE.value,
                'listing_id': offer['listing_id'],
                'offer_id': offer_id,
                'seller_id': seller_id,
                'buyer_id': offer['offerer_id'],
                'points_amount': offer['points_amount'],
                'price_per_point': offer['offered_price'],
                'total_price': offer['total_offer'],
                'platform_fee': platform_fee,
                'seller_receives': offer['total_offer'] - platform_fee,
                'status': 'completed',
                'created_at': datetime.utcnow(),
                'completed_at': datetime.utcnow()
            }
            
            self._save_transaction(transaction)
            
            # Update listing
            listing['points_remaining'] -= offer['points_amount']
            if listing['points_remaining'] == 0:
                listing['status'] = ListingStatus.SOLD.value
            self._update_listing(listing)
            
            # Release payment to seller
            await self._release_payment_to_seller(
                seller_id,
                transaction['seller_receives'],
                transaction_id
            )
            
            # Reject other pending offers for same amount
            await self._reject_competing_offers(offer)
            
            # Send notifications
            await self._send_offer_acceptance_notifications(offer, transaction)
            
            return {
                'success': True,
                'transaction_id': transaction_id,
                'transaction': transaction,
                'seller_earnings': transaction['seller_receives']
            }
            
        except Exception as e:
            logger.error(f"Error accepting offer: {e}")
            return {
                'success': False,
                'error': 'Failed to accept offer',
                'details': str(e)
            }
    
    async def create_exchange(self, user1_id: int, user2_id: int,
                            exchange_data: Dict[str, Any]) -> Dict:
        """
        Create a points exchange between two users
        
        Args:
            exchange_data: {
                'user1_points': int,
                'user2_points': int,
                'additional_payment': Optional[float],
                'payment_from': Optional[int],  # user_id who pays additional
                'conditions': List[str],
                'expires_in_hours': int
            }
        """
        try:
            # Validate both users have enough points
            user1_validation = await self._validate_seller(user1_id, exchange_data['user1_points'])
            user2_validation = await self._validate_seller(user2_id, exchange_data['user2_points'])
            
            if not user1_validation['eligible'] or not user2_validation['eligible']:
                return {
                    'success': False,
                    'error': 'One or both users do not have enough points'
                }
            
            # Generate exchange ID
            exchange_id = self._generate_exchange_id()
            
            # Lock points in escrow for both users
            escrow1 = await self._lock_points_in_escrow(user1_id, exchange_data['user1_points'])
            escrow2 = await self._lock_points_in_escrow(user2_id, exchange_data['user2_points'])
            
            if not escrow1['success'] or not escrow2['success']:
                # Rollback if either fails
                if escrow1['success']:
                    await self._unlock_points_from_escrow(escrow1['escrow_id'])
                if escrow2['success']:
                    await self._unlock_points_from_escrow(escrow2['escrow_id'])
                
                return {
                    'success': False,
                    'error': 'Failed to lock points in escrow'
                }
            
            # Create exchange record
            exchange = {
                'id': exchange_id,
                'type': TransactionType.EXCHANGE.value,
                'user1_id': user1_id,
                'user2_id': user2_id,
                'user1_points': exchange_data['user1_points'],
                'user2_points': exchange_data['user2_points'],
                'escrow1_id': escrow1['escrow_id'],
                'escrow2_id': escrow2['escrow_id'],
                'additional_payment': exchange_data.get('additional_payment', 0),
                'payment_from': exchange_data.get('payment_from'),
                'conditions': exchange_data.get('conditions', []),
                'status': 'pending_confirmation',
                'created_at': datetime.utcnow(),
                'expires_at': datetime.utcnow() + timedelta(
                    hours=exchange_data.get('expires_in_hours', 24)
                ),
                'user1_confirmed': False,
                'user2_confirmed': False
            }
            
            self._save_exchange(exchange)
            
            # Notify both users
            await self._notify_exchange_participants(exchange)
            
            return {
                'success': True,
                'exchange_id': exchange_id,
                'exchange': exchange,
                'confirmation_required': True,
                'expires_at': exchange['expires_at']
            }
            
        except Exception as e:
            logger.error(f"Error creating exchange: {e}")
            return {
                'success': False,
                'error': 'Failed to create exchange',
                'details': str(e)
            }
    
    async def get_market_statistics(self) -> Dict:
        """Get current market statistics and trends"""
        try:
            # Check cache first
            cache_key = "marketplace:statistics"
            cached = self.redis.get(cache_key)
            if cached:
                return json.loads(cached)
            
            # Calculate fresh statistics
            stats = {
                'timestamp': datetime.utcnow().isoformat(),
                'overview': {
                    'total_listings': await self._count_active_listings(),
                    'total_points_available': await self._sum_available_points(),
                    'average_price_per_point': await self._calculate_average_price(),
                    'median_price_per_point': await self._calculate_median_price(),
                    'total_volume_24h': await self._calculate_volume_24h(),
                    'total_transactions_24h': await self._count_transactions_24h(),
                    'active_users': await self._count_active_users(),
                },
                'price_trends': {
                    'last_hour': await self._calculate_price_change(hours=1),
                    'last_24h': await self._calculate_price_change(hours=24),
                    'last_7d': await self._calculate_price_change(days=7),
                    'last_30d': await self._calculate_price_change(days=30),
                },
                'top_sellers': await self._get_top_sellers(limit=10),
                'top_buyers': await self._get_top_buyers(limit=10),
                'price_distribution': await self._get_price_distribution(),
                'popular_tags': await self._get_popular_tags(),
                'market_depth': {
                    'buy_orders': await self._get_market_depth('buy'),
                    'sell_orders': await self._get_market_depth('sell')
                },
                'predictions': {
                    'next_hour': await self._predict_price(hours=1),
                    'next_24h': await self._predict_price(hours=24),
                    'next_7d': await self._predict_price(days=7),
                    'volatility_index': await self._calculate_volatility(),
                    'liquidity_score': await self._calculate_liquidity_score()
                }
            }
            
            # Cache the results
            self.redis.setex(
                cache_key,
                self.market_cache_ttl,
                json.dumps(stats, default=str)
            )
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting market statistics: {e}")
            return {
                'success': False,
                'error': 'Failed to get market statistics',
                'details': str(e)
            }
    
    async def search_listings(self, filters: Dict[str, Any]) -> Dict:
        """
        Search and filter marketplace listings
        
        Args:
            filters: {
                'min_points': int,
                'max_points': int,
                'min_price': float,
                'max_price': float,
                'seller_rating': float,
                'payment_methods': List[str],
                'tags': List[str],
                'sort_by': str,  # price, points, rating, newest
                'order': str,  # asc, desc
                'page': int,
                'limit': int
            }
        """
        try:
            # Build query
            query = self.db.query(MarketplaceListing).filter(
                MarketplaceListing.status == ListingStatus.ACTIVE.value
            )
            
            # Apply filters
            if filters.get('min_points'):
                query = query.filter(
                    MarketplaceListing.points_remaining >= filters['min_points']
                )
            
            if filters.get('max_points'):
                query = query.filter(
                    MarketplaceListing.points_remaining <= filters['max_points']
                )
            
            if filters.get('min_price'):
                query = query.filter(
                    MarketplaceListing.price_per_point >= filters['min_price']
                )
            
            if filters.get('max_price'):
                query = query.filter(
                    MarketplaceListing.price_per_point <= filters['max_price']
                )
            
            if filters.get('seller_rating'):
                # Join with user ratings
                query = query.join(UserRating).filter(
                    UserRating.rating >= filters['seller_rating']
                )
            
            if filters.get('payment_methods'):
                # Filter by payment methods
                for method in filters['payment_methods']:
                    query = query.filter(
                        MarketplaceListing.payment_methods.contains(method)
                    )
            
            if filters.get('tags'):
                # Filter by tags
                for tag in filters['tags']:
                    query = query.filter(
                        MarketplaceListing.tags.contains(tag)
                    )
            
            # Apply sorting
            sort_by = filters.get('sort_by', 'newest')
            order = filters.get('order', 'desc')
            
            if sort_by == 'price':
                order_field = MarketplaceListing.price_per_point
            elif sort_by == 'points':
                order_field = MarketplaceListing.points_remaining
            elif sort_by == 'rating':
                order_field = UserRating.rating
            else:  # newest
                order_field = MarketplaceListing.created_at
            
            if order == 'asc':
                query = query.order_by(asc(order_field))
            else:
                query = query.order_by(desc(order_field))
            
            # Pagination
            page = filters.get('page', 1)
            limit = min(filters.get('limit', 20), 100)  # Max 100 items
            offset = (page - 1) * limit
            
            # Execute query
            total_count = query.count()
            listings = query.offset(offset).limit(limit).all()
            
            # Format results
            results = []
            for listing in listings:
                listing_dict = listing.to_dict()
                
                # Add seller info
                seller = self.db.query(User).filter(
                    User.id == listing.seller_id
                ).first()
                
                listing_dict['seller'] = {
                    'id': seller.id,
                    'username': seller.username,
                    'rating': await self._get_user_rating(seller.id),
                    'completed_sales': await self._get_user_sales_count(seller.id),
                    'member_since': seller.created_at.isoformat()
                }
                
                # Add market comparison
                listing_dict['market_comparison'] = {
                    'vs_average': (
                        listing.price_per_point - 
                        await self._calculate_average_price()
                    ),
                    'percentile': await self._calculate_price_percentile(
                        listing.price_per_point
                    ),
                    'competitiveness_score': await self._calculate_competitiveness(
                        listing_dict
                    )
                }
                
                results.append(listing_dict)
            
            return {
                'success': True,
                'listings': results,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total_count': total_count,
                    'total_pages': (total_count + limit - 1) // limit
                },
                'applied_filters': filters,
                'suggestions': await self._get_search_suggestions(filters, results)
            }
            
        except Exception as e:
            logger.error(f"Error searching listings: {e}")
            return {
                'success': False,
                'error': 'Failed to search listings',
                'details': str(e)
            }
    
    # Helper methods
    
    def _generate_listing_id(self) -> str:
        """Generate unique listing ID"""
        return f"LST-{uuid.uuid4().hex[:12].upper()}"
    
    def _generate_transaction_id(self) -> str:
        """Generate unique transaction ID"""
        return f"TXN-{uuid.uuid4().hex[:12].upper()}"
    
    def _generate_offer_id(self) -> str:
        """Generate unique offer ID"""
        return f"OFR-{uuid.uuid4().hex[:12].upper()}"
    
    def _generate_exchange_id(self) -> str:
        """Generate unique exchange ID"""
        return f"EXC-{uuid.uuid4().hex[:12].upper()}"
    
    async def _validate_seller(self, user_id: int, points_amount: int) -> Dict:
        """Validate if user can sell points"""
        try:
            # Check user exists and is active
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_active:
                return {
                    'eligible': False,
                    'reason': 'User account not active'
                }
            
            # Check account age
            account_age = (datetime.utcnow() - user.created_at).days
            if account_age < self.config['min_account_age_days']:
                return {
                    'eligible': False,
                    'reason': f'Account must be at least {self.config["min_account_age_days"]} days old',
                    'requirements': {
                        'current_age': account_age,
                        'required_age': self.config['min_account_age_days']
                    }
                }
            
            # Check user has enough points
            user_points = await self._get_user_available_points(user_id)
            if user_points < points_amount:
                return {
                    'eligible': False,
                    'reason': 'Insufficient points balance',
                    'requirements': {
                        'available': user_points,
                        'required': points_amount
                    }
                }
            
            # Check user hasn't exceeded listing limits
            active_listings = await self._count_user_active_listings(user_id)
            if active_listings >= self.config['max_active_listings_per_user']:
                return {
                    'eligible': False,
                    'reason': f'Maximum {self.config["max_active_listings_per_user"]} active listings allowed'
                }
            
            # Check for fraud indicators
            fraud_score = await self._calculate_fraud_score(user_id)
            if fraud_score > self.config['fraud_score_threshold']:
                return {
                    'eligible': False,
                    'reason': 'Account flagged for review'
                }
            
            return {
                'eligible': True,
                'user_rating': await self._get_user_rating(user_id),
                'trust_score': await self._calculate_trust_score(user_id)
            }
            
        except Exception as e:
            logger.error(f"Error validating seller: {e}")
            return {
                'eligible': False,
                'reason': 'Validation error'
            }
    
    async def _validate_buyer(self, buyer_id: int, seller_id: int, 
                             amount: float) -> Dict:
        """Validate if user can buy points"""
        try:
            # Check not buying from self
            if buyer_id == seller_id:
                return {
                    'eligible': False,
                    'reason': 'Cannot buy from yourself'
                }
            
            # Check buyer account
            buyer = self.db.query(User).filter(User.id == buyer_id).first()
            if not buyer or not buyer.is_active:
                return {
                    'eligible': False,
                    'reason': 'Buyer account not active'
                }
            
            # Check daily transaction limit
            daily_total = await self._get_user_daily_transaction_total(buyer_id)
            if daily_total + amount > self.config['max_daily_transaction_limit']:
                return {
                    'eligible': False,
                    'reason': f'Daily transaction limit of ${self.config["max_daily_transaction_limit"]} exceeded'
                }
            
            # Check KYC for large amounts
            if amount >= self.config['kyc_required_amount']:
                kyc_verified = await self._check_kyc_status(buyer_id)
                if not kyc_verified:
                    return {
                        'eligible': False,
                        'reason': f'KYC verification required for transactions over ${self.config["kyc_required_amount"]}'
                    }
            
            return {
                'eligible': True
            }
            
        except Exception as e:
            logger.error(f"Error validating buyer: {e}")
            return {
                'eligible': False,
                'reason': 'Validation error'
            }
    
    def _train_price_model(self):
        """Train ML model for price prediction"""
        try:
            # This would use historical data in production
            # For now, using synthetic data
            np.random.seed(42)
            
            # Generate synthetic training data
            n_samples = 1000
            
            # Features: hour_of_day, day_of_week, available_supply, demand_index
            X = np.random.rand(n_samples, 4)
            
            # Price based on supply/demand with some noise
            y = 1.5 - 0.5 * X[:, 2] + 0.8 * X[:, 3] + np.random.normal(0, 0.1, n_samples)
            
            # Normalize features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.price_predictor.fit(X_scaled, y)
            
            logger.info("Price prediction model trained")
            
        except Exception as e:
            logger.error(f"Error training price model: {e}")
    
    async def _predict_price(self, hours: int = None, days: int = None) -> float:
        """Predict future price using ML model"""
        try:
            # Calculate future timestamp
            if days:
                future_time = datetime.utcnow() + timedelta(days=days)
            else:
                future_time = datetime.utcnow() + timedelta(hours=hours or 1)
            
            # Extract features
            hour_of_day = future_time.hour / 24
            day_of_week = future_time.weekday() / 7
            available_supply = await self._sum_available_points() / 100000  # Normalize
            demand_index = await self._calculate_demand_index()
            
            # Prepare features
            features = np.array([[hour_of_day, day_of_week, available_supply, demand_index]])
            features_scaled = self.scaler.transform(features)
            
            # Predict
            predicted_price = self.price_predictor.predict(features_scaled)[0]
            
            # Ensure within bounds
            predicted_price = max(
                self.config['min_price_per_point'],
                min(predicted_price, self.config['max_price_per_point'])
            )
            
            return round(predicted_price, 2)
            
        except Exception as e:
            logger.error(f"Error predicting price: {e}")
            # Return current average as fallback
            return await self._calculate_average_price()
    
    # Additional helper methods would continue...
    # Including all the database operations, notifications, analytics, etc.