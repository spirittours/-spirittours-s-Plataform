"""
🎯 Advanced Email Segmentation System
Sistema de segmentación avanzada con ML y predicciones

Características:
- Segmentación basada en comportamiento
- RFM Analysis (Recency, Frequency, Monetary)
- Predicción de churn
- Lifetime Value (LTV) prediction
- Engagement scoring
- Dynamic segment updates
- Custom rules engine
"""

from typing import List, Dict, Optional, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
import logging
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

logger = logging.getLogger(__name__)


@dataclass
class SegmentRule:
    """Regla de segmentación"""
    field: str
    operator: str  # ==, !=, >, <, >=, <=, contains, not_contains, in, not_in
    value: Any
    
    def evaluate(self, contact_data: Dict[str, Any]) -> bool:
        """Evaluar regla contra datos del contacto"""
        field_value = contact_data.get(self.field)
        
        if field_value is None:
            return False
        
        if self.operator == "==":
            return field_value == self.value
        elif self.operator == "!=":
            return field_value != self.value
        elif self.operator == ">":
            return field_value > self.value
        elif self.operator == "<":
            return field_value < self.value
        elif self.operator == ">=":
            return field_value >= self.value
        elif self.operator == "<=":
            return field_value <= self.value
        elif self.operator == "contains":
            return self.value in field_value
        elif self.operator == "not_contains":
            return self.value not in field_value
        elif self.operator == "in":
            return field_value in self.value
        elif self.operator == "not_in":
            return field_value not in self.value
        else:
            raise ValueError(f"Unknown operator: {self.operator}")


@dataclass
class SegmentDefinition:
    """Definición de segmento"""
    name: str
    rules: List[SegmentRule]
    logic: str = "AND"  # AND o OR
    
    def matches(self, contact_data: Dict[str, Any]) -> bool:
        """Verificar si el contacto cumple con el segmento"""
        if not self.rules:
            return False
        
        results = [rule.evaluate(contact_data) for rule in self.rules]
        
        if self.logic == "AND":
            return all(results)
        elif self.logic == "OR":
            return any(results)
        else:
            raise ValueError(f"Unknown logic: {self.logic}")


