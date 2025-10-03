"""
Real-time Sentiment Analysis System for Spirit Tours CRM
Advanced emotion detection and sentiment monitoring during customer interactions
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import numpy as np
import pandas as pd
from textblob import TextBlob
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, sent_tokenize
import spacy
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import speech_recognition as sr
import pyaudio
import wave
from pydub import AudioSegment
from pydub.silence import split_on_silence
import librosa
import soundfile as sf
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, ForeignKey, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from pydantic import BaseModel, validator
import redis.asyncio as redis
import websockets
from celery import Celery
import uuid
import re
from collections import defaultdict, deque
import threading
import queue
import warnings
warnings.filterwarnings('ignore')

# Download required NLTK data
try:
    nltk.download('vader_lexicon', quiet=True)
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('averaged_perceptron_tagger', quiet=True)
except:
    pass

Base = declarative_base()

# Enums
class SentimentType(Enum):
    VERY_POSITIVE = "very_positive"
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    VERY_NEGATIVE = "very_negative"

class EmotionType(Enum):
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    EXCITEMENT = "excitement"
    FRUSTRATION = "frustration"
    CONFUSION = "confusion"
    SATISFACTION = "satisfaction"

class InteractionType(Enum):
    CHAT = "chat"
    EMAIL = "email"
    PHONE_CALL = "phone_call"
    VOICE_MESSAGE = "voice_message"
    VIDEO_CALL = "video_call"
    SOCIAL_MEDIA = "social_media"
    SUPPORT_TICKET = "support_ticket"

class AlertSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class AnalysisConfidence(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"

# Database Models
class SentimentAnalysis(Base):
    __tablename__ = "sentiment_analyses"
    
    id = Column(String, primary_key=True)
    
    # Interaction details
    interaction_id = Column(String, nullable=False)
    customer_id = Column(String)
    agent_id = Column(String)
    interaction_type = Column(String, nullable=False)  # InteractionType enum
    
    # Content analysis
    original_content = Column(Text, nullable=False)
    processed_content = Column(Text)
    content_language = Column(String, default="es")
    word_count = Column(Integer, default=0)
    
    # Sentiment scores
    overall_sentiment = Column(String, nullable=False)  # SentimentType enum
    sentiment_score = Column(Float, nullable=False)  # -1 to 1
    confidence_level = Column(String, default="medium")  # AnalysisConfidence enum
    
    # Detailed sentiment breakdown
    positive_score = Column(Float, default=0.0)
    negative_score = Column(Float, default=0.0)
    neutral_score = Column(Float, default=0.0)
    compound_score = Column(Float, default=0.0)
    
    # Emotion analysis
    primary_emotion = Column(String)  # EmotionType enum
    emotion_scores = Column(JSON)  # Dict of emotion -> score
    emotion_intensity = Column(Float, default=0.0)
    
    # Advanced analysis
    subjectivity = Column(Float, default=0.0)  # 0=objective, 1=subjective
    polarity_shift = Column(Float, default=0.0)  # Sentiment change over time
    urgency_level = Column(String, default="normal")  # low, normal, high, urgent
    
    # Context and keywords
    keywords = Column(JSON)  # Important keywords found
    topics = Column(JSON)   # Topics discussed
    intent_indicators = Column(JSON)  # Buying intent, complaint, etc.
    
    # Audio-specific (for voice interactions)
    audio_features = Column(JSON)  # Tone, pace, volume analysis
    speech_quality = Column(String)  # clear, muffled, noisy, etc.
    
    # Real-time tracking
    analysis_timestamp = Column(DateTime, default=datetime.utcnow)
    processing_time_ms = Column(Integer, default=0)
    
    # Alert generation
    alert_triggered = Column(Boolean, default=False)
    alert_severity = Column(String)  # AlertSeverity enum
    alert_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sentiment_alerts = relationship("SentimentAlert", back_populates="analysis")

class SentimentAlert(Base):
    __tablename__ = "sentiment_alerts"
    
    id = Column(String, primary_key=True)
    analysis_id = Column(String, ForeignKey("sentiment_analyses.id"))
    
    # Alert details
    alert_type = Column(String, nullable=False)  # negative_sentiment, emotion_spike, urgency_detected
    severity = Column(String, nullable=False)  # AlertSeverity enum
    title = Column(String, nullable=False)
    description = Column(Text)
    
    # Trigger conditions
    trigger_conditions = Column(JSON)
    threshold_exceeded = Column(String)
    
    # Customer and interaction info
    customer_id = Column(String)
    agent_id = Column(String)
    interaction_id = Column(String)
    interaction_type = Column(String)
    
    # Resolution tracking
    status = Column(String, default="active")  # active, acknowledged, resolved, false_positive
    acknowledged_by = Column(String)
    acknowledged_at = Column(DateTime)
    resolved_at = Column(DateTime)
    resolution_notes = Column(Text)
    
    # Escalation
    escalated = Column(Boolean, default=False)
    escalated_to = Column(String)
    escalation_reason = Column(Text)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    analysis = relationship("SentimentAnalysis", back_populates="sentiment_alerts")

class SentimentTrend(Base):
    __tablename__ = "sentiment_trends"
    
    id = Column(String, primary_key=True)
    
    # Trend tracking
    customer_id = Column(String, nullable=False)
    time_window = Column(String, default="hourly")  # hourly, daily, weekly
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    
    # Aggregated metrics
    interaction_count = Column(Integer, default=0)
    avg_sentiment_score = Column(Float, default=0.0)
    sentiment_variance = Column(Float, default=0.0)
    
    # Sentiment distribution
    very_positive_count = Column(Integer, default=0)
    positive_count = Column(Integer, default=0)
    neutral_count = Column(Integer, default=0)
    negative_count = Column(Integer, default=0)
    very_negative_count = Column(Integer, default=0)
    
    # Emotion trends
    dominant_emotion = Column(String)
    emotion_stability = Column(Float, default=0.0)  # How consistent emotions are
    
    # Change indicators
    sentiment_direction = Column(String, default="stable")  # improving, declining, stable, volatile
    change_rate = Column(Float, default=0.0)
    trend_significance = Column(Float, default=0.0)
    
    # Context
    interaction_types = Column(JSON)  # Count by interaction type
    topics_discussed = Column(JSON)  # Trending topics
    
    created_at = Column(DateTime, default=datetime.utcnow)

class SentimentConfiguration(Base):
    __tablename__ = "sentiment_configurations"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    
    # Alert thresholds
    negative_sentiment_threshold = Column(Float, default=-0.5)
    positive_sentiment_threshold = Column(Float, default=0.5)
    emotion_intensity_threshold = Column(Float, default=0.7)
    urgency_keywords_threshold = Column(Integer, default=3)
    
    # Analysis settings
    enable_emotion_detection = Column(Boolean, default=True)
    enable_keyword_extraction = Column(Boolean, default=True)
    enable_topic_modeling = Column(Boolean, default=True)
    enable_intent_detection = Column(Boolean, default=True)
    enable_voice_analysis = Column(Boolean, default=True)
    
    # Language and model settings
    supported_languages = Column(JSON, default=['es', 'en'])
    primary_model = Column(String, default="vader")  # vader, textblob, transformers
    fallback_model = Column(String, default="textblob")
    
    # Real-time settings
    analysis_frequency_seconds = Column(Integer, default=5)
    batch_size = Column(Integer, default=10)
    max_processing_time_ms = Column(Integer, default=1000)
    
    # Alert settings
    alert_cooldown_minutes = Column(Integer, default=15)
    auto_escalation_threshold = Column(Float, default=0.8)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# Pydantic Models
class SentimentAnalysisRequest(BaseModel):
    interaction_id: str
    customer_id: Optional[str] = None
    agent_id: Optional[str] = None
    interaction_type: InteractionType
    content: str
    content_language: str = "es"
    audio_data: Optional[bytes] = None
    context: Optional[Dict[str, Any]] = {}

class SentimentAnalysisResult(BaseModel):
    analysis_id: str
    overall_sentiment: SentimentType
    sentiment_score: float
    confidence_level: AnalysisConfidence
    primary_emotion: Optional[EmotionType] = None
    emotion_scores: Dict[str, float] = {}
    keywords: List[str] = []
    topics: List[str] = []
    alert_triggered: bool = False
    alert_severity: Optional[AlertSeverity] = None
    processing_time_ms: int = 0

# AI Models and Analyzers
class MultiLanguageSentimentAnalyzer:
    """Advanced sentiment analyzer supporting multiple languages and models"""
    
    def __init__(self):
        # Initialize NLTK components
        self.vader_analyzer = SentimentIntensityAnalyzer()
        
        # Initialize spaCy models
        self.nlp_models = {}
        try:
            self.nlp_models['es'] = spacy.load("es_core_news_sm")
            self.nlp_models['en'] = spacy.load("en_core_web_sm")
        except OSError:
            self.logger.warning("SpaCy models not found. Install with: python -m spacy download es_core_news_sm")
        
        # Initialize transformers models
        self.emotion_classifier = None
        self.sentiment_classifier = None
        
        try:
            # Load emotion detection model
            self.emotion_classifier = pipeline(
                "text-classification",
                model="j-hartmann/emotion-english-distilroberta-base",
                device=-1  # Use CPU
            )
            
            # Load multilingual sentiment model
            self.sentiment_classifier = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",
                device=-1  # Use CPU
            )
        except Exception as e:
            logging.warning(f"Could not load transformer models: {e}")
        
        # Spanish emotion keywords
        self.spanish_emotion_keywords = {
            'joy': ['feliz', 'contento', 'alegre', 'emocionado', 'genial', 'excelente', 'fantástico', 'perfecto'],
            'sadness': ['triste', 'decepcionado', 'desanimado', 'melancólico', 'deprimido'],
            'anger': ['enojado', 'molesto', 'furioso', 'irritado', 'indignado', 'iracundo'],
            'fear': ['miedo', 'temor', 'asustado', 'nervioso', 'preocupado', 'ansioso'],
            'surprise': ['sorprendido', 'asombrado', 'impresionado', 'inesperado'],
            'excitement': ['emocionado', 'entusiasmado', 'ansioso por', 'expectante'],
            'frustration': ['frustrado', 'desesperado', 'harto', 'cansado de'],
            'satisfaction': ['satisfecho', 'complacido', 'agradecido', 'conforme']
        }
        
        # Spanish urgency indicators
        self.spanish_urgency_keywords = [
            'urgente', 'inmediatamente', 'ahora mismo', 'ya', 'rápido',
            'emergencia', 'importante', 'pronto', 'cuanto antes', 'necesito ya'
        ]
        
        # Intent keywords
        self.intent_keywords = {
            'buying_intent': ['comprar', 'reservar', 'precio', 'costo', 'disponibilidad', 'fechas'],
            'complaint': ['problema', 'queja', 'mal servicio', 'insatisfecho', 'reclamo'],
            'information_seeking': ['información', 'detalles', 'explicar', 'cómo funciona'],
            'cancellation': ['cancelar', 'devolver', 'reembolso', 'cambiar fechas']
        }
    
    async def analyze_sentiment(self, text: str, language: str = "es") -> Dict[str, Any]:
        """Comprehensive sentiment analysis"""
        
        start_time = datetime.utcnow()
        
        # Clean and preprocess text
        cleaned_text = self._preprocess_text(text, language)
        
        # Multi-model analysis
        results = {
            'original_text': text,
            'cleaned_text': cleaned_text,
            'language': language,
            'word_count': len(cleaned_text.split())
        }
        
        # VADER analysis (works well with Spanish too)
        vader_scores = self.vader_analyzer.polarity_scores(cleaned_text)
        results['vader_scores'] = vader_scores
        
        # TextBlob analysis
        blob = TextBlob(cleaned_text)
        results['textblob_sentiment'] = blob.sentiment.polarity
        results['textblob_subjectivity'] = blob.sentiment.subjectivity
        
        # Transformer-based analysis (if available)
        if self.sentiment_classifier:
            try:
                transformer_result = self.sentiment_classifier(cleaned_text[:512])  # Truncate for model limits
                results['transformer_sentiment'] = transformer_result[0]
            except Exception as e:
                logging.warning(f"Transformer sentiment analysis failed: {e}")
        
        # Emotion analysis
        emotions = await self._analyze_emotions(cleaned_text, language)
        results['emotions'] = emotions
        
        # Keyword extraction
        keywords = self._extract_keywords(cleaned_text, language)
        results['keywords'] = keywords
        
        # Intent detection
        intents = self._detect_intent(cleaned_text)
        results['intents'] = intents
        
        # Urgency detection
        urgency_level = self._detect_urgency(cleaned_text, language)
        results['urgency_level'] = urgency_level
        
        # Calculate final sentiment score
        final_sentiment = self._calculate_final_sentiment(results)
        results['final_sentiment'] = final_sentiment
        
        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds() * 1000
        results['processing_time_ms'] = int(processing_time)
        
        return results
    
    async def _analyze_emotions(self, text: str, language: str) -> Dict[str, float]:
        """Analyze emotions in text"""
        
        emotions = defaultdict(float)
        
        # Keyword-based emotion detection for Spanish
        if language == 'es':
            text_lower = text.lower()
            for emotion, keywords in self.spanish_emotion_keywords.items():
                matches = sum(1 for keyword in keywords if keyword in text_lower)
                if matches > 0:
                    emotions[emotion] = min(1.0, matches * 0.3)
        
        # Transformer-based emotion detection (English)
        if self.emotion_classifier and language == 'en':
            try:
                emotion_result = self.emotion_classifier(text[:512])
                for result in emotion_result:
                    emotion = result['label'].lower()
                    score = result['score']
                    emotions[emotion] = score
            except Exception as e:
                logging.warning(f"Emotion classification failed: {e}")
        
        # Fallback: derive emotions from sentiment
        if not emotions:
            sentiment_score = TextBlob(text).sentiment.polarity
            if sentiment_score > 0.3:
                emotions['joy'] = min(1.0, sentiment_score)
            elif sentiment_score < -0.3:
                emotions['sadness'] = min(1.0, abs(sentiment_score))
            else:
                emotions['neutral'] = 0.7
        
        return dict(emotions)
    
    def _preprocess_text(self, text: str, language: str) -> str:
        """Clean and preprocess text for analysis"""
        
        # Remove URLs, emails, phone numbers
        text = re.sub(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\\(\\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', '', text)
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '', text)
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '', text)
        
        # Remove excessive punctuation and normalize whitespace
        text = re.sub(r'[!]{2,}', '!', text)
        text = re.sub(r'[?]{2,}', '?', text)
        text = re.sub(r'\s+', ' ', text)
        
        # Remove excessive capitalization while preserving emphasis
        words = text.split()
        processed_words = []
        for word in words:
            if word.isupper() and len(word) > 2:
                processed_words.append(word.lower().capitalize())
            else:
                processed_words.append(word)
        
        return ' '.join(processed_words).strip()
    
    def _extract_keywords(self, text: str, language: str) -> List[str]:
        """Extract important keywords from text"""
        
        # Use spaCy if available
        if language in self.nlp_models:
            doc = self.nlp_models[language](text)
            keywords = []
            
            # Extract named entities
            for ent in doc.ents:
                if ent.label_ in ['PER', 'ORG', 'LOC', 'MISC']:
                    keywords.append(ent.text.lower())
            
            # Extract important nouns and adjectives
            for token in doc:
                if (token.pos_ in ['NOUN', 'ADJ'] and 
                    not token.is_stop and 
                    not token.is_punct and 
                    len(token.text) > 2):
                    keywords.append(token.lemma_.lower())
            
            return list(set(keywords))[:10]  # Top 10 keywords
        
        # Fallback: simple keyword extraction
        words = text.lower().split()
        # Filter out common stop words
        spanish_stopwords = {
            'el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le',
            'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'como'
        }
        
        keywords = [word for word in words if len(word) > 3 and word not in spanish_stopwords]
        return list(set(keywords))[:10]
    
    def _detect_intent(self, text: str) -> Dict[str, float]:
        """Detect customer intent from text"""
        
        intents = {}
        text_lower = text.lower()
        
        for intent, keywords in self.intent_keywords.items():
            matches = sum(1 for keyword in keywords if keyword in text_lower)
            if matches > 0:
                intents[intent] = min(1.0, matches * 0.4)
        
        return intents
    
    def _detect_urgency(self, text: str, language: str) -> str:
        """Detect urgency level in text"""
        
        text_lower = text.lower()
        urgency_score = 0
        
        if language == 'es':
            # Count urgency indicators
            for keyword in self.spanish_urgency_keywords:
                if keyword in text_lower:
                    urgency_score += 1
        
        # Check for excessive punctuation (indicates urgency)
        if text.count('!') >= 2 or text.count('?') >= 2:
            urgency_score += 1
        
        # Check for ALL CAPS (indicates shouting/urgency)
        caps_words = sum(1 for word in text.split() if word.isupper() and len(word) > 2)
        if caps_words >= 2:
            urgency_score += 2
        
        # Determine urgency level
        if urgency_score >= 4:
            return 'urgent'
        elif urgency_score >= 2:
            return 'high'
        elif urgency_score >= 1:
            return 'normal'
        else:
            return 'low'
    
    def _calculate_final_sentiment(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate final sentiment from multiple analysis results"""
        
        # Combine different sentiment scores
        scores = []
        
        # VADER compound score
        if 'vader_scores' in results:
            scores.append(results['vader_scores']['compound'])
        
        # TextBlob sentiment
        if 'textblob_sentiment' in results:
            scores.append(results['textblob_sentiment'])
        
        # Transformer sentiment (convert to -1 to 1 scale)
        if 'transformer_sentiment' in results:
            label = results['transformer_sentiment']['label'].lower()
            score = results['transformer_sentiment']['score']
            
            if 'positive' in label:
                scores.append(score)
            elif 'negative' in label:
                scores.append(-score)
            else:  # neutral
                scores.append(0)
        
        # Calculate weighted average
        if scores:
            final_score = np.mean(scores)
        else:
            final_score = 0.0
        
        # Determine sentiment category
        if final_score >= 0.6:
            sentiment_type = SentimentType.VERY_POSITIVE
            confidence = AnalysisConfidence.HIGH
        elif final_score >= 0.2:
            sentiment_type = SentimentType.POSITIVE
            confidence = AnalysisConfidence.MEDIUM
        elif final_score <= -0.6:
            sentiment_type = SentimentType.VERY_NEGATIVE
            confidence = AnalysisConfidence.HIGH
        elif final_score <= -0.2:
            sentiment_type = SentimentType.NEGATIVE
            confidence = AnalysisConfidence.MEDIUM
        else:
            sentiment_type = SentimentType.NEUTRAL
            confidence = AnalysisConfidence.MEDIUM
        
        # Adjust confidence based on score consistency
        score_variance = np.var(scores) if len(scores) > 1 else 0
        if score_variance > 0.3:
            if confidence == AnalysisConfidence.HIGH:
                confidence = AnalysisConfidence.MEDIUM
            elif confidence == AnalysisConfidence.MEDIUM:
                confidence = AnalysisConfidence.LOW
        
        return {
            'sentiment_type': sentiment_type,
            'sentiment_score': final_score,
            'confidence': confidence,
            'score_breakdown': scores,
            'score_variance': score_variance
        }

