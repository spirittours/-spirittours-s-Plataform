"""
Sistema de Expansión Global para Spirit Tours
Multi-idioma, multi-moneda y regulaciones internacionales
"""

import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from enum import Enum
from decimal import Decimal
import aiohttp
from dataclasses import dataclass
import re
from babel import Locale, numbers, dates
import pytz
import pycountry

# Translation and localization imports
try:
    from googletrans import Translator
    from forex_python.converter import CurrencyRates, CurrencyCodes
    TRANSLATION_AVAILABLE = True
except ImportError:
    TRANSLATION_AVAILABLE = False
    print("Translation libraries not available. Install with: pip install googletrans forex-python")

# Enums
class Language(str, Enum):
    # Major Languages (20)
    ENGLISH = "en"
    SPANISH = "es"
    CHINESE = "zh"
    HINDI = "hi"
    ARABIC = "ar"
    PORTUGUESE = "pt"
    RUSSIAN = "ru"
    JAPANESE = "ja"
    GERMAN = "de"
    FRENCH = "fr"
    KOREAN = "ko"
    ITALIAN = "it"
    TURKISH = "tr"
    DUTCH = "nl"
    POLISH = "pl"
    SWEDISH = "sv"
    NORWEGIAN = "no"
    DANISH = "da"
    FINNISH = "fi"
    GREEK = "el"
    # Additional Languages (30+)
    HEBREW = "he"
    THAI = "th"
    VIETNAMESE = "vi"
    INDONESIAN = "id"
    MALAY = "ms"
    FILIPINO = "tl"
    BENGALI = "bn"
    URDU = "ur"
    TAMIL = "ta"
    TELUGU = "te"
    MARATHI = "mr"
    GUJARATI = "gu"
    KANNADA = "kn"
    MALAYALAM = "ml"
    PUNJABI = "pa"
    PERSIAN = "fa"
    SWAHILI = "sw"
    HAUSA = "ha"
    YORUBA = "yo"
    ZULU = "zu"
    AMHARIC = "am"
    UKRAINIAN = "uk"
    CZECH = "cs"
    HUNGARIAN = "hu"
    ROMANIAN = "ro"
    BULGARIAN = "bg"
    CROATIAN = "hr"
    SERBIAN = "sr"
    SLOVAK = "sk"
    SLOVENIAN = "sl"
    LITHUANIAN = "lt"
    LATVIAN = "lv"
    ESTONIAN = "et"
    ALBANIAN = "sq"
    MACEDONIAN = "mk"
    GEORGIAN = "ka"
    ARMENIAN = "hy"
    AZERBAIJANI = "az"
    KAZAKH = "kk"
    UZBEK = "uz"
    MONGOLIAN = "mn"
    BURMESE = "my"
    KHMER = "km"
    LAO = "lo"
    ICELANDIC = "is"
    WELSH = "cy"
    IRISH = "ga"
    SCOTS_GAELIC = "gd"
    BASQUE = "eu"
    CATALAN = "ca"
    GALICIAN = "gl"

class Currency(str, Enum):
    USD = "USD"  # US Dollar
    EUR = "EUR"  # Euro
    GBP = "GBP"  # British Pound
    JPY = "JPY"  # Japanese Yen
    CNY = "CNY"  # Chinese Yuan
    INR = "INR"  # Indian Rupee
    AUD = "AUD"  # Australian Dollar
    CAD = "CAD"  # Canadian Dollar
    CHF = "CHF"  # Swiss Franc
    NZD = "NZD"  # New Zealand Dollar
    SEK = "SEK"  # Swedish Krona
    NOK = "NOK"  # Norwegian Krone
    DKK = "DKK"  # Danish Krone
    SGD = "SGD"  # Singapore Dollar
    HKD = "HKD"  # Hong Kong Dollar
    KRW = "KRW"  # South Korean Won
    MXN = "MXN"  # Mexican Peso
    BRL = "BRL"  # Brazilian Real
    ZAR = "ZAR"  # South African Rand
    AED = "AED"  # UAE Dirham
    SAR = "SAR"  # Saudi Riyal
    THB = "THB"  # Thai Baht
    MYR = "MYR"  # Malaysian Ringgit
    IDR = "IDR"  # Indonesian Rupiah
    PHP = "PHP"  # Philippine Peso
    VND = "VND"  # Vietnamese Dong
    TRY = "TRY"  # Turkish Lira
    RUB = "RUB"  # Russian Ruble
    PLN = "PLN"  # Polish Zloty
    CZK = "CZK"  # Czech Koruna
    HUF = "HUF"  # Hungarian Forint
    ILS = "ILS"  # Israeli Shekel
    CLP = "CLP"  # Chilean Peso
    ARS = "ARS"  # Argentine Peso
    COP = "COP"  # Colombian Peso
    PEN = "PEN"  # Peruvian Sol
    EGP = "EGP"  # Egyptian Pound
    NGN = "NGN"  # Nigerian Naira
    KES = "KES"  # Kenyan Shilling
    MAD = "MAD"  # Moroccan Dirham

