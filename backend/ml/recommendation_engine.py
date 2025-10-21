"""
Motor de Recomendaciones ML para Spirit Tours
Implementa recomendaciones personalizadas usando técnicas de ML
"""

import asyncio
import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.decomposition import PCA, TruncatedSVD
from sklearn.cluster import KMeans, DBSCAN
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.model_selection import train_test_split
import joblib
import pickle
from enum import Enum

logger = logging.getLogger(__name__)


class RecommendationType(Enum):
    """Tipos de recomendación"""
    ITINERARY = "ITINERARY"
    DESTINATION = "DESTINATION"
    ACTIVITY = "ACTIVITY"
    HOTEL = "HOTEL"
    GUIDE = "GUIDE"
    PACKAGE = "PACKAGE"
    SEASONAL = "SEASONAL"
    SIMILAR_USERS = "SIMILAR_USERS"


class UserSegment(Enum):
    """Segmentos de usuarios"""
    ADVENTURE_SEEKER = "ADVENTURE_SEEKER"
    CULTURAL_EXPLORER = "CULTURAL_EXPLORER"
    LUXURY_TRAVELER = "LUXURY_TRAVELER"
    BUDGET_CONSCIOUS = "BUDGET_CONSCIOUS"
    FAMILY_ORIENTED = "FAMILY_ORIENTED"
    BUSINESS_TRAVELER = "BUSINESS_TRAVELER"
    ECO_TOURIST = "ECO_TOURIST"
    SENIOR_TRAVELER = "SENIOR_TRAVELER"