class VoiceEmotionAnalyzer:
    """Analyze emotions from voice/audio data"""
    
    def __init__(self):
        self.sample_rate = 16000
        self.frame_length = 2048
        self.hop_length = 512
    
    async def analyze_audio_emotion(self, audio_data: bytes) -> Dict[str, Any]:
        """Analyze emotion from audio data"""
        
        try:
            # Convert audio data to numpy array
            audio_array, sr = librosa.load(io.BytesIO(audio_data), sr=self.sample_rate)
            
            # Extract audio features
            features = self._extract_audio_features(audio_array, sr)
            
            # Analyze prosodic features
            prosodic_analysis = self._analyze_prosodic_features(audio_array, sr)
            
            # Combine features for emotion classification
            emotion_prediction = self._predict_emotion_from_audio(features, prosodic_analysis)
            
            return {
                'audio_features': features,
                'prosodic_analysis': prosodic_analysis,
                'emotion_prediction': emotion_prediction,
                'audio_quality': self._assess_audio_quality(audio_array, sr)
            }
            
        except Exception as e:
            logging.error(f"Audio emotion analysis failed: {e}")
            return {
                'error': str(e),
                'audio_features': {},
                'emotion_prediction': {'confidence': 'low'}
            }
    
    def _extract_audio_features(self, audio: np.ndarray, sr: int) -> Dict[str, float]:
        """Extract relevant audio features for emotion analysis"""
        
        features = {}
        
        try:
            # Spectral features
            spectral_centroids = librosa.feature.spectral_centroid(y=audio, sr=sr)[0]
            features['spectral_centroid_mean'] = np.mean(spectral_centroids)
            features['spectral_centroid_std'] = np.std(spectral_centroids)
            
            # MFCC features
            mfccs = librosa.feature.mfcc(y=audio, sr=sr, n_mfcc=13)
            for i in range(13):
                features[f'mfcc_{i}_mean'] = np.mean(mfccs[i])
                features[f'mfcc_{i}_std'] = np.std(mfccs[i])
            
            # Chroma features
            chroma = librosa.feature.chroma_stft(y=audio, sr=sr)
            features['chroma_mean'] = np.mean(chroma)
            features['chroma_std'] = np.std(chroma)
            
            # Zero crossing rate
            zcr = librosa.feature.zero_crossing_rate(audio)[0]
            features['zcr_mean'] = np.mean(zcr)
            features['zcr_std'] = np.std(zcr)
            
            # RMS energy
            rms = librosa.feature.rms(y=audio)[0]
            features['rms_mean'] = np.mean(rms)
            features['rms_std'] = np.std(rms)
            
        except Exception as e:
            logging.error(f"Feature extraction error: {e}")
        
        return features
    
    def _analyze_prosodic_features(self, audio: np.ndarray, sr: int) -> Dict[str, Any]:
        """Analyze prosodic features (pitch, tempo, volume)"""
        
        prosodic = {}
        
        try:
            # Pitch analysis
            pitches, magnitudes = librosa.piptrack(y=audio, sr=sr)
            pitch_values = []
            
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            if pitch_values:
                prosodic['pitch_mean'] = np.mean(pitch_values)
                prosodic['pitch_std'] = np.std(pitch_values)
                prosodic['pitch_range'] = max(pitch_values) - min(pitch_values)
            else:
                prosodic['pitch_mean'] = 0
                prosodic['pitch_std'] = 0
                prosodic['pitch_range'] = 0
            
            # Tempo analysis
            tempo, _ = librosa.beat.beat_track(y=audio, sr=sr)
            prosodic['tempo'] = tempo
            
            # Volume dynamics
            rms = librosa.feature.rms(y=audio)[0]
            prosodic['volume_mean'] = np.mean(rms)
            prosodic['volume_dynamics'] = np.std(rms)
            
            # Speaking rate (rough estimate)
            onset_frames = librosa.onset.onset_detect(y=audio, sr=sr)
            prosodic['speaking_rate'] = len(onset_frames) / (len(audio) / sr)
            
        except Exception as e:
            logging.error(f"Prosodic analysis error: {e}")
        
        return prosodic
    
    def _predict_emotion_from_audio(self, features: Dict, prosodic: Dict) -> Dict[str, Any]:
        """Predict emotion from audio features (simplified heuristic approach)"""
        
        # Simple heuristic-based emotion prediction
        # In production, this would use a trained ML model
        
        emotion_scores = defaultdict(float)
        
        # High pitch + fast tempo = excitement/joy
        if (prosodic.get('pitch_mean', 0) > 200 and 
            prosodic.get('tempo', 0) > 120):
            emotion_scores['excitement'] += 0.6
            emotion_scores['joy'] += 0.4
        
        # Low pitch + slow tempo = sadness
        elif (prosodic.get('pitch_mean', 0) < 150 and 
              prosodic.get('tempo', 0) < 80):
            emotion_scores['sadness'] += 0.7
        
        # High volume dynamics = anger/frustration
        if prosodic.get('volume_dynamics', 0) > 0.1:
            emotion_scores['anger'] += 0.5
            emotion_scores['frustration'] += 0.3
        
        # Fast speaking rate = anxiety/urgency
        if prosodic.get('speaking_rate', 0) > 5:
            emotion_scores['anxiety'] += 0.4
        
        # Default to neutral if no clear emotion
        if not emotion_scores:
            emotion_scores['neutral'] = 0.7
        
        # Normalize scores
        total_score = sum(emotion_scores.values())
        if total_score > 0:
            emotion_scores = {k: v/total_score for k, v in emotion_scores.items()}
        
        primary_emotion = max(emotion_scores.items(), key=lambda x: x[1]) if emotion_scores else ('neutral', 0.5)
        
        return {
            'emotion_scores': dict(emotion_scores),
            'primary_emotion': primary_emotion[0],
            'confidence': 'medium' if primary_emotion[1] > 0.6 else 'low'
        }
    
    def _assess_audio_quality(self, audio: np.ndarray, sr: int) -> str:
        """Assess audio quality for analysis reliability"""
        
        # Calculate signal-to-noise ratio estimate
        rms = np.sqrt(np.mean(audio**2))
        
        if rms > 0.1:
            return 'good'
        elif rms > 0.05:
            return 'fair'
        else:
            return 'poor'