class PaymentMethod(str, Enum):
    CREDIT_CARD = "credit_card"
    DEBIT_CARD = "debit_card"
    PAYPAL = "paypal"
    APPLE_PAY = "apple_pay"
    GOOGLE_PAY = "google_pay"
    ALIPAY = "alipay"
    WECHAT_PAY = "wechat_pay"
    BANK_TRANSFER = "bank_transfer"
    CRYPTOCURRENCY = "cryptocurrency"
    CASH = "cash"
    STRIPE = "stripe"
    SQUARE = "square"
    MERCADO_PAGO = "mercado_pago"
    PAYTM = "paytm"
    M_PESA = "m_pesa"
    KLARNA = "klarna"
    AFTERPAY = "afterpay"

# Data Models
@dataclass
class CountryInfo:
    """Country-specific information"""
    code: str  # ISO 3166-1 alpha-2
    name: str
    languages: List[Language]
    currency: Currency
    timezone: str
    phone_code: str
    visa_policy: Dict[str, str]  # Country -> requirement
    payment_methods: List[PaymentMethod]
    regulations: Dict[str, Any]
    cultural_notes: List[str]
    emergency_numbers: Dict[str, str]
    public_holidays: List[Dict[str, Any]]
    business_hours: Dict[str, str]
    tipping_culture: str
    tax_rate: float
    tourist_tax: Optional[float] = None

@dataclass
class Translation:
    """Translation data"""
    original_text: str
    translated_text: str
    source_language: Language
    target_language: Language
    confidence: float
    alternative_translations: List[str] = None

@dataclass
class CurrencyExchange:
    """Currency exchange information"""
    from_currency: Currency
    to_currency: Currency
    rate: Decimal
    timestamp: datetime
    provider: str
    fee_percentage: float = 0.0
    minimum_fee: float = 0.0

@dataclass
class LocalizedContent:
    """Localized content for different regions"""
    content_id: str
    language: Language
    title: str
    description: str
    currency: Currency
    price: Decimal
    formatted_price: str
    date_format: str
    formatted_date: str
    images: List[str]
    metadata: Dict[str, Any]


