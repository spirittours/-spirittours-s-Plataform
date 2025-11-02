"""
Sentiment Analysis API Endpoints

RESTful API for:
- Analyzing individual comments/messages
- Batch analysis
- Sentiment summaries and reports
- Auto-response management

Author: Spirit Tours Development Team
Created: 2025-10-04
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import logging

from database import get_db
from services.sentiment_analysis_service import SentimentAnalysisService
from auth.rbac_middleware import get_current_active_user
from models.rbac_models import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sentiment", tags=["Sentiment Analysis"])


# ===== Request/Response Models =====

class AnalyzeTextRequest(BaseModel):
    """Request model for text analysis"""
    text: str = Field(..., description="Text to analyze", min_length=1)
    platform: str = Field(default="unknown", description="Platform name")
    post_id: Optional[int] = Field(None, description="Associated post ID")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "This retreat was absolutely amazing! Life-changing experience!",
                "platform": "instagram",
                "post_id": 123
            }
        }


class BatchAnalyzeRequest(BaseModel):
    """Request model for batch analysis"""
    texts: List[dict] = Field(..., description="List of texts to analyze")
    
    class Config:
        json_schema_extra = {
            "example": {
                "texts": [
                    {"text": "Love this!", "platform": "instagram"},
                    {"text": "Not satisfied with service", "platform": "facebook"}
                ]
            }
        }


class SentimentSummaryRequest(BaseModel):
    """Request model for sentiment summary"""
    start_date: Optional[str] = Field(None, description="Start date (ISO format)")
    end_date: Optional[str] = Field(None, description="End date (ISO format)")
    platform: Optional[str] = Field(None, description="Platform filter")


# ===== API Endpoints =====

@router.post("/analyze")
async def analyze_text(
    request: AnalyzeTextRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_user)
):
    """
    Analyze sentiment and intent of a text
    
    **Features:**
    - Sentiment classification (positive, negative, neutral)
    - Intent detection (query, complaint, praise, purchase)
    - Confidence scoring
    - Auto-response generation
    - Keyword extraction
    
    **Returns:**
    - Sentiment and sentiment score (-1.0 to +1.0)
    - Intent and keywords
    - Whether response is needed
    - Auto-generated response if applicable
    """
    try:
        service = SentimentAnalysisService(db)
        
        result = await service.analyze_text(
            text=request.text,
            platform=request.platform,
            post_id=request.post_id
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Analysis failed')
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Analyze endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/analyze/batch")
async def batch_analyze(
    request: BatchAnalyzeRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_user)
):
    """
    Analyze multiple texts in batch
    
    **Use Case:** Process multiple comments/messages at once
    for efficiency. Up to 100 texts per request.
    
    **Returns:**
    - List of analysis results for each text
    - Overall statistics
    """
    try:
        if len(request.texts) > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 100 texts per batch"
            )
        
        service = SentimentAnalysisService(db)
        
        results = await service.batch_analyze(request.texts)
        
        # Calculate statistics
        total = len(results)
        positive = sum(1 for r in results if r.get('sentiment') == 'positive')
        negative = sum(1 for r in results if r.get('sentiment') == 'negative')
        neutral = sum(1 for r in results if r.get('sentiment') == 'neutral')
        
        return {
            'success': True,
            'total_analyzed': total,
            'statistics': {
                'positive': positive,
                'negative': negative,
                'neutral': neutral,
                'positive_percentage': (positive / total * 100) if total > 0 else 0,
                'negative_percentage': (negative / total * 100) if total > 0 else 0
            },
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Batch analyze endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/summary")
async def get_sentiment_summary(
    request: SentimentSummaryRequest,
    db: AsyncSession = Depends(get_db),
    current_admin: User = Depends(get_current_active_user)
):
    """
    Get sentiment analysis summary for a time period
    
    **Use Case:** View overall sentiment trends, track brand
    perception over time, identify issues early.
    
    **Returns:**
    - Total interactions count
    - Breakdown by sentiment (positive/negative/neutral)
    - Average sentiment scores
    - Time period info
    """
    try:
        service = SentimentAnalysisService(db)
        
        # Parse dates if provided
        start_date = None
        end_date = None
        
        if request.start_date:
            start_date = datetime.fromisoformat(request.start_date)
        if request.end_date:
            end_date = datetime.fromisoformat(request.end_date)
        
        result = await service.get_sentiment_summary(
            start_date=start_date,
            end_date=end_date,
            platform=request.platform
        )
        
        if not result.get('success'):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('error', 'Summary failed')
            )
        
        return result
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid date format: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Summary endpoint error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/intents")
async def get_intent_categories():
    """
    Get available intent categories and their keywords
    
    **Returns:**
    - List of intent categories
    - Keywords associated with each intent
    - Description of each intent type
    """
    from services.sentiment_analysis_service import SentimentAnalysisService
    
    return {
        'success': True,
        'intents': {
            'query': {
                'description': 'User asking questions or seeking information',
                'keywords': SentimentAnalysisService.INTENT_KEYWORDS['query'][:10],
                'response_priority': 'high'
            },
            'complaint': {
                'description': 'User expressing dissatisfaction or issues',
                'keywords': SentimentAnalysisService.INTENT_KEYWORDS['complaint'][:10],
                'response_priority': 'urgent'
            },
            'praise': {
                'description': 'User expressing positive feedback',
                'keywords': SentimentAnalysisService.INTENT_KEYWORDS['praise'][:10],
                'response_priority': 'medium'
            },
            'purchase_intent': {
                'description': 'User showing interest in purchasing',
                'keywords': SentimentAnalysisService.INTENT_KEYWORDS['purchase_intent'][:10],
                'response_priority': 'high'
            },
            'other': {
                'description': 'General interaction without clear intent',
                'keywords': [],
                'response_priority': 'low'
            }
        }
    }


@router.get("/response-templates")
async def get_response_templates():
    """
    Get available auto-response templates
    
    **Returns:**
    - Response templates by category
    - Usage guidelines
    """
    from services.sentiment_analysis_service import SentimentAnalysisService
    
    return {
        'success': True,
        'templates': SentimentAnalysisService.RESPONSE_TEMPLATES,
        'guidelines': {
            'auto_response_threshold': SentimentAnalysisService.AUTO_RESPONSE_THRESHOLD,
            'description': 'Responses are automatically generated only when confidence exceeds threshold',
            'customization': 'Templates can be customized in service configuration'
        }
    }


@router.get("/config")
async def get_sentiment_config():
    """
    Get sentiment analysis configuration
    
    **Returns:**
    - Model information
    - Available features
    - Configuration settings
    """
    from services.sentiment_analysis_service import TRANSFORMERS_AVAILABLE
    
    return {
        'success': True,
        'config': {
            'model': 'DistilBERT' if TRANSFORMERS_AVAILABLE else 'Rule-based',
            'model_name': 'distilbert-base-uncased-finetuned-sst-2-english' if TRANSFORMERS_AVAILABLE else 'N/A',
            'transformers_available': TRANSFORMERS_AVAILABLE,
            'features': {
                'sentiment_classification': True,
                'intent_detection': True,
                'auto_response': True,
                'batch_processing': True,
                'multi_language': 'Limited (English optimized)',
                'confidence_scoring': True,
                'keyword_extraction': True
            },
            'thresholds': {
                'auto_response': 0.85,
                'high_confidence': 0.7,
                'low_confidence': 0.5
            }
        }
    }


@router.get("/health")
async def health_check():
    """
    Health check endpoint for sentiment analysis service
    
    **Returns:** Service status and model availability
    """
    from services.sentiment_analysis_service import TRANSFORMERS_AVAILABLE
    
    return {
        'status': 'healthy',
        'service': 'Sentiment Analysis',
        'model_loaded': TRANSFORMERS_AVAILABLE,
        'version': '1.0.0',
        'timestamp': datetime.utcnow().isoformat()
    }
