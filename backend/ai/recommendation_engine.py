"""
AI-Powered Recommendation Engine
Uses collaborative filtering and content-based filtering
"""

import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import pandas as pd

class RecommendationEngine:
    """
    Hybrid Recommendation System
    Combines collaborative and content-based filtering
    """
    
    def __init__(self):
        self.user_item_matrix = None
        self.item_features = None
        self.tfidf_vectorizer = TfidfVectorizer(max_features=100)
        self.similarity_matrix = None
        
    def train(self, bookings_data: pd.DataFrame, tours_data: pd.DataFrame):
        """
        Train recommendation models
        
        Args:
            bookings_data: DataFrame with columns [user_id, tour_id, rating]
            tours_data: DataFrame with columns [tour_id, description, category, tags]
        """
        # Create user-item matrix for collaborative filtering
        self.user_item_matrix = bookings_data.pivot_table(
            index='user_id',
            columns='tour_id',
            values='rating',
            fill_value=0
        )
        
        # Create item features for content-based filtering
        tours_data['combined_features'] = (
            tours_data['description'] + ' ' + 
            tours_data['category'] + ' ' + 
            tours_data['tags']
        )
        
        self.item_features = self.tfidf_vectorizer.fit_transform(
            tours_data['combined_features']
        )
        
        # Compute item-item similarity matrix
        self.similarity_matrix = cosine_similarity(self.item_features)
        
    def get_user_recommendations(
        self,
        user_id: str,
        n_recommendations: int = 10,
        method: str = 'hybrid'
    ) -> List[Tuple[str, float]]:
        """
        Get personalized recommendations for a user
        
        Args:
            user_id: User identifier
            n_recommendations: Number of recommendations to return
            method: 'collaborative', 'content', or 'hybrid'
            
        Returns:
            List of (tour_id, score) tuples
        """
        if method == 'collaborative':
            return self._collaborative_filtering(user_id, n_recommendations)
        elif method == 'content':
            return self._content_based_filtering(user_id, n_recommendations)
        else:  # hybrid
            collab_recs = self._collaborative_filtering(user_id, n_recommendations * 2)
            content_recs = self._content_based_filtering(user_id, n_recommendations * 2)
            
            # Combine and re-rank
            combined = {}
            for tour_id, score in collab_recs:
                combined[tour_id] = score * 0.6  # 60% weight to collaborative
            
            for tour_id, score in content_recs:
                if tour_id in combined:
                    combined[tour_id] += score * 0.4  # 40% weight to content
                else:
                    combined[tour_id] = score * 0.4
            
            # Sort and return top N
            sorted_recs = sorted(combined.items(), key=lambda x: x[1], reverse=True)
            return sorted_recs[:n_recommendations]
    
    def _collaborative_filtering(self, user_id: str, n: int) -> List[Tuple[str, float]]:
        """Collaborative filtering recommendations"""
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return []
        
        # Find similar users
        user_ratings = self.user_item_matrix.loc[user_id]
        similarities = cosine_similarity(
            [user_ratings],
            self.user_item_matrix
        )[0]
        
        # Get weighted average of ratings from similar users
        recommendations = {}
        for idx, sim in enumerate(similarities):
            if sim > 0.5:  # Similarity threshold
                other_user_id = self.user_item_matrix.index[idx]
                other_ratings = self.user_item_matrix.loc[other_user_id]
                
                for tour_id, rating in other_ratings.items():
                    if rating > 0 and user_ratings[tour_id] == 0:  # Not yet rated by user
                        if tour_id not in recommendations:
                            recommendations[tour_id] = 0
                        recommendations[tour_id] += sim * rating
        
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]
    
    def _content_based_filtering(self, user_id: str, n: int) -> List[Tuple[str, float]]:
        """Content-based filtering recommendations"""
        if self.user_item_matrix is None or user_id not in self.user_item_matrix.index:
            return []
        
        # Get user's liked tours
        user_ratings = self.user_item_matrix.loc[user_id]
        liked_tours = user_ratings[user_ratings > 3.5].index.tolist()
        
        if not liked_tours:
            return []
        
        # Find similar tours based on content
        recommendations = {}
        for tour_id in liked_tours:
            tour_idx = self.user_item_matrix.columns.get_loc(tour_id)
            similar_scores = self.similarity_matrix[tour_idx]
            
            for idx, score in enumerate(similar_scores):
                rec_tour_id = self.user_item_matrix.columns[idx]
                if rec_tour_id not in liked_tours and user_ratings[rec_tour_id] == 0:
                    if rec_tour_id not in recommendations:
                        recommendations[rec_tour_id] = 0
                    recommendations[rec_tour_id] += score
        
        sorted_recs = sorted(recommendations.items(), key=lambda x: x[1], reverse=True)
        return sorted_recs[:n]
    
    def get_similar_tours(self, tour_id: str, n: int = 5) -> List[Tuple[str, float]]:
        """Get similar tours based on content"""
        if tour_id not in self.user_item_matrix.columns:
            return []
        
        tour_idx = self.user_item_matrix.columns.get_loc(tour_id)
        similar_scores = self.similarity_matrix[tour_idx]
        
        # Get top N similar tours (excluding the tour itself)
        similar_indices = np.argsort(similar_scores)[::-1][1:n+1]
        similar_tours = [
            (self.user_item_matrix.columns[idx], similar_scores[idx])
            for idx in similar_indices
        ]
        
        return similar_tours


# Global recommendation engine instance
recommendation_engine = RecommendationEngine()