class AdvancedSegmentation:
    """
    Sistema avanzado de segmentación
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.scaler = StandardScaler()
        
        # Modelos ML
        self.churn_model = None
        self.ltv_model = None
        self.engagement_model = None
        
        logger.info("Advanced Segmentation System initialized")
    
    # ==================== RFM ANALYSIS ====================
    
    def calculate_rfm_scores(
        self,
        contacts_data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Calcular scores RFM (Recency, Frequency, Monetary)
        
        Args:
            contacts_data: DataFrame con columnas:
                - contact_id
                - last_purchase_date
                - total_purchases
                - total_spent
        
        Returns:
            DataFrame con scores RFM y segmento
        """
        df = contacts_data.copy()
        
        # Calcular Recency (días desde última compra)
        current_date = datetime.now()
        df['recency'] = (current_date - pd.to_datetime(df['last_purchase_date'])).dt.days
        
        # Frequency ya está en total_purchases
        df['frequency'] = df['total_purchases']
        
        # Monetary ya está en total_spent
        df['monetary'] = df['total_spent']
        
        # Calcular quintiles (1-5 scores)
        df['R_score'] = pd.qcut(df['recency'], 5, labels=[5, 4, 3, 2, 1], duplicates='drop')
        df['F_score'] = pd.qcut(df['frequency'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        df['M_score'] = pd.qcut(df['monetary'].rank(method='first'), 5, labels=[1, 2, 3, 4, 5], duplicates='drop')
        
        # Convertir a int
        df['R_score'] = df['R_score'].astype(int)
        df['F_score'] = df['F_score'].astype(int)
        df['M_score'] = df['M_score'].astype(int)
        
        # Calcular RFM score combinado
        df['RFM_score'] = df['R_score'].astype(str) + df['F_score'].astype(str) + df['M_score'].astype(str)
        
        # Asignar segmento basado en RFM
        df['rfm_segment'] = df.apply(self._assign_rfm_segment, axis=1)
        
        logger.info(f"Calculated RFM scores for {len(df)} contacts")
        
        return df
    
    def _assign_rfm_segment(self, row) -> str:
        """Asignar segmento RFM basado en scores"""
        r, f, m = row['R_score'], row['F_score'], row['M_score']
        
        # Champions: Compraron recientemente, compran frecuente, gastan mucho
        if r >= 4 and f >= 4 and m >= 4:
            return "Champions"
        
        # Loyal Customers: Compran frecuente
        elif f >= 4:
            return "Loyal Customers"
        
        # Potential Loyalists: Clientes recientes con buen gasto
        elif r >= 4 and m >= 3:
            return "Potential Loyalists"
        
        # Recent Customers: Compraron recientemente pero poco frecuente
        elif r >= 4:
            return "Recent Customers"
        
        # Promising: Compradores recientes de valor medio
        elif r >= 3 and m >= 3:
            return "Promising"
        
        # Need Attention: Por debajo del promedio pero no perdidos
        elif r >= 2 and f >= 2:
            return "Need Attention"
        
        # About to Sleep: Por debajo del promedio, mostrar inactividad
        elif r >= 2:
            return "About to Sleep"
        
        # At Risk: Gastaron mucho pero hace tiempo que no compran
        elif m >= 4:
            return "At Risk"
        
        # Can't Lose Them: Buenos clientes históricamente pero inactivos
        elif f >= 4 and r <= 2:
            return "Can't Lose Them"
        
        # Hibernating: Última compra hace mucho, baja frecuencia
        elif r <= 2:
            return "Hibernating"
        
        # Lost: Peores scores en todo
        else:
            return "Lost"
    
    # ==================== ML-BASED SEGMENTATION ====================
    
    def cluster_contacts_kmeans(
        self,
        contacts_data: pd.DataFrame,
        n_clusters: int = 5,
        features: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """
        Segmentar contactos usando K-Means clustering
        
        Args:
            contacts_data: DataFrame con datos de contactos
            n_clusters: Número de clusters
            features: Lista de features a usar (default: engagement metrics)
        
        Returns:
            DataFrame con cluster asignado
        """
        df = contacts_data.copy()
        
        # Features por defecto
        if features is None:
            features = [
                'total_sent',
                'total_opened',
                'total_clicked',
                'total_purchases',
                'total_spent',
                'engagement_score'
            ]
        
        # Preparar datos
        X = df[features].fillna(0)
        
        # Normalizar
        X_scaled = self.scaler.fit_transform(X)
        
        # Aplicar K-Means
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        df['cluster'] = kmeans.fit_predict(X_scaled)
        
        # Interpretar clusters
        df['cluster_name'] = df['cluster'].apply(
            lambda x: self._interpret_cluster(x, df, features)
        )
        
        logger.info(f"Clustered {len(df)} contacts into {n_clusters} segments")
        
        return df
    
    def _interpret_cluster(
        self,
        cluster_id: int,
        df: pd.DataFrame,
        features: List[str]
    ) -> str:
        """Interpretar significado del cluster"""
        cluster_data = df[df['cluster'] == cluster_id]
        
        # Calcular promedios del cluster
        avg_engagement = cluster_data['engagement_score'].mean()
        avg_spent = cluster_data['total_spent'].mean()
        avg_purchases = cluster_data['total_purchases'].mean()
        
        # Clasificar
        if avg_engagement > 70 and avg_spent > df['total_spent'].median():
            return f"High Value Engaged (Cluster {cluster_id})"
        elif avg_engagement > 50:
            return f"Active Users (Cluster {cluster_id})"
        elif avg_purchases == 0:
            return f"Subscribers Only (Cluster {cluster_id})"
        elif avg_engagement < 30:
            return f"Low Engagement (Cluster {cluster_id})"
        else:
            return f"Average Users (Cluster {cluster_id})"
    
    # ==================== CHURN PREDICTION ====================
    
    def train_churn_model(self, training_data: pd.DataFrame):
        """
        Entrenar modelo de predicción de churn
        
        Args:
            training_data: DataFrame con features y columna 'churned' (0/1)
        """
        features = [
            'recency_days',
            'total_opened',
            'total_clicked',
            'total_purchases',
            'total_spent',
            'engagement_score',
            'days_since_last_open',
            'avg_time_between_purchases'
        ]
        
        X = training_data[features].fillna(0)
        y = training_data['churned']
        
        # Entrenar Random Forest
        self.churn_model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            random_state=42
        )
        self.churn_model.fit(X, y)
        
        # Accuracy
        accuracy = self.churn_model.score(X, y)
        logger.info(f"Churn model trained with accuracy: {accuracy:.2%}")
    
    def predict_churn_risk(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """
        Predecir riesgo de churn para contactos
        
        Returns:
            DataFrame con columna 'churn_risk' (0-1)
        """
        if self.churn_model is None:
            raise ValueError("Churn model not trained. Call train_churn_model first.")
        
        df = contacts_data.copy()
        
        features = [
            'recency_days',
            'total_opened',
            'total_clicked',
            'total_purchases',
            'total_spent',
            'engagement_score',
            'days_since_last_open',
            'avg_time_between_purchases'
        ]
        
        X = df[features].fillna(0)
        
        # Predecir probabilidad de churn
        df['churn_risk'] = self.churn_model.predict_proba(X)[:, 1]
        
        # Categorizar riesgo
        df['churn_risk_category'] = pd.cut(
            df['churn_risk'],
            bins=[0, 0.3, 0.6, 1.0],
            labels=['Low Risk', 'Medium Risk', 'High Risk']
        )
        
        logger.info(f"Predicted churn risk for {len(df)} contacts")
        
        return df
    
    # ==================== LTV PREDICTION ====================
    
    def train_ltv_model(self, training_data: pd.DataFrame):
        """
        Entrenar modelo de predicción de Lifetime Value
        
        Args:
            training_data: DataFrame con features y columna 'actual_ltv'
        """
        features = [
            'total_purchases',
            'total_spent',
            'avg_order_value',
            'purchase_frequency',
            'engagement_score',
            'customer_age_days'
        ]
        
        X = training_data[features].fillna(0)
        y = training_data['actual_ltv']
        
        # Entrenar Gradient Boosting
        self.ltv_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.ltv_model.fit(X, y)
        
        # R2 score
        r2_score = self.ltv_model.score(X, y)
        logger.info(f"LTV model trained with R2 score: {r2_score:.2f}")
    
    def predict_ltv(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """
        Predecir Lifetime Value para contactos
        
        Returns:
            DataFrame con columna 'predicted_ltv'
        """
        if self.ltv_model is None:
            raise ValueError("LTV model not trained. Call train_ltv_model first.")
        
        df = contacts_data.copy()
        
        features = [
            'total_purchases',
            'total_spent',
            'avg_order_value',
            'purchase_frequency',
            'engagement_score',
            'customer_age_days'
        ]
        
        X = df[features].fillna(0)
        
        # Predecir LTV
        df['predicted_ltv'] = self.ltv_model.predict(X)
        
        # Categorizar valor
        df['ltv_category'] = pd.qcut(
            df['predicted_ltv'],
            q=4,
            labels=['Low Value', 'Medium Value', 'High Value', 'Very High Value'],
            duplicates='drop'
        )
        
        logger.info(f"Predicted LTV for {len(df)} contacts")
        
        return df
    
    # ==================== ENGAGEMENT SCORING ====================
    
    def calculate_engagement_score(
        self,
        contacts_data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Calcular engagement score (0-100) para cada contacto
        
        Factores:
        - Email opens
        - Email clicks
        - Recent activity
        - Purchase behavior
        """
        df = contacts_data.copy()
        
        # Calcular métricas base
        df['open_rate'] = (df['total_opened'] / df['total_sent'].replace(0, 1)) * 100
        df['click_rate'] = (df['total_clicked'] / df['total_sent'].replace(0, 1)) * 100
        
        # Calcular recency score (más reciente = mejor)
        current_date = datetime.now()
        df['days_since_last_open'] = (current_date - pd.to_datetime(df['last_opened_at'])).dt.days
        df['recency_score'] = np.where(
            df['days_since_last_open'] <= 7, 100,
            np.where(df['days_since_last_open'] <= 30, 75,
            np.where(df['days_since_last_open'] <= 90, 50,
            np.where(df['days_since_last_open'] <= 180, 25, 0)))
        )
        
        # Engagement score ponderado
        df['engagement_score'] = (
            df['open_rate'] * 0.3 +
            df['click_rate'] * 0.4 +
            df['recency_score'] * 0.3
        ).clip(0, 100)
        
        # Categorizar engagement
        df['engagement_category'] = pd.cut(
            df['engagement_score'],
            bins=[0, 25, 50, 75, 100],
            labels=['Low', 'Medium', 'High', 'Very High']
        )
        
        logger.info(f"Calculated engagement scores for {len(df)} contacts")
        
        return df
    
    # ==================== DYNAMIC SEGMENTS ====================
    
    def create_dynamic_segment(
        self,
        name: str,
        rules: List[SegmentRule],
        logic: str = "AND"
    ) -> SegmentDefinition:
        """Crear segmento dinámico con reglas"""
        segment = SegmentDefinition(
            name=name,
            rules=rules,
            logic=logic
        )
        
        logger.info(f"Created dynamic segment: {name} with {len(rules)} rules")
        
        return segment
    
    def evaluate_segment(
        self,
        segment: SegmentDefinition,
        contacts_data: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Evaluar segmento contra todos los contactos
        
        Returns:
            DataFrame filtrado con contactos que coinciden
        """
        # Convertir a dict para evaluación
        contacts_dict = contacts_data.to_dict('records')
        
        # Evaluar cada contacto
        matching_indices = []
        for idx, contact in enumerate(contacts_dict):
            if segment.matches(contact):
                matching_indices.append(idx)
        
        # Filtrar DataFrame
        result = contacts_data.iloc[matching_indices].copy()
        
        logger.info(f"Segment '{segment.name}' matched {len(result)} contacts out of {len(contacts_data)}")
        
        return result
    
    # ==================== PREDEFINED SEGMENTS ====================
    
    def get_vip_customers(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """VIP Customers: High value, highly engaged"""
        segment = self.create_dynamic_segment(
            name="VIP Customers",
            rules=[
                SegmentRule(field="total_spent", operator=">=", value=5000),
                SegmentRule(field="engagement_score", operator=">=", value=70),
                SegmentRule(field="total_purchases", operator=">=", value=5)
            ],
            logic="AND"
        )
        return self.evaluate_segment(segment, contacts_data)
    
    def get_at_risk_customers(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """At Risk: Previously active but declining"""
        # Calcular días desde última compra
        current_date = datetime.now()
        contacts_data['days_since_purchase'] = (
            current_date - pd.to_datetime(contacts_data['last_purchase_date'])
        ).dt.days
        
        segment = self.create_dynamic_segment(
            name="At Risk Customers",
            rules=[
                SegmentRule(field="total_spent", operator=">=", value=1000),
                SegmentRule(field="days_since_purchase", operator=">", value=90),
                SegmentRule(field="engagement_score", operator="<", value=40)
            ],
            logic="AND"
        )
        return self.evaluate_segment(segment, contacts_data)
    
    def get_new_subscribers(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """New Subscribers: Joined recently, no purchases yet"""
        contacts_data['days_subscribed'] = (
            datetime.now() - pd.to_datetime(contacts_data['subscribed_at'])
        ).dt.days
        
        segment = self.create_dynamic_segment(
            name="New Subscribers",
            rules=[
                SegmentRule(field="days_subscribed", operator="<=", value=30),
                SegmentRule(field="total_purchases", operator="==", value=0)
            ],
            logic="AND"
        )
        return self.evaluate_segment(segment, contacts_data)
    
    def get_loyal_fans(self, contacts_data: pd.DataFrame) -> pd.DataFrame:
        """Loyal Fans: Frequent buyers, high engagement"""
        segment = self.create_dynamic_segment(
            name="Loyal Fans",
            rules=[
                SegmentRule(field="total_purchases", operator=">=", value=10),
                SegmentRule(field="engagement_score", operator=">=", value=60),
                SegmentRule(field="open_rate", operator=">=", value=40)
            ],
            logic="AND"
        )
        return self.evaluate_segment(segment, contacts_data)


# ==================== EXAMPLE USAGE ====================

def example_usage():
    """Ejemplo de uso del sistema de segmentación"""
    
    # Datos de ejemplo
    contacts_df = pd.DataFrame({
        'contact_id': range(1, 101),
        'email': [f'user{i}@example.com' for i in range(1, 101)],
        'last_purchase_date': pd.date_range(end=datetime.now(), periods=100),
        'total_purchases': np.random.randint(0, 20, 100),
        'total_spent': np.random.uniform(0, 10000, 100),
        'total_sent': np.random.randint(10, 100, 100),
        'total_opened': np.random.randint(0, 80, 100),
        'total_clicked': np.random.randint(0, 40, 100),
        'last_opened_at': pd.date_range(end=datetime.now(), periods=100),
        'subscribed_at': pd.date_range(start='2023-01-01', end=datetime.now(), periods=100),
        'engagement_score': np.random.uniform(0, 100, 100)
    })
    
    # Inicializar sistema
    segmentation = AdvancedSegmentation(session=None)
    
    # RFM Analysis
    rfm_df = segmentation.calculate_rfm_scores(contacts_df)
    print("\nRFM Segments:")
    print(rfm_df['rfm_segment'].value_counts())
    
    # K-Means Clustering
    clustered_df = segmentation.cluster_contacts_kmeans(contacts_df, n_clusters=5)
    print("\nClusters:")
    print(clustered_df['cluster_name'].value_counts())
    
    # Engagement Scoring
    engaged_df = segmentation.calculate_engagement_score(contacts_df)
    print("\nEngagement Categories:")
    print(engaged_df['engagement_category'].value_counts())
    
    # Segmentos predefinidos
    vip_customers = segmentation.get_vip_customers(contacts_df)
    print(f"\nVIP Customers: {len(vip_customers)}")


if __name__ == "__main__":
    example_usage()
