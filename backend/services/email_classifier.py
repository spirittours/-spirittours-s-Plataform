"""
Email Classification Service for Spirit Tours Intelligent Email System
Integrates with existing SentimentAnalysisService for comprehensive email analysis

Author: Spirit Tours Development Team
Created: 2025-10-04
Phase: 1 - Email Foundation
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models.email_models import (
    EmailMessage, EmailClassification, EmailCategory, 
    EmailIntent, EmailPriority, EmailLanguage
)
from services.sentiment_analysis_service import SentimentAnalysisService

logger = logging.getLogger(__name__)


class EmailClassifier:
    """
    Email classification service for categorizing and routing emails
    Integrates with SentimentAnalysisService for sentiment and intent detection
    """
    
    # Email Category Detection Keywords
    CATEGORY_KEYWORDS = {
        EmailCategory.SALES: [
            'sales', 'price', 'pricing', 'quote', 'quotation', 'cost',
            'package', 'tour', 'trip', 'interested', 'book', 'inquiry'
        ],
        EmailCategory.B2B: [
            'partnership', 'collaboration', 'b2b', 'wholesale', 'contract',
            'agreement', 'commercial', 'business', 'agency', 'operator'
        ],
        EmailCategory.OTA: [
            'ota', 'booking.com', 'expedia', 'airbnb', 'viator', 'tripadvisor',
            'online travel', 'distribution', 'channel manager'
        ],
        EmailCategory.RESERVATIONS: [
            'reservation', 'booking', 'confirm', 'confirmation', 'reserve',
            'availability', 'dates', 'itinerary', 'schedule'
        ],
        EmailCategory.SUPPORT: [
            'help', 'support', 'issue', 'problem', 'question', 'assistance',
            'customer service', 'inquiry', 'complaint'
        ],
        EmailCategory.PILGRIMAGES: [
            'pilgrimage', 'religious', 'faith', 'holy land', 'jerusalem',
            'bethlehem', 'nazareth', 'spiritual', 'christian', 'catholic',
            'biblical', 'sacred', 'holy sites'
        ],
        EmailCategory.GROUPS: [
            'group', 'groups', 'party', 'delegation', 'conference',
            'incentive', 'corporate group', 'school group', 'church group'
        ],
        EmailCategory.SUPPLIERS_HOTELS: [
            'hotel', 'accommodation', 'lodging', 'rooms', 'stay',
            'property', 'hostel', 'resort'
        ],
        EmailCategory.SUPPLIERS_TRANSPORT: [
            'transportation', 'transfer', 'bus', 'vehicle', 'driver',
            'airport pickup', 'shuttle', 'car rental'
        ],
        EmailCategory.MARKETING: [
            'marketing', 'promotion', 'campaign', 'advertising',
            'social media', 'newsletter', 'email campaign'
        ],
        EmailCategory.FEEDBACK: [
            'feedback', 'review', 'testimonial', 'experience',
            'satisfaction', 'comment', 'suggestion'
        ],
    }
    
    # Email Intent Keywords (extended from sentiment service)
    INTENT_KEYWORDS = {
        EmailIntent.BOOKING: [
            'book', 'booking', 'reserve', 'reservation', 'purchase',
            'i want to', 'we want to', 'interested in booking'
        ],
        EmailIntent.QUOTATION: [
            'quote', 'quotation', 'price', 'cost', 'how much',
            'pricing', 'estimate', 'budget', 'rates'
        ],
        EmailIntent.MODIFICATION: [
            'modify', 'change', 'update', 'edit', 'reschedule',
            'modify booking', 'change reservation'
        ],
        EmailIntent.CANCELLATION: [
            'cancel', 'cancellation', 'refund', 'cancel booking',
            'terminate', 'cancel reservation'
        ],
        EmailIntent.COMPLAINT: [
            'complaint', 'complain', 'disappointed', 'unhappy',
            'terrible', 'horrible', 'awful', 'problem', 'issue'
        ],
        EmailIntent.QUERY: [
            'question', 'ask', 'inquiry', 'information', 'details',
            'can you', 'could you', 'would you', 'do you', 'what', 'how', 'when', 'where'
        ],
        EmailIntent.CONFIRMATION: [
            'confirm', 'confirmation', 'verify', 'verification',
            'confirmed', 'booking confirmation'
        ],
        EmailIntent.PARTNERSHIP: [
            'partner', 'partnership', 'collaboration', 'joint venture',
            'work together', 'cooperation', 'alliance'
        ],
        EmailIntent.FEEDBACK: [
            'feedback', 'review', 'comment', 'testimonial',
            'experience', 'satisfaction', 'thank you', 'thanks'
        ],
        EmailIntent.URGENT: [
            'urgent', 'emergency', 'asap', 'immediately', 'critical',
            'important', 'rush', 'time-sensitive'
        ],
    }
    
    # Priority Detection Keywords
    URGENT_KEYWORDS = [
        'urgent', 'emergency', 'asap', 'immediately', 'critical',
        'time-sensitive', 'deadline', 'tomorrow', 'today'
    ]
    
    HIGH_PRIORITY_KEYWORDS = [
        'important', 'soon', 'quickly', 'rush', 'priority',
        'complaint', 'problem', 'issue', 'help'
    ]
    
    # Language Detection Patterns
    LANGUAGE_PATTERNS = {
        EmailLanguage.SPANISH: r'[áéíóúñ¿¡]',
        EmailLanguage.PORTUGUESE: r'[ãõç]',
        EmailLanguage.FRENCH: r'[àâçèéêëîïôùûü]',
        EmailLanguage.HEBREW: r'[\u0590-\u05FF]',
        EmailLanguage.ARABIC: r'[\u0600-\u06FF]',
    }
    
    # Regional Email Patterns
    REGIONAL_EMAIL_PATTERNS = {
        EmailCategory.REGIONAL_MEXICO: ['mexico', 'mx'],
        EmailCategory.REGIONAL_USA: ['usa', 'us', 'america'],
        EmailCategory.REGIONAL_JORDAN: ['jordan', 'jo'],
        EmailCategory.REGIONAL_ISRAEL: ['israel', 'il'],
        EmailCategory.REGIONAL_SPAIN: ['spain', 'es', 'españa'],
        EmailCategory.REGIONAL_EUROPE: ['europe', 'eu'],
        EmailCategory.REGIONAL_LATAM: ['latam', 'latinamerica'],
    }
    
    def __init__(self, db: AsyncSession):
        """
        Initialize email classifier
        
        Args:
            db: Database session
        """
        self.db = db
        self.sentiment_service = SentimentAnalysisService(db)
        self.version = "1.0.0"
    
    async def classify_email(
        self,
        email: EmailMessage,
        store_result: bool = True
    ) -> Dict[str, Any]:
        """
        Classify email by category, intent, and priority
        Integrates with sentiment analysis service
        
        Args:
            email: EmailMessage object to classify
            store_result: Whether to store classification in database
            
        Returns:
            Dict with classification results
        """
        start_time = datetime.utcnow()
        
        try:
            # Combine subject and body for analysis
            text_content = f"{email.subject or ''}\n\n{email.body_text or ''}"
            
            # 1. Detect Language
            language = self._detect_language(text_content)
            
            # 2. Classify Category
            category_result = self._classify_category(email, text_content)
            
            # 3. Detect Intent (using sentiment service)
            intent_result = await self._detect_intent(text_content)
            
            # 4. Run Sentiment Analysis (reusing existing service)
            sentiment_result = await self.sentiment_service.analyze_text(
                text=text_content,
                platform='email'
            )
            
            # 5. Determine Priority
            priority = self._determine_priority(
                email,
                text_content,
                category_result['category'],
                intent_result['intent'],
                sentiment_result.get('sentiment', 'neutral')
            )
            
            # 6. Extract Entities
            entities = self._extract_entities(text_content)
            
            # Calculate processing time
            processing_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Prepare result
            classification = {
                'category': category_result['category'],
                'category_confidence': category_result['confidence'],
                'intent': intent_result['intent'],
                'intent_confidence': intent_result['confidence'],
                'priority': priority,
                'language': language,
                'sentiment': sentiment_result.get('sentiment'),
                'sentiment_score': sentiment_result.get('sentiment_score'),
                'sentiment_confidence': sentiment_result.get('confidence'),
                'keywords': intent_result.get('keywords', []),
                'extracted_entities': entities,
                'requires_response': sentiment_result.get('requires_response', True),
                'auto_response': sentiment_result.get('auto_response'),
                'processing_time_ms': processing_time,
                'classifier_version': self.version,
                'classification_method': 'hybrid'
            }
            
            # Update email record
            email.category = category_result['category']
            email.intent = intent_result['intent']
            email.priority = priority
            email.language = language
            email.sentiment = sentiment_result.get('sentiment')
            email.sentiment_score = sentiment_result.get('sentiment_score')
            email.sentiment_confidence = sentiment_result.get('confidence')
            email.extracted_entities = entities
            email.keywords = intent_result.get('keywords', [])
            email.requires_response = sentiment_result.get('requires_response', True)
            email.classification_confidence = (
                category_result['confidence'] + intent_result['confidence']
            ) / 2
            email.classified_at = datetime.utcnow()
            
            # Calculate response deadline based on priority
            email.response_deadline = self._calculate_response_deadline(priority)
            
            # Store classification record if requested
            if store_result:
                await self._store_classification(email, classification)
            
            await self.db.commit()
            
            logger.info(
                f"Email {email.id} classified: "
                f"category={category_result['category'].value}, "
                f"intent={intent_result['intent'].value}, "
                f"priority={priority.value}, "
                f"time={processing_time}ms"
            )
            
            return {
                'success': True,
                **classification
            }
            
        except Exception as e:
            logger.error(f"Email classification failed: {str(e)}")
            await self.db.rollback()
            return {
                'success': False,
                'error': str(e)
            }
    
    def _classify_category(
        self,
        email: EmailMessage,
        text_content: str
    ) -> Dict[str, Any]:
        """
        Classify email category based on recipient and content
        
        Args:
            email: EmailMessage object
            text_content: Combined subject + body text
            
        Returns:
            Dict with category and confidence
        """
        text_lower = text_content.lower()
        
        # First, check recipient email for direct category match
        to_email = email.to_emails[0] if email.to_emails else ""
        to_local = to_email.split('@')[0].lower() if '@' in to_email else ""
        
        # Direct mapping from email address
        if 'sales' in to_local:
            return {'category': EmailCategory.SALES, 'confidence': 0.95}
        elif 'b2b' in to_local:
            return {'category': EmailCategory.B2B, 'confidence': 0.95}
        elif 'ota' in to_local:
            return {'category': EmailCategory.OTA, 'confidence': 0.95}
        elif 'reservation' in to_local or 'booking' in to_local:
            return {'category': EmailCategory.RESERVATIONS, 'confidence': 0.95}
        elif 'support' in to_local or 'customer' in to_local:
            return {'category': EmailCategory.SUPPORT, 'confidence': 0.95}
        elif 'pilgrimage' in to_local or 'religious' in to_local or 'faith' in to_local:
            return {'category': EmailCategory.PILGRIMAGES, 'confidence': 0.95}
        elif 'group' in to_local:
            return {'category': EmailCategory.GROUPS, 'confidence': 0.95}
        elif 'hotel' in to_local:
            return {'category': EmailCategory.SUPPLIERS_HOTELS, 'confidence': 0.95}
        elif 'transport' in to_local:
            return {'category': EmailCategory.SUPPLIERS_TRANSPORT, 'confidence': 0.95}
        elif 'marketing' in to_local:
            return {'category': EmailCategory.MARKETING, 'confidence': 0.95}
        elif 'feedback' in to_local:
            return {'category': EmailCategory.FEEDBACK, 'confidence': 0.95}
        
        # Check for regional categories
        for category, patterns in self.REGIONAL_EMAIL_PATTERNS.items():
            if any(pattern in to_local for pattern in patterns):
                return {'category': category, 'confidence': 0.90}
        
        # Content-based classification
        category_scores = {}
        
        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                category_scores[category] = score
        
        # Determine best match
        if category_scores:
            best_category = max(category_scores, key=category_scores.get)
            max_score = category_scores[best_category]
            total_keywords = len(self.CATEGORY_KEYWORDS[best_category])
            confidence = min(0.5 + (max_score / total_keywords) * 0.4, 0.90)
            
            return {
                'category': best_category,
                'confidence': confidence
            }
        
        # Default to corporate info if no match
        return {
            'category': EmailCategory.CORPORATE_INFO,
            'confidence': 0.30
        }
    
    async def _detect_intent(self, text_content: str) -> Dict[str, Any]:
        """
        Detect user intent from email content
        
        Args:
            text_content: Email text to analyze
            
        Returns:
            Dict with intent and confidence
        """
        text_lower = text_content.lower()
        
        # Calculate scores for each intent
        intent_scores = {}
        detected_keywords = []
        
        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
                    detected_keywords.append(keyword)
            if score > 0:
                intent_scores[intent] = score
        
        # Determine primary intent
        if not intent_scores:
            return {
                'intent': EmailIntent.QUERY,
                'confidence': 0.40,
                'keywords': []
            }
        
        best_intent = max(intent_scores, key=intent_scores.get)
        max_score = intent_scores[best_intent]
        total_keywords = len(self.INTENT_KEYWORDS[best_intent])
        confidence = min(0.50 + (max_score / total_keywords) * 0.45, 0.95)
        
        return {
            'intent': best_intent,
            'confidence': confidence,
            'keywords': list(set(detected_keywords))
        }
    
    def _determine_priority(
        self,
        email: EmailMessage,
        text_content: str,
        category: EmailCategory,
        intent: EmailIntent,
        sentiment: str
    ) -> EmailPriority:
        """
        Determine email priority based on multiple factors
        
        Args:
            email: EmailMessage object
            text_content: Email text
            category: Classified category
            intent: Detected intent
            sentiment: Sentiment analysis result
            
        Returns:
            EmailPriority level
        """
        text_lower = text_content.lower()
        
        # Check for urgent keywords
        if any(keyword in text_lower for keyword in self.URGENT_KEYWORDS):
            return EmailPriority.URGENT
        
        # Intent-based priority
        if intent == EmailIntent.URGENT:
            return EmailPriority.URGENT
        
        if intent == EmailIntent.COMPLAINT:
            return EmailPriority.HIGH
        
        # Sentiment-based priority
        if sentiment == 'negative':
            return EmailPriority.HIGH
        
        # Check for high priority keywords
        if any(keyword in text_lower for keyword in self.HIGH_PRIORITY_KEYWORDS):
            return EmailPriority.HIGH
        
        # Category-based priority
        high_priority_categories = [
            EmailCategory.COMPLAINT,
            EmailCategory.URGENT,
            EmailCategory.SUPPORT
        ]
        
        if category in high_priority_categories:
            return EmailPriority.HIGH
        
        # Default to normal priority
        return EmailPriority.NORMAL
    
    def _detect_language(self, text: str) -> EmailLanguage:
        """
        Detect language from text patterns
        
        Args:
            text: Text to analyze
            
        Returns:
            Detected EmailLanguage
        """
        # Check for non-Latin scripts first
        for language, pattern in self.LANGUAGE_PATTERNS.items():
            if re.search(pattern, text):
                return language
        
        # Default to English if no special characters
        # In production, this would use a proper language detection library
        return EmailLanguage.ENGLISH
    
    def _extract_entities(self, text: str) -> Dict[str, Any]:
        """
        Extract entities from email text (dates, destinations, etc.)
        
        Args:
            text: Email text to analyze
            
        Returns:
            Dict with extracted entities
        """
        entities = {}
        
        # Extract dates (simple pattern matching)
        date_patterns = [
            r'\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b',  # DD/MM/YYYY or MM/DD/YYYY
            r'\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b',    # YYYY-MM-DD
        ]
        
        dates = []
        for pattern in date_patterns:
            matches = re.findall(pattern, text)
            dates.extend(matches)
        
        if dates:
            entities['dates'] = dates
        
        # Extract numbers (potential travelers, budget)
        numbers = re.findall(r'\b\d+\b', text)
        if numbers:
            entities['numbers'] = [int(n) for n in numbers[:5]]  # Limit to first 5
        
        # Extract email addresses
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if emails:
            entities['emails'] = emails
        
        # Extract phone numbers (simple pattern)
        phones = re.findall(r'\b\+?[\d\s\-\(\)]{10,}\b', text)
        if phones:
            entities['phones'] = phones[:3]  # Limit to first 3
        
        # Common destinations (can be extended)
        destinations = [
            'jerusalem', 'bethlehem', 'nazareth', 'galilee', 'dead sea',
            'tel aviv', 'petra', 'wadi rum', 'amman', 'mexico city',
            'cancun', 'playa del carmen', 'madrid', 'barcelona', 'rome'
        ]
        
        text_lower = text.lower()
        found_destinations = [dest for dest in destinations if dest in text_lower]
        if found_destinations:
            entities['destinations'] = found_destinations
        
        return entities
    
    def _calculate_response_deadline(self, priority: EmailPriority) -> datetime:
        """
        Calculate response deadline based on priority
        
        Args:
            priority: Email priority level
            
        Returns:
            Deadline datetime
        """
        now = datetime.utcnow()
        
        if priority == EmailPriority.URGENT:
            return now + timedelta(hours=2)
        elif priority == EmailPriority.HIGH:
            return now + timedelta(hours=4)
        elif priority == EmailPriority.NORMAL:
            return now + timedelta(hours=24)
        else:  # LOW
            return now + timedelta(hours=48)
    
    async def _store_classification(
        self,
        email: EmailMessage,
        classification: Dict[str, Any]
    ):
        """
        Store classification result in database
        
        Args:
            email: EmailMessage object
            classification: Classification results
        """
        try:
            classification_record = EmailClassification(
                email_id=email.id,
                category=classification['category'],
                category_confidence=classification['category_confidence'],
                intent=classification['intent'],
                intent_confidence=classification['intent_confidence'],
                priority=classification['priority'],
                classifier_version=self.version,
                classification_method='hybrid',
                keywords_detected=classification.get('keywords', []),
                processing_time_ms=classification['processing_time_ms']
            )
            
            self.db.add(classification_record)
            await self.db.flush()
            
            logger.debug(f"Stored classification for email {email.id}")
            
        except Exception as e:
            logger.error(f"Failed to store classification: {str(e)}")
    
    async def batch_classify(
        self,
        email_ids: List[str]
    ) -> List[Dict[str, Any]]:
        """
        Classify multiple emails in batch
        
        Args:
            email_ids: List of email IDs to classify
            
        Returns:
            List of classification results
        """
        results = []
        
        for email_id in email_ids:
            try:
                # Fetch email
                result = await self.db.execute(
                    select(EmailMessage).where(EmailMessage.id == email_id)
                )
                email = result.scalar_one_or_none()
                
                if not email:
                    results.append({
                        'email_id': email_id,
                        'success': False,
                        'error': 'Email not found'
                    })
                    continue
                
                # Classify
                classification = await self.classify_email(email)
                results.append({
                    'email_id': email_id,
                    **classification
                })
                
            except Exception as e:
                logger.error(f"Failed to classify email {email_id}: {str(e)}")
                results.append({
                    'email_id': email_id,
                    'success': False,
                    'error': str(e)
                })
        
        return results
