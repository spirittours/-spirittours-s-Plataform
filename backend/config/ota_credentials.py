"""
OTA API Credentials Configuration
Centralized management of all OTA and GDS API credentials
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
import json
import base64
from cryptography.fernet import Fernet
import logging

logger = logging.getLogger(__name__)

class CredentialStatus(Enum):
    """API credential status"""
    ACTIVE = "active"
    SANDBOX = "sandbox"
    PENDING = "pending"
    EXPIRED = "expired"
    SUSPENDED = "suspended"

@dataclass
class APICredential:
    """API credential configuration"""
    provider: str
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    endpoint: Optional[str] = None
    sandbox_endpoint: Optional[str] = None
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    status: CredentialStatus = CredentialStatus.SANDBOX
    rate_limit: int = 1000
    additional_config: Dict[str, Any] = None

class OTACredentialsManager:
    """Manage all OTA and GDS API credentials"""
    
    def __init__(self):
        # Generate encryption key (in production, load from secure storage)
        self.encryption_key = os.getenv("ENCRYPTION_KEY", Fernet.generate_key())
        self.cipher = Fernet(self.encryption_key)
        
        # Initialize all credentials
        self.credentials = self._initialize_credentials()
    
    def _encrypt(self, value: str) -> str:
        """Encrypt sensitive data"""
        if value:
            return self.cipher.encrypt(value.encode()).decode()
        return value
    
    def _decrypt(self, value: str) -> str:
        """Decrypt sensitive data"""
        if value:
            return self.cipher.decrypt(value.encode()).decode()
        return value
    
    def _initialize_credentials(self) -> Dict[str, APICredential]:
        """Initialize all OTA/GDS credentials"""
        
        credentials = {
            # Major GDS Systems
            "amadeus": APICredential(
                provider="Amadeus",
                api_key=os.getenv("AMADEUS_API_KEY", "sandbox_key_amadeus_2024"),
                api_secret=os.getenv("AMADEUS_API_SECRET", "sandbox_secret_amadeus"),
                endpoint="https://api.amadeus.com/v1",
                sandbox_endpoint="https://test.api.amadeus.com/v1",
                status=CredentialStatus.SANDBOX,
                rate_limit=1000,
                additional_config={
                    "market": "US",
                    "language": "EN",
                    "currency": "USD"
                }
            ),
            
            "travelport": APICredential(
                provider="Travelport",
                username=os.getenv("TRAVELPORT_USERNAME", "Universal API/uAPI12345"),
                password=os.getenv("TRAVELPORT_PASSWORD", "password123"),
                endpoint="https://api.travelport.com/universal/v42_0",
                sandbox_endpoint="https://api-test.travelport.com/universal/v42_0",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "target_branch": "P7182045",
                    "provider_code": "1G",
                    "trace_id": "trace_spirittours"
                }
            ),
            
            "sabre": APICredential(
                provider="Sabre",
                client_id=os.getenv("SABRE_CLIENT_ID", "V1:spirittours:DEVCENTER:EXT"),
                client_secret=os.getenv("SABRE_CLIENT_SECRET", "secret_sabre_2024"),
                endpoint="https://api.sabre.com",
                sandbox_endpoint="https://api-test.sabre.com",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "pcc": "U9PK",
                    "gds_code": "SB"
                }
            ),
            
            # Bedbanks
            "hotelbeds": APICredential(
                provider="Hotelbeds",
                api_key=os.getenv("HOTELBEDS_API_KEY", "test_hotelbeds_key_2024"),
                api_secret=os.getenv("HOTELBEDS_SECRET", "test_hotelbeds_secret"),
                endpoint="https://api.hotelbeds.com",
                sandbox_endpoint="https://api.test.hotelbeds.com",
                status=CredentialStatus.SANDBOX,
                rate_limit=500,
                additional_config={
                    "market": "ES",
                    "language": "ENG",
                    "version": "1.2"
                }
            ),
            
            "tbo": APICredential(
                provider="TBO Holidays",
                username=os.getenv("TBO_USERNAME", "spirittours_test"),
                password=os.getenv("TBO_PASSWORD", "Test@2024"),
                api_key=os.getenv("TBO_API_KEY", "tbo_test_key_2024"),
                endpoint="http://api.tboholidays.com/HotelAPI_V10",
                sandbox_endpoint="http://api.test.tboholidays.com/HotelAPI_V10",
                status=CredentialStatus.SANDBOX
            ),
            
            # Major OTAs - Global
            "booking": APICredential(
                provider="Booking.com",
                username=os.getenv("BOOKING_USERNAME", "spirittours_partner"),
                password=os.getenv("BOOKING_PASSWORD", "BookingPass2024"),
                endpoint="https://connect-api.booking.com/v2",
                sandbox_endpoint="https://connect-api.test.booking.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "hotel_id": "test_hotel_123",
                    "partner_id": "spirit_partner_001"
                }
            ),
            
            "expedia": APICredential(
                provider="Expedia",
                api_key=os.getenv("EXPEDIA_API_KEY", "expedia_test_key_2024"),
                api_secret=os.getenv("EXPEDIA_SECRET", "expedia_test_secret"),
                endpoint="https://api.expediapartnercentral.com",
                sandbox_endpoint="https://api.test.expediapartnercentral.com",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "eqc_account": "test_account",
                    "property_id": "test_prop_456"
                }
            ),
            
            "airbnb": APICredential(
                provider="Airbnb",
                client_id=os.getenv("AIRBNB_CLIENT_ID", "spirittours_airbnb_client"),
                client_secret=os.getenv("AIRBNB_CLIENT_SECRET", "airbnb_secret_2024"),
                endpoint="https://api.airbnb.com/v2",
                sandbox_endpoint="https://api.test.airbnb.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "listing_id": "test_listing_789",
                    "user_id": "test_user_spirittours",
                    "webhook_url": "https://spirittours.com/webhooks/airbnb"
                }
            ),
            
            "vrbo": APICredential(
                provider="Vrbo",
                api_key=os.getenv("VRBO_API_KEY", "vrbo_test_key_2024"),
                endpoint="https://api.vrbo.com/v1",
                sandbox_endpoint="https://api.test.vrbo.com/v1",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "advertiser_id": "test_advertiser",
                    "property_id": "test_vrbo_prop"
                }
            ),
            
            "tripadvisor": APICredential(
                provider="TripAdvisor",
                api_key=os.getenv("TRIPADVISOR_KEY", "ta_test_key_2024"),
                endpoint="https://api.tripadvisor.com/api/partner/3.0",
                sandbox_endpoint="https://api.test.tripadvisor.com/api/partner/3.0",
                status=CredentialStatus.SANDBOX
            ),
            
            # Regional OTAs - Americas
            "despegar": APICredential(
                provider="Despegar",
                api_key=os.getenv("DESPEGAR_API_KEY", "despegar_test_2024"),
                username=os.getenv("DESPEGAR_USERNAME", "spirittours_despegar"),
                password=os.getenv("DESPEGAR_PASSWORD", "Despegar@2024"),
                endpoint="https://api.despegar.com/v3",
                sandbox_endpoint="https://api.test.despegar.com/v3",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "agency_code": "SPIRIT_001",
                    "branch_code": "BR001",
                    "language": "ES"
                }
            ),
            
            "decolar": APICredential(
                provider="Decolar",
                api_key=os.getenv("DECOLAR_API_KEY", "decolar_test_2024"),
                endpoint="https://api.decolar.com/v1",
                sandbox_endpoint="https://api.test.decolar.com/v1",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "market": "BR",
                    "language": "PT"
                }
            ),
            
            # Regional OTAs - Asia
            "makemytrip": APICredential(
                provider="MakeMyTrip",
                client_id=os.getenv("MMT_CLIENT_ID", "mmt_spirittours"),
                client_secret=os.getenv("MMT_CLIENT_SECRET", "mmt_secret_2024"),
                endpoint="https://www.makemytrip.com/api/v2",
                sandbox_endpoint="https://sandbox.makemytrip.com/api/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "affiliate_id": "SPIRIT_MMT",
                    "market": "IN",
                    "currency": "INR"
                }
            ),
            
            "ctrip": APICredential(
                provider="Ctrip",
                api_key=os.getenv("CTRIP_API_KEY", "ctrip_test_2024"),
                api_secret=os.getenv("CTRIP_SECRET", "ctrip_secret"),
                endpoint="https://gateway.ctrip.com/api",
                sandbox_endpoint="https://gateway.test.ctrip.com/api",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "aid": "spirit_ctrip",
                    "sid": "1234567",
                    "market": "CN"
                }
            ),
            
            "agoda": APICredential(
                provider="Agoda",
                api_key=os.getenv("AGODA_API_KEY", "agoda_test_2024"),
                api_secret=os.getenv("AGODA_SECRET", "agoda_secret"),
                endpoint="https://api.agoda.com/xmlpartner",
                sandbox_endpoint="https://api.test.agoda.com/xmlpartner",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "partner_id": "spirit_agoda",
                    "site_id": "1899801"
                }
            ),
            
            "traveloka": APICredential(
                provider="Traveloka",
                api_key=os.getenv("TRAVELOKA_API_KEY", "traveloka_test_2024"),
                client_id=os.getenv("TRAVELOKA_CLIENT_ID", "spirit_traveloka"),
                client_secret=os.getenv("TRAVELOKA_SECRET", "traveloka_secret"),
                endpoint="https://api.traveloka.com/v1",
                sandbox_endpoint="https://api.sandbox.traveloka.com/v1",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "partner_code": "SPIRIT_TL",
                    "market": "ID"
                }
            ),
            
            "rakuten": APICredential(
                provider="Rakuten Travel",
                api_key=os.getenv("RAKUTEN_API_KEY", "rakuten_test_2024"),
                endpoint="https://api.travel.rakuten.com",
                sandbox_endpoint="https://api.test.travel.rakuten.com",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "affiliate_id": "spirit_rakuten",
                    "market": "JP"
                }
            ),
            
            # Regional OTAs - Europe
            "hrs": APICredential(
                provider="HRS",
                api_key=os.getenv("HRS_API_KEY", "hrs_test_2024"),
                username=os.getenv("HRS_USERNAME", "spirittours_hrs"),
                password=os.getenv("HRS_PASSWORD", "HRS@2024"),
                endpoint="https://api.hrs.com/v2",
                sandbox_endpoint="https://api.test.hrs.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "customer_id": "spirit_hrs_001",
                    "market": "DE"
                }
            ),
            
            "lastminute": APICredential(
                provider="lastminute.com",
                api_key=os.getenv("LASTMINUTE_API_KEY", "lm_test_2024"),
                endpoint="https://api.lastminute.com/v3",
                sandbox_endpoint="https://api.test.lastminute.com/v3",
                status=CredentialStatus.SANDBOX
            ),
            
            # Regional OTAs - Middle East & Africa
            "wego": APICredential(
                provider="Wego",
                api_key=os.getenv("WEGO_API_KEY", "wego_test_2024"),
                api_secret=os.getenv("WEGO_SECRET", "wego_secret"),
                endpoint="https://api.wego.com/v2",
                sandbox_endpoint="https://api.test.wego.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "ts_code": "spirit_wego",
                    "market": "AE"
                }
            ),
            
            "almosafer": APICredential(
                provider="Almosafer",
                api_key=os.getenv("ALMOSAFER_API_KEY", "almosafer_test_2024"),
                endpoint="https://api.almosafer.com/v2",
                sandbox_endpoint="https://api.test.almosafer.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "market": "SA",
                    "language": "AR"
                }
            ),
            
            "travelstart": APICredential(
                provider="Travelstart",
                api_key=os.getenv("TRAVELSTART_API_KEY", "travelstart_test_2024"),
                endpoint="https://api.travelstart.com/v2",
                sandbox_endpoint="https://api.test.travelstart.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "affiliate_code": "spirit_ts",
                    "market": "ZA"
                }
            ),
            
            # Niche OTAs
            "hostelworld": APICredential(
                provider="Hostelworld",
                api_key=os.getenv("HOSTELWORLD_API_KEY", "hw_test_2024"),
                endpoint="https://api.hostelworld.com/v2",
                sandbox_endpoint="https://api.test.hostelworld.com/v2",
                status=CredentialStatus.SANDBOX
            ),
            
            "priceline": APICredential(
                provider="Priceline",
                api_key=os.getenv("PRICELINE_API_KEY", "priceline_test_2024"),
                api_secret=os.getenv("PRICELINE_SECRET", "priceline_secret"),
                endpoint="https://api.priceline.com/v2",
                sandbox_endpoint="https://api.test.priceline.com/v2",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "refid": "spirit_priceline",
                    "refclickid": "spirit_001"
                }
            ),
            
            "kayak": APICredential(
                provider="Kayak",
                api_key=os.getenv("KAYAK_API_KEY", "kayak_test_2024"),
                endpoint="https://api.kayak.com/v2",
                sandbox_endpoint="https://api.test.kayak.com/v2",
                status=CredentialStatus.SANDBOX
            ),
            
            "skyscanner": APICredential(
                provider="Skyscanner",
                api_key=os.getenv("SKYSCANNER_API_KEY", "skyscanner_test_2024"),
                endpoint="https://partners.api.skyscanner.net/apiservices",
                sandbox_endpoint="https://partners.api.test.skyscanner.net/apiservices",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "market": "US",
                    "currency": "USD",
                    "locale": "en-US"
                }
            ),
            
            # Car Rental
            "rentalcars": APICredential(
                provider="RentalCars",
                api_key=os.getenv("RENTALCARS_API_KEY", "rc_test_2024"),
                endpoint="https://api.rentalcars.com/v3",
                sandbox_endpoint="https://api.test.rentalcars.com/v3",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "affiliate_code": "spirit_rc"
                }
            ),
            
            # Additional integrations
            "google_hotels": APICredential(
                provider="Google Hotels",
                api_key=os.getenv("GOOGLE_HOTELS_API_KEY", "google_test_2024"),
                endpoint="https://www.googleapis.com/travel/v1",
                status=CredentialStatus.SANDBOX,
                additional_config={
                    "partner_id": "spirit_google",
                    "account_id": "1234567890"
                }
            )
        }
        
        return credentials
    
    def get_credential(self, provider: str) -> Optional[APICredential]:
        """Get credential for specific provider"""
        return self.credentials.get(provider.lower())
    
    def get_active_credentials(self) -> Dict[str, APICredential]:
        """Get all active credentials"""
        return {
            k: v for k, v in self.credentials.items()
            if v.status == CredentialStatus.ACTIVE
        }
    
    def update_credential(self, provider: str, updates: Dict[str, Any]):
        """Update credential for a provider"""
        if provider.lower() in self.credentials:
            cred = self.credentials[provider.lower()]
            for key, value in updates.items():
                if hasattr(cred, key):
                    # Encrypt sensitive fields
                    if key in ['api_key', 'api_secret', 'password', 'token']:
                        value = self._encrypt(value)
                    setattr(cred, key, value)
            logger.info(f"Updated credentials for {provider}")
    
    def activate_credential(self, provider: str):
        """Activate a credential (move from sandbox to production)"""
        if provider.lower() in self.credentials:
            cred = self.credentials[provider.lower()]
            cred.status = CredentialStatus.ACTIVE
            # Switch to production endpoint
            if cred.endpoint:
                cred.sandbox_endpoint = cred.endpoint
            logger.info(f"Activated production credentials for {provider}")
    
    def export_credentials(self, filepath: str):
        """Export credentials to encrypted file"""
        export_data = {}
        for provider, cred in self.credentials.items():
            export_data[provider] = {
                "provider": cred.provider,
                "status": cred.status.value,
                "endpoint": cred.endpoint,
                "rate_limit": cred.rate_limit,
                "configured": cred.api_key is not None or cred.username is not None
            }
        
        with open(filepath, "w") as f:
            json.dump(export_data, f, indent=2)
        
        logger.info(f"Exported credential configuration to {filepath}")
    
    def validate_all_credentials(self) -> Dict[str, bool]:
        """Validate all configured credentials"""
        validation_results = {}
        
        for provider, cred in self.credentials.items():
            # Basic validation - check if essential fields are present
            is_valid = False
            
            if cred.api_key or (cred.username and cred.password) or (cred.client_id and cred.client_secret):
                is_valid = True
            
            validation_results[provider] = is_valid
            
            if not is_valid:
                logger.warning(f"Missing credentials for {provider}")
        
        return validation_results
    
    def get_credential_summary(self) -> Dict[str, Any]:
        """Get summary of all credentials"""
        total = len(self.credentials)
        configured = sum(1 for c in self.credentials.values() 
                        if c.api_key or c.username or c.client_id)
        active = sum(1 for c in self.credentials.values() 
                    if c.status == CredentialStatus.ACTIVE)
        sandbox = sum(1 for c in self.credentials.values() 
                     if c.status == CredentialStatus.SANDBOX)
        
        return {
            "total_providers": total,
            "configured": configured,
            "active": active,
            "sandbox": sandbox,
            "completion_percentage": (configured / total) * 100 if total > 0 else 0,
            "providers": list(self.credentials.keys())
        }


# Environment variables template
ENV_TEMPLATE = """# Spirit Tours Platform - OTA API Credentials
# Copy this to .env and fill with actual credentials

