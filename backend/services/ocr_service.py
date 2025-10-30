#!/usr/bin/env python3
"""
OCR Service for Invoice and Document Processing
Servicio OCR Avanzado para Lectura Automática de Facturas
"""

import os
import json
import re
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from decimal import Decimal
import asyncio
import logging
from io import BytesIO

# Third-party libraries
try:
    import pytesseract
    from PIL import Image
    import pdf2image
    import cv2
    import numpy as np
    HAS_OCR = True
except ImportError:
    HAS_OCR = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False

logger = logging.getLogger(__name__)

class OCRService:
    """
    Advanced OCR service for processing invoices and documents
    Supports multiple formats: PDF, JPG, PNG, TIFF
    Uses Tesseract + OpenAI for enhanced accuracy
    """
    
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        
        if HAS_OPENAI and self.openai_api_key:
            openai.api_key = self.openai_api_key
        
        # OCR Configuration
        self.tesseract_config = '--oem 3 --psm 6'
        self.languages = ['spa', 'eng']  # Spanish and English
        
        # Patterns for data extraction
        self.patterns = {
            'invoice_number': [
                r'(?:Invoice|Factura|INVOICE|FACTURA)\s*[#:\s]*([A-Z0-9\-]+)',
                r'(?:No\.|N°|Num)\s*[:\s]*([A-Z0-9\-]+)',
                r'Invoice\s+Number[:\s]*([A-Z0-9\-]+)'
            ],
            'date': [
                r'(?:Date|Fecha|DATE|FECHA)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
                r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
                r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})'
            ],
            'total': [
                r'(?:Total|TOTAL|Suma Total)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'(?:Grand Total|Total General)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'(?:Amount Due|Importe)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
            ],
            'tax': [
                r'(?:Tax|Impuesto|IVA|VAT)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
                r'(?:Sales Tax)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
            ],
            'subtotal': [
                r'(?:Subtotal|SUBTOTAL|Sub Total)[:\s]*\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)'
            ],
            'provider': [
                r'(?:From|De|Provider|Proveedor)[:\s]*([A-Za-z\s]+)',
                r'^([A-Z][A-Za-z\s&]+)(?:\n|\r)',  # First line often company name
            ],
            'tax_id': [
                r'(?:Tax ID|NIF|CIF|RUC|RFC)[:\s]*([A-Z0-9\-]+)',
                r'(?:ID Fiscal|Identificación)[:\s]*([A-Z0-9\-]+)'
            ]
        }
    
    async def process_invoice(
        self,
        file_content: bytes,
        filename: str,
        use_ai_enhancement: bool = True
    ) -> Dict[str, Any]:
        """
        Process invoice file and extract structured data
        
        Args:
            file_content: Binary content of the file
            filename: Original filename
            use_ai_enhancement: Use OpenAI for enhanced extraction
        
        Returns:
            Dict with extracted invoice data
        """
        try:
            # Determine file type
            file_ext = filename.lower().split('.')[-1]
            
            # Extract text using OCR
            if file_ext == 'pdf':
                text, images = await self._process_pdf(file_content)
            elif file_ext in ['jpg', 'jpeg', 'png', 'tiff', 'bmp']:
                text, images = await self._process_image(file_content)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported file format: {file_ext}"
                }
            
            # Extract structured data using patterns
            extracted_data = self._extract_invoice_data(text)
            
            # Enhance with AI if available and enabled
            if use_ai_enhancement and HAS_OPENAI and self.openai_api_key:
                enhanced_data = await self._enhance_with_ai(text, extracted_data)
                extracted_data.update(enhanced_data)
            
            # Extract line items
            line_items = self._extract_line_items(text)
            
            # Validate extracted data
            validation = self._validate_invoice_data(extracted_data)
            
            return {
                "success": True,
                "invoice_number": extracted_data.get("invoice_number"),
                "date": extracted_data.get("date"),
                "provider_name": extracted_data.get("provider"),
                "tax_id": extracted_data.get("tax_id"),
                "subtotal": extracted_data.get("subtotal"),
                "tax": extracted_data.get("tax"),
                "total": extracted_data.get("total"),
                "currency": extracted_data.get("currency", "USD"),
                "line_items": line_items,
                "raw_text": text,
                "confidence_score": validation["confidence"],
                "validation": validation,
                "extracted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing invoice: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def process_rooming_list(
        self,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Process rooming list and extract structured data
        """
        try:
            # Determine file type
            file_ext = filename.lower().split('.')[-1]
            
            # Extract text
            if file_ext == 'pdf':
                text, images = await self._process_pdf(file_content)
            elif file_ext in ['jpg', 'jpeg', 'png', 'tiff']:
                text, images = await self._process_image(file_content)
            else:
                return {"success": False, "error": "Unsupported format"}
            
            # Extract rooming data
            rooming_data = self._extract_rooming_data(text)
            
            return {
                "success": True,
                **rooming_data,
                "raw_text": text,
                "extracted_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing rooming list: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def _process_pdf(self, pdf_content: bytes) -> Tuple[str, List[np.ndarray]]:
        """Process PDF file and extract text"""
        if not HAS_OCR:
            raise ImportError("OCR libraries not installed")
        
        # Convert PDF to images
        images = pdf2image.convert_from_bytes(pdf_content)
        
        # Process each page
        all_text = []
        processed_images = []
        
        for i, image in enumerate(images):
            # Preprocess image
            processed_img = self._preprocess_image(np.array(image))
            processed_images.append(processed_img)
            
            # Extract text from page
            page_text = pytesseract.image_to_string(
                processed_img,
                lang='+'.join(self.languages),
                config=self.tesseract_config
            )
            
            all_text.append(f"--- Page {i+1} ---\n{page_text}")
        
        return "\n\n".join(all_text), processed_images
    
    async def _process_image(self, image_content: bytes) -> Tuple[str, List[np.ndarray]]:
        """Process image file and extract text"""
        if not HAS_OCR:
            raise ImportError("OCR libraries not installed")
        
        # Load image
        image = Image.open(BytesIO(image_content))
        
        # Convert to numpy array
        img_array = np.array(image)
        
        # Preprocess
        processed_img = self._preprocess_image(img_array)
        
        # Extract text
        text = pytesseract.image_to_string(
            processed_img,
            lang='+'.join(self.languages),
            config=self.tesseract_config
        )
        
        return text, [processed_img]
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """Preprocess image for better OCR accuracy"""
        if not HAS_OCR:
            return image
        
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
        else:
            gray = image
        
        # Denoise
        denoised = cv2.fastNlMeansDenoising(gray)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            11,
            2
        )
        
        # Deskew (correct rotation)
        coords = np.column_stack(np.where(thresh > 0))
        if len(coords) > 0:
            angle = cv2.minAreaRect(coords)[-1]
            if angle < -45:
                angle = 90 + angle
            
            if abs(angle) > 0.5:  # Only rotate if significant
                (h, w) = thresh.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                thresh = cv2.warpAffine(
                    thresh,
                    M,
                    (w, h),
                    flags=cv2.INTER_CUBIC,
                    borderMode=cv2.BORDER_REPLICATE
                )
        
        return thresh
    
    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extract structured data from invoice text using patterns"""
        data = {}
        
        # Extract each field using patterns
        for field, patterns in self.patterns.items():
            for pattern in patterns:
                match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
                if match:
                    value = match.group(1).strip()
                    
                    # Clean and format value
                    if field in ['total', 'tax', 'subtotal']:
                        value = self._parse_amount(value)
                    elif field == 'date':
                        value = self._parse_date(value)
                    
                    data[field] = value
                    break
        
        # Detect currency
        if '$' in text[:500]:  # Check first 500 chars
            data['currency'] = 'USD'
        elif '€' in text[:500]:
            data['currency'] = 'EUR'
        elif '£' in text[:500]:
            data['currency'] = 'GBP'
        elif '₪' in text[:500] or 'ILS' in text[:500]:
            data['currency'] = 'ILS'
        else:
            data['currency'] = 'USD'  # Default
        
        return data
    
    def _extract_line_items(self, text: str) -> List[Dict[str, Any]]:
        """Extract line items from invoice"""
        items = []
        
        # Look for tabular data (description, quantity, price)
        # Pattern: description followed by numbers
        lines = text.split('\n')
        
        for line in lines:
            # Skip empty lines
            if not line.strip():
                continue
            
            # Look for lines with amounts
            amounts = re.findall(r'\$?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)', line)
            
            if len(amounts) >= 1:
                # Extract description (text before numbers)
                desc_match = re.match(r'^(.*?)\s*\d', line)
                description = desc_match.group(1).strip() if desc_match else line
                
                # Parse amounts
                quantity = 1
                unit_price = 0
                total = 0
                
                if len(amounts) == 1:
                    total = self._parse_amount(amounts[0])
                elif len(amounts) == 2:
                    quantity = float(amounts[0].replace(',', ''))
                    total = self._parse_amount(amounts[1])
                    unit_price = total / quantity if quantity > 0 else 0
                elif len(amounts) >= 3:
                    quantity = float(amounts[0].replace(',', ''))
                    unit_price = self._parse_amount(amounts[1])
                    total = self._parse_amount(amounts[2])
                
                # Only add if has meaningful description
                if description and len(description) > 3:
                    items.append({
                        "description": description,
                        "quantity": quantity,
                        "unit_price": float(unit_price),
                        "total": float(total)
                    })
        
        return items
    
    def _extract_rooming_data(self, text: str) -> Dict[str, Any]:
        """Extract rooming list data"""
        data = {
            "total_rooms": 0,
            "guests": [],
            "check_in": None,
            "check_out": None,
            "room_types": {}
        }
        
        # Extract dates
        date_pattern = r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}'
        dates = re.findall(date_pattern, text)
        if len(dates) >= 2:
            data["check_in"] = self._parse_date(dates[0])
            data["check_out"] = self._parse_date(dates[1])
        
        # Count rooms (look for room numbers or keywords)
        room_keywords = ['room', 'habitación', 'hab', 'rm']
        lines = text.lower().split('\n')
        
        room_count = 0
        for line in lines:
            for keyword in room_keywords:
                if keyword in line:
                    room_count += 1
                    break
        
        data["total_rooms"] = room_count
        
        # Extract guest names (lines with full names pattern)
        name_pattern = r'\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b'
        guests = re.findall(name_pattern, text)
        data["guests"] = guests[:room_count * 2]  # Max 2 guests per room
        
        # Detect room types
        room_type_keywords = {
            'single': ['single', 'sgl', 'individual'],
            'double': ['double', 'dbl', 'doble'],
            'triple': ['triple', 'trpl'],
            'suite': ['suite', 'executive']
        }
        
        for room_type, keywords in room_type_keywords.items():
            count = 0
            for keyword in keywords:
                count += text.lower().count(keyword)
            if count > 0:
                data["room_types"][room_type] = count
        
        return data
    
    async def _enhance_with_ai(
        self,
        text: str,
        extracted_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Use OpenAI to enhance data extraction"""
        try:
            prompt = f"""
            Analyze this invoice text and extract the following information in JSON format:
            - invoice_number
            - date (YYYY-MM-DD format)
            - provider (company name)
            - tax_id
            - subtotal (number)
            - tax (number)
            - total (number)
            - currency (USD, EUR, etc.)
            
            Invoice text:
            {text[:2000]}  # Limit to first 2000 chars
            
            Current extracted data:
            {json.dumps(extracted_data, indent=2)}
            
            Return ONLY a JSON object with the corrected/enhanced data.
            """
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured data from invoices."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0,
                max_tokens=500
            )
            
            result = response.choices[0].message.content
            
            # Parse JSON response
            enhanced_data = json.loads(result)
            
            return enhanced_data
            
        except Exception as e:
            logger.error(f"AI enhancement failed: {str(e)}")
            return {}
    
    def _parse_amount(self, amount_str: str) -> Decimal:
        """Parse amount string to Decimal"""
        try:
            # Remove currency symbols and spaces
            cleaned = re.sub(r'[^\d.,]', '', amount_str)
            
            # Handle different decimal separators
            if ',' in cleaned and '.' in cleaned:
                # Determine which is decimal separator
                if cleaned.rindex(',') > cleaned.rindex('.'):
                    # Comma is decimal separator (European format)
                    cleaned = cleaned.replace('.', '').replace(',', '.')
                else:
                    # Period is decimal separator (US format)
                    cleaned = cleaned.replace(',', '')
            elif ',' in cleaned:
                # Could be thousands or decimal separator
                if cleaned.count(',') > 1:
                    # Multiple commas = thousands separator
                    cleaned = cleaned.replace(',', '')
                else:
                    # Single comma - check position
                    comma_pos = cleaned.index(',')
                    if len(cleaned) - comma_pos == 3:
                        # Comma followed by 2 digits = decimal separator
                        cleaned = cleaned.replace(',', '.')
                    else:
                        # Thousands separator
                        cleaned = cleaned.replace(',', '')
            
            return Decimal(cleaned)
            
        except Exception as e:
            logger.warning(f"Error parsing amount '{amount_str}': {str(e)}")
            return Decimal('0')
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        date_formats = [
            '%m/%d/%Y',
            '%d/%m/%Y',
            '%Y-%m-%d',
            '%d-%m-%Y',
            '%m-%d-%Y',
            '%d/%m/%y',
            '%m/%d/%y'
        ]
        
        for fmt in date_formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.strftime('%Y-%m-%d')
            except:
                continue
        
        return None
    
    def _validate_invoice_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate extracted invoice data and calculate confidence"""
        validation = {
            "is_valid": True,
            "confidence": 0.0,
            "issues": []
        }
        
        # Check required fields
        required_fields = ['invoice_number', 'total']
        confidence_score = 0
        max_score = 100
        
        # Invoice number (20 points)
        if data.get('invoice_number'):
            confidence_score += 20
        else:
            validation["issues"].append("Missing invoice number")
        
        # Total amount (30 points)
        if data.get('total'):
            confidence_score += 30
        else:
            validation["issues"].append("Missing total amount")
        
        # Date (15 points)
        if data.get('date'):
            confidence_score += 15
        else:
            validation["issues"].append("Missing date")
        
        # Provider (15 points)
        if data.get('provider'):
            confidence_score += 15
        
        # Tax ID (10 points)
        if data.get('tax_id'):
            confidence_score += 10
        
        # Subtotal and tax (10 points)
        if data.get('subtotal') and data.get('tax'):
            confidence_score += 10
            
            # Verify math
            subtotal = data.get('subtotal', 0)
            tax = data.get('tax', 0)
            total = data.get('total', 0)
            
            if abs(subtotal + tax - total) > 0.01:
                validation["issues"].append("Total doesn't match subtotal + tax")
                confidence_score -= 5
        
        validation["confidence"] = min(confidence_score / max_score, 1.0)
        validation["is_valid"] = confidence_score >= 50  # At least 50% confidence
        
        return validation

# Singleton instance
ocr_service = OCRService()

__all__ = ['OCRService', 'ocr_service']