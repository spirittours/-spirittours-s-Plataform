#!/usr/bin/env python3
"""
API Package for Spirit Tours B2C/B2B/B2B2C Platform
"""

# Import all API routers
from . import admin_api
from . import auth_api
from . import communications_api
from . import audit_api
from . import security_2fa_api
from . import alerts_api
from . import booking_api
from . import b2b_management_api
from . import scheduler_api
from . import sentiment_analysis_api
from . import analytics_api

__all__ = [
    'admin_api',
    'auth_api', 
    'communications_api',
    'audit_api',
    'security_2fa_api',
    'alerts_api',
    'booking_api',
    'b2b_management_api',
    'scheduler_api',
    'sentiment_analysis_api',
    'analytics_api'
]