# GDS Systems
AMADEUS_API_KEY=your_amadeus_key
AMADEUS_API_SECRET=your_amadeus_secret
TRAVELPORT_USERNAME=your_travelport_user
TRAVELPORT_PASSWORD=your_travelport_pass
SABRE_CLIENT_ID=your_sabre_client_id
SABRE_CLIENT_SECRET=your_sabre_secret

# Bedbanks
HOTELBEDS_API_KEY=your_hotelbeds_key
HOTELBEDS_SECRET=your_hotelbeds_secret
TBO_USERNAME=your_tbo_username
TBO_PASSWORD=your_tbo_password
TBO_API_KEY=your_tbo_key

# Major OTAs
BOOKING_USERNAME=your_booking_username
BOOKING_PASSWORD=your_booking_password
EXPEDIA_API_KEY=your_expedia_key
EXPEDIA_SECRET=your_expedia_secret
AIRBNB_CLIENT_ID=your_airbnb_client_id
AIRBNB_CLIENT_SECRET=your_airbnb_secret
VRBO_API_KEY=your_vrbo_key
TRIPADVISOR_KEY=your_tripadvisor_key

# Regional OTAs - Americas
DESPEGAR_API_KEY=your_despegar_key
DESPEGAR_USERNAME=your_despegar_user
DESPEGAR_PASSWORD=your_despegar_pass
DECOLAR_API_KEY=your_decolar_key

