"""
Two-Factor Authentication (2FA) and Advanced Security System
Multi-factor authentication with TOTP, SMS, and email verification
"""

import pyotp
import qrcode
import io
import base64
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, DateTime, Boolean, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import jwt

from backend.models.rbac_models import User, Base

logger = logging.getLogger(__name__)

class TwoFactorAuth(Base):
    """Two-factor authentication table"""
    __tablename__ = 'two_factor_auth'
    
    user_id = Column(String, primary_key=True)
    secret_key = Column(String, nullable=False)  # TOTP secret
    backup_codes = Column(Text, nullable=True)   # JSON array of backup codes
    is_enabled = Column(Boolean, default=False)
    phone_number = Column(String, nullable=True)
    email_verified = Column(Boolean, default=False)
    phone_verified = Column(Boolean, default=False)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SecurityLog(Base):
    """Security events logging"""
    __tablename__ = 'security_logs'
    
    id = Column(String, primary_key=True, default=lambda: secrets.token_urlsafe(16))
    user_id = Column(String, nullable=True)
    event_type = Column(String, nullable=False)  # login_attempt, 2fa_setup, suspicious_activity
    event_details = Column(Text, nullable=True)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, default=False)
    risk_level = Column(String, default='low')  # low, medium, high, critical
    timestamp = Column(DateTime, default=datetime.utcnow)

class LoginAttempt(Base):
    """Login attempts tracking"""
    __tablename__ = 'login_attempts'
    
    id = Column(String, primary_key=True, default=lambda: secrets.token_urlsafe(16))
    username = Column(String, nullable=False)
    ip_address = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    success = Column(Boolean, default=False)
    failure_reason = Column(String, nullable=True)
    attempt_time = Column(DateTime, default=datetime.utcnow)

