#!/usr/bin/env python3
"""
Predictive AI Service
Servicios de IA Predictiva: Demanda, Optimización de Costos, Detección de Fraudes
"""

import os
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
import asyncio
import logging
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

# Machine Learning imports
try:
    from sklearn.ensemble import RandomForestRegressor, IsolationForest, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.model_selection import train_test_split
    import joblib
    HAS_ML = True
except ImportError:
    HAS_ML = False

# Deep Learning imports
try:
    from prophet import Prophet
    HAS_PROPHET = True
except ImportError:
    HAS_PROPHET = False

logger = logging.getLogger(__name__)

class PredictiveAIService:
    """
    Advanced AI service for predictive analytics
    - Demand forecasting
    - Cost optimization
    - Fraud detection
    - Anomaly detection
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.model_path = "models/predictive"
        
        # Create models directory if not exists
        os.makedirs(self.model_path, exist_ok=True)
        
        # Load pre-trained models if available
        self._load_models()
    
    # ==========================================
    # DEMAND FORECASTING
    # ==========================================
    
    async def forecast_demand(
        self,
        service_type: str,
        date_range: Tuple[datetime, datetime],
        db: Session
    ) -> Dict[str, Any]:
        """
        Forecast demand for a specific service type
        
        Args:
            service_type: Type of service (hotel, transport, etc.)
            date_range: Tuple of (start_date, end_date)
            db: Database session
        
        Returns:
            Dict with forecast data and confidence intervals
        """
        try:
            # Get historical data
            historical_data = await self._get_historical_bookings(
                service_type,
                db
            )
            
            if len(historical_data) < 30:  # Need minimum data
                return {
                    "success": False,
                    "error": "Insufficient historical data (need at least 30 days)"
                }
            
            # Use Prophet for time series forecasting
            if HAS_PROPHET:
                forecast = await self._forecast_with_prophet(
                    historical_data,
                    date_range
                )
            else:
                # Fallback to simple regression
                forecast = await self._forecast_with_regression(
                    historical_data,
                    date_range
                )
            
            # Calculate confidence metrics
            confidence_metrics = self._calculate_forecast_confidence(
                historical_data,
                forecast
            )
            
            return {
                "success": True,
                "service_type": service_type,
                "forecast_period": {
                    "start": date_range[0].isoformat(),
                    "end": date_range[1].isoformat()
                },
                "predictions": forecast["predictions"],
                "confidence_intervals": forecast["confidence_intervals"],
                "metrics": confidence_metrics,
                "recommendations": self._generate_demand_recommendations(forecast)
            }
            
        except Exception as e:
            logger.error(f"Error forecasting demand: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def predict_peak_seasons(
        self,
        service_type: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Predict peak and low seasons for service demand
        """
        try:
            # Get 2+ years of historical data
            historical_data = await self._get_historical_bookings(
                service_type,
                db,
                days=730  # 2 years
            )
            
            # Aggregate by month
            df = pd.DataFrame(historical_data)
            df['month'] = df['date'].dt.month
            monthly_avg = df.groupby('month')['demand'].mean()
            
            # Calculate statistics
            mean_demand = monthly_avg.mean()
            std_demand = monthly_avg.std()
            
            # Classify months
            peak_months = []
            high_months = []
            normal_months = []
            low_months = []
            
            for month, demand in monthly_avg.items():
                if demand > mean_demand + std_demand:
                    peak_months.append({
                        "month": month,
                        "month_name": datetime(2000, month, 1).strftime('%B'),
                        "avg_demand": float(demand),
                        "vs_average": f"+{((demand/mean_demand - 1) * 100):.1f}%"
                    })
                elif demand > mean_demand:
                    high_months.append({
                        "month": month,
                        "month_name": datetime(2000, month, 1).strftime('%B'),
                        "avg_demand": float(demand)
                    })
                elif demand < mean_demand - std_demand:
                    low_months.append({
                        "month": month,
                        "month_name": datetime(2000, month, 1).strftime('%B'),
                        "avg_demand": float(demand),
                        "vs_average": f"{((demand/mean_demand - 1) * 100):.1f}%"
                    })
                else:
                    normal_months.append({
                        "month": month,
                        "month_name": datetime(2000, month, 1).strftime('%B'),
                        "avg_demand": float(demand)
                    })
            
            return {
                "success": True,
                "service_type": service_type,
                "peak_months": peak_months,
                "high_months": high_months,
                "normal_months": normal_months,
                "low_months": low_months,
                "recommendations": self._generate_seasonal_recommendations(
                    peak_months,
                    low_months
                )
            }
            
        except Exception as e:
            logger.error(f"Error predicting seasons: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ==========================================
    # COST OPTIMIZATION
    # ==========================================
    
    async def optimize_pricing(
        self,
        provider_id: str,
        service_type: str,
        current_price: Decimal,
        db: Session
    ) -> Dict[str, Any]:
        """
        Suggest optimal pricing based on market analysis
        """
        try:
            # Get competitor pricing
            competitor_prices = await self._get_competitor_prices(
                provider_id,
                service_type,
                db
            )
            
            # Get historical conversion rates
            conversion_data = await self._get_conversion_rates(
                provider_id,
                db
            )
            
            # Analyze pricing trends
            market_analysis = self._analyze_market_pricing(
                competitor_prices,
                float(current_price)
            )
            
            # Calculate optimal price point
            optimal_price = self._calculate_optimal_price(
                float(current_price),
                competitor_prices,
                conversion_data
            )
            
            # Calculate potential revenue impact
            revenue_impact = self._estimate_revenue_impact(
                float(current_price),
                optimal_price,
                conversion_data
            )
            
            return {
                "success": True,
                "provider_id": provider_id,
                "current_price": float(current_price),
                "optimal_price": optimal_price,
                "price_change": {
                    "amount": optimal_price - float(current_price),
                    "percentage": ((optimal_price / float(current_price)) - 1) * 100
                },
                "market_analysis": market_analysis,
                "revenue_impact": revenue_impact,
                "recommendations": self._generate_pricing_recommendations(
                    float(current_price),
                    optimal_price,
                    market_analysis
                ),
                "confidence_score": market_analysis["confidence"]
            }
            
        except Exception as e:
            logger.error(f"Error optimizing pricing: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def find_cost_savings(
        self,
        group_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Identify cost saving opportunities for a group
        """
        try:
            from ..models.operations_models import TourGroup, ProviderReservation, Provider
            
            # Get group and its reservations
            group = db.query(TourGroup).filter(TourGroup.id == group_id).first()
            if not group:
                return {"success": False, "error": "Group not found"}
            
            reservations = db.query(ProviderReservation).filter(
                ProviderReservation.group_id == group_id
            ).all()
            
            savings_opportunities = []
            total_potential_savings = 0
            
            # Analyze each reservation
            for reservation in reservations:
                # Get alternative providers
                alternatives = await self._find_alternative_providers(
                    reservation,
                    db
                )
                
                if alternatives:
                    best_alternative = alternatives[0]
                    savings = float(reservation.total_price) - best_alternative["price"]
                    
                    if savings > 0:
                        savings_opportunities.append({
                            "reservation_id": str(reservation.id),
                            "service_type": reservation.service_type.value,
                            "current_provider": reservation.provider.name,
                            "current_price": float(reservation.total_price),
                            "alternative_provider": best_alternative["name"],
                            "alternative_price": best_alternative["price"],
                            "savings": savings,
                            "savings_percentage": (savings / float(reservation.total_price)) * 100,
                            "quality_score": best_alternative.get("quality_score", 0)
                        })
                        total_potential_savings += savings
            
            # Sort by savings amount
            savings_opportunities.sort(key=lambda x: x["savings"], reverse=True)
            
            return {
                "success": True,
                "group_id": group_id,
                "group_name": group.name,
                "current_total_cost": float(group.total_cost or 0),
                "potential_savings": total_potential_savings,
                "savings_percentage": (total_potential_savings / float(group.total_cost or 1)) * 100,
                "opportunities": savings_opportunities[:10],  # Top 10
                "recommendations": self._generate_cost_saving_recommendations(
                    savings_opportunities
                )
            }
            
        except Exception as e:
            logger.error(f"Error finding cost savings: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ==========================================
    # FRAUD DETECTION
    # ==========================================
    
    async def detect_fraud_patterns(
        self,
        reservation_id: Optional[str] = None,
        provider_id: Optional[str] = None,
        db: Session = None
    ) -> Dict[str, Any]:
        """
        Detect fraud patterns in reservations or provider behavior
        """
        try:
            if reservation_id:
                return await self._analyze_reservation_fraud(reservation_id, db)
            elif provider_id:
                return await self._analyze_provider_fraud(provider_id, db)
            else:
                return await self._analyze_system_wide_fraud(db)
                
        except Exception as e:
            logger.error(f"Error detecting fraud: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _analyze_reservation_fraud(
        self,
        reservation_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Analyze a specific reservation for fraud indicators
        """
        from ..models.operations_models import ProviderReservation
        
        reservation = db.query(ProviderReservation).filter(
            ProviderReservation.id == reservation_id
        ).first()
        
        if not reservation:
            return {"success": False, "error": "Reservation not found"}
        
        fraud_indicators = []
        risk_score = 0
        
        # Check 1: Unusual pricing
        avg_price = await self._get_average_price(
            reservation.service_type,
            reservation.provider_id,
            db
        )
        
        if avg_price:
            price_variance = abs(float(reservation.total_price) - avg_price) / avg_price
            if price_variance > 0.3:  # 30% variance
                fraud_indicators.append({
                    "type": "PRICE_ANOMALY",
                    "severity": "high" if price_variance > 0.5 else "medium",
                    "details": f"Price {price_variance*100:.1f}% different from average",
                    "expected": avg_price,
                    "actual": float(reservation.total_price)
                })
                risk_score += 30 if price_variance > 0.5 else 15
        
        # Check 2: Unusual timing
        if reservation.created_at:
            hour = reservation.created_at.hour
            if hour < 6 or hour > 23:  # Created during odd hours
                fraud_indicators.append({
                    "type": "UNUSUAL_TIMING",
                    "severity": "low",
                    "details": f"Reservation created at {hour}:00"
                })
                risk_score += 10
        
        # Check 3: Rapid modifications
        if reservation.updated_at and reservation.created_at:
            time_diff = (reservation.updated_at - reservation.created_at).total_seconds() / 60
            if time_diff < 5:  # Modified within 5 minutes
                fraud_indicators.append({
                    "type": "RAPID_MODIFICATION",
                    "severity": "medium",
                    "details": f"Modified {time_diff:.1f} minutes after creation"
                })
                risk_score += 15
        
        # Check 4: Duplicate confirmation number
        duplicates = db.query(ProviderReservation).filter(
            ProviderReservation.confirmation_number == reservation.confirmation_number,
            ProviderReservation.id != reservation.id
        ).count()
        
        if duplicates > 0:
            fraud_indicators.append({
                "type": "DUPLICATE_CONFIRMATION",
                "severity": "critical",
                "details": f"Confirmation number used in {duplicates} other reservations"
            })
            risk_score += 40
        
        # Determine risk level
        if risk_score >= 50:
            risk_level = "critical"
        elif risk_score >= 30:
            risk_level = "high"
        elif risk_score >= 15:
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "success": True,
            "reservation_id": reservation_id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "fraud_indicators": fraud_indicators,
            "recommendations": self._generate_fraud_recommendations(
                fraud_indicators,
                risk_level
            )
        }
    
    async def _analyze_provider_fraud(
        self,
        provider_id: str,
        db: Session
    ) -> Dict[str, Any]:
        """
        Analyze provider for fraudulent behavior patterns
        """
        from ..models.operations_models import Provider, ProviderReservation
        
        provider = db.query(Provider).filter(Provider.id == provider_id).first()
        if not provider:
            return {"success": False, "error": "Provider not found"}
        
        # Get all reservations for this provider
        reservations = db.query(ProviderReservation).filter(
            ProviderReservation.provider_id == provider_id
        ).all()
        
        fraud_patterns = []
        risk_score = 0
        
        # Pattern 1: Consistent overcharging
        price_variances = []
        for res in reservations:
            avg_price = await self._get_average_price(
                res.service_type,
                None,  # Compare against all providers
                db
            )
            if avg_price:
                variance = (float(res.total_price) - avg_price) / avg_price
                price_variances.append(variance)
        
        if price_variances:
            avg_variance = np.mean(price_variances)
            if avg_variance > 0.15:  # Consistently 15% above average
                fraud_patterns.append({
                    "type": "SYSTEMATIC_OVERCHARGING",
                    "severity": "high",
                    "details": f"Average price {avg_variance*100:.1f}% above market",
                    "occurrences": len([v for v in price_variances if v > 0.15])
                })
                risk_score += 35
        
        # Pattern 2: Frequent invoice discrepancies
        discrepancies = sum(1 for res in reservations if not res.invoice_validated)
        if len(reservations) > 0:
            discrepancy_rate = discrepancies / len(reservations)
            if discrepancy_rate > 0.3:  # More than 30% have issues
                fraud_patterns.append({
                    "type": "FREQUENT_DISCREPANCIES",
                    "severity": "medium",
                    "details": f"{discrepancy_rate*100:.1f}% of invoices have issues",
                    "count": discrepancies
                })
                risk_score += 25
        
        # Pattern 3: Duplicate charges
        confirmation_numbers = [r.confirmation_number for r in reservations if r.confirmation_number]
        duplicates = len(confirmation_numbers) - len(set(confirmation_numbers))
        
        if duplicates > 0:
            fraud_patterns.append({
                "type": "DUPLICATE_CHARGES",
                "severity": "critical",
                "details": f"{duplicates} duplicate confirmation numbers found"
            })
            risk_score += 40
        
        # Determine risk level
        if risk_score >= 60:
            risk_level = "critical"
            action = "SUSPEND_PROVIDER"
        elif risk_score >= 40:
            risk_level = "high"
            action = "REQUIRE_APPROVAL"
        elif risk_score >= 20:
            risk_level = "medium"
            action = "MONITOR_CLOSELY"
        else:
            risk_level = "low"
            action = "NORMAL_MONITORING"
        
        return {
            "success": True,
            "provider_id": provider_id,
            "provider_name": provider.name,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "fraud_patterns": fraud_patterns,
            "recommended_action": action,
            "total_reservations_analyzed": len(reservations),
            "recommendations": self._generate_provider_fraud_recommendations(
                fraud_patterns,
                risk_level
            )
        }
    
    # ==========================================
    # HELPER METHODS
    # ==========================================
    
    async def _get_historical_bookings(
        self,
        service_type: str,
        db: Session,
        days: int = 365
    ) -> List[Dict[str, Any]]:
        """Get historical booking data"""
        from ..models.operations_models import ProviderReservation
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        reservations = db.query(ProviderReservation).filter(
            ProviderReservation.service_type == service_type,
            ProviderReservation.created_at >= cutoff_date
        ).all()
        
        # Aggregate by date
        data = []
        for res in reservations:
            data.append({
                "date": res.service_date_start,
                "demand": res.quantity,
                "price": float(res.total_price)
            })
        
        return data
    
    async def _forecast_with_prophet(
        self,
        historical_data: List[Dict[str, Any]],
        date_range: Tuple[datetime, datetime]
    ) -> Dict[str, Any]:
        """Forecast using Prophet (Facebook's time series library)"""
        # Prepare data for Prophet
        df = pd.DataFrame(historical_data)
        df = df.rename(columns={"date": "ds", "demand": "y"})
        
        # Train model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False
        )
        model.fit(df)
        
        # Make predictions
        future_dates = pd.date_range(
            start=date_range[0],
            end=date_range[1],
            freq='D'
        )
        future_df = pd.DataFrame({"ds": future_dates})
        forecast = model.predict(future_df)
        
        # Extract predictions and confidence intervals
        predictions = []
        for _, row in forecast.iterrows():
            predictions.append({
                "date": row["ds"].isoformat(),
                "predicted_demand": max(0, row["yhat"]),  # Can't be negative
                "lower_bound": max(0, row["yhat_lower"]),
                "upper_bound": row["yhat_upper"]
            })
        
        return {
            "predictions": predictions,
            "confidence_intervals": {
                "level": 0.95,
                "description": "95% confidence interval"
            }
        }
    
    async def _forecast_with_regression(
        self,
        historical_data: List[Dict[str, Any]],
        date_range: Tuple[datetime, datetime]
    ) -> Dict[str, Any]:
        """Fallback forecasting using regression"""
        df = pd.DataFrame(historical_data)
        
        # Convert dates to numeric features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        
        X = df[['day_of_week', 'day_of_month', 'month']]
        y = df['demand']
        
        # Train model
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Make predictions
        future_dates = pd.date_range(
            start=date_range[0],
            end=date_range[1],
            freq='D'
        )
        
        predictions = []
        for date in future_dates:
            features = [[
                date.dayofweek,
                date.day,
                date.month
            ]]
            pred = max(0, model.predict(features)[0])
            
            predictions.append({
                "date": date.isoformat(),
                "predicted_demand": pred,
                "lower_bound": pred * 0.8,  # Simple confidence interval
                "upper_bound": pred * 1.2
            })
        
        return {
            "predictions": predictions,
            "confidence_intervals": {
                "level": 0.80,
                "description": "Approximate 80% confidence interval"
            }
        }
    
    def _calculate_forecast_confidence(
        self,
        historical_data: List[Dict[str, Any]],
        forecast: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Calculate confidence metrics for forecast"""
        # Simple metrics based on data quality
        data_points = len(historical_data)
        
        confidence = min(1.0, data_points / 365)  # Higher confidence with more data
        
        return {
            "confidence_score": confidence,
            "data_points_used": data_points,
            "forecast_period_days": len(forecast["predictions"]),
            "quality": "high" if confidence > 0.8 else "medium" if confidence > 0.5 else "low"
        }
    
    def _generate_demand_recommendations(
        self,
        forecast: Dict[str, Any]
    ) -> List[str]:
        """Generate recommendations based on demand forecast"""
        recommendations = []
        
        predictions = forecast["predictions"]
        
        if not predictions:
            return ["Insufficient data for recommendations"]
        
        # Find peak and low periods
        avg_demand = np.mean([p["predicted_demand"] for p in predictions])
        
        peak_dates = [p for p in predictions if p["predicted_demand"] > avg_demand * 1.3]
        low_dates = [p for p in predictions if p["predicted_demand"] < avg_demand * 0.7]
        
        if peak_dates:
            recommendations.append(
                f"📈 Prepare for high demand: {len(peak_dates)} days expected above average. "
                "Consider pre-booking resources."
            )
        
        if low_dates:
            recommendations.append(
                f"📉 Low demand expected for {len(low_dates)} days. "
                "Consider promotional offers to boost bookings."
            )
        
        return recommendations
    
    def _generate_seasonal_recommendations(
        self,
        peak_months: List[Dict],
        low_months: List[Dict]
    ) -> List[str]:
        """Generate seasonal recommendations"""
        recommendations = []
        
        if peak_months:
            months = ", ".join([m["month_name"] for m in peak_months])
            recommendations.append(
                f"🌟 Peak season: {months}. "
                "Negotiate better rates and secure inventory early."
            )
        
        if low_months:
            months = ", ".join([m["month_name"] for m in low_months])
            recommendations.append(
                f"💡 Low season: {months}. "
                "Offer special promotions and packages to increase bookings."
            )
        
        return recommendations
    
    async def _get_competitor_prices(
        self,
        provider_id: str,
        service_type: str,
        db: Session
    ) -> List[float]:
        """Get competitor pricing"""
        from ..models.operations_models import ProviderReservation
        
        # Get prices from other providers for same service type
        prices = db.query(ProviderReservation.total_price).filter(
            ProviderReservation.service_type == service_type,
            ProviderReservation.provider_id != provider_id
        ).limit(100).all()
        
        return [float(p[0]) for p in prices if p[0]]
    
    async def _get_conversion_rates(
        self,
        provider_id: str,
        db: Session
    ) -> Dict[str, float]:
        """Get historical conversion rates"""
        # Simplified - would need actual conversion tracking
        return {
            "current_rate": 0.25,  # 25% conversion
            "historical_avg": 0.23
        }
    
    def _analyze_market_pricing(
        self,
        competitor_prices: List[float],
        current_price: float
    ) -> Dict[str, Any]:
        """Analyze market pricing"""
        if not competitor_prices:
            return {
                "position": "unknown",
                "confidence": 0.0
            }
        
        market_avg = np.mean(competitor_prices)
        market_std = np.std(competitor_prices)
        
        # Determine position in market
        if current_price < market_avg - market_std:
            position = "significantly_below"
        elif current_price < market_avg:
            position = "below_average"
        elif current_price > market_avg + market_std:
            position = "significantly_above"
        elif current_price > market_avg:
            position = "above_average"
        else:
            position = "average"
        
        return {
            "position": position,
            "market_average": market_avg,
            "market_std": market_std,
            "percentile": self._calculate_percentile(current_price, competitor_prices),
            "confidence": min(1.0, len(competitor_prices) / 50)
        }
    
    def _calculate_percentile(self, value: float, data: List[float]) -> float:
        """Calculate percentile of value in data"""
        return (sum(1 for x in data if x <= value) / len(data)) * 100
    
    def _calculate_optimal_price(
        self,
        current_price: float,
        competitor_prices: List[float],
        conversion_data: Dict[str, float]
    ) -> float:
        """Calculate optimal price point"""
        if not competitor_prices:
            return current_price
        
        market_avg = np.mean(competitor_prices)
        market_std = np.std(competitor_prices)
        
        # Target: slightly below market average for competitive advantage
        optimal = market_avg * 0.95
        
        # Constrain to reasonable range
        min_price = market_avg - (2 * market_std)
        max_price = market_avg + (2 * market_std)
        
        return max(min_price, min(max_price, optimal))
    
    def _estimate_revenue_impact(
        self,
        current_price: float,
        optimal_price: float,
        conversion_data: Dict[str, float]
    ) -> Dict[str, Any]:
        """Estimate revenue impact of price change"""
        price_change_pct = (optimal_price / current_price) - 1
        
        # Simplified elasticity model
        demand_elasticity = -1.5  # Assume elastic demand
        demand_change_pct = price_change_pct * demand_elasticity
        
        # Calculate revenue change
        revenue_multiplier = (1 + price_change_pct) * (1 + demand_change_pct)
        
        return {
            "price_change_percentage": price_change_pct * 100,
            "expected_demand_change": demand_change_pct * 100,
            "expected_revenue_change": (revenue_multiplier - 1) * 100,
            "break_even_demand_change": -price_change_pct * 100  # Demand change needed to break even
        }
    
    def _generate_pricing_recommendations(
        self,
        current_price: float,
        optimal_price: float,
        market_analysis: Dict[str, Any]
    ) -> List[str]:
        """Generate pricing recommendations"""
        recommendations = []
        
        price_diff = optimal_price - current_price
        price_diff_pct = (price_diff / current_price) * 100
        
        if abs(price_diff_pct) < 5:
            recommendations.append(
                f"✅ Current pricing is optimal (within 5% of market sweet spot)"
            )
        elif price_diff > 0:
            recommendations.append(
                f"📈 Consider increasing price by {price_diff_pct:.1f}% "
                f"(${price_diff:.2f}) to ${optimal_price:.2f}"
            )
            recommendations.append(
                "Market can support higher pricing while maintaining competitiveness"
            )
        else:
            recommendations.append(
                f"📉 Consider decreasing price by {abs(price_diff_pct):.1f}% "
                f"(${abs(price_diff):.2f}) to ${optimal_price:.2f}"
            )
            recommendations.append(
                "Lower pricing could significantly increase demand"
            )
        
        position = market_analysis.get("position", "")
        if position == "significantly_above":
            recommendations.append(
                "⚠️ Currently priced significantly above market - may lose customers"
            )
        elif position == "significantly_below":
            recommendations.append(
                "💡 Opportunity to increase margins - currently underpriced"
            )
        
        return recommendations
    
    async def _find_alternative_providers(
        self,
        reservation: Any,
        db: Session
    ) -> List[Dict[str, Any]]:
        """Find alternative providers for cost comparison"""
        from ..models.operations_models import Provider
        
        # Get other providers of same service type
        providers = db.query(Provider).filter(
            Provider.provider_type == reservation.service_type,
            Provider.id != reservation.provider_id,
            Provider.active == True
        ).all()
        
        alternatives = []
        for provider in providers:
            # Estimate price (simplified - would need actual quotes)
            estimated_price = float(reservation.total_price) * 0.9  # Assume 10% cheaper
            
            alternatives.append({
                "provider_id": str(provider.id),
                "name": provider.name,
                "price": estimated_price,
                "quality_score": provider.rating or 0
            })
        
        # Sort by price
        alternatives.sort(key=lambda x: x["price"])
        
        return alternatives
    
    def _generate_cost_saving_recommendations(
        self,
        opportunities: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate cost saving recommendations"""
        recommendations = []
        
        if not opportunities:
            recommendations.append("✅ Current providers offer competitive pricing")
            return recommendations
        
        total_savings = sum(o["savings"] for o in opportunities)
        
        recommendations.append(
            f"💰 Potential savings: ${total_savings:.2f} by switching providers for "
            f"{len(opportunities)} services"
        )
        
        # Top 3 opportunities
        top_3 = opportunities[:3]
        for i, opp in enumerate(top_3, 1):
            recommendations.append(
                f"{i}. Switch {opp['service_type']} from {opp['current_provider']} to "
                f"{opp['alternative_provider']}: Save ${opp['savings']:.2f}"
            )
        
        return recommendations
    
    def _generate_fraud_recommendations(
        self,
        indicators: List[Dict[str, Any]],
        risk_level: str
    ) -> List[str]:
        """Generate fraud prevention recommendations"""
        recommendations = []
        
        if risk_level == "critical":
            recommendations.append("🚨 CRITICAL: Do not process payment without senior approval")
            recommendations.append("Escalate immediately to management")
        elif risk_level == "high":
            recommendations.append("⚠️ Require additional verification before proceeding")
            recommendations.append("Request supporting documentation from provider")
        elif risk_level == "medium":
            recommendations.append("📋 Perform standard verification procedures")
        else:
            recommendations.append("✅ Risk level acceptable - proceed with normal process")
        
        # Specific recommendations based on indicators
        for indicator in indicators:
            if indicator["type"] == "DUPLICATE_CONFIRMATION":
                recommendations.append(
                    "🔍 Verify confirmation number with provider directly"
                )
            elif indicator["type"] == "PRICE_ANOMALY":
                recommendations.append(
                    "💵 Request detailed price breakdown from provider"
                )
        
        return recommendations
    
    def _generate_provider_fraud_recommendations(
        self,
        patterns: List[Dict[str, Any]],
        risk_level: str
    ) -> List[str]:
        """Generate provider fraud recommendations"""
        recommendations = []
        
        if risk_level == "critical":
            recommendations.append(
                "🚫 SUSPEND all new bookings with this provider pending investigation"
            )
            recommendations.append(
                "Review all historical transactions for potential fraud"
            )
        elif risk_level == "high":
            recommendations.append(
                "⚠️ Require manager approval for all bookings with this provider"
            )
            recommendations.append(
                "Schedule audit of recent transactions"
            )
        elif risk_level == "medium":
            recommendations.append(
                "👁️ Monitor all transactions closely"
            )
            recommendations.append(
                "Request explanation for pricing discrepancies"
            )
        
        return recommendations
    
    async def _get_average_price(
        self,
        service_type: str,
        provider_id: Optional[str],
        db: Session
    ) -> Optional[float]:
        """Get average price for a service type"""
        from ..models.operations_models import ProviderReservation
        
        query = db.query(func.avg(ProviderReservation.total_price)).filter(
            ProviderReservation.service_type == service_type
        )
        
        if provider_id:
            query = query.filter(ProviderReservation.provider_id == provider_id)
        
        result = query.scalar()
        return float(result) if result else None
    
    async def _analyze_system_wide_fraud(self, db: Session) -> Dict[str, Any]:
        """Analyze system-wide fraud patterns"""
        # Placeholder for system-wide analysis
        return {
            "success": True,
            "message": "System-wide fraud analysis requires more implementation"
        }
    
    def _load_models(self):
        """Load pre-trained models"""
        # Placeholder for loading saved models
        pass
    
    def _save_model(self, model_name: str, model: Any):
        """Save trained model"""
        try:
            model_file = os.path.join(self.model_path, f"{model_name}.pkl")
            joblib.dump(model, model_file)
            logger.info(f"Model saved: {model_name}")
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")

# Singleton instance
predictive_ai_service = PredictiveAIService()

__all__ = ['PredictiveAIService', 'predictive_ai_service']