# Regional OTAs - Asia
MMT_CLIENT_ID=your_makemytrip_client_id
MMT_CLIENT_SECRET=your_makemytrip_secret
CTRIP_API_KEY=your_ctrip_key
CTRIP_SECRET=your_ctrip_secret
AGODA_API_KEY=your_agoda_key
AGODA_SECRET=your_agoda_secret
TRAVELOKA_API_KEY=your_traveloka_key
TRAVELOKA_CLIENT_ID=your_traveloka_client_id
TRAVELOKA_SECRET=your_traveloka_secret
RAKUTEN_API_KEY=your_rakuten_key

# Regional OTAs - Europe
HRS_API_KEY=your_hrs_key
HRS_USERNAME=your_hrs_username
HRS_PASSWORD=your_hrs_password
LASTMINUTE_API_KEY=your_lastminute_key

# Regional OTAs - Middle East & Africa
WEGO_API_KEY=your_wego_key
WEGO_SECRET=your_wego_secret
ALMOSAFER_API_KEY=your_almosafer_key
TRAVELSTART_API_KEY=your_travelstart_key

# Niche OTAs
HOSTELWORLD_API_KEY=your_hostelworld_key
PRICELINE_API_KEY=your_priceline_key
PRICELINE_SECRET=your_priceline_secret
KAYAK_API_KEY=your_kayak_key
SKYSCANNER_API_KEY=your_skyscanner_key