class InternationalManager:
    """
    Main manager for international operations
    """
    
    def __init__(self):
        self.translator = Translator() if TRANSLATION_AVAILABLE else None
        self.currency_converter = CurrencyRates() if TRANSLATION_AVAILABLE else None
        self.currency_codes = CurrencyCodes() if TRANSLATION_AVAILABLE else None
        self.countries = self._load_countries()
        self.translation_cache = {}
        self.exchange_rate_cache = {}
        self.localization_rules = self._load_localization_rules()
    
    def _load_countries(self) -> Dict[str, CountryInfo]:
        """Load country information database"""
        countries = {}
        
        # Sample country data (in production, load from database)
        countries["US"] = CountryInfo(
            code="US",
            name="United States",
            languages=[Language.ENGLISH],
            currency=Currency.USD,
            timezone="America/New_York",
            phone_code="+1",
            visa_policy={"EU": "ESTA", "UK": "ESTA", "CN": "VISA"},
            payment_methods=[
                PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD,
                PaymentMethod.PAYPAL, PaymentMethod.APPLE_PAY, PaymentMethod.GOOGLE_PAY
            ],
            regulations={
                "drinking_age": 21,
                "driving_side": "right",
                "plug_type": "A/B",
                "voltage": "120V"
            },
            cultural_notes=[
                "Tipping is expected (15-20% in restaurants)",
                "Tax is added at checkout, not included in price",
                "Personal space is valued"
            ],
            emergency_numbers={"police": "911", "medical": "911", "fire": "911"},
            public_holidays=[
                {"date": "01-01", "name": "New Year's Day"},
                {"date": "07-04", "name": "Independence Day"},
                {"date": "12-25", "name": "Christmas"}
            ],
            business_hours={"mon-fri": "9:00-17:00", "sat": "10:00-16:00", "sun": "closed"},
            tipping_culture="15-20% expected",
            tax_rate=0.08,
            tourist_tax=None
        )
        
        countries["ES"] = CountryInfo(
            code="ES",
            name="Spain",
            languages=[Language.SPANISH, Language.CATALAN, Language.BASQUE, Language.GALICIAN],
            currency=Currency.EUR,
            timezone="Europe/Madrid",
            phone_code="+34",
            visa_policy={"US": "90_DAYS", "UK": "90_DAYS", "CN": "VISA"},
            payment_methods=[
                PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD,
                PaymentMethod.CASH, PaymentMethod.PAYPAL
            ],
            regulations={
                "drinking_age": 18,
                "driving_side": "right",
                "plug_type": "C/F",
                "voltage": "230V"
            },
            cultural_notes=[
                "Siesta time (14:00-17:00) many shops close",
                "Dinner is typically late (21:00-22:00)",
                "Greeting with two kisses is common"
            ],
            emergency_numbers={"police": "091", "medical": "061", "fire": "080"},
            public_holidays=[
                {"date": "01-01", "name": "Año Nuevo"},
                {"date": "08-15", "name": "Asunción de la Virgen"},
                {"date": "12-25", "name": "Navidad"}
            ],
            business_hours={"mon-fri": "10:00-14:00, 17:00-20:00", "sat": "10:00-14:00", "sun": "closed"},
            tipping_culture="5-10% optional",
            tax_rate=0.21,
            tourist_tax=2.5
        )
        
        countries["JP"] = CountryInfo(
            code="JP",
            name="Japan",
            languages=[Language.JAPANESE],
            currency=Currency.JPY,
            timezone="Asia/Tokyo",
            phone_code="+81",
            visa_policy={"US": "90_DAYS", "EU": "90_DAYS", "CN": "VISA"},
            payment_methods=[
                PaymentMethod.CASH, PaymentMethod.CREDIT_CARD,
                PaymentMethod.WECHAT_PAY, PaymentMethod.ALIPAY
            ],
            regulations={
                "drinking_age": 20,
                "driving_side": "left",
                "plug_type": "A/B",
                "voltage": "100V"
            },
            cultural_notes=[
                "No tipping - it can be considered rude",
                "Remove shoes when entering homes and some restaurants",
                "Bow when greeting",
                "Be quiet on public transport"
            ],
            emergency_numbers={"police": "110", "medical": "119", "fire": "119"},
            public_holidays=[
                {"date": "01-01", "name": "New Year"},
                {"date": "05-03", "name": "Constitution Day"},
                {"date": "08-11", "name": "Mountain Day"}
            ],
            business_hours={"mon-fri": "9:00-18:00", "sat": "9:00-17:00", "sun": "closed"},
            tipping_culture="No tipping",
            tax_rate=0.10,
            tourist_tax=1.0
        )
        
        # Add more countries...
        for country in pycountry.countries:
            if country.alpha_2 not in countries:
                # Default country info
                countries[country.alpha_2] = CountryInfo(
                    code=country.alpha_2,
                    name=country.name,
                    languages=[Language.ENGLISH],  # Default
                    currency=Currency.USD,  # Default
                    timezone="UTC",
                    phone_code="+0",
                    visa_policy={},
                    payment_methods=[PaymentMethod.CREDIT_CARD, PaymentMethod.CASH],
                    regulations={},
                    cultural_notes=[],
                    emergency_numbers={},
                    public_holidays=[],
                    business_hours={},
                    tipping_culture="Varies",
                    tax_rate=0.0
                )
        
        return countries
    
    def _load_localization_rules(self) -> Dict[str, Any]:
        """Load localization rules for different regions"""
        return {
            "date_formats": {
                "US": "MM/DD/YYYY",
                "EU": "DD/MM/YYYY",
                "ISO": "YYYY-MM-DD",
                "JP": "YYYY年MM月DD日"
            },
            "number_formats": {
                "US": {"decimal": ".", "thousands": ","},
                "EU": {"decimal": ",", "thousands": "."},
                "IN": {"decimal": ".", "thousands": ",", "grouping": "lakh"}
            },
            "address_formats": {
                "US": "{street}\n{city}, {state} {zip}\n{country}",
                "UK": "{street}\n{city}\n{state}\n{zip}\n{country}",
                "JP": "〒{zip}\n{country}{state}{city}{street}"
            },
            "name_formats": {
                "western": "{first} {last}",
                "eastern": "{last} {first}",
                "formal": "{title} {last}"
            }
        }
    
    async def translate_text(
        self,
        text: str,
        target_language: Language,
        source_language: Optional[Language] = None
    ) -> Translation:
        """Translate text to target language"""
        
        # Check cache
        cache_key = f"{text}_{source_language}_{target_language}"
        if cache_key in self.translation_cache:
            return self.translation_cache[cache_key]
        
        if not self.translator:
            # Fallback: return original text
            return Translation(
                original_text=text,
                translated_text=text,
                source_language=source_language or Language.ENGLISH,
                target_language=target_language,
                confidence=0.0
            )
        
        try:
            # Detect source language if not provided
            if not source_language:
                detected = self.translator.detect(text)
                source_language = Language(detected.lang)
            
            # Translate
            result = self.translator.translate(
                text,
                src=source_language.value,
                dest=target_language.value
            )
            
            translation = Translation(
                original_text=text,
                translated_text=result.text,
                source_language=source_language,
                target_language=target_language,
                confidence=result.confidence if hasattr(result, 'confidence') else 0.9
            )
            
            # Cache result
            self.translation_cache[cache_key] = translation
            
            return translation
            
        except Exception as e:
            print(f"Translation error: {e}")
            return Translation(
                original_text=text,
                translated_text=text,
                source_language=source_language or Language.ENGLISH,
                target_language=target_language,
                confidence=0.0
            )
    
    async def translate_content(
        self,
        content: Dict[str, Any],
        target_language: Language
    ) -> Dict[str, Any]:
        """Translate all text fields in content"""
        
        translated_content = content.copy()
        
        # Fields to translate
        text_fields = ['title', 'description', 'summary', 'instructions', 'notes']
        
        for field in text_fields:
            if field in content and content[field]:
                translation = await self.translate_text(
                    content[field],
                    target_language
                )
                translated_content[field] = translation.translated_text
        
        # Translate nested content
        if 'items' in content:
            translated_items = []
            for item in content['items']:
                translated_item = await self.translate_content(item, target_language)
                translated_items.append(translated_item)
            translated_content['items'] = translated_items
        
        return translated_content
    
    async def convert_currency(
        self,
        amount: Decimal,
        from_currency: Currency,
        to_currency: Currency,
        include_fee: bool = True
    ) -> CurrencyExchange:
        """Convert amount between currencies"""
        
        if from_currency == to_currency:
            return CurrencyExchange(
                from_currency=from_currency,
                to_currency=to_currency,
                rate=Decimal("1.0"),
                timestamp=datetime.now(),
                provider="none"
            )
        
        # Check cache (valid for 1 hour)
        cache_key = f"{from_currency}_{to_currency}"
        if cache_key in self.exchange_rate_cache:
            cached = self.exchange_rate_cache[cache_key]
            if (datetime.now() - cached['timestamp']).seconds < 3600:
                rate = cached['rate']
            else:
                rate = await self._fetch_exchange_rate(from_currency, to_currency)
        else:
            rate = await self._fetch_exchange_rate(from_currency, to_currency)
        
        # Apply conversion fee if requested
        fee_percentage = 2.5 if include_fee else 0.0  # 2.5% conversion fee
        effective_rate = rate * Decimal(1 - fee_percentage / 100)
        
        exchange = CurrencyExchange(
            from_currency=from_currency,
            to_currency=to_currency,
            rate=effective_rate,
            timestamp=datetime.now(),
            provider="forex_python",
            fee_percentage=fee_percentage
        )
        
        return exchange
    
    async def _fetch_exchange_rate(
        self,
        from_currency: Currency,
        to_currency: Currency
    ) -> Decimal:
        """Fetch current exchange rate"""
        
        if not self.currency_converter:
            # Fallback rates (mock data)
            mock_rates = {
                ("USD", "EUR"): 0.92,
                ("USD", "GBP"): 0.79,
                ("USD", "JPY"): 149.50,
                ("EUR", "USD"): 1.09,
                ("GBP", "USD"): 1.27,
                ("JPY", "USD"): 0.0067
            }
            
            key = (from_currency.value, to_currency.value)
            if key in mock_rates:
                rate = Decimal(str(mock_rates[key]))
            else:
                rate = Decimal("1.0")
        else:
            try:
                rate = Decimal(str(
                    self.currency_converter.get_rate(
                        from_currency.value,
                        to_currency.value
                    )
                ))
            except:
                rate = Decimal("1.0")
        
        # Cache the rate
        cache_key = f"{from_currency}_{to_currency}"
        self.exchange_rate_cache[cache_key] = {
            'rate': rate,
            'timestamp': datetime.now()
        }
        
        return rate
    
    def format_currency(
        self,
        amount: Decimal,
        currency: Currency,
        locale_code: str = "en_US"
    ) -> str:
        """Format currency for display"""
        
        try:
            locale_obj = Locale.parse(locale_code)
            return numbers.format_currency(
                amount,
                currency.value,
                locale=locale_obj
            )
        except:
            # Fallback formatting
            symbols = {
                Currency.USD: "$",
                Currency.EUR: "€",
                Currency.GBP: "£",
                Currency.JPY: "¥",
                Currency.CNY: "¥",
                Currency.INR: "₹"
            }
            symbol = symbols.get(currency, currency.value)
            return f"{symbol}{amount:,.2f}"
    
    def format_date(
        self,
        date: datetime,
        country_code: str,
        format_type: str = "medium"
    ) -> str:
        """Format date according to country conventions"""
        
        country = self.countries.get(country_code)
        if not country:
            # Default ISO format
            return date.strftime("%Y-%m-%d")
        
        # Get locale for country
        try:
            # Use first language of country
            lang = country.languages[0].value
            locale_code = f"{lang}_{country_code}"
            
            if format_type == "short":
                return dates.format_date(date, 'short', locale=locale_code)
            elif format_type == "long":
                return dates.format_date(date, 'long', locale=locale_code)
            else:  # medium
                return dates.format_date(date, 'medium', locale=locale_code)
        except:
            # Fallback to regional format
            formats = self.localization_rules["date_formats"]
            if country_code in ["US"]:
                return date.strftime("%m/%d/%Y")
            elif country_code in ["JP"]:
                return date.strftime("%Y年%m月%d日")
            else:
                return date.strftime("%d/%m/%Y")
    
    def format_number(
        self,
        number: float,
        country_code: str,
        decimal_places: int = 2
    ) -> str:
        """Format number according to country conventions"""
        
        rules = self.localization_rules["number_formats"]
        
        # Get format rules for country
        if country_code in ["US", "UK", "AU", "CA"]:
            fmt = rules["US"]
        elif country_code in ["DE", "FR", "ES", "IT"]:
            fmt = rules["EU"]
        elif country_code == "IN":
            fmt = rules["IN"]
        else:
            fmt = rules["US"]  # Default
        
        # Format number
        formatted = f"{number:,.{decimal_places}f}"
        
        # Replace separators
        if fmt["decimal"] != ".":
            formatted = formatted.replace(".", "TEMP")
            formatted = formatted.replace(",", fmt["thousands"])
            formatted = formatted.replace("TEMP", fmt["decimal"])
        
        return formatted
    
    async def localize_content(
        self,
        content: Dict[str, Any],
        target_country: str,
        target_language: Optional[Language] = None
    ) -> LocalizedContent:
        """Fully localize content for target country"""
        
        country = self.countries.get(target_country, self.countries["US"])
        
        # Determine target language
        if not target_language:
            target_language = country.languages[0]
        
        # Translate text content
        translated = await self.translate_content(content, target_language)
        
        # Convert currency
        if 'price' in content:
            original_currency = Currency(content.get('currency', 'USD'))
            exchange = await self.convert_currency(
                Decimal(str(content['price'])),
                original_currency,
                country.currency
            )
            local_price = Decimal(str(content['price'])) * exchange.rate
            formatted_price = self.format_currency(
                local_price,
                country.currency,
                f"{target_language.value}_{target_country}"
            )
        else:
            local_price = Decimal("0")
            formatted_price = ""
        
        # Format dates
        if 'date' in content:
            date_obj = datetime.fromisoformat(content['date'])
            formatted_date = self.format_date(date_obj, target_country)
        else:
            formatted_date = ""
        
        # Create localized content
        localized = LocalizedContent(
            content_id=content.get('id', ''),
            language=target_language,
            title=translated.get('title', ''),
            description=translated.get('description', ''),
            currency=country.currency,
            price=local_price,
            formatted_price=formatted_price,
            date_format=self.localization_rules["date_formats"].get(
                target_country, "YYYY-MM-DD"
            ),
            formatted_date=formatted_date,
            images=content.get('images', []),
            metadata={
                'original_content': content,
                'country': target_country,
                'timezone': country.timezone,
                'tax_rate': country.tax_rate,
                'tourist_tax': country.tourist_tax
            }
        )
        
        return localized
    
    def get_country_requirements(
        self,
        origin_country: str,
        destination_country: str
    ) -> Dict[str, Any]:
        """Get travel requirements between countries"""
        
        dest = self.countries.get(destination_country, self.countries["US"])
        
        # Check visa requirements
        visa_requirement = dest.visa_policy.get(origin_country, "VISA_REQUIRED")
        
        requirements = {
            "visa": visa_requirement,
            "passport_validity": "6_months",  # Most countries require 6 months
            "vaccinations": self._get_vaccination_requirements(destination_country),
            "travel_insurance": self._is_insurance_required(destination_country),
            "covid_requirements": self._get_covid_requirements(destination_country),
            "customs_allowances": {
                "duty_free_limit": 800,  # USD equivalent
                "alcohol": "1L",
                "tobacco": "200 cigarettes",
                "currency_declaration": 10000  # USD equivalent
            },
            "prohibited_items": [
                "Drugs", "Weapons", "Endangered species products",
                "Counterfeit goods", "Some food products"
            ],
            "emergency_contacts": dest.emergency_numbers,
            "embassy_info": self._get_embassy_info(origin_country, destination_country)
        }
        
        return requirements
    
    def _get_vaccination_requirements(self, country: str) -> List[str]:
        """Get vaccination requirements for country"""
        
        # Simplified - in production, use comprehensive database
        tropical_countries = ["BR", "IN", "TH", "VN", "KE", "TZ", "NG"]
        
        requirements = []
        
        if country in tropical_countries:
            requirements.extend([
                "Yellow Fever",
                "Hepatitis A",
                "Typhoid",
                "Malaria prophylaxis recommended"
            ])
        
        # COVID-19 for all countries
        requirements.append("COVID-19 (check current requirements)")
        
        return requirements
    
    def _is_insurance_required(self, country: str) -> bool:
        """Check if travel insurance is mandatory"""
        
        # Countries requiring travel insurance
        insurance_required = ["CU", "RU", "IR", "AE", "TH", "EC"]
        return country in insurance_required
    
    def _get_covid_requirements(self, country: str) -> Dict[str, Any]:
        """Get COVID-19 requirements for country"""
        
        # Simplified - in production, fetch from live API
        return {
            "vaccination_required": False,  # Most countries have lifted requirements
            "test_required": False,
            "quarantine_required": False,
            "health_declaration": True,
            "mask_required": False,
            "app_required": False,
            "last_updated": datetime.now().isoformat()
        }
    
    def _get_embassy_info(self, origin: str, destination: str) -> Dict[str, str]:
        """Get embassy contact information"""
        
        # Mock data - in production, use embassy database
        return {
            "address": f"{origin} Embassy in {destination}",
            "phone": "+1-234-567-8900",
            "emergency_phone": "+1-234-567-8901",
            "email": f"embassy.{destination.lower()}@{origin.lower()}.gov",
            "website": f"https://www.{origin.lower()}.embassy.gov/{destination.lower()}"
        }
    
    async def calculate_total_cost_local_currency(
        self,
        base_price: Decimal,
        base_currency: Currency,
        destination_country: str,
        include_taxes: bool = True,
        include_fees: bool = True
    ) -> Dict[str, Any]:
        """Calculate total cost in local currency including taxes and fees"""
        
        country = self.countries.get(destination_country, self.countries["US"])
        
        # Convert to local currency
        exchange = await self.convert_currency(
            base_price,
            base_currency,
            country.currency,
            include_fee=include_fees
        )
        
        local_price = base_price * exchange.rate
        
        # Calculate taxes
        tax_amount = Decimal("0")
        if include_taxes:
            tax_amount = local_price * Decimal(str(country.tax_rate))
            if country.tourist_tax:
                tax_amount += Decimal(str(country.tourist_tax))
        
        # Calculate fees
        fee_amount = Decimal("0")
        if include_fees:
            # Platform fee (3%)
            platform_fee = local_price * Decimal("0.03")
            # Payment processing fee (2%)
            processing_fee = local_price * Decimal("0.02")
            fee_amount = platform_fee + processing_fee
        
        total = local_price + tax_amount + fee_amount
        
        return {
            "base_price": float(local_price),
            "tax_amount": float(tax_amount),
            "fee_amount": float(fee_amount),
            "total": float(total),
            "currency": country.currency.value,
            "formatted_total": self.format_currency(
                total,
                country.currency,
                f"{country.languages[0].value}_{destination_country}"
            ),
            "breakdown": {
                "base": self.format_currency(local_price, country.currency),
                "taxes": self.format_currency(tax_amount, country.currency),
                "fees": self.format_currency(fee_amount, country.currency)
            },
            "exchange_rate": float(exchange.rate),
            "original_amount": f"{base_price} {base_currency.value}"
        }
    
    def get_payment_methods(self, country_code: str) -> List[PaymentMethod]:
        """Get available payment methods for country"""
        
        country = self.countries.get(country_code, self.countries["US"])
        return country.payment_methods
    
    def validate_phone_number(self, phone: str, country_code: str) -> bool:
        """Validate phone number format for country"""
        
        country = self.countries.get(country_code)
        if not country:
            return False
        
        # Remove spaces and dashes
        clean_phone = re.sub(r'[\s\-\(\)]', '', phone)
        
        # Check if starts with country code
        if not clean_phone.startswith(country.phone_code.replace('+', '')):
            clean_phone = country.phone_code.replace('+', '') + clean_phone
        
        # Validate length (simplified)
        min_length = 10
        max_length = 15
        
        return min_length <= len(clean_phone) <= max_length
    
    def format_address(
        self,
        address_components: Dict[str, str],
        country_code: str
    ) -> str:
        """Format address according to country conventions"""
        
        formats = self.localization_rules["address_formats"]
        
        if country_code == "US":
            template = formats["US"]
        elif country_code == "UK":
            template = formats["UK"]
        elif country_code == "JP":
            template = formats["JP"]
        else:
            template = formats["US"]  # Default
        
        # Format address
        formatted = template
        for key, value in address_components.items():
            formatted = formatted.replace(f"{{{key}}}", value or "")
        
        # Clean up empty lines
        lines = [line.strip() for line in formatted.split('\n') if line.strip()]
        return '\n'.join(lines)