class RecommendationEngine:
    """
    Motor de recomendaciones basado en ML
    Combina filtrado colaborativo, basado en contenido y técnicas híbridas
    """
    
    def __init__(self, db_session=None):
        self.db = db_session
        
        # Modelos
        self.user_segmentation_model = None
        self.itinerary_recommender = None
        self.price_predictor = None
        self.demand_forecaster = None
        self.similarity_matrix = None
        
        # Escaladores y encoders
        self.scaler = StandardScaler()
        self.label_encoders = {}
        
        # Cache de features
        self.user_features_cache = {}
        self.item_features_cache = {}
        
        # Configuración
        self.min_ratings_for_recommendation = 3
        self.similarity_threshold = 0.7
        self.max_recommendations = 20
        
        # Pesos para scoring híbrido
        self.weights = {
            'collaborative': 0.4,
            'content_based': 0.3,
            'popularity': 0.15,
            'personalization': 0.15
        }
    
    async def train_all_models(self, training_data: Optional[Dict[str, pd.DataFrame]] = None):
        """
        Entrenar todos los modelos del sistema de recomendación
        """
        logger.info("Starting training of all recommendation models")
        
        # Cargar datos si no se proporcionan
        if training_data is None:
            training_data = await self._load_training_data()
        
        # 1. Entrenar modelo de segmentación de usuarios
        await self.train_user_segmentation(training_data.get('users'))
        
        # 2. Entrenar sistema de recomendación de itinerarios
        await self.train_itinerary_recommender(
            training_data.get('bookings'),
            training_data.get('itineraries')
        )
        
        # 3. Entrenar predictor de precios
        await self.train_price_predictor(training_data.get('bookings'))
        
        # 4. Entrenar forecaster de demanda
        await self.train_demand_forecaster(training_data.get('bookings'))
        
        # Guardar modelos
        await self._save_models()
        
        logger.info("All models trained successfully")
    
    async def train_user_segmentation(self, user_data: pd.DataFrame):
        """
        Entrenar modelo de segmentación de usuarios
        """
        logger.info("Training user segmentation model")
        
        # Feature engineering
        features = self._extract_user_features(user_data)
        
        # Escalar features
        X_scaled = self.scaler.fit_transform(features)
        
        # PCA para reducción de dimensionalidad
        pca = PCA(n_components=min(10, X_scaled.shape[1]), random_state=42)
        X_pca = pca.fit_transform(X_scaled)
        
        # Determinar número óptimo de clusters usando elbow method
        optimal_k = self._find_optimal_clusters(X_pca)
        
        # K-Means clustering
        kmeans = KMeans(n_clusters=optimal_k, random_state=42, n_init=10)
        kmeans.fit(X_pca)
        
        # Asignar segmentos
        user_data['segment'] = kmeans.labels_
        user_data['segment_name'] = user_data['segment'].map(self._map_segment_to_name)
        
        # Guardar modelo
        self.user_segmentation_model = {
            'scaler': self.scaler,
            'pca': pca,
            'kmeans': kmeans,
            'segment_profiles': self._create_segment_profiles(user_data, features)
        }
        
        logger.info(f"User segmentation completed with {optimal_k} segments")
    
    def _extract_user_features(self, user_data: pd.DataFrame) -> pd.DataFrame:
        """
        Extraer features relevantes de usuarios
        """
        features = pd.DataFrame()
        
        # Features demográficas
        features['age'] = user_data.get('age', 0)
        features['days_since_registration'] = (
            datetime.now() - pd.to_datetime(user_data.get('created_at', datetime.now()))
        ).dt.days
        
        # Features de comportamiento
        features['total_bookings'] = user_data.get('booking_count', 0)
        features['avg_booking_value'] = user_data.get('avg_booking_value', 0)
        features['total_spent'] = user_data.get('total_spent', 0)
        features['booking_frequency'] = user_data.get('booking_frequency', 0)
        features['cancellation_rate'] = user_data.get('cancellation_rate', 0)
        
        # Features de preferencias
        features['preferred_duration'] = user_data.get('avg_trip_duration', 0)
        features['group_size_avg'] = user_data.get('avg_group_size', 1)
        features['advance_booking_days'] = user_data.get('avg_advance_booking', 0)
        features['weekend_preference'] = user_data.get('weekend_trips_ratio', 0)
        
        # Features de satisfacción
        features['avg_rating'] = user_data.get('avg_rating_given', 0)
        features['review_count'] = user_data.get('reviews_written', 0)
        features['satisfaction_score'] = user_data.get('satisfaction_score', 0)
        
        # Rellenar valores faltantes
        features = features.fillna(0)
        
        return features
    
    def _find_optimal_clusters(self, X: np.ndarray, max_k: int = 10) -> int:
        """
        Encontrar número óptimo de clusters usando elbow method
        """
        inertias = []
        K_range = range(2, min(max_k, len(X) // 10))
        
        for k in K_range:
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            kmeans.fit(X)
            inertias.append(kmeans.inertia_)
        
        # Encontrar el "codo" usando segunda derivada
        if len(inertias) < 3:
            return 3
        
        second_diff = np.diff(np.diff(inertias))
        optimal_k = np.argmax(second_diff) + 2  # +2 porque diff reduce dimensión
        
        return min(max(optimal_k, 3), 8)  # Entre 3 y 8 clusters
    
    def _map_segment_to_name(self, segment_id: int) -> str:
        """
        Mapear ID de cluster a nombre de segmento
        """
        segment_mapping = {
            0: UserSegment.ADVENTURE_SEEKER.value,
            1: UserSegment.CULTURAL_EXPLORER.value,
            2: UserSegment.LUXURY_TRAVELER.value,
            3: UserSegment.BUDGET_CONSCIOUS.value,
            4: UserSegment.FAMILY_ORIENTED.value,
            5: UserSegment.BUSINESS_TRAVELER.value,
            6: UserSegment.ECO_TOURIST.value,
            7: UserSegment.SENIOR_TRAVELER.value
        }
        return segment_mapping.get(segment_id, f"SEGMENT_{segment_id}")
    
    def _create_segment_profiles(
        self,
        user_data: pd.DataFrame,
        features: pd.DataFrame
    ) -> Dict[str, Dict[str, Any]]:
        """
        Crear perfiles detallados de cada segmento
        """
        profiles = {}
        
        for segment in user_data['segment'].unique():
            segment_mask = user_data['segment'] == segment
            segment_features = features[segment_mask]
            
            profile = {
                'segment_id': int(segment),
                'segment_name': self._map_segment_to_name(segment),
                'size': int(segment_mask.sum()),
                'percentage': float(segment_mask.sum() / len(user_data) * 100),
                'characteristics': {
                    'avg_age': float(segment_features['age'].mean()),
                    'avg_spending': float(segment_features['total_spent'].mean()),
                    'avg_bookings': float(segment_features['total_bookings'].mean()),
                    'avg_group_size': float(segment_features['group_size_avg'].mean()),
                    'avg_trip_duration': float(segment_features['preferred_duration'].mean()),
                    'satisfaction_score': float(segment_features['satisfaction_score'].mean())
                },
                'top_destinations': [],  # Se llenaría con datos reales
                'preferred_activities': [],  # Se llenaría con datos reales
                'price_sensitivity': self._calculate_price_sensitivity(segment_features)
            }
            
            profiles[segment] = profile
        
        return profiles
    
    def _calculate_price_sensitivity(self, segment_features: pd.DataFrame) -> str:
        """
        Calcular sensibilidad al precio del segmento
        """
        avg_spending = segment_features['total_spent'].mean()
        booking_frequency = segment_features['booking_frequency'].mean()
        
        if avg_spending < segment_features['total_spent'].quantile(0.33):
            return "HIGH"
        elif avg_spending > segment_features['total_spent'].quantile(0.67):
            return "LOW"
        else:
            return "MEDIUM"
    
    async def train_itinerary_recommender(
        self,
        booking_data: pd.DataFrame,
        itinerary_data: pd.DataFrame
    ):
        """
        Entrenar sistema de recomendación de itinerarios
        Combina filtrado colaborativo y basado en contenido
        """
        logger.info("Training itinerary recommender")
        
        # 1. Crear matriz usuario-item
        user_item_matrix = self._create_user_item_matrix(booking_data)
        
        # 2. Factorización de matrices con SVD
        svd = TruncatedSVD(n_components=min(50, user_item_matrix.shape[1] - 1), random_state=42)
        user_features_svd = svd.fit_transform(user_item_matrix)
        
        # 3. Crear features de contenido para itinerarios
        item_features = self._extract_itinerary_features(itinerary_data)
        
        # 4. Calcular matriz de similaridad de itinerarios
        item_similarity = cosine_similarity(item_features)
        
        # 5. Entrenar modelo híbrido
        self.itinerary_recommender = {
            'svd': svd,
            'user_features': user_features_svd,
            'item_features': item_features,
            'item_similarity': item_similarity,
            'user_item_matrix': user_item_matrix,
            'item_mapping': dict(enumerate(user_item_matrix.columns)),
            'popularity_scores': self._calculate_popularity_scores(booking_data)
        }
        
        logger.info("Itinerary recommender trained successfully")
    
    def _create_user_item_matrix(self, booking_data: pd.DataFrame) -> pd.DataFrame:
        """
        Crear matriz usuario-item para filtrado colaborativo
        """
        # Crear matriz con ratings implícitos/explícitos
        matrix = booking_data.pivot_table(
            index='user_id',
            columns='itinerary_id',
            values='rating',  # O usar 'booked' como implícito
            fill_value=0,
            aggfunc='mean'
        )
        
        # Normalizar ratings
        matrix = (matrix - matrix.mean()) / (matrix.std() + 1e-8)
        
        return matrix
    
    def _extract_itinerary_features(self, itinerary_data: pd.DataFrame) -> np.ndarray:
        """
        Extraer features de contenido de itinerarios
        """
        features = pd.DataFrame()
        
        # Features numéricas
        features['duration_days'] = itinerary_data.get('duration_days', 0)
        features['total_distance'] = itinerary_data.get('total_distance_km', 0)
        features['num_activities'] = itinerary_data.get('activity_count', 0)
        features['avg_daily_cost'] = itinerary_data.get('avg_daily_cost', 0)
        features['difficulty_level'] = itinerary_data.get('difficulty_level', 0)
        
        # One-hot encoding para categorías
        if 'category' in itinerary_data.columns:
            category_dummies = pd.get_dummies(itinerary_data['category'], prefix='cat')
            features = pd.concat([features, category_dummies], axis=1)
        
        if 'destination' in itinerary_data.columns:
            dest_dummies = pd.get_dummies(itinerary_data['destination'], prefix='dest')
            features = pd.concat([features, dest_dummies], axis=1)
        
        # Normalizar features
        features = features.fillna(0)
        features_scaled = self.scaler.fit_transform(features)
        
        return features_scaled
    
    def _calculate_popularity_scores(self, booking_data: pd.DataFrame) -> Dict[str, float]:
        """
        Calcular scores de popularidad para items
        """
        popularity = booking_data.groupby('itinerary_id').agg({
            'booking_id': 'count',
            'rating': 'mean'
        }).rename(columns={'booking_id': 'booking_count'})
        
        # Score combinado de popularidad y rating
        popularity['score'] = (
            popularity['booking_count'] / popularity['booking_count'].max() * 0.7 +
            popularity['rating'] / 5.0 * 0.3
        )
        
        return popularity['score'].to_dict()
    
    async def train_price_predictor(self, booking_data: pd.DataFrame):
        """
        Entrenar modelo de predicción de precios
        """
        logger.info("Training price predictor")
        
        # Preparar features
        X, y = self._prepare_price_prediction_data(booking_data)
        
        # Split train/test
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Entrenar ensemble de modelos
        rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        
        gb_model = GradientBoostingRegressor(
            n_estimators=100,
            learning_rate=0.1,
            max_depth=5,
            random_state=42
        )
        
        # Entrenar modelos
        rf_model.fit(X_train, y_train)
        gb_model.fit(X_train, y_train)
        
        # Evaluar y combinar
        rf_score = rf_model.score(X_test, y_test)
        gb_score = gb_model.score(X_test, y_test)
        
        logger.info(f"Price predictor scores - RF: {rf_score:.3f}, GB: {gb_score:.3f}")
        
        # Guardar el mejor modelo o ensemble
        self.price_predictor = {
            'models': [rf_model, gb_model],
            'weights': [rf_score / (rf_score + gb_score), gb_score / (rf_score + gb_score)],
            'features': X.columns.tolist(),
            'feature_importance': self._get_feature_importance(rf_model, X.columns)
        }
    
    def _prepare_price_prediction_data(
        self,
        booking_data: pd.DataFrame
    ) -> Tuple[pd.DataFrame, pd.Series]:
        """
        Preparar datos para predicción de precios
        """
        features = pd.DataFrame()
        
        # Features temporales
        booking_data['booking_date'] = pd.to_datetime(booking_data['booking_date'])
        features['month'] = booking_data['booking_date'].dt.month
        features['day_of_week'] = booking_data['booking_date'].dt.dayofweek
        features['quarter'] = booking_data['booking_date'].dt.quarter
        features['is_weekend'] = (features['day_of_week'] >= 5).astype(int)
        
        # Features del viaje
        features['duration_days'] = booking_data.get('duration_days', 0)
        features['group_size'] = booking_data.get('group_size', 1)
        features['advance_booking_days'] = booking_data.get('advance_days', 0)
        features['destination_popularity'] = booking_data.get('dest_popularity', 0)
        
        # Features de temporada
        features['is_high_season'] = booking_data.get('is_high_season', 0)
        features['competition_index'] = booking_data.get('competition_index', 0)
        
        # Features del usuario (si están disponibles)
        features['user_segment'] = booking_data.get('user_segment', 0)
        features['user_loyalty'] = booking_data.get('user_loyalty_score', 0)
        
        # Target
        y = booking_data['total_price']
        
        # Limpiar datos
        features = features.fillna(0)
        
        return features, y
    
    def _get_feature_importance(
        self,
        model: RandomForestRegressor,
        feature_names: List[str]
    ) -> Dict[str, float]:
        """
        Obtener importancia de features
        """
        importance = pd.DataFrame({
            'feature': feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        return importance.set_index('feature')['importance'].to_dict()
    
    async def train_demand_forecaster(self, booking_data: pd.DataFrame):
        """
        Entrenar modelo de forecasting de demanda
        """
        logger.info("Training demand forecaster")
        
        # Preparar serie temporal
        time_series = self._prepare_time_series_data(booking_data)
        
        # Por simplicidad, usar modelo de tendencia + estacionalidad
        # En producción se usaría Prophet, ARIMA o LSTM
        
        from statsmodels.tsa.seasonal import seasonal_decompose
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        
        # Descomposición
        decomposition = seasonal_decompose(
            time_series['bookings'],
            period=30,  # Mensual
            extrapolate_trend='freq'
        )
        
        # Modelo Holt-Winters
        model = ExponentialSmoothing(
            time_series['bookings'],
            seasonal_periods=30,
            trend='add',
            seasonal='add'
        ).fit()
        
        self.demand_forecaster = {
            'model': model,
            'decomposition': decomposition,
            'historical_data': time_series
        }
        
        logger.info("Demand forecaster trained successfully")
    
    def _prepare_time_series_data(self, booking_data: pd.DataFrame) -> pd.DataFrame:
        """
        Preparar datos para serie temporal
        """
        # Agregar por fecha
        daily_bookings = booking_data.groupby(
            pd.to_datetime(booking_data['booking_date']).dt.date
        ).agg({
            'booking_id': 'count',
            'total_price': 'sum'
        }).rename(columns={
            'booking_id': 'bookings',
            'total_price': 'revenue'
        })
        
        # Rellenar fechas faltantes
        date_range = pd.date_range(
            start=daily_bookings.index.min(),
            end=daily_bookings.index.max(),
            freq='D'
        )
        
        daily_bookings = daily_bookings.reindex(date_range, fill_value=0)
        
        return daily_bookings
    
    async def get_recommendations(
        self,
        user_id: str,
        recommendation_type: RecommendationType,
        context: Optional[Dict[str, Any]] = None,
        num_recommendations: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Obtener recomendaciones personalizadas para un usuario
        """
        logger.info(f"Getting {recommendation_type.value} recommendations for user {user_id}")
        
        # Obtener perfil del usuario
        user_profile = await self._get_user_profile(user_id)
        
        # Obtener recomendaciones según tipo
        if recommendation_type == RecommendationType.ITINERARY:
            recommendations = await self._get_itinerary_recommendations(
                user_profile, context, num_recommendations
            )
        elif recommendation_type == RecommendationType.DESTINATION:
            recommendations = await self._get_destination_recommendations(
                user_profile, context, num_recommendations
            )
        elif recommendation_type == RecommendationType.PACKAGE:
            recommendations = await self._get_package_recommendations(
                user_profile, context, num_recommendations
            )
        else:
            recommendations = []
        
        # Aplicar post-procesamiento
        recommendations = self._post_process_recommendations(
            recommendations,
            user_profile,
            context
        )
        
        return recommendations[:num_recommendations]
    
    async def _get_user_profile(self, user_id: str) -> Dict[str, Any]:
        """
        Obtener perfil completo del usuario
        """
        # Verificar cache
        if user_id in self.user_features_cache:
            return self.user_features_cache[user_id]
        
        # En producción, esto vendría de la base de datos
        profile = {
            'user_id': user_id,
            'segment': UserSegment.CULTURAL_EXPLORER.value,
            'preferences': {
                'destinations': ['Peru', 'Bolivia', 'Ecuador'],
                'activities': ['cultural', 'historical', 'gastronomy'],
                'budget_range': [100, 500],
                'group_size': 4,
                'duration_preference': 7
            },
            'history': {
                'bookings': [],
                'ratings': {},
                'last_booking': None
            },
            'demographics': {
                'age': 35,
                'location': 'Lima'
            }
        }
        
        # Guardar en cache
        self.user_features_cache[user_id] = profile
        
        return profile
    
    async def _get_itinerary_recommendations(
        self,
        user_profile: Dict[str, Any],
        context: Optional[Dict[str, Any]],
        num_recommendations: int
    ) -> List[Dict[str, Any]]:
        """
        Obtener recomendaciones de itinerarios usando modelo híbrido
        """
        if not self.itinerary_recommender:
            logger.warning("Itinerary recommender not trained")
            return []
        
        recommendations = []
        
        # 1. Filtrado colaborativo
        collab_scores = self._get_collaborative_scores(
            user_profile['user_id'],
            self.itinerary_recommender
        )
        
        # 2. Filtrado basado en contenido
        content_scores = self._get_content_based_scores(
            user_profile,
            self.itinerary_recommender['item_features']
        )
        
        # 3. Popularidad
        popularity_scores = self.itinerary_recommender['popularity_scores']
        
        # 4. Personalización basada en contexto
        context_scores = self._get_context_scores(context, user_profile)
        
        # Combinar scores con pesos
        all_items = set(collab_scores.keys()) | set(content_scores.keys())
        
        for item_id in all_items:
            final_score = (
                self.weights['collaborative'] * collab_scores.get(item_id, 0) +
                self.weights['content_based'] * content_scores.get(item_id, 0) +
                self.weights['popularity'] * popularity_scores.get(item_id, 0) +
                self.weights['personalization'] * context_scores.get(item_id, 0)
            )
            
            recommendations.append({
                'itinerary_id': item_id,
                'score': final_score,
                'explanation': self._generate_explanation(
                    item_id,
                    collab_scores.get(item_id, 0),
                    content_scores.get(item_id, 0),
                    popularity_scores.get(item_id, 0)
                ),
                'confidence': self._calculate_confidence(final_score, user_profile)
            })
        
        # Ordenar por score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return recommendations
    
    def _get_collaborative_scores(
        self,
        user_id: str,
        recommender_data: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Obtener scores de filtrado colaborativo
        """
        scores = {}
        
        # Simplified collaborative filtering
        # En producción se usaría el modelo SVD entrenado
        
        user_item_matrix = recommender_data['user_item_matrix']
        
        if user_id in user_item_matrix.index:
            user_vector = user_item_matrix.loc[user_id]
            
            # Calcular similaridad con otros usuarios
            user_similarities = cosine_similarity(
                [user_vector],
                user_item_matrix
            )[0]
            
            # Obtener items de usuarios similares
            similar_users_idx = np.argsort(user_similarities)[-10:]
            
            for idx in similar_users_idx:
                similar_user = user_item_matrix.index[idx]
                if similar_user != user_id:
                    similar_items = user_item_matrix.loc[similar_user]
                    for item, rating in similar_items[similar_items > 0].items():
                        if item not in scores:
                            scores[item] = 0
                        scores[item] += rating * user_similarities[idx]
        
        # Normalizar scores
        if scores:
            max_score = max(scores.values())
            scores = {k: v / max_score for k, v in scores.items()}
        
        return scores
    
    def _get_content_based_scores(
        self,
        user_profile: Dict[str, Any],
        item_features: np.ndarray
    ) -> Dict[str, float]:
        """
        Obtener scores basados en contenido
        """
        scores = {}
        
        # Crear vector de preferencias del usuario
        user_preferences = self._create_user_preference_vector(user_profile)
        
        # Calcular similaridad con items
        if user_preferences is not None and item_features is not None:
            similarities = cosine_similarity([user_preferences], item_features)[0]
            
            for idx, similarity in enumerate(similarities):
                scores[idx] = similarity
        
        return scores
    
    def _create_user_preference_vector(
        self,
        user_profile: Dict[str, Any]
    ) -> Optional[np.ndarray]:
        """
        Crear vector de preferencias del usuario
        """
        # Simplified - en producción sería más complejo
        preferences = user_profile.get('preferences', {})
        
        # Crear vector básico
        vector = np.zeros(10)  # Ajustar dimensión según features reales
        
        # Mapear preferencias a índices del vector
        if 'duration_preference' in preferences:
            vector[0] = preferences['duration_preference'] / 30  # Normalizar
        
        if 'budget_range' in preferences:
            vector[1] = np.mean(preferences['budget_range']) / 1000  # Normalizar
        
        if 'group_size' in preferences:
            vector[2] = preferences['group_size'] / 50  # Normalizar
        
        return vector
    
    def _get_context_scores(
        self,
        context: Optional[Dict[str, Any]],
        user_profile: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Obtener scores basados en contexto actual
        """
        scores = {}
        
        if not context:
            return scores
        
        # Considerar factores contextuales
        current_season = context.get('season')
        current_date = context.get('date')
        device_type = context.get('device')
        location = context.get('location')
        
        # Ajustar scores según contexto
        # Simplified - en producción sería más sofisticado
        
        return scores
    
    def _generate_explanation(
        self,
        item_id: str,
        collab_score: float,
        content_score: float,
        popularity_score: float
    ) -> str:
        """
        Generar explicación de por qué se recomienda este item
        """
        explanations = []
        
        if collab_score > 0.7:
            explanations.append("Usuarios similares también lo eligieron")
        
        if content_score > 0.7:
            explanations.append("Coincide con tus preferencias")
        
        if popularity_score > 0.8:
            explanations.append("Muy popular entre nuestros viajeros")
        
        if not explanations:
            explanations.append("Podría interesarte")
        
        return " • ".join(explanations)
    
    def _calculate_confidence(
        self,
        score: float,
        user_profile: Dict[str, Any]
    ) -> float:
        """
        Calcular nivel de confianza de la recomendación
        """
        # Basado en cantidad de datos del usuario
        num_bookings = len(user_profile.get('history', {}).get('bookings', []))
        
        if num_bookings < 3:
            confidence = 0.6  # Baja confianza para usuarios nuevos
        elif num_bookings < 10:
            confidence = 0.8  # Media
        else:
            confidence = 0.95  # Alta
        
        # Ajustar por score
        confidence *= min(score, 1.0)
        
        return confidence
    
    def _post_process_recommendations(
        self,
        recommendations: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Post-procesar recomendaciones (diversificación, filtros, etc.)
        """
        # 1. Eliminar items ya consumidos
        history = user_profile.get('history', {}).get('bookings', [])
        recommendations = [r for r in recommendations if r['itinerary_id'] not in history]
        
        # 2. Diversificar resultados
        recommendations = self._diversify_recommendations(recommendations)
        
        # 3. Aplicar filtros de negocio
        if context and 'filters' in context:
            recommendations = self._apply_business_filters(
                recommendations,
                context['filters']
            )
        
        # 4. Enriquecer con información adicional
        recommendations = self._enrich_recommendations(recommendations)
        
        return recommendations
    
    def _diversify_recommendations(
        self,
        recommendations: List[Dict[str, Any]],
        diversity_factor: float = 0.3
    ) -> List[Dict[str, Any]]:
        """
        Diversificar recomendaciones para evitar redundancia
        """
        if len(recommendations) <= 1:
            return recommendations
        
        diversified = [recommendations[0]]
        
        for rec in recommendations[1:]:
            # Calcular similaridad promedio con items ya seleccionados
            # Simplified - en producción se usaría similaridad real
            is_diverse = True  # Placeholder
            
            if is_diverse:
                diversified.append(rec)
        
        return diversified
    
    def _apply_business_filters(
        self,
        recommendations: List[Dict[str, Any]],
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Aplicar filtros de negocio a las recomendaciones
        """
        # Filtros ejemplo: precio, duración, destino, etc.
        filtered = recommendations
        
        if 'max_price' in filters:
            filtered = [r for r in filtered if r.get('price', 0) <= filters['max_price']]
        
        if 'min_duration' in filters:
            filtered = [r for r in filtered if r.get('duration', 0) >= filters['min_duration']]
        
        return filtered
    
    def _enrich_recommendations(
        self,
        recommendations: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Enriquecer recomendaciones con información adicional
        """
        for rec in recommendations:
            # Agregar información adicional
            rec['display_priority'] = 'high' if rec['score'] > 0.8 else 'normal'
            rec['freshness'] = 'new' if rec.get('is_new', False) else 'regular'
            rec['personalization_level'] = 'high' if rec['confidence'] > 0.8 else 'medium'
        
        return recommendations
    
    async def get_similar_items(
        self,
        item_id: str,
        num_similar: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Obtener items similares a uno dado
        """
        if not self.itinerary_recommender or 'item_similarity' not in self.itinerary_recommender:
            return []
        
        similarity_matrix = self.itinerary_recommender['item_similarity']
        
        if item_id >= len(similarity_matrix):
            return []
        
        # Obtener items más similares
        similarities = similarity_matrix[item_id]
        similar_indices = np.argsort(similarities)[-num_similar-1:-1][::-1]
        
        similar_items = []
        for idx in similar_indices:
            if idx != item_id:
                similar_items.append({
                    'item_id': self.itinerary_recommender['item_mapping'].get(idx),
                    'similarity': float(similarities[idx])
                })
        
        return similar_items
    
    async def predict_user_preference(
        self,
        user_id: str,
        item_id: str
    ) -> Dict[str, Any]:
        """
        Predecir si un usuario preferirá un item específico
        """
        user_profile = await self._get_user_profile(user_id)
        
        # Obtener scores para este item
        recommendations = await self._get_itinerary_recommendations(
            user_profile,
            None,
            100
        )
        
        # Buscar el item en las recomendaciones
        for rec in recommendations:
            if rec['itinerary_id'] == item_id:
                return {
                    'item_id': item_id,
                    'predicted_rating': min(rec['score'] * 5, 5),  # Convertir a escala 1-5
                    'confidence': rec['confidence'],
                    'will_like': rec['score'] > 0.6
                }
        
        return {
            'item_id': item_id,
            'predicted_rating': 3.0,  # Neutral
            'confidence': 0.5,
            'will_like': False
        }
    
    async def update_user_feedback(
        self,
        user_id: str,
        item_id: str,
        feedback: Dict[str, Any]
    ):
        """
        Actualizar modelo con feedback del usuario
        """
        # Actualizar matriz usuario-item
        # En producción esto se haría de forma incremental
        
        logger.info(f"Updated feedback for user {user_id} on item {item_id}")
    
    async def _load_training_data(self) -> Dict[str, pd.DataFrame]:
        """
        Cargar datos de entrenamiento
        """
        # En producción esto vendría de la base de datos
        # Por ahora retornamos datos de ejemplo
        
        # Datos de usuarios
        users_data = pd.DataFrame({
            'user_id': range(1000),
            'age': np.random.randint(18, 70, 1000),
            'booking_count': np.random.randint(1, 20, 1000),
            'avg_booking_value': np.random.uniform(100, 1000, 1000),
            'total_spent': np.random.uniform(500, 10000, 1000)
        })
        
        # Datos de bookings
        bookings_data = pd.DataFrame({
            'booking_id': range(5000),
            'user_id': np.random.randint(0, 1000, 5000),
            'itinerary_id': np.random.randint(0, 100, 5000),
            'booking_date': pd.date_range('2023-01-01', periods=5000, freq='H'),
            'total_price': np.random.uniform(100, 2000, 5000),
            'rating': np.random.uniform(3, 5, 5000),
            'duration_days': np.random.randint(1, 15, 5000),
            'group_size': np.random.randint(1, 10, 5000)
        })
        
        # Datos de itinerarios
        itineraries_data = pd.DataFrame({
            'itinerary_id': range(100),
            'duration_days': np.random.randint(1, 15, 100),
            'total_distance_km': np.random.uniform(100, 2000, 100),
            'activity_count': np.random.randint(3, 20, 100),
            'avg_daily_cost': np.random.uniform(50, 500, 100),
            'category': np.random.choice(['adventure', 'cultural', 'relaxation', 'family'], 100),
            'destination': np.random.choice(['Peru', 'Bolivia', 'Ecuador', 'Colombia'], 100)
        })
        
        return {
            'users': users_data,
            'bookings': bookings_data,
            'itineraries': itineraries_data
        }
    
    async def _save_models(self):
        """
        Guardar modelos entrenados
        """
        models_dir = './models/recommendation'
        import os
        os.makedirs(models_dir, exist_ok=True)
        
        # Guardar cada modelo
        if self.user_segmentation_model:
            joblib.dump(
                self.user_segmentation_model,
                f'{models_dir}/user_segmentation.pkl'
            )
        
        if self.itinerary_recommender:
            joblib.dump(
                self.itinerary_recommender,
                f'{models_dir}/itinerary_recommender.pkl'
            )
        
        if self.price_predictor:
            joblib.dump(
                self.price_predictor,
                f'{models_dir}/price_predictor.pkl'
            )
        
        if self.demand_forecaster:
            # Prophet/statsmodels models need special handling
            with open(f'{models_dir}/demand_forecaster.pkl', 'wb') as f:
                pickle.dump(self.demand_forecaster, f)
        
        logger.info("All models saved successfully")
    
    async def load_models(self):
        """
        Cargar modelos previamente entrenados
        """
        models_dir = './models/recommendation'
        
        try:
            if os.path.exists(f'{models_dir}/user_segmentation.pkl'):
                self.user_segmentation_model = joblib.load(
                    f'{models_dir}/user_segmentation.pkl'
                )
            
            if os.path.exists(f'{models_dir}/itinerary_recommender.pkl'):
                self.itinerary_recommender = joblib.load(
                    f'{models_dir}/itinerary_recommender.pkl'
                )
            
            if os.path.exists(f'{models_dir}/price_predictor.pkl'):
                self.price_predictor = joblib.load(
                    f'{models_dir}/price_predictor.pkl'
                )
            
            if os.path.exists(f'{models_dir}/demand_forecaster.pkl'):
                with open(f'{models_dir}/demand_forecaster.pkl', 'rb') as f:
                    self.demand_forecaster = pickle.load(f)
            
            logger.info("Models loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading models: {e}")


# Singleton global
_recommendation_engine: Optional[RecommendationEngine] = None


async def get_recommendation_engine(db_session=None) -> RecommendationEngine:
    """
    Obtener instancia singleton del motor de recomendaciones
    """
    global _recommendation_engine
    
    if _recommendation_engine is None:
        _recommendation_engine = RecommendationEngine(db_session)
        # Intentar cargar modelos existentes
        await _recommendation_engine.load_models()
    
    return _recommendation_engine