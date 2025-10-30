#!/usr/bin/env python3
"""
AI Validation Service for Operations
Servicio de Validación con IA para Operaciones
"""

import json
import re
from typing import Dict, Any, List, Optional
from datetime import datetime
from decimal import Decimal
import asyncio
from fastapi import UploadFile
import pandas as pd
import numpy as np
from io import BytesIO

# Import AI/ML libraries
try:
    import openai
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler
    HAS_ML = True
except ImportError:
    HAS_ML = False

from ..models.operations_models import (
    ValidationStatus, ValidationType, ProviderReservation
)

class AIValidationService:
    """
    Service for AI-powered validation of reservations and documents
    """
    
    def __init__(self):
        self.confidence_threshold = 0.85
        self.price_tolerance = 0.05  # 5% price variance allowed
        self.anomaly_detector = None
        
        if HAS_ML:
            # Initialize anomaly detector
            self.anomaly_detector = IsolationForest(
                contamination=0.1,
                random_state=42
            )
            self.scaler = StandardScaler()
    
    async def validate_data(
        self,
        validation_type: ValidationType,
        expected_values: Dict[str, Any],
        actual_values: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate data using AI/ML techniques
        """
        if validation_type == ValidationType.ROOMING_LIST:
            return await self._validate_rooming_data(expected_values, actual_values)
        elif validation_type == ValidationType.INVOICE:
            return await self._validate_invoice_data(expected_values, actual_values)
        elif validation_type == ValidationType.QUANTITY:
            return await self._validate_quantity(expected_values, actual_values)
        elif validation_type == ValidationType.PRICE:
            return await self._validate_price(expected_values, actual_values)
        elif validation_type == ValidationType.DATES:
            return await self._validate_dates(expected_values, actual_values)
        elif validation_type == ValidationType.DUPLICATE:
            return await self._detect_duplicates(expected_values, actual_values)
        elif validation_type == ValidationType.FRAUD:
            return await self._detect_fraud(expected_values, actual_values)
        else:
            return {
                "status": ValidationStatus.FAILED,
                "error": "Unknown validation type"
            }
    
    async def validate_rooming_list(
        self,
        reservation: ProviderReservation,
        rooming_file: UploadFile
    ) -> Dict[str, Any]:
        """
        Validate rooming list against reservation
        """
        try:
            # Read file content
            content = await rooming_file.read()
            
            # Parse rooming data (support various formats)
            rooming_data = await self._parse_rooming_file(
                content,
                rooming_file.filename
            )
            
            # Extract key information
            extracted = {
                "total_rooms": rooming_data.get("total_rooms", 0),
                "check_in": rooming_data.get("check_in"),
                "check_out": rooming_data.get("check_out"),
                "room_types": rooming_data.get("room_types", {}),
                "guest_count": rooming_data.get("guest_count", 0)
            }
            
            # Expected values from reservation
            expected = {
                "total_rooms": reservation.quantity,
                "check_in": reservation.service_date_start,
                "check_out": reservation.service_date_end,
                "room_types": reservation.quantity_details or {},
                "guest_count": reservation.quantity_details.get("guests", 0) if reservation.quantity_details else 0
            }
            
            # Validate
            discrepancies = []
            confidence = 1.0
            
            # Check room count
            if extracted["total_rooms"] != expected["total_rooms"]:
                discrepancies.append({
                    "field": "total_rooms",
                    "expected": expected["total_rooms"],
                    "actual": extracted["total_rooms"],
                    "severity": "high"
                })
                confidence -= 0.3
            
            # Check dates
            if extracted["check_in"] != expected["check_in"]:
                discrepancies.append({
                    "field": "check_in",
                    "expected": str(expected["check_in"]),
                    "actual": str(extracted["check_in"]),
                    "severity": "medium"
                })
                confidence -= 0.2
            
            if extracted["check_out"] != expected["check_out"]:
                discrepancies.append({
                    "field": "check_out",
                    "expected": str(expected["check_out"]),
                    "actual": str(extracted["check_out"]),
                    "severity": "medium"
                })
                confidence -= 0.2
            
            # Determine status
            if len(discrepancies) == 0:
                status = ValidationStatus.PASSED
            elif confidence >= self.confidence_threshold:
                status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.FAILED
            
            return {
                "valid": len(discrepancies) == 0,
                "status": status,
                "confidence": max(0, confidence),
                "discrepancies": discrepancies,
                "recommendations": self._generate_recommendations(discrepancies),
                "extracted_data": extracted
            }
            
        except Exception as e:
            return {
                "valid": False,
                "status": ValidationStatus.FAILED,
                "error": str(e),
                "confidence": 0.0
            }
    
    async def validate_invoice(
        self,
        reservation: ProviderReservation,
        invoice_file: UploadFile
    ) -> Dict[str, Any]:
        """
        Validate invoice against reservation
        """
        try:
            # Read file content
            content = await invoice_file.read()
            
            # Parse invoice data
            invoice_data = await self._parse_invoice_file(
                content,
                invoice_file.filename
            )
            
            # Extract key information
            extracted = {
                "invoice_number": invoice_data.get("invoice_number"),
                "total_amount": Decimal(str(invoice_data.get("total_amount", 0))),
                "items": invoice_data.get("items", []),
                "date": invoice_data.get("date"),
                "tax_amount": Decimal(str(invoice_data.get("tax_amount", 0)))
            }
            
            # Expected values
            expected_amount = reservation.total_price
            
            # Detect anomalies
            anomalies = []
            confidence = 1.0
            
            # Check amount
            amount_diff = abs(extracted["total_amount"] - expected_amount)
            amount_variance = amount_diff / expected_amount if expected_amount > 0 else 0
            
            if amount_variance > self.price_tolerance:
                anomalies.append({
                    "type": "PRICE_VARIANCE",
                    "expected": float(expected_amount),
                    "actual": float(extracted["total_amount"]),
                    "variance": float(amount_variance),
                    "severity": "high" if amount_variance > 0.1 else "medium"
                })
                confidence -= 0.4
            
            # Check for unauthorized items
            for item in extracted["items"]:
                if not await self._is_item_authorized(item, reservation):
                    anomalies.append({
                        "type": "UNAUTHORIZED_ITEM",
                        "item": item,
                        "severity": "high"
                    })
                    confidence -= 0.2
            
            # Check for duplicate charges
            duplicate_items = self._find_duplicate_items(extracted["items"])
            if duplicate_items:
                anomalies.append({
                    "type": "DUPLICATE_CHARGES",
                    "items": duplicate_items,
                    "severity": "medium"
                })
                confidence -= 0.15
            
            # Determine status
            if len(anomalies) == 0:
                status = ValidationStatus.PASSED
            elif confidence >= self.confidence_threshold:
                status = ValidationStatus.WARNING
            else:
                status = ValidationStatus.FAILED
            
            return {
                "valid": len(anomalies) == 0,
                "status": status,
                "confidence": max(0, confidence),
                "anomalies": anomalies,
                "recommendations": self._generate_invoice_recommendations(anomalies),
                "extracted_data": {
                    "invoice_number": extracted["invoice_number"],
                    "total_amount": float(extracted["total_amount"]),
                    "tax_amount": float(extracted["tax_amount"])
                }
            }
            
        except Exception as e:
            return {
                "valid": False,
                "status": ValidationStatus.FAILED,
                "error": str(e),
                "confidence": 0.0
            }
    
    async def _validate_rooming_data(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate rooming list data
        """
        discrepancies = []
        confidence = 1.0
        
        # Compare each field
        for key in expected:
            if key in actual:
                if expected[key] != actual[key]:
                    discrepancies.append({
                        "field": key,
                        "expected": expected[key],
                        "actual": actual[key]
                    })
                    confidence -= 0.1
        
        status = ValidationStatus.PASSED if not discrepancies else ValidationStatus.WARNING
        
        return {
            "status": status,
            "confidence": max(0, confidence),
            "discrepancies": discrepancies
        }
    
    async def _validate_invoice_data(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate invoice data
        """
        anomalies = []
        confidence = 1.0
        
        # Price validation
        if "amount" in expected and "amount" in actual:
            expected_amount = Decimal(str(expected["amount"]))
            actual_amount = Decimal(str(actual["amount"]))
            variance = abs(actual_amount - expected_amount) / expected_amount if expected_amount > 0 else 0
            
            if variance > self.price_tolerance:
                anomalies.append({
                    "type": "PRICE_VARIANCE",
                    "variance": float(variance),
                    "expected": float(expected_amount),
                    "actual": float(actual_amount)
                })
                confidence -= 0.3
        
        status = ValidationStatus.PASSED if not anomalies else ValidationStatus.WARNING
        
        return {
            "status": status,
            "confidence": max(0, confidence),
            "anomalies": anomalies
        }
    
    async def _validate_quantity(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate quantities
        """
        expected_qty = expected.get("quantity", 0)
        actual_qty = actual.get("quantity", 0)
        
        if expected_qty != actual_qty:
            return {
                "status": ValidationStatus.FAILED,
                "confidence": 0.0,
                "discrepancies": [{
                    "field": "quantity",
                    "expected": expected_qty,
                    "actual": actual_qty
                }]
            }
        
        return {
            "status": ValidationStatus.PASSED,
            "confidence": 1.0,
            "discrepancies": []
        }
    
    async def _validate_price(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate pricing with tolerance
        """
        expected_price = Decimal(str(expected.get("price", 0)))
        actual_price = Decimal(str(actual.get("price", 0)))
        
        if expected_price > 0:
            variance = abs(actual_price - expected_price) / expected_price
        else:
            variance = 1.0 if actual_price > 0 else 0.0
        
        if variance <= self.price_tolerance:
            status = ValidationStatus.PASSED
            confidence = 1.0 - variance
        elif variance <= self.price_tolerance * 2:
            status = ValidationStatus.WARNING
            confidence = 0.7
        else:
            status = ValidationStatus.FAILED
            confidence = 0.3
        
        return {
            "status": status,
            "confidence": confidence,
            "variance": float(variance),
            "expected": float(expected_price),
            "actual": float(actual_price)
        }
    
    async def _validate_dates(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate date ranges
        """
        discrepancies = []
        
        # Parse dates
        try:
            expected_start = datetime.fromisoformat(expected.get("start_date", ""))
            expected_end = datetime.fromisoformat(expected.get("end_date", ""))
            actual_start = datetime.fromisoformat(actual.get("start_date", ""))
            actual_end = datetime.fromisoformat(actual.get("end_date", ""))
        except:
            return {
                "status": ValidationStatus.FAILED,
                "confidence": 0.0,
                "error": "Invalid date format"
            }
        
        if expected_start != actual_start:
            discrepancies.append({
                "field": "start_date",
                "expected": str(expected_start),
                "actual": str(actual_start)
            })
        
        if expected_end != actual_end:
            discrepancies.append({
                "field": "end_date",
                "expected": str(expected_end),
                "actual": str(actual_end)
            })
        
        if discrepancies:
            return {
                "status": ValidationStatus.FAILED,
                "confidence": 0.5,
                "discrepancies": discrepancies
            }
        
        return {
            "status": ValidationStatus.PASSED,
            "confidence": 1.0,
            "discrepancies": []
        }
    
    async def _detect_duplicates(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect duplicate entries
        """
        # Check if this is a duplicate based on key fields
        duplicates = []
        
        # Compare confirmation numbers
        if expected.get("confirmation_number") == actual.get("confirmation_number"):
            if expected.get("id") != actual.get("id"):
                duplicates.append({
                    "type": "DUPLICATE_CONFIRMATION",
                    "confirmation_number": expected.get("confirmation_number")
                })
        
        if duplicates:
            return {
                "status": ValidationStatus.FAILED,
                "confidence": 0.2,
                "duplicates": duplicates
            }
        
        return {
            "status": ValidationStatus.PASSED,
            "confidence": 1.0,
            "duplicates": []
        }
    
    async def _detect_fraud(
        self,
        expected: Dict[str, Any],
        actual: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Detect potential fraud patterns using ML
        """
        fraud_indicators = []
        risk_score = 0.0
        
        # Pattern 1: Unusual price variance
        if "price" in expected and "price" in actual:
            price_ratio = Decimal(str(actual["price"])) / Decimal(str(expected["price"]))
            if price_ratio > Decimal("1.5") or price_ratio < Decimal("0.5"):
                fraud_indicators.append({
                    "type": "SUSPICIOUS_PRICE",
                    "risk": "high",
                    "details": f"Price ratio: {float(price_ratio)}"
                })
                risk_score += 0.4
        
        # Pattern 2: Suspicious timing
        if "created_at" in actual:
            created = datetime.fromisoformat(actual["created_at"])
            if created.hour in [0, 1, 2, 3, 4]:  # Created in unusual hours
                fraud_indicators.append({
                    "type": "UNUSUAL_TIMING",
                    "risk": "medium",
                    "details": f"Created at {created.hour}:00"
                })
                risk_score += 0.2
        
        # Pattern 3: Anomaly detection using ML (if available)
        if HAS_ML and self.anomaly_detector:
            features = self._extract_fraud_features(actual)
            if features is not None:
                prediction = self.anomaly_detector.predict([features])
                if prediction[0] == -1:  # Anomaly detected
                    fraud_indicators.append({
                        "type": "ML_ANOMALY",
                        "risk": "high",
                        "details": "Machine learning model detected anomaly"
                    })
                    risk_score += 0.5
        
        # Determine fraud risk level
        if risk_score >= 0.7:
            status = ValidationStatus.FAILED
            risk_level = "high"
        elif risk_score >= 0.4:
            status = ValidationStatus.WARNING
            risk_level = "medium"
        else:
            status = ValidationStatus.PASSED
            risk_level = "low"
        
        return {
            "status": status,
            "confidence": 1.0 - risk_score,
            "fraud_indicators": fraud_indicators,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "recommendations": self._generate_fraud_recommendations(fraud_indicators)
        }
    
    async def _parse_rooming_file(
        self,
        content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Parse rooming list file (support multiple formats)
        """
        # Detect file type
        if filename.lower().endswith('.xlsx') or filename.lower().endswith('.xls'):
            return self._parse_excel_rooming(content)
        elif filename.lower().endswith('.csv'):
            return self._parse_csv_rooming(content)
        elif filename.lower().endswith('.pdf'):
            return await self._parse_pdf_rooming(content)
        else:
            # Try to parse as text
            return self._parse_text_rooming(content.decode('utf-8', errors='ignore'))
    
    def _parse_excel_rooming(self, content: bytes) -> Dict[str, Any]:
        """
        Parse Excel rooming list
        """
        try:
            df = pd.read_excel(BytesIO(content))
            
            # Extract information
            total_rooms = len(df)
            
            # Try to find check-in/out dates
            check_in = None
            check_out = None
            
            # Common column names for dates
            date_columns = ['check in', 'checkin', 'arrival', 'check_in', 'in']
            for col in date_columns:
                if col in df.columns.str.lower():
                    check_in = pd.to_datetime(df[col].iloc[0])
                    break
            
            date_columns = ['check out', 'checkout', 'departure', 'check_out', 'out']
            for col in date_columns:
                if col in df.columns.str.lower():
                    check_out = pd.to_datetime(df[col].iloc[0])
                    break
            
            # Count room types
            room_types = {}
            if 'room type' in df.columns.str.lower():
                room_types = df['room type'].value_counts().to_dict()
            
            # Count guests
            guest_count = total_rooms * 2  # Default assumption
            if 'guests' in df.columns.str.lower():
                guest_count = df['guests'].sum()
            
            return {
                "total_rooms": total_rooms,
                "check_in": check_in,
                "check_out": check_out,
                "room_types": room_types,
                "guest_count": guest_count
            }
            
        except Exception as e:
            raise ValueError(f"Failed to parse Excel file: {str(e)}")
    
    def _parse_csv_rooming(self, content: bytes) -> Dict[str, Any]:
        """
        Parse CSV rooming list
        """
        try:
            df = pd.read_csv(BytesIO(content))
            # Similar logic to Excel parsing
            return self._parse_excel_rooming(content)
        except:
            return {"error": "Failed to parse CSV"}
    
    async def _parse_pdf_rooming(self, content: bytes) -> Dict[str, Any]:
        """
        Parse PDF rooming list (simplified - would need OCR in production)
        """
        # In production, use OCR service or PDF parser
        return {
            "total_rooms": 0,
            "check_in": None,
            "check_out": None,
            "room_types": {},
            "guest_count": 0,
            "note": "PDF parsing not fully implemented"
        }
    
    def _parse_text_rooming(self, text: str) -> Dict[str, Any]:
        """
        Parse text-based rooming list
        """
        # Extract numbers for room count
        numbers = re.findall(r'\d+', text)
        total_rooms = int(numbers[0]) if numbers else 0
        
        # Extract dates
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
        dates = re.findall(date_pattern, text)
        
        check_in = None
        check_out = None
        if len(dates) >= 2:
            try:
                check_in = datetime.strptime(dates[0], '%m/%d/%Y')
                check_out = datetime.strptime(dates[1], '%m/%d/%Y')
            except:
                pass
        
        return {
            "total_rooms": total_rooms,
            "check_in": check_in,
            "check_out": check_out,
            "room_types": {},
            "guest_count": total_rooms * 2
        }
    
    async def _parse_invoice_file(
        self,
        content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Parse invoice file
        """
        # Similar parsing logic for invoices
        # Extract invoice number, amount, items, etc.
        
        # Simplified implementation
        text = content.decode('utf-8', errors='ignore')
        
        # Extract invoice number
        invoice_pattern = r'(?:Invoice|INV)[#:\s]*(\S+)'
        invoice_match = re.search(invoice_pattern, text, re.IGNORECASE)
        invoice_number = invoice_match.group(1) if invoice_match else None
        
        # Extract total amount
        amount_pattern = r'(?:Total|Amount)[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)'
        amount_match = re.search(amount_pattern, text, re.IGNORECASE)
        total_amount = float(amount_match.group(1).replace(',', '')) if amount_match else 0
        
        # Extract items (simplified)
        items = []
        lines = text.split('\n')
        for line in lines:
            if '$' in line or '€' in line:
                items.append({
                    "description": line.strip(),
                    "amount": 0  # Would need better parsing
                })
        
        return {
            "invoice_number": invoice_number,
            "total_amount": total_amount,
            "items": items,
            "date": datetime.now(),
            "tax_amount": total_amount * 0.1  # Assumed 10% tax
        }
    
    async def _is_item_authorized(
        self,
        item: Dict[str, Any],
        reservation: ProviderReservation
    ) -> bool:
        """
        Check if an invoice item is authorized based on reservation
        """
        # Check if item description matches expected service
        item_desc = item.get("description", "").lower()
        
        # Basic keyword matching
        if reservation.service_type.value.lower() in item_desc:
            return True
        
        # Check against known authorized items
        authorized_keywords = {
            "hotel": ["accommodation", "room", "lodging", "stay"],
            "transport": ["transfer", "bus", "vehicle", "transportation"],
            "entrance": ["ticket", "admission", "entry", "pass"],
            "guide": ["guide", "tour", "assistance"],
            "restaurant": ["meal", "food", "dining", "restaurant"]
        }
        
        service_keywords = authorized_keywords.get(reservation.service_type.value, [])
        
        for keyword in service_keywords:
            if keyword in item_desc:
                return True
        
        return False
    
    def _find_duplicate_items(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Find duplicate items in invoice
        """
        duplicates = []
        seen = {}
        
        for item in items:
            key = f"{item.get('description', '')}_{item.get('amount', 0)}"
            if key in seen:
                duplicates.append({
                    "original": seen[key],
                    "duplicate": item
                })
            else:
                seen[key] = item
        
        return duplicates
    
    def _generate_recommendations(
        self,
        discrepancies: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate recommendations based on discrepancies
        """
        recommendations = []
        
        for discrepancy in discrepancies:
            field = discrepancy.get("field")
            severity = discrepancy.get("severity", "medium")
            
            if field == "total_rooms":
                recommendations.append(
                    f"Contact provider to confirm room count. Expected {discrepancy['expected']}, received {discrepancy['actual']}"
                )
            elif field in ["check_in", "check_out"]:
                recommendations.append(
                    f"Verify {field.replace('_', ' ')} date with provider and update if necessary"
                )
            
            if severity == "high":
                recommendations.insert(0, "⚠️ HIGH PRIORITY: Immediate action required")
        
        return recommendations
    
    def _generate_invoice_recommendations(
        self,
        anomalies: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate recommendations for invoice anomalies
        """
        recommendations = []
        
        for anomaly in anomalies:
            anomaly_type = anomaly.get("type")
            
            if anomaly_type == "PRICE_VARIANCE":
                variance_pct = anomaly.get("variance", 0) * 100
                recommendations.append(
                    f"Review price difference of {variance_pct:.1f}%. Contact provider for clarification."
                )
            elif anomaly_type == "UNAUTHORIZED_ITEM":
                recommendations.append(
                    f"Unauthorized item found: {anomaly.get('item', {}).get('description', 'Unknown')}. Verify with provider."
                )
            elif anomaly_type == "DUPLICATE_CHARGES":
                recommendations.append(
                    "Duplicate charges detected. Request corrected invoice from provider."
                )
        
        if not recommendations:
            recommendations.append("Invoice appears correct. Proceed with payment processing.")
        
        return recommendations
    
    def _generate_fraud_recommendations(
        self,
        indicators: List[Dict[str, Any]]
    ) -> List[str]:
        """
        Generate recommendations for fraud indicators
        """
        recommendations = []
        
        high_risk = any(i.get("risk") == "high" for i in indicators)
        
        if high_risk:
            recommendations.append("🚨 HIGH RISK: Escalate to management immediately")
            recommendations.append("Do not process payment without additional verification")
            recommendations.append("Request additional documentation from provider")
        else:
            recommendations.append("Perform standard verification procedures")
        
        return recommendations
    
    def _extract_fraud_features(self, data: Dict[str, Any]) -> Optional[List[float]]:
        """
        Extract features for ML fraud detection
        """
        try:
            features = []
            
            # Price-related features
            price = float(data.get("price", 0))
            features.append(price)
            
            # Time-related features
            if "created_at" in data:
                created = datetime.fromisoformat(data["created_at"])
                features.append(float(created.hour))
                features.append(float(created.weekday()))
            else:
                features.extend([12, 3])  # Default values
            
            # Quantity features
            features.append(float(data.get("quantity", 1)))
            
            # Add more features as needed
            
            return features
            
        except:
            return None

# Export service
__all__ = ['AIValidationService']