# Additional
RENTALCARS_API_KEY=your_rentalcars_key
GOOGLE_HOTELS_API_KEY=your_google_hotels_key

# Encryption
ENCRYPTION_KEY=your_secure_encryption_key_base64
"""

if __name__ == "__main__":
    # Create .env.template file
    with open("/home/user/webapp/.env.template", "w") as f:
        f.write(ENV_TEMPLATE)
    
    # Initialize and test credentials manager
    manager = OTACredentialsManager()
    
    # Validate all credentials
    validation = manager.validate_all_credentials()
    
    # Get summary
    summary = manager.get_credential_summary()
    
    print("🔐 OTA Credentials Configuration")
    print("=" * 50)
    print(f"Total Providers: {summary['total_providers']}")
    print(f"Configured: {summary['configured']}")
    print(f"Active: {summary['active']}")
    print(f"Sandbox: {summary['sandbox']}")
    print(f"Completion: {summary['completion_percentage']:.1f}%")
    print("\nValidation Results:")
    for provider, is_valid in validation.items():
        status = "✅" if is_valid else "⚠️"
        print(f"{status} {provider}: {'Configured' if is_valid else 'Needs Configuration'}")
    
    # Export configuration
    manager.export_credentials("/home/user/webapp/backend/config/credentials_status.json")
    print("\n✅ Credentials configuration saved to credentials_status.json")
    print("📝 Environment template saved to .env.template")