class SecurityManager:
    """Advanced security and 2FA manager"""
    
    def __init__(self, db: Session):
        self.db = db
        self.totp_issuer = "Spirit Tours CRM"
        self.backup_codes_count = 10
    
    # 2FA Setup and Management
    def setup_2fa(self, user_id: str, phone_number: Optional[str] = None) -> Dict[str, Any]:
        """Set up 2FA for user"""
        try:
            # Generate TOTP secret
            secret = pyotp.random_base32()
            
            # Generate backup codes
            backup_codes = [secrets.token_hex(4).upper() for _ in range(self.backup_codes_count)]
            
            # Create or update 2FA record
            twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
            if twofa:
                twofa.secret_key = secret
                twofa.backup_codes = ','.join(backup_codes)
                twofa.phone_number = phone_number
            else:
                twofa = TwoFactorAuth(
                    user_id=user_id,
                    secret_key=secret,
                    backup_codes=','.join(backup_codes),
                    phone_number=phone_number
                )
                self.db.add(twofa)
            
            self.db.commit()
            
            # Generate QR code
            user = self.db.query(User).filter_by(id=user_id).first()
            totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
                name=user.email,
                issuer_name=self.totp_issuer
            )
            
            qr_code = qrcode.QRCode(version=1, box_size=10, border=5)
            qr_code.add_data(totp_uri)
            qr_code.make(fit=True)
            
            img = qr_code.make_image(fill_color="black", back_color="white")
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            qr_code_base64 = base64.b64encode(buffered.getvalue()).decode()
            
            self.log_security_event(
                user_id=user_id,
                event_type="2fa_setup",
                event_details="2FA setup initiated",
                success=True
            )
            
            return {
                'secret_key': secret,
                'qr_code': f"data:image/png;base64,{qr_code_base64}",
                'backup_codes': backup_codes,
                'totp_uri': totp_uri
            }
            
        except Exception as e:
            logger.error(f"Error setting up 2FA: {e}")
            raise
    
    def verify_2fa_token(self, user_id: str, token: str) -> bool:
        """Verify 2FA TOTP token"""
        try:
            twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
            if not twofa or not twofa.is_enabled:
                return False
            
            # Verify TOTP token
            totp = pyotp.TOTP(twofa.secret_key)
            if totp.verify(token, valid_window=2):  # Allow 2 windows for clock drift
                twofa.last_used_at = datetime.utcnow()
                self.db.commit()
                
                self.log_security_event(
                    user_id=user_id,
                    event_type="2fa_verification",
                    event_details="2FA token verified successfully",
                    success=True
                )
                return True
            
            # Check backup codes
            if twofa.backup_codes:
                backup_codes = twofa.backup_codes.split(',')
                if token.upper() in backup_codes:
                    # Remove used backup code
                    backup_codes.remove(token.upper())
                    twofa.backup_codes = ','.join(backup_codes)
                    twofa.last_used_at = datetime.utcnow()
                    self.db.commit()
                    
                    self.log_security_event(
                        user_id=user_id,
                        event_type="2fa_backup_code_used",
                        event_details=f"Backup code used: {token.upper()[:4]}****",
                        success=True
                    )
                    return True
            
            self.log_security_event(
                user_id=user_id,
                event_type="2fa_verification_failed",
                event_details="Invalid 2FA token provided",
                success=False,
                risk_level="medium"
            )
            return False
            
        except Exception as e:
            logger.error(f"Error verifying 2FA token: {e}")
            return False
    
    def enable_2fa(self, user_id: str, verification_token: str) -> bool:
        """Enable 2FA after successful verification"""
        try:
            if self.verify_2fa_token(user_id, verification_token):
                twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
                twofa.is_enabled = True
                self.db.commit()
                
                self.log_security_event(
                    user_id=user_id,
                    event_type="2fa_enabled",
                    event_details="2FA successfully enabled",
                    success=True
                )
                return True
                
            return False
            
        except Exception as e:
            logger.error(f"Error enabling 2FA: {e}")
            return False
    
    def disable_2fa(self, user_id: str) -> bool:
        """Disable 2FA for user"""
        try:
            twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
            if twofa:
                twofa.is_enabled = False
                self.db.commit()
                
                self.log_security_event(
                    user_id=user_id,
                    event_type="2fa_disabled",
                    event_details="2FA disabled by user",
                    success=True,
                    risk_level="medium"
                )
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error disabling 2FA: {e}")
            return False
    
    def regenerate_backup_codes(self, user_id: str) -> List[str]:
        """Regenerate backup codes for user"""
        try:
            twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
            if not twofa:
                raise ValueError("2FA not set up for user")
            
            # Generate new backup codes
            backup_codes = [secrets.token_hex(4).upper() for _ in range(self.backup_codes_count)]
            twofa.backup_codes = ','.join(backup_codes)
            self.db.commit()
            
            self.log_security_event(
                user_id=user_id,
                event_type="backup_codes_regenerated",
                event_details="Backup codes regenerated",
                success=True
            )
            
            return backup_codes
            
        except Exception as e:
            logger.error(f"Error regenerating backup codes: {e}")
            raise
    
    def is_2fa_required(self, user: User) -> bool:
        """Check if 2FA is required for user based on role"""
        # Roles that require 2FA (high-privilege roles)
        required_2fa_roles = [
            'CEO', 'COO', 'CFO', 'CTO',
            'Director de Operaciones', 'Director Financiero',
            'Director de Tecnología', 'Director de Ventas',
            'Gerente General', 'Administrador del Sistema',
            'Super Administrador'
        ]
        
        return any(role.name in required_2fa_roles for role in user.roles)
    
    def force_2fa_setup(self, user_id: str) -> bool:
        """Force 2FA setup for user (Admin function)"""
        try:
            user = self.db.query(User).filter_by(id=user_id).first()
            if not user:
                return False
            
            user.force_password_change = True  # Force user to set up 2FA on next login
            self.db.commit()
            
            self.log_security_event(
                user_id=user_id,
                event_type="2fa_setup_forced",
                event_details="2FA setup forced by administrator",
                success=True,
                risk_level="medium"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error forcing 2FA setup: {e}")
            return False
    
    # Security Monitoring Methods
    def log_security_event(self, user_id: str, event_type: str, event_details: str,
                          success: bool = True, risk_level: str = "low",
                          ip_address: str = None, user_agent: str = None):
        """Log security event"""
        try:
            security_log = SecurityLog(
                user_id=user_id,
                event_type=event_type,
                event_details=event_details,
                success=success,
                risk_level=risk_level,
                ip_address=ip_address,
                user_agent=user_agent
            )
            
            self.db.add(security_log)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def log_login_attempt(self, username: str, ip_address: str, success: bool,
                         failure_reason: str = None, user_agent: str = None):
        """Log login attempt"""
        try:
            login_attempt = LoginAttempt(
                username=username,
                ip_address=ip_address,
                success=success,
                failure_reason=failure_reason,
                user_agent=user_agent
            )
            
            self.db.add(login_attempt)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging login attempt: {e}")
    
    def get_user_security_events(self, user_id: str, days: int = 30) -> List[SecurityLog]:
        """Get security events for user"""
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            events = self.db.query(SecurityLog).filter(
                SecurityLog.user_id == user_id,
                SecurityLog.timestamp >= start_date
            ).order_by(SecurityLog.timestamp.desc()).all()
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting user security events: {e}")
            return []
    
    def get_user_login_attempts(self, username: str, days: int = 30) -> List[LoginAttempt]:
        """Get login attempts for user"""
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            attempts = self.db.query(LoginAttempt).filter(
                LoginAttempt.username == username,
                LoginAttempt.attempt_time >= start_date
            ).order_by(LoginAttempt.attempt_time.desc()).all()
            
            return attempts
            
        except Exception as e:
            logger.error(f"Error getting user login attempts: {e}")
            return []
    
    def get_security_overview(self) -> Dict[str, Any]:
        """Get system-wide security overview"""
        try:
            from datetime import timedelta
            
            # Get recent security events
            recent_events = self.db.query(SecurityLog).filter(
                SecurityLog.timestamp >= datetime.utcnow() - timedelta(days=7)
            ).all()
            
            # Get recent login attempts
            recent_attempts = self.db.query(LoginAttempt).filter(
                LoginAttempt.attempt_time >= datetime.utcnow() - timedelta(days=7)
            ).all()
            
            # Get 2FA statistics
            total_users = self.db.query(User).count()
            users_with_2fa = self.db.query(TwoFactorAuth).filter(
                TwoFactorAuth.is_enabled == True
            ).count()
            
            return {
                "security_events": {
                    "total_events": len(recent_events),
                    "high_risk_events": len([e for e in recent_events if e.risk_level == "high"]),
                    "medium_risk_events": len([e for e in recent_events if e.risk_level == "medium"]),
                    "low_risk_events": len([e for e in recent_events if e.risk_level == "low"])
                },
                "login_attempts": {
                    "total_attempts": len(recent_attempts),
                    "successful_attempts": len([a for a in recent_attempts if a.success]),
                    "failed_attempts": len([a for a in recent_attempts if not a.success])
                },
                "two_factor_auth": {
                    "total_users": total_users,
                    "users_with_2fa": users_with_2fa,
                    "2fa_adoption_rate": round((users_with_2fa / max(total_users, 1)) * 100, 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting security overview: {e}")
            return {}
    
    def get_all_users_2fa_status(self) -> List[Dict[str, Any]]:
        """Get 2FA status for all users"""
        try:
            users = self.db.query(User).all()
            users_status = []
            
            for user in users:
                twofa = self.db.query(TwoFactorAuth).filter_by(user_id=str(user.id)).first()
                
                users_status.append({
                    "user_id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "is_enabled": twofa.is_enabled if twofa else False,
                    "is_required": self.is_2fa_required(user),
                    "last_used": twofa.last_used_at.isoformat() if twofa and twofa.last_used_at else None
                })
            
            return users_status
            
        except Exception as e:
            logger.error(f"Error getting all users 2FA status: {e}")
            return []
    
    def get_high_risk_events(self, days: int = 7) -> List[SecurityLog]:
        """Get high-risk security events"""
        try:
            from datetime import timedelta
            start_date = datetime.utcnow() - timedelta(days=days)
            
            events = self.db.query(SecurityLog).filter(
                SecurityLog.timestamp >= start_date,
                SecurityLog.risk_level.in_(["high", "critical"])
            ).order_by(SecurityLog.timestamp.desc()).all()
            
            return events
            
        except Exception as e:
            logger.error(f"Error getting high-risk events: {e}")
            return []
    
    # Email and SMS notification methods (placeholder for future implementation)
    def send_2fa_email_notification(self, user_email: str, verification_code: str) -> bool:
        """Send 2FA verification email (placeholder)"""
        # TODO: Implement email sending
        logger.info(f"2FA email notification sent to {user_email}")
        return True
    
    def send_2fa_sms_notification(self, phone_number: str, verification_code: str) -> bool:
        """Send 2FA verification SMS (placeholder)"""
        # TODO: Implement SMS sending
        logger.info(f"2FA SMS notification sent to {phone_number}")
        return True
    
    def disable_2fa(self, user_id: str, verification_token: str) -> bool:
        """Disable 2FA after verification"""
        try:
            if self.verify_2fa_token(user_id, verification_token):
                twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
                if twofa:
                    twofa.is_enabled = False
                    self.db.commit()
                    
                    self.log_security_event(
                        user_id=user_id,
                        event_type="2fa_disabled",
                        event_details="2FA disabled by user",
                        success=True,
                        risk_level="medium"
                    )
                    return True
            return False
            
        except Exception as e:
            logger.error(f"Error disabling 2FA: {e}")
            return False
    
    def get_2fa_status(self, user_id: str) -> Dict[str, Any]:
        """Get 2FA status for user"""
        try:
            twofa = self.db.query(TwoFactorAuth).filter_by(user_id=user_id).first()
            if not twofa:
                return {
                    'is_enabled': False,
                    'is_setup': False,
                    'phone_verified': False,
                    'email_verified': False,
                    'backup_codes_remaining': 0
                }
            
            backup_codes_count = len(twofa.backup_codes.split(',')) if twofa.backup_codes else 0
            
            return {
                'is_enabled': twofa.is_enabled,
                'is_setup': True,
                'phone_verified': twofa.phone_verified,
                'email_verified': twofa.email_verified,
                'backup_codes_remaining': backup_codes_count,
                'last_used': twofa.last_used_at.isoformat() if twofa.last_used_at else None
            }
            
        except Exception as e:
            logger.error(f"Error getting 2FA status: {e}")
            return {'is_enabled': False, 'is_setup': False}
    
    # Security Logging and Monitoring
    def log_security_event(self, event_type: str, event_details: str,
                          user_id: Optional[str] = None, ip_address: Optional[str] = None,
                          user_agent: Optional[str] = None, success: bool = True,
                          risk_level: str = 'low'):
        """Log security event"""
        try:
            security_log = SecurityLog(
                user_id=user_id,
                event_type=event_type,
                event_details=event_details,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                risk_level=risk_level
            )
            self.db.add(security_log)
            self.db.commit()
            
            # Log to file as well
            logger.info(f"Security Event: {event_type} - {event_details} - Risk: {risk_level}")
            
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def log_login_attempt(self, username: str, ip_address: str, user_agent: str,
                         success: bool, failure_reason: Optional[str] = None):
        """Log login attempt"""
        try:
            login_attempt = LoginAttempt(
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                success=success,
                failure_reason=failure_reason
            )
            self.db.add(login_attempt)
            self.db.commit()
            
        except Exception as e:
            logger.error(f"Error logging login attempt: {e}")
    
    # Advanced Security Features
    def check_suspicious_activity(self, user_id: str, ip_address: str) -> Dict[str, Any]:
        """Check for suspicious login activity"""
        try:
            # Check failed login attempts in last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            failed_attempts = self.db.query(LoginAttempt).filter(
                LoginAttempt.ip_address == ip_address,
                LoginAttempt.success == False,
                LoginAttempt.attempt_time >= one_hour_ago
            ).count()
            
            # Check login attempts from different locations
            user = self.db.query(User).filter_by(id=user_id).first()
            if user:
                recent_logins = self.db.query(LoginAttempt).filter(
                    LoginAttempt.username == user.username,
                    LoginAttempt.success == True,
                    LoginAttempt.attempt_time >= datetime.utcnow() - timedelta(days=7)
                ).all()
                
                different_ips = len(set([login.ip_address for login in recent_logins]))
            else:
                different_ips = 0
            
            # Calculate risk level
            risk_level = 'low'
            risk_factors = []
            
            if failed_attempts >= 5:
                risk_level = 'high'
                risk_factors.append(f"{failed_attempts} failed attempts in last hour")
            elif failed_attempts >= 3:
                risk_level = 'medium'
                risk_factors.append(f"{failed_attempts} failed attempts in last hour")
            
            if different_ips >= 5:
                risk_level = 'high'
                risk_factors.append(f"Login from {different_ips} different IPs in 7 days")
            elif different_ips >= 3:
                risk_level = 'medium'
                risk_factors.append(f"Login from {different_ips} different IPs in 7 days")
            
            if risk_level in ['medium', 'high']:
                self.log_security_event(
                    user_id=user_id,
                    event_type="suspicious_activity_detected",
                    event_details=f"Risk factors: {'; '.join(risk_factors)}",
                    ip_address=ip_address,
                    risk_level=risk_level
                )
            
            return {
                'risk_level': risk_level,
                'risk_factors': risk_factors,
                'failed_attempts': failed_attempts,
                'different_ips': different_ips,
                'requires_additional_verification': risk_level == 'high'
            }
            
        except Exception as e:
            logger.error(f"Error checking suspicious activity: {e}")
            return {'risk_level': 'low', 'risk_factors': []}
    
    def is_2fa_required(self, user: User) -> bool:
        """Check if 2FA is required for user based on role and permissions"""
        # 2FA required roles (from the matrix document)
        required_2fa_roles = [
            'CEO', 'COO', 'CFO', 'Gerente Administrativo',
            'Director de Operaciones', 'Director de Ventas',
            'Director de Marketing', 'Gerente de Finanzas',
            'Director de Recursos Humanos', 'CTO',
            'Asesor Legal'
        ]
        
        for role in user.roles:
            if role.name in required_2fa_roles:
                return True
        
        return False
    
    def get_security_dashboard(self, days: int = 30) -> Dict[str, Any]:
        """Get security dashboard metrics"""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            # Get security events
            security_events = self.db.query(SecurityLog).filter(
                SecurityLog.timestamp >= start_date
            ).all()
            
            # Get login attempts
            login_attempts = self.db.query(LoginAttempt).filter(
                LoginAttempt.attempt_time >= start_date
            ).all()
            
            # Get 2FA status
            total_users = self.db.query(User).filter(User.is_active == True).count()
            users_with_2fa = self.db.query(TwoFactorAuth).filter(
                TwoFactorAuth.is_enabled == True
            ).count()
            
            # Calculate metrics
            failed_logins = len([a for a in login_attempts if not a.success])
            successful_logins = len([a for a in login_attempts if a.success])
            
            high_risk_events = len([e for e in security_events if e.risk_level == 'high'])
            medium_risk_events = len([e for e in security_events if e.risk_level == 'medium'])
            
            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': days
                },
                'authentication': {
                    'total_login_attempts': len(login_attempts),
                    'successful_logins': successful_logins,
                    'failed_logins': failed_logins,
                    'success_rate': round((successful_logins / max(len(login_attempts), 1)) * 100, 2)
                },
                'two_factor_auth': {
                    'total_users': total_users,
                    'users_with_2fa': users_with_2fa,
                    '2fa_adoption_rate': round((users_with_2fa / max(total_users, 1)) * 100, 2)
                },
                'security_events': {
                    'total_events': len(security_events),
                    'high_risk_events': high_risk_events,
                    'medium_risk_events': medium_risk_events,
                    'low_risk_events': len(security_events) - high_risk_events - medium_risk_events
                },
                'top_events': [
                    {
                        'event_type': event.event_type,
                        'risk_level': event.risk_level,
                        'timestamp': event.timestamp.isoformat(),
                        'details': event.event_details
                    }
                    for event in sorted(security_events, key=lambda x: x.timestamp, reverse=True)[:10]
                ]
            }
            
        except Exception as e:
            logger.error(f"Error getting security dashboard: {e}")
            return {}
    
    # Password Security
    def validate_password_strength(self, password: str) -> Dict[str, Any]:
        """Validate password strength"""
        requirements = {
            'min_length': len(password) >= 8,
            'has_uppercase': any(c.isupper() for c in password),
            'has_lowercase': any(c.islower() for c in password),
            'has_digit': any(c.isdigit() for c in password),
            'has_special': any(c in '!@#$%^&*(),.?":{}|<>' for c in password),
            'not_common': password.lower() not in ['password', '123456', 'admin', 'user']
        }
        
        score = sum(requirements.values())
        
        if score == 6:
            strength = 'strong'
        elif score >= 4:
            strength = 'medium'
        else:
            strength = 'weak'
        
        return {
            'strength': strength,
            'score': score,
            'requirements': requirements,
            'is_valid': score >= 4
        }
    
    def force_password_change(self, user_id: str, reason: str = "Security policy"):
        """Force user to change password on next login"""
        try:
            user = self.db.query(User).filter_by(id=user_id).first()
            if user:
                user.force_password_change = True
                self.db.commit()
                
                self.log_security_event(
                    user_id=user_id,
                    event_type="password_change_forced",
                    event_details=f"Reason: {reason}",
                    success=True
                )
                
        except Exception as e:
            logger.error(f"Error forcing password change: {e}")

# Email and SMS utilities for 2FA
class NotificationManager:
    """Manage email and SMS notifications for 2FA"""
    
    def __init__(self):
        # Configure your email and SMS settings here
        self.smtp_server = "smtp.gmail.com"  # Configure with actual SMTP
        self.smtp_port = 587
        self.email_user = "noreply@spirittours.com"
        self.email_password = "your_email_password"
        
        # SMS API configuration (Twilio, etc.)
        self.sms_api_url = "https://api.sms-provider.com/send"
        self.sms_api_key = "your_sms_api_key"
    
    def send_2fa_email(self, email: str, code: str) -> bool:
        """Send 2FA code via email"""
        try:
            msg = MIMEMultipart()
            msg['From'] = self.email_user
            msg['To'] = email
            msg['Subject'] = "Spirit Tours - Código de Verificación 2FA"
            
            body = f"""
            Su código de verificación de dos factores es: {code}
            
            Este código expira en 10 minutos.
            
            Si no solicitó este código, ignore este mensaje.
            
            Spirit Tours CRM Security Team
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.smtp_server, self.smtp_port)
            server.starttls()
            server.login(self.email_user, self.email_password)
            server.sendmail(self.email_user, email, msg.as_string())
            server.quit()
            
            return True
            
        except Exception as e:
            logger.error(f"Error sending 2FA email: {e}")
            return False
    
    def send_2fa_sms(self, phone_number: str, code: str) -> bool:
        """Send 2FA code via SMS"""
        try:
            payload = {
                'to': phone_number,
                'message': f"Spirit Tours - Código 2FA: {code}. Expira en 10 min.",
                'api_key': self.sms_api_key
            }
            
            response = requests.post(self.sms_api_url, json=payload)
            return response.status_code == 200
            
        except Exception as e:
            logger.error(f"Error sending 2FA SMS: {e}")
            return False