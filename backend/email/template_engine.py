"""
Email Template Engine

Jinja2-based template rendering engine for emails.
"""

import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, Template, select_autoescape
from sqlalchemy.orm import Session

from backend.email.email_config import email_config
from backend.models.email_models import EmailTemplate, EmailTemplateType


logger = logging.getLogger(__name__)


class EmailTemplateEngine:
    """
    Email template engine using Jinja2.
    
    Features:
    - Template rendering with variable substitution
    - Database-stored templates
    - File-based templates
    - Template caching
    - Multi-language support
    - Default values for missing variables
    """
    
    def __init__(self, templates_dir: Optional[str] = None):
        """
        Initialize template engine.
        
        Args:
            templates_dir: Directory containing template files
        """
        self.templates_dir = templates_dir or email_config.EMAIL_TEMPLATES_DIR
        
        # Create Jinja2 environment
        self.env = Environment(
            loader=FileSystemLoader(self.templates_dir),
            autoescape=select_autoescape(['html', 'xml']),
            trim_blocks=True,
            lstrip_blocks=True
        )
        
        # Add custom filters
        self.env.filters['currency'] = self._filter_currency
        self.env.filters['date'] = self._filter_date
        self.env.filters['datetime'] = self._filter_datetime
        
        # Template cache
        self._cache: Dict[str, Template] = {}
    
    def _filter_currency(self, value: float, currency: str = 'USD') -> str:
        """Format currency filter"""
        symbol_map = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'ILS': '₪',
        }
        symbol = symbol_map.get(currency, '$')
        return f"{symbol}{value:,.2f}"
    
    def _filter_date(self, value, format: str = '%Y-%m-%d') -> str:
        """Format date filter"""
        if hasattr(value, 'strftime'):
            return value.strftime(format)
        return str(value)
    
    def _filter_datetime(self, value, format: str = '%Y-%m-%d %H:%M:%S') -> str:
        """Format datetime filter"""
        if hasattr(value, 'strftime'):
            return value.strftime(format)
        return str(value)
    
    def render_template(
        self,
        template_content: str,
        variables: Dict[str, Any],
        default_values: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Render a template with variables.
        
        Args:
            template_content: Template content (Jinja2 syntax)
            variables: Variables to substitute
            default_values: Default values for missing variables
            
        Returns:
            Rendered template string
        """
        try:
            # Merge with default values
            if default_values:
                render_vars = {**default_values, **variables}
            else:
                render_vars = variables
            
            # Create template
            template = Template(template_content)
            
            # Render
            return template.render(**render_vars)
            
        except Exception as e:
            logger.error(f"Template rendering error: {str(e)}")
            raise
    
    def render_template_from_file(
        self,
        template_name: str,
        variables: Dict[str, Any]
    ) -> str:
        """
        Render a template from file.
        
        Args:
            template_name: Template filename
            variables: Variables to substitute
            
        Returns:
            Rendered template string
        """
        try:
            template = self.env.get_template(template_name)
            return template.render(**variables)
            
        except Exception as e:
            logger.error(f"Template file rendering error: {str(e)}")
            raise
    
    def render_from_db(
        self,
        db: Session,
        template_id: int,
        variables: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, str]:
        """
        Render template from database.
        
        Args:
            db: Database session
            template_id: Template ID
            variables: Variables to substitute
            language: Language code
            
        Returns:
            Dictionary with rendered subject, html_body, and text_body
        """
        try:
            # Get template from database
            template = db.query(EmailTemplate).filter(
                EmailTemplate.id == template_id,
                EmailTemplate.language == language,
                EmailTemplate.is_active == True
            ).first()
            
            if not template:
                raise ValueError(f"Template {template_id} not found for language {language}")
            
            # Merge with default values
            render_vars = {**(template.default_values or {}), **variables}
            
            # Render subject
            subject = self.render_template(template.subject, render_vars)
            
            # Render HTML body
            html_body = self.render_template(template.html_content, render_vars)
            
            # Render text body (if available)
            text_body = None
            if template.text_content:
                text_body = self.render_template(template.text_content, render_vars)
            
            return {
                'subject': subject,
                'html_body': html_body,
                'text_body': text_body
            }
            
        except Exception as e:
            logger.error(f"Database template rendering error: {str(e)}")
            raise
    
    def render_by_type(
        self,
        db: Session,
        template_type: EmailTemplateType,
        variables: Dict[str, Any],
        language: str = 'en'
    ) -> Dict[str, str]:
        """
        Render template by type.
        
        Args:
            db: Database session
            template_type: Template type
            variables: Variables to substitute
            language: Language code
            
        Returns:
            Dictionary with rendered subject, html_body, and text_body
        """
        try:
            # Get template by type
            template = db.query(EmailTemplate).filter(
                EmailTemplate.type == template_type,
                EmailTemplate.language == language,
                EmailTemplate.is_active == True
            ).first()
            
            if not template:
                raise ValueError(
                    f"No active template found for type {template_type} "
                    f"and language {language}"
                )
            
            return self.render_from_db(db, template.id, variables, language)
            
        except Exception as e:
            logger.error(f"Template type rendering error: {str(e)}")
            raise
    
    def validate_variables(
        self,
        template_content: str,
        provided_variables: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate that all required variables are provided.
        
        Args:
            template_content: Template content
            provided_variables: Variables provided
            
        Returns:
            Dictionary with validation result
        """
        try:
            # Parse template to find variables
            template = Template(template_content)
            required_vars = template.module.__loader__.get_source(
                self.env, template.name
            )[0]
            
            # Simple regex to find {{ variable }} patterns
            import re
            found_vars = set(re.findall(r'\{\{\s*(\w+)', template_content))
            
            # Check which variables are missing
            provided_keys = set(provided_variables.keys())
            missing_vars = found_vars - provided_keys
            
            return {
                'valid': len(missing_vars) == 0,
                'required_variables': list(found_vars),
                'provided_variables': list(provided_keys),
                'missing_variables': list(missing_vars)
            }
            
        except Exception as e:
            logger.error(f"Variable validation error: {str(e)}")
            return {
                'valid': False,
                'error': str(e)
            }
    
    def preview_template(
        self,
        template_content: str,
        sample_variables: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Preview a template with sample data.
        
        Args:
            template_content: Template content
            sample_variables: Sample variables for preview
            
        Returns:
            Rendered preview
        """
        # Use sample data if not provided
        if not sample_variables:
            sample_variables = {
                'user_name': 'John Doe',
                'tour_name': 'Sample Tour',
                'booking_date': '2025-01-15',
                'price': 299.99,
                'currency': 'USD',
                'company_name': 'Spirit Tours'
            }
        
        return self.render_template(template_content, sample_variables)
    
    def clear_cache(self):
        """Clear template cache"""
        self._cache.clear()
        logger.info("Template cache cleared")


# Global template engine instance
template_engine = EmailTemplateEngine()