class GlobalSearchOptimizer:
    """
    Optimize search results for different regions
    """
    
    def __init__(self, international_manager: InternationalManager):
        self.intl_manager = international_manager
    
    async def optimize_search_results(
        self,
        results: List[Dict[str, Any]],
        user_country: str,
        user_language: Language
    ) -> List[Dict[str, Any]]:
        """Optimize and localize search results"""
        
        optimized = []
        
        for result in results:
            # Localize content
            localized = await self.intl_manager.localize_content(
                result,
                user_country,
                user_language
            )
            
            # Calculate relevance score
            relevance_score = self._calculate_relevance(
                result,
                user_country,
                user_language
            )
            
            optimized_result = {
                **localized.__dict__,
                'relevance_score': relevance_score,
                'original_id': result.get('id')
            }
            
            optimized.append(optimized_result)
        
        # Sort by relevance
        optimized.sort(key=lambda x: x['relevance_score'], reverse=True)
        
        return optimized
    
    def _calculate_relevance(
        self,
        result: Dict[str, Any],
        user_country: str,
        user_language: Language
    ) -> float:
        """Calculate relevance score for user's region"""
        
        score = 50.0
        
        # Boost if destination is nearby
        if result.get('country') == user_country:
            score += 20
        elif result.get('region') == self._get_region(user_country):
            score += 10
        
        # Boost if content is in user's language
        if result.get('language') == user_language.value:
            score += 15
        
        # Boost based on popularity in region
        regional_popularity = result.get('regional_popularity', {})
        if user_country in regional_popularity:
            score += regional_popularity[user_country] * 10
        
        # Seasonal relevance
        if self._is_seasonally_relevant(result, user_country):
            score += 10
        
        return min(100, score)
    
    def _get_region(self, country_code: str) -> str:
        """Get region for country"""
        
        regions = {
            "US": "North America",
            "CA": "North America",
            "MX": "North America",
            "BR": "South America",
            "AR": "South America",
            "UK": "Europe",
            "FR": "Europe",
            "DE": "Europe",
            "ES": "Europe",
            "IT": "Europe",
            "JP": "Asia",
            "CN": "Asia",
            "IN": "Asia",
            "AU": "Oceania",
            "NZ": "Oceania",
            "ZA": "Africa",
            "EG": "Africa",
            "NG": "Africa"
        }
        
        return regions.get(country_code, "Unknown")
    
    def _is_seasonally_relevant(
        self,
        result: Dict[str, Any],
        user_country: str
    ) -> bool:
        """Check if result is seasonally relevant"""
        
        # Get current season for user's location
        now = datetime.now()
        month = now.month
        
        # Determine hemisphere
        northern_hemisphere = user_country in ["US", "UK", "FR", "DE", "JP", "CN"]
        
        if northern_hemisphere:
            if month in [12, 1, 2]:
                season = "winter"
            elif month in [3, 4, 5]:
                season = "spring"
            elif month in [6, 7, 8]:
                season = "summer"
            else:
                season = "fall"
        else:
            # Reversed for southern hemisphere
            if month in [12, 1, 2]:
                season = "summer"
            elif month in [3, 4, 5]:
                season = "fall"
            elif month in [6, 7, 8]:
                season = "winter"
            else:
                season = "spring"
        
        # Check if result matches season
        result_seasons = result.get('best_seasons', [])
        return season in result_seasons


