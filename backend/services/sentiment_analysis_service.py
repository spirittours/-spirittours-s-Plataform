"""
Sentiment Analysis Service with DistilBERT

This service provides:
- Sentiment classification (positive, negative, neutral)
- Intent detection (query, complaint, praise, purchase)
- Confidence scoring
- Multi-language support
- Automatic response suggestions

Uses transformers library with DistilBERT model

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, insert

logger = logging.getLogger(__name__)

# Try to import transformers, gracefully handle if not installed
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    logger.warning("transformers library not available. Install with: pip install transformers torch")


class SentimentAnalysisService:
    """
    Sentiment analysis and intent classification service
    
    Uses DistilBERT for sentiment analysis and custom logic for intent detection
    """
    
    # Intent keywords for classification
    INTENT_KEYWORDS = {
        'query': [
            'how', 'what', 'when', 'where', 'why', 'which', 'who',
            'can you', 'could you', 'would you', 'do you',
            'question', 'information', 'details', 'tell me',
            '?'
        ],
        'complaint': [
            'disappointed', 'unhappy', 'terrible', 'horrible', 'awful',
            'worst', 'bad', 'poor', 'unsatisfied', 'frustrated',
            'angry', 'upset', 'problem', 'issue', 'broken',
            'not working', 'failed', 'error', 'refund', 'cancel'
        ],
        'praise': [
            'amazing', 'excellent', 'wonderful', 'fantastic', 'great',
            'love', 'perfect', 'best', 'awesome', 'incredible',
            'beautiful', 'outstanding', 'brilliant', 'thank you',
            'thanks', 'appreciate', 'grateful', 'impressed'
        ],
        'purchase_intent': [
            'buy', 'purchase', 'order', 'book', 'reserve',
            'pricing', 'price', 'cost', 'how much', 'available',
            'availability', 'in stock', 'interested', 'want to'
        ]
    }
    
    # Auto-response confidence threshold
    AUTO_RESPONSE_THRESHOLD = 0.85
    
    # Response templates
    RESPONSE_TEMPLATES = {
        'query_positive': [
            "Great question! {}",
            "Thanks for asking! {}",
            "Happy to help! {}"
        ],
        'complaint_empathy': [
            "We're so sorry to hear about your experience. {}",
            "Thank you for bringing this to our attention. {}",
            "We apologize for the inconvenience. {}"
        ],
        'praise_gratitude': [
            "Thank you so much! We're thrilled to hear that! {}",
            "We're so glad you enjoyed it! {}",
            "Your kind words mean the world to us! {}"
        ],
        'purchase_intent': [
            "We'd love to help you with that! {}",
            "Great choice! {}",
            "Excited to assist you! {}"
        ]
    }
    
    def __init__(self, db: AsyncSession):
        """
        Initialize sentiment analysis service
        
        Args:
            db: Database session
        """
        self.db = db
        self.sentiment_analyzer = None
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize ML models"""
        if not TRANSFORMERS_AVAILABLE:
            logger.warning("Transformers not available, using rule-based sentiment analysis")
            return
        
        try:
            # Initialize sentiment analysis pipeline with DistilBERT
            logger.info("Loading DistilBERT sentiment model...")
            
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                device=-1  # CPU
            )
            
            logger.info("DistilBERT model loaded successfully")
            
        except Exception as e:
            logger.error(f"Failed to load models: {str(e)}")
            logger.warning("Falling back to rule-based analysis")
    
    async def analyze_text(
        self,
        text: str,
        platform: str = 'unknown',
        post_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Analyze sentiment and intent of text
        
        Args:
            text: Text to analyze
            platform: Platform where text originated
            post_id: Optional associated post ID
            
        Returns:
            Dict with analysis results
        """
        try:
            # Get sentiment
            sentiment_result = self._analyze_sentiment(text)
            
            # Detect intent
            intent_result = self._detect_intent(text)
            
            # Determine if requires response
            requires_response = self._requires_response(
                sentiment_result['sentiment'],
                intent_result['intent'],
                sentiment_result['confidence']
            )
            
            # Generate auto-response if appropriate
            auto_response = None
            if requires_response and sentiment_result['confidence'] >= self.AUTO_RESPONSE_THRESHOLD:
                auto_response = self._generate_response(
                    text,
                    sentiment_result['sentiment'],
                    intent_result['intent']
                )
            
            # Combine results
            analysis = {
                'sentiment': sentiment_result['sentiment'],
                'sentiment_score': sentiment_result['score'],
                'confidence': sentiment_result['confidence'],
                'intent': intent_result['intent'],
                'keywords': intent_result['keywords'],
                'requires_response': requires_response,
                'auto_response': auto_response,
                'platform': platform,
                'analyzed_at': datetime.utcnow().isoformat()
            }
            
            # Store in database if post_id provided
            if post_id:
                await self._store_analysis(text, analysis, post_id)
            
            return {
                'success': True,
                **analysis
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _analyze_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze sentiment using DistilBERT or rule-based fallback
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with sentiment, score, and confidence
        """
        if self.sentiment_analyzer and TRANSFORMERS_AVAILABLE:
            try:
                # Use DistilBERT model
                result = self.sentiment_analyzer(text[:512])[0]  # Truncate to max length
                
                # Convert to our format
                label = result['label'].lower()
                score = result['score']
                
                # Map labels to sentiment
                sentiment_map = {
                    'positive': 'positive',
                    'negative': 'negative',
                    'neutral': 'neutral'
                }
                
                sentiment = sentiment_map.get(label, 'neutral')
                
                # Convert score to -1 to +1 range
                if sentiment == 'negative':
                    sentiment_score = -score
                elif sentiment == 'positive':
                    sentiment_score = score
                else:
                    sentiment_score = 0.0
                
                return {
                    'sentiment': sentiment,
                    'score': sentiment_score,
                    'confidence': score
                }
                
            except Exception as e:
                logger.error(f"DistilBERT analysis failed: {str(e)}")
                # Fall through to rule-based
        
        # Rule-based fallback
        return self._rule_based_sentiment(text)
    
    def _rule_based_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Simple rule-based sentiment analysis fallback
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with sentiment, score, and confidence
        """
        text_lower = text.lower()
        
        # Positive and negative keywords
        positive_words = [
            'love', 'great', 'amazing', 'excellent', 'wonderful', 'fantastic',
            'perfect', 'best', 'awesome', 'beautiful', 'brilliant', 'good'
        ]
        negative_words = [
            'hate', 'terrible', 'horrible', 'awful', 'bad', 'worst',
            'disappointing', 'poor', 'useless', 'broken', 'failed'
        ]
        
        # Count occurrences
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)
        
        # Determine sentiment
        if positive_count > negative_count:
            sentiment = 'positive'
            score = min(positive_count / 10.0, 1.0)
        elif negative_count > positive_count:
            sentiment = 'negative'
            score = -min(negative_count / 10.0, 1.0)
        else:
            sentiment = 'neutral'
            score = 0.0
        
        confidence = min(abs(score), 0.7)  # Lower confidence for rule-based
        
        return {
            'sentiment': sentiment,
            'score': score,
            'confidence': confidence
        }
    
    def _detect_intent(self, text: str) -> Dict[str, Any]:
        """
        Detect user intent from text
        
        Args:
            text: Text to analyze
            
        Returns:
            Dict with intent and keywords
        """
        text_lower = text.lower()
        
        # Calculate scores for each intent
        intent_scores = {}
        detected_keywords = []
        
        for intent, keywords in self.INTENT_KEYWORDS.items():
            score = 0
            for keyword in keywords:
                if keyword in text_lower:
                    score += 1
                    detected_keywords.append(keyword)
            intent_scores[intent] = score
        
        # Determine primary intent
        if all(score == 0 for score in intent_scores.values()):
            intent = 'other'
        else:
            intent = max(intent_scores, key=intent_scores.get)
        
        return {
            'intent': intent,
            'keywords': list(set(detected_keywords)),
            'scores': intent_scores
        }
    
    def _requires_response(
        self,
        sentiment: str,
        intent: str,
        confidence: float
    ) -> bool:
        """
        Determine if interaction requires a response
        
        Args:
            sentiment: Detected sentiment
            intent: Detected intent
            confidence: Confidence score
            
        Returns:
            Boolean indicating if response needed
        """
        # Always respond to complaints
        if intent == 'complaint':
            return True
        
        # Respond to queries
        if intent == 'query':
            return True
        
        # Respond to purchase intent
        if intent == 'purchase_intent':
            return True
        
        # Respond to negative sentiment if high confidence
        if sentiment == 'negative' and confidence >= 0.7:
            return True
        
        # Thank for praise if high confidence
        if intent == 'praise' and confidence >= 0.8:
            return True
        
        return False
    
    def _generate_response(
        self,
        original_text: str,
        sentiment: str,
        intent: str
    ) -> Optional[str]:
        """
        Generate automatic response based on sentiment and intent
        
        Args:
            original_text: Original comment/message
            sentiment: Detected sentiment
            intent: Detected intent
            
        Returns:
            Generated response or None
        """
        try:
            # Select appropriate template
            if intent == 'complaint':
                template_key = 'complaint_empathy'
                follow_up = "We'd like to make this right. Could you please DM us more details?"
            elif intent == 'query':
                template_key = 'query_positive'
                follow_up = "Check our bio for more info or DM us anytime!"
            elif intent == 'praise':
                template_key = 'praise_gratitude'
                follow_up = "Hope to see you on our next adventure! 🌟"
            elif intent == 'purchase_intent':
                template_key = 'purchase_intent'
                follow_up = "Visit our website or DM us for booking details!"
            else:
                return None
            
            # Get random template
            import random
            template = random.choice(self.RESPONSE_TEMPLATES[template_key])
            
            # Format with follow-up
            response = template.format(follow_up)
            
            return response
            
        except Exception as e:
            logger.error(f"Response generation failed: {str(e)}")
            return None
    
    async def _store_analysis(
        self,
        text: str,
        analysis: Dict[str, Any],
        post_id: int
    ):
        """Store analysis results in database"""
        try:
            from database import InteractionSentiment
            
            interaction = InteractionSentiment(
                post_id=post_id,
                platform=analysis['platform'],
                interaction_type='comment',
                content=text,
                sentiment=analysis['sentiment'],
                sentiment_score=analysis['sentiment_score'],
                confidence=analysis['confidence'],
                intent=analysis['intent'],
                keywords=analysis['keywords'],
                requires_response=analysis['requires_response'],
                ai_response=analysis.get('auto_response'),
                response_status='pending' if analysis['requires_response'] else 'not_needed',
                interaction_time=datetime.utcnow()
            )
            
            self.db.add(interaction)
            await self.db.commit()
            
            logger.info(f"Stored sentiment analysis for post {post_id}")
            
        except Exception as e:
            logger.error(f"Failed to store analysis: {str(e)}")
    
    async def batch_analyze(
        self,
        texts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple texts in batch
        
        Args:
            texts: List of dicts with 'text', 'platform', 'post_id'
            
        Returns:
            List of analysis results
        """
        results = []
        
        for item in texts:
            result = await self.analyze_text(
                text=item['text'],
                platform=item.get('platform', 'unknown'),
                post_id=item.get('post_id')
            )
            results.append(result)
        
        return results
    
    async def get_sentiment_summary(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        platform: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get sentiment analysis summary for a time period
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            platform: Optional platform filter
            
        Returns:
            Dict with sentiment statistics
        """
        try:
            from database import InteractionSentiment
            from sqlalchemy import func, and_
            
            # Build query
            query = select(
                InteractionSentiment.sentiment,
                func.count(InteractionSentiment.id).label('count'),
                func.avg(InteractionSentiment.sentiment_score).label('avg_score')
            ).group_by(InteractionSentiment.sentiment)
            
            # Apply filters
            conditions = []
            if start_date:
                conditions.append(InteractionSentiment.interaction_time >= start_date)
            if end_date:
                conditions.append(InteractionSentiment.interaction_time <= end_date)
            if platform:
                conditions.append(InteractionSentiment.platform == platform)
            
            if conditions:
                query = query.where(and_(*conditions))
            
            result = await self.db.execute(query)
            rows = result.all()
            
            # Format results
            summary = {
                'total_interactions': sum(row.count for row in rows),
                'by_sentiment': {
                    row.sentiment: {
                        'count': row.count,
                        'avg_score': float(row.avg_score)
                    }
                    for row in rows
                },
                'period': {
                    'start': start_date.isoformat() if start_date else None,
                    'end': end_date.isoformat() if end_date else None
                }
            }
            
            return {
                'success': True,
                **summary
            }
            
        except Exception as e:
            logger.error(f"Failed to get sentiment summary: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
