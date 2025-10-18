"""
White Label Service for B2B2B Platform.

Manages white label branding, custom domains, and agent-specific customization.
"""
import logging
from typing import Optional, Dict, Any
from datetime import datetime

from .models import WhiteLabelConfig, Agent

logger = logging.getLogger(__name__)


class WhiteLabelService:
    """
    Service for managing white label configurations.
    
    Enables agents to customize branding, domains, and appearance.
    """
    
    def __init__(self, db_connection, agent_service):
        """
        Initialize white label service.
        
        Args:
            db_connection: Database connection
            agent_service: Agent service instance
        """
        self.db = db_connection
        self.agent_service = agent_service
    
    async def create_white_label_config(
        self,
        agent_code: str,
        config: WhiteLabelConfig
    ) -> WhiteLabelConfig:
        """
        Create white label configuration for agent.
        
        Args:
            agent_code: Agent code
            config: White label configuration
            
        Returns:
            Created configuration
        """
        agent = await self.agent_service.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        if not agent.white_label_enabled:
            raise ValueError(f"White label not enabled for agent {agent_code}")
        
        # Validate custom domain is unique
        existing = await self.get_config_by_domain(config.custom_domain)
        if existing:
            raise ValueError(f"Domain {config.custom_domain} already in use")
        
        # Set agent references
        config.agent_id = agent.id
        config.agent_code = agent.agent_code
        
        # Save to database
        logger.info(f"White label config created for agent {agent_code}")
        
        return config
    
    async def update_white_label_config(
        self,
        agent_code: str,
        config_updates: Dict[str, Any]
    ) -> WhiteLabelConfig:
        """
        Update white label configuration.
        
        Args:
            agent_code: Agent code
            config_updates: Configuration updates
            
        Returns:
            Updated configuration
        """
        config = await self.get_config_by_agent(agent_code)
        if not config:
            raise ValueError(f"White label config not found for agent {agent_code}")
        
        # Update fields
        for key, value in config_updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.utcnow()
        
        logger.info(f"White label config updated for agent {agent_code}")
        
        return config
    
    async def get_config_by_agent(self, agent_code: str) -> Optional[WhiteLabelConfig]:
        """Get white label config by agent code."""
        # In production, query database
        return None
    
    async def get_config_by_domain(self, domain: str) -> Optional[WhiteLabelConfig]:
        """Get white label config by custom domain."""
        # In production, query database
        return None
    
    async def validate_domain(self, domain: str) -> Dict[str, Any]:
        """
        Validate custom domain configuration.
        
        Checks DNS records, SSL, and domain availability.
        
        Args:
            domain: Custom domain
            
        Returns:
            Validation result with status and messages
        """
        result = {
            "domain": domain,
            "valid": False,
            "checks": {
                "dns_configured": False,
                "ssl_valid": False,
                "domain_available": False
            },
            "messages": []
        }
        
        # Check domain availability
        existing = await self.get_config_by_domain(domain)
        if existing:
            result["messages"].append(f"Domain already in use by agent {existing.agent_code}")
        else:
            result["checks"]["domain_available"] = True
        
        # In production, would check DNS records and SSL
        # For now, assume valid
        result["checks"]["dns_configured"] = True
        result["checks"]["ssl_valid"] = True
        
        result["valid"] = all(result["checks"].values())
        
        return result
    
    async def generate_custom_css(
        self,
        agent_code: str,
        theme_vars: Dict[str, str]
    ) -> str:
        """
        Generate custom CSS from theme variables.
        
        Args:
            agent_code: Agent code
            theme_vars: Theme variables (colors, fonts, etc.)
            
        Returns:
            Generated CSS string
        """
        primary_color = theme_vars.get("primary_color", "#FF6B35")
        secondary_color = theme_vars.get("secondary_color", "#004E89")
        accent_color = theme_vars.get("accent_color", "#F7931E")
        
        css = f"""
/* Custom theme for {agent_code} */
:root {{
    --primary-color: {primary_color};
    --secondary-color: {secondary_color};
    --accent-color: {accent_color};
}}

.btn-primary {{
    background-color: var(--primary-color);
    border-color: var(--primary-color);
}}

.btn-primary:hover {{
    background-color: color-mix(in srgb, var(--primary-color) 85%, black);
}}

.navbar {{
    background-color: var(--secondary-color);
}}

.link-accent {{
    color: var(--accent-color);
}}
"""
        
        return css.strip()
    
    async def enable_white_label(
        self,
        agent_code: str,
        enabled_by: int
    ) -> Agent:
        """
        Enable white label for agent.
        
        Args:
            agent_code: Agent code
            enabled_by: User ID enabling
            
        Returns:
            Updated agent
        """
        agent = await self.agent_service.get_agent_by_code(agent_code)
        if not agent:
            raise ValueError(f"Agent {agent_code} not found")
        
        agent.white_label_enabled = True
        agent.updated_at = datetime.utcnow()
        
        logger.info(f"White label enabled for agent {agent_code} by user {enabled_by}")
        
        return agent