class ComplianceManager:
    """
    Manage legal and regulatory compliance across regions
    """
    
    def __init__(self):
        self.gdpr_countries = self._get_gdpr_countries()
        self.data_residency_requirements = self._load_data_residency()
    
    def _get_gdpr_countries(self) -> List[str]:
        """Get list of GDPR countries"""
        
        # EU countries + EEA
        return [
            "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
            "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
            "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO"
        ]
    
    def _load_data_residency(self) -> Dict[str, str]:
        """Load data residency requirements"""
        
        return {
            "RU": "russia",  # Data must be stored in Russia
            "CN": "china",   # Data must be stored in China
            "AU": "australia",  # Personal data should stay in Australia
            "CA": "canada",  # Some data must stay in Canada
            "IN": "india",   # Payment data must stay in India
        }
    
    def check_gdpr_compliance(self, country_code: str) -> Dict[str, Any]:
        """Check GDPR compliance requirements"""
        
        is_gdpr = country_code in self.gdpr_countries
        
        requirements = {
            "gdpr_applies": is_gdpr,
            "consent_required": is_gdpr,
            "right_to_be_forgotten": is_gdpr,
            "data_portability": is_gdpr,
            "privacy_by_design": is_gdpr,
            "dpo_required": is_gdpr,  # Data Protection Officer
            "breach_notification": "72_hours" if is_gdpr else "reasonable_time",
            "age_of_consent": 16 if is_gdpr else 13,
            "cookie_consent": is_gdpr,
            "privacy_policy_requirements": [
                "Clear and plain language",
                "Lawful basis for processing",
                "Data retention periods",
                "Third-party sharing",
                "User rights",
                "Contact information"
            ] if is_gdpr else ["Basic privacy policy"]
        }
        
        return requirements
    
    def check_data_residency(self, country_code: str) -> Dict[str, Any]:
        """Check data residency requirements"""
        
        residency_required = country_code in self.data_residency_requirements
        
        return {
            "residency_required": residency_required,
            "location": self.data_residency_requirements.get(country_code, "any"),
            "data_types_affected": self._get_affected_data_types(country_code),
            "exceptions": self._get_residency_exceptions(country_code)
        }
    
    def _get_affected_data_types(self, country_code: str) -> List[str]:
        """Get data types affected by residency requirements"""
        
        if country_code == "IN":
            return ["payment_data", "financial_records"]
        elif country_code in ["RU", "CN"]:
            return ["personal_data", "user_generated_content", "communications"]
        else:
            return ["personal_data"]
    
    def _get_residency_exceptions(self, country_code: str) -> List[str]:
        """Get exceptions to data residency requirements"""
        
        if country_code == "CA":
            return ["Anonymized data", "Publicly available data"]
        else:
            return []
    
    def get_marketing_regulations(self, country_code: str) -> Dict[str, Any]:
        """Get marketing and advertising regulations"""
        
        regulations = {
            "email_marketing": {
                "opt_in_required": country_code in self.gdpr_countries or country_code == "CA",
                "unsubscribe_required": True,
                "sender_identification": True
            },
            "sms_marketing": {
                "opt_in_required": True,
                "time_restrictions": country_code == "US",  # TCPA restrictions
                "quiet_hours": "21:00-09:00" if country_code == "US" else None
            },
            "cookie_tracking": {
                "consent_required": country_code in self.gdpr_countries,
                "categories": ["Essential", "Functional", "Analytics", "Marketing"]
            },
            "price_display": {
                "include_tax": country_code in ["UK", "EU", "AU"],
                "currency_required": True,
                "fees_disclosure": True
            }
        }
        
        return regulations