# Main Real-time Sentiment Analysis System
class RealtimeSentimentAnalysisSystem:
    """
    Comprehensive real-time sentiment analysis system with multi-modal support
    """
    
    def __init__(self, database_url: str, redis_url: str = "redis://localhost:6379"):
        self.database_url = database_url
        self.redis_url = redis_url
        self.engine = None
        self.session_factory = None
        self.redis_client = None
        
        # Analysis components
        self.sentiment_analyzer = MultiLanguageSentimentAnalyzer()
        self.voice_analyzer = VoiceEmotionAnalyzer()
        
        # Real-time processing
        self.analysis_queue = queue.Queue()
        self.processing_threads = []
        self.websocket_connections = {}
        
        # Alert thresholds (can be configured)
        self.alert_config = {
            'negative_threshold': -0.6,
            'emotion_intensity_threshold': 0.8,
            'urgency_threshold': 'high',
            'consecutive_negative_limit': 3
        }
        
        # Celery for background processing
        self.celery_app = Celery('realtime_sentiment')
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize the sentiment analysis system"""
        self.engine = create_async_engine(self.database_url, echo=True)
        self.session_factory = sessionmaker(
            self.engine, 
            class_=AsyncSession, 
            expire_on_commit=False
        )
        
        self.redis_client = redis.from_url(self.redis_url)
        
        # Create database tables
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Setup default configuration
        await self._setup_default_configuration()
        
        # Start processing threads
        self._start_processing_threads()
        
        self.logger.info("✅ Real-time Sentiment Analysis System initialized")
    
    async def analyze_interaction(self, request: SentimentAnalysisRequest) -> SentimentAnalysisResult:
        """Analyze sentiment of customer interaction"""
        
        analysis_id = str(uuid.uuid4())
        start_time = datetime.utcnow()
        
        try:
            # Perform sentiment analysis
            analysis_results = await self.sentiment_analyzer.analyze_sentiment(
                request.content,
                request.content_language
            )
            
            # Analyze audio if provided
            audio_results = {}
            if request.audio_data:
                audio_results = await self.voice_analyzer.analyze_audio_emotion(request.audio_data)
            
            # Create comprehensive analysis record
            sentiment_analysis = await self._create_analysis_record(
                analysis_id,
                request,
                analysis_results,
                audio_results
            )
            
            # Check for alerts
            alert_info = await self._check_alert_conditions(
                sentiment_analysis,
                request.customer_id
            )
            
            # Send real-time updates via WebSocket
            await self._send_realtime_update(request, sentiment_analysis, alert_info)
            
            # Update customer sentiment trend
            await self._update_sentiment_trend(request.customer_id, sentiment_analysis)
            
            # Create response
            result = SentimentAnalysisResult(
                analysis_id=analysis_id,
                overall_sentiment=SentimentType(sentiment_analysis['overall_sentiment']),
                sentiment_score=sentiment_analysis['sentiment_score'],
                confidence_level=AnalysisConfidence(sentiment_analysis['confidence_level']),
                primary_emotion=EmotionType(sentiment_analysis['primary_emotion']) if sentiment_analysis.get('primary_emotion') else None,
                emotion_scores=sentiment_analysis.get('emotion_scores', {}),
                keywords=sentiment_analysis.get('keywords', []),
                topics=sentiment_analysis.get('topics', []),
                alert_triggered=alert_info['triggered'],
                alert_severity=AlertSeverity(alert_info['severity']) if alert_info['severity'] else None,
                processing_time_ms=sentiment_analysis['processing_time_ms']
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Sentiment analysis error: {e}")
            raise
    
    async def get_customer_sentiment_trend(self, customer_id: str, days: int = 7) -> Dict[str, Any]:
        """Get customer sentiment trend over time"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Get sentiment analyses for customer
            analyses = await session.execute("""
                SELECT analysis_timestamp, overall_sentiment, sentiment_score, 
                       primary_emotion, emotion_intensity
                FROM sentiment_analyses
                WHERE customer_id = :customer_id 
                AND analysis_timestamp >= :start_date
                ORDER BY analysis_timestamp
            """, {'customer_id': customer_id, 'start_date': start_date})
            
            sentiment_data = [dict(row) for row in analyses]
            
            # Get aggregated trends
            trends = await session.execute("""
                SELECT * FROM sentiment_trends
                WHERE customer_id = :customer_id
                AND period_start >= :start_date
                ORDER BY period_start
            """, {'customer_id': customer_id, 'start_date': start_date})
            
            trend_data = [dict(row) for row in trends]
            
            # Calculate summary statistics
            if sentiment_data:
                scores = [d['sentiment_score'] for d in sentiment_data]
                summary = {
                    'total_interactions': len(sentiment_data),
                    'avg_sentiment': np.mean(scores),
                    'sentiment_volatility': np.std(scores),
                    'trend_direction': self._calculate_trend_direction(scores),
                    'dominant_emotion': self._find_dominant_emotion(sentiment_data),
                    'recent_sentiment': scores[-5:] if len(scores) >= 5 else scores
                }
            else:
                summary = {
                    'total_interactions': 0,
                    'avg_sentiment': 0.0,
                    'sentiment_volatility': 0.0,
                    'trend_direction': 'stable',
                    'dominant_emotion': 'neutral',
                    'recent_sentiment': []
                }
            
            return {
                'customer_id': customer_id,
                'period_days': days,
                'sentiment_timeline': sentiment_data,
                'aggregated_trends': trend_data,
                'summary': summary,
                'generated_at': datetime.utcnow().isoformat()
            }
    
    async def get_sentiment_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get comprehensive sentiment analytics"""
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        async with self.session_factory() as session:
            # Overall sentiment distribution
            sentiment_distribution = await session.execute("""
                SELECT overall_sentiment, COUNT(*) as count
                FROM sentiment_analyses
                WHERE analysis_timestamp >= :start_date
                GROUP BY overall_sentiment
            """, {'start_date': start_date})
            
            # Emotion analysis
            emotion_analysis = await session.execute("""
                SELECT primary_emotion, COUNT(*) as count,
                       AVG(emotion_intensity) as avg_intensity
                FROM sentiment_analyses
                WHERE analysis_timestamp >= :start_date
                AND primary_emotion IS NOT NULL
                GROUP BY primary_emotion
            """, {'start_date': start_date})
            
            # Alert statistics
            alert_stats = await session.execute("""
                SELECT severity, alert_type, COUNT(*) as count
                FROM sentiment_alerts
                WHERE created_at >= :start_date
                GROUP BY severity, alert_type
            """, {'start_date': start_date})
            
            # Interaction type breakdown
            interaction_breakdown = await session.execute("""
                SELECT interaction_type, 
                       COUNT(*) as total_interactions,
                       AVG(sentiment_score) as avg_sentiment,
                       COUNT(CASE WHEN overall_sentiment IN ('negative', 'very_negative') THEN 1 END) as negative_count
                FROM sentiment_analyses
                WHERE analysis_timestamp >= :start_date
                GROUP BY interaction_type
            """, {'start_date': start_date})
            
            # Daily trends
            daily_trends = await session.execute("""
                SELECT DATE(analysis_timestamp) as date,
                       COUNT(*) as total_analyses,
                       AVG(sentiment_score) as avg_sentiment,
                       COUNT(CASE WHEN alert_triggered = true THEN 1 END) as alerts_triggered
                FROM sentiment_analyses
                WHERE analysis_timestamp >= :start_date
                GROUP BY DATE(analysis_timestamp)
                ORDER BY date
            """, {'start_date': start_date})
            
            return {
                'period_days': days,
                'sentiment_distribution': [dict(row) for row in sentiment_distribution],
                'emotion_analysis': [dict(row) for row in emotion_analysis],
                'alert_statistics': [dict(row) for row in alert_stats],
                'interaction_breakdown': [dict(row) for row in interaction_breakdown],
                'daily_trends': [dict(row) for row in daily_trends],
                'generated_at': datetime.utcnow().isoformat()
            }
    
    async def setup_realtime_monitoring(self, port: int = 8766):
        """Setup WebSocket server for real-time sentiment monitoring"""
        
        async def handle_websocket(websocket, path):
            try:
                # Register connection
                connection_id = str(uuid.uuid4())
                self.websocket_connections[connection_id] = websocket
                
                await websocket.send(json.dumps({
                    'type': 'connection_established',
                    'connection_id': connection_id
                }))
                
                # Keep connection alive
                async for message in websocket:
                    # Handle incoming messages (subscription requests, etc.)
                    await self._handle_websocket_message(connection_id, message)
                    
            except Exception as e:
                self.logger.error(f"WebSocket error: {e}")
            finally:
                if connection_id in self.websocket_connections:
                    del self.websocket_connections[connection_id]
        
        return await websockets.serve(handle_websocket, "localhost", port)
    
    # Helper methods
    async def _create_analysis_record(self, 
                                    analysis_id: str,
                                    request: SentimentAnalysisRequest,
                                    analysis_results: Dict[str, Any],
                                    audio_results: Dict[str, Any]) -> Dict[str, Any]:
        """Create sentiment analysis database record"""
        
        # Extract final sentiment data
        final_sentiment = analysis_results['final_sentiment']
        emotions = analysis_results.get('emotions', {})
        
        # Determine primary emotion
        primary_emotion = None
        emotion_intensity = 0.0
        if emotions:
            primary_emotion_item = max(emotions.items(), key=lambda x: x[1])
            primary_emotion = primary_emotion_item[0]
            emotion_intensity = primary_emotion_item[1]
        
        # Combine audio results if available
        if audio_results and 'emotion_prediction' in audio_results:
            audio_emotion = audio_results['emotion_prediction'].get('primary_emotion')
            if audio_emotion and emotion_intensity < 0.5:  # Use audio emotion if text emotion is weak
                primary_emotion = audio_emotion
                emotion_intensity = 0.6
        
        async with self.session_factory() as session:
            sentiment_analysis = SentimentAnalysis(
                id=analysis_id,
                interaction_id=request.interaction_id,
                customer_id=request.customer_id,
                agent_id=request.agent_id,
                interaction_type=request.interaction_type.value,
                original_content=request.content,
                processed_content=analysis_results.get('cleaned_text', request.content),
                content_language=request.content_language,
                word_count=analysis_results.get('word_count', 0),
                overall_sentiment=final_sentiment['sentiment_type'].value,
                sentiment_score=final_sentiment['sentiment_score'],
                confidence_level=final_sentiment['confidence'].value,
                positive_score=analysis_results.get('vader_scores', {}).get('pos', 0.0),
                negative_score=analysis_results.get('vader_scores', {}).get('neg', 0.0),
                neutral_score=analysis_results.get('vader_scores', {}).get('neu', 0.0),
                compound_score=analysis_results.get('vader_scores', {}).get('compound', 0.0),
                primary_emotion=primary_emotion,
                emotion_scores=emotions,
                emotion_intensity=emotion_intensity,
                subjectivity=analysis_results.get('textblob_subjectivity', 0.0),
                urgency_level=analysis_results.get('urgency_level', 'normal'),
                keywords=analysis_results.get('keywords', []),
                topics=analysis_results.get('topics', []),
                intent_indicators=analysis_results.get('intents', {}),
                audio_features=audio_results.get('audio_features', {}),
                speech_quality=audio_results.get('audio_quality', 'unknown'),
                processing_time_ms=analysis_results.get('processing_time_ms', 0)
            )
            
            session.add(sentiment_analysis)
            await session.commit()
            
            return {
                'id': analysis_id,
                'overall_sentiment': sentiment_analysis.overall_sentiment,
                'sentiment_score': sentiment_analysis.sentiment_score,
                'confidence_level': sentiment_analysis.confidence_level,
                'primary_emotion': sentiment_analysis.primary_emotion,
                'emotion_scores': sentiment_analysis.emotion_scores,
                'keywords': sentiment_analysis.keywords,
                'topics': sentiment_analysis.topics,
                'urgency_level': sentiment_analysis.urgency_level,
                'processing_time_ms': sentiment_analysis.processing_time_ms
            }
    
    async def _check_alert_conditions(self, 
                                    analysis: Dict[str, Any],
                                    customer_id: Optional[str]) -> Dict[str, Any]:
        """Check if alert conditions are met"""
        
        alert_info = {'triggered': False, 'severity': None, 'reasons': []}
        
        sentiment_score = analysis['sentiment_score']
        urgency_level = analysis['urgency_level']
        primary_emotion = analysis.get('primary_emotion')
        
        # Check negative sentiment threshold
        if sentiment_score <= self.alert_config['negative_threshold']:
            alert_info['triggered'] = True
            alert_info['severity'] = 'high'
            alert_info['reasons'].append('Very negative sentiment detected')
        
        # Check urgency
        if urgency_level in ['urgent', 'high']:
            alert_info['triggered'] = True
            alert_info['severity'] = 'medium' if alert_info['severity'] != 'high' else 'high'
            alert_info['reasons'].append(f'High urgency detected: {urgency_level}')
        
        # Check emotion intensity
        emotion_intensity = analysis.get('emotion_intensity', 0.0)
        if emotion_intensity >= self.alert_config['emotion_intensity_threshold']:
            if primary_emotion in ['anger', 'frustration', 'fear']:
                alert_info['triggered'] = True
                alert_info['severity'] = 'high'
                alert_info['reasons'].append(f'Intense negative emotion: {primary_emotion}')
        
        # Check for consecutive negative interactions
        if customer_id:
            consecutive_negative = await self._count_consecutive_negative_interactions(customer_id)
            if consecutive_negative >= self.alert_config['consecutive_negative_limit']:
                alert_info['triggered'] = True
                alert_info['severity'] = 'critical'
                alert_info['reasons'].append(f'Multiple consecutive negative interactions: {consecutive_negative}')
        
        # Create alert record if triggered
        if alert_info['triggered']:
            await self._create_alert_record(analysis, alert_info, customer_id)
        
        return alert_info
    
    async def _create_alert_record(self, 
                                 analysis: Dict[str, Any],
                                 alert_info: Dict[str, Any],
                                 customer_id: Optional[str]):
        """Create sentiment alert record"""
        
        alert_id = str(uuid.uuid4())
        
        async with self.session_factory() as session:
            alert = SentimentAlert(
                id=alert_id,
                analysis_id=analysis['id'],
                alert_type='sentiment_alert',
                severity=alert_info['severity'],
                title=f"Sentiment Alert - {alert_info['severity'].title()}",
                description='; '.join(alert_info['reasons']),
                trigger_conditions=alert_info['reasons'],
                customer_id=customer_id,
                interaction_id=analysis.get('interaction_id')
            )
            
            session.add(alert)
            await session.commit()
    
    async def _send_realtime_update(self, 
                                  request: SentimentAnalysisRequest,
                                  analysis: Dict[str, Any],
                                  alert_info: Dict[str, Any]):
        """Send real-time update via WebSocket"""
        
        update_message = {
            'type': 'sentiment_update',
            'timestamp': datetime.utcnow().isoformat(),
            'interaction_id': request.interaction_id,
            'customer_id': request.customer_id,
            'sentiment': {
                'overall': analysis['overall_sentiment'],
                'score': analysis['sentiment_score'],
                'confidence': analysis['confidence_level'],
                'emotion': analysis.get('primary_emotion'),
                'urgency': analysis.get('urgency_level')
            },
            'alert': alert_info if alert_info['triggered'] else None
        }
        
        # Send to all connected WebSocket clients
        disconnected = []
        for connection_id, websocket in self.websocket_connections.items():
            try:
                await websocket.send(json.dumps(update_message))
            except Exception as e:
                self.logger.warning(f"Failed to send WebSocket update: {e}")
                disconnected.append(connection_id)
        
        # Clean up disconnected clients
        for connection_id in disconnected:
            del self.websocket_connections[connection_id]
    
    async def _update_sentiment_trend(self, customer_id: Optional[str], analysis: Dict[str, Any]):
        """Update customer sentiment trend"""
        
        if not customer_id:
            return
        
        # This would update rolling sentiment trends
        # For now, we'll just cache the latest sentiment in Redis
        
        await self.redis_client.lpush(
            f"sentiment_history:{customer_id}",
            json.dumps({
                'timestamp': datetime.utcnow().isoformat(),
                'sentiment_score': analysis['sentiment_score'],
                'emotion': analysis.get('primary_emotion')
            })
        )
        
        # Keep only last 50 interactions
        await self.redis_client.ltrim(f"sentiment_history:{customer_id}", 0, 49)
    
    async def _count_consecutive_negative_interactions(self, customer_id: str) -> int:
        """Count consecutive negative interactions for customer"""
        
        # Get recent sentiment history from Redis
        recent_sentiments = await self.redis_client.lrange(
            f"sentiment_history:{customer_id}", 0, 9  # Last 10 interactions
        )
        
        consecutive_count = 0
        for sentiment_json in recent_sentiments:
            try:
                sentiment_data = json.loads(sentiment_json)
                if sentiment_data['sentiment_score'] < -0.2:
                    consecutive_count += 1
                else:
                    break  # Stop counting at first non-negative
            except:
                break
        
        return consecutive_count
    
    async def _setup_default_configuration(self):
        """Setup default sentiment analysis configuration"""
        
        async with self.session_factory() as session:
            # Check if default config exists
            existing_config = await session.execute(
                "SELECT id FROM sentiment_configurations WHERE name = 'default'"
            )
            
            if not existing_config.first():
                default_config = SentimentConfiguration(
                    id=str(uuid.uuid4()),
                    name="default",
                    description="Default sentiment analysis configuration",
                    negative_sentiment_threshold=-0.5,
                    positive_sentiment_threshold=0.5,
                    emotion_intensity_threshold=0.7,
                    urgency_keywords_threshold=2,
                    supported_languages=['es', 'en'],
                    primary_model='vader',
                    analysis_frequency_seconds=5,
                    alert_cooldown_minutes=15
                )
                
                session.add(default_config)
                await session.commit()
    
    def _start_processing_threads(self):
        """Start background processing threads"""
        
        # Start sentiment processing thread
        processing_thread = threading.Thread(
            target=self._process_sentiment_queue,
            daemon=True
        )
        processing_thread.start()
        self.processing_threads.append(processing_thread)
    
    def _process_sentiment_queue(self):
        """Process sentiment analysis queue (background thread)"""
        
        while True:
            try:
                # This would process queued sentiment analysis requests
                # For now, just sleep to avoid busy waiting
                time.sleep(1)
            except Exception as e:
                self.logger.error(f"Sentiment queue processing error: {e}")
                time.sleep(5)
    
    def _calculate_trend_direction(self, scores: List[float]) -> str:
        """Calculate sentiment trend direction"""
        
        if len(scores) < 3:
            return 'stable'
        
        recent_scores = scores[-5:]
        earlier_scores = scores[:-5] if len(scores) > 5 else scores[:-2]
        
        recent_avg = np.mean(recent_scores)
        earlier_avg = np.mean(earlier_scores)
        
        diff = recent_avg - earlier_avg
        
        if diff > 0.2:
            return 'improving'
        elif diff < -0.2:
            return 'declining'
        else:
            return 'stable'
    
    def _find_dominant_emotion(self, sentiment_data: List[Dict]) -> str:
        """Find dominant emotion across interactions"""
        
        emotions = [d.get('primary_emotion') for d in sentiment_data if d.get('primary_emotion')]
        
        if emotions:
            emotion_counts = Counter(emotions)
            return emotion_counts.most_common(1)[0][0]
        
        return 'neutral'
    
    async def _handle_websocket_message(self, connection_id: str, message: str):
        """Handle incoming WebSocket message"""
        
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'subscribe_customer':
                # Subscribe to updates for specific customer
                customer_id = data.get('customer_id')
                # Implementation would store subscription preferences
                
            elif message_type == 'ping':
                # Respond to ping
                websocket = self.websocket_connections.get(connection_id)
                if websocket:
                    await websocket.send(json.dumps({'type': 'pong'}))
        
        except Exception as e:
            self.logger.error(f"WebSocket message handling error: {e}")

# Usage Example
async def main():
    """Example usage of the Real-time Sentiment Analysis System"""
    
    # Initialize the system
    sentiment_system = RealtimeSentimentAnalysisSystem(
        database_url="sqlite+aiosqlite:///realtime_sentiment.db",
        redis_url="redis://localhost:6379"
    )
    
    await sentiment_system.initialize()
    
    # Example: Analyze customer message
    analysis_request = SentimentAnalysisRequest(
        interaction_id="interaction_123",
        customer_id="customer_456",
        agent_id="agent_789",
        interaction_type=InteractionType.CHAT,
        content="¡Estoy muy frustrado! El servicio ha sido terrible y nadie me ayuda. ¡Necesito una solución AHORA!",
        content_language="es",
        context={
            'previous_interactions': 2,
            'customer_tier': 'premium'
        }
    )
    
    result = await sentiment_system.analyze_interaction(analysis_request)
    print(f"Sentiment Analysis Result: {result}")
    
    # Get customer sentiment trend
    trend = await sentiment_system.get_customer_sentiment_trend("customer_456", days=7)
    print(f"Sentiment Trend: {trend}")
    
    # Get overall analytics
    analytics = await sentiment_system.get_sentiment_analytics(days=30)
    print(f"Sentiment Analytics: {analytics}")

if __name__ == "__main__":
    asyncio.run(main())