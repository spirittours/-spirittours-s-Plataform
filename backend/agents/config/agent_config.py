"""
AgentConfig - Configuration management for agents
=================================================

This module provides configuration loading and management for agents,
supporting YAML configuration files and environment variables.

Author: Spirit Tours Development Team
Date: 2025-11-02
"""

import os
import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


class AgentConfig(BaseModel):
    """
    Configuration for an agent.
    
    Attributes:
        agent_type: Type of agent
        agent_name: Human-readable agent name
        enabled: Whether agent is enabled
        max_concurrent_tasks: Maximum concurrent tasks
        timeout: Task timeout in seconds
        retry_attempts: Number of retry attempts for failed tasks
        retry_delay: Delay between retries in seconds
        parameters: Agent-specific parameters
        dependencies: List of agent types this agent depends on
        capabilities: List of agent capabilities
        priority: Agent priority for task routing
        metadata: Additional metadata
    """
    
    agent_type: str = Field(..., description="Type of agent")
    agent_name: str = Field(..., description="Human-readable name")
    enabled: bool = Field(default=True, description="Whether agent is enabled")
    
    max_concurrent_tasks: int = Field(default=10, ge=1, description="Max concurrent tasks")
    timeout: int = Field(default=300, ge=1, description="Task timeout in seconds")
    retry_attempts: int = Field(default=3, ge=0, description="Retry attempts for failures")
    retry_delay: int = Field(default=5, ge=0, description="Delay between retries in seconds")
    
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Agent parameters")
    dependencies: list[str] = Field(default_factory=list, description="Agent dependencies")
    capabilities: list[str] = Field(default_factory=list, description="Agent capabilities")
    
    priority: int = Field(default=5, ge=1, le=10, description="Agent priority (1-10)")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        extra = "allow"  # Allow additional fields
    
    @classmethod
    def from_yaml(cls, yaml_path: Path) -> 'AgentConfig':
        """
        Load configuration from YAML file.
        
        Args:
            yaml_path: Path to YAML configuration file
            
        Returns:
            AgentConfig instance
            
        Raises:
            FileNotFoundError: If file doesn't exist
            ValueError: If YAML is invalid
        """
        if not yaml_path.exists():
            raise FileNotFoundError(f"Config file not found: {yaml_path}")
        
        try:
            with open(yaml_path, 'r') as f:
                data = yaml.safe_load(f)
            
            # Apply environment variable overrides
            data = cls._apply_env_overrides(data)
            
            return cls(**data)
            
        except yaml.YAMLError as e:
            raise ValueError(f"Invalid YAML in {yaml_path}: {e}")
        except Exception as e:
            raise ValueError(f"Error loading config from {yaml_path}: {e}")
    
    @staticmethod
    def _apply_env_overrides(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Apply environment variable overrides to configuration.
        
        Environment variables are in format: AGENT_{AGENT_TYPE}_{KEY}
        Example: AGENT_ITINERARY_PLANNER_ENABLED=false
        
        Args:
            config: Original configuration dictionary
            
        Returns:
            Configuration with environment overrides applied
        """
        agent_type = config.get('agent_type', '').upper().replace('-', '_')
        
        # Check for enabled override
        enabled_key = f"AGENT_{agent_type}_ENABLED"
        if enabled_key in os.environ:
            config['enabled'] = os.environ[enabled_key].lower() == 'true'
        
        # Check for timeout override
        timeout_key = f"AGENT_{agent_type}_TIMEOUT"
        if timeout_key in os.environ:
            try:
                config['timeout'] = int(os.environ[timeout_key])
            except ValueError:
                logger.warning(f"Invalid timeout value in {timeout_key}")
        
        # Check for max_concurrent_tasks override
        concurrent_key = f"AGENT_{agent_type}_MAX_CONCURRENT_TASKS"
        if concurrent_key in os.environ:
            try:
                config['max_concurrent_tasks'] = int(os.environ[concurrent_key])
            except ValueError:
                logger.warning(f"Invalid max_concurrent_tasks value in {concurrent_key}")
        
        return config
    
    def get_parameter(self, key: str, default: Any = None) -> Any:
        """
        Get an agent parameter value.
        
        Args:
            key: Parameter key
            default: Default value if key not found
            
        Returns:
            Parameter value or default
        """
        return self.parameters.get(key, default)
    
    def set_parameter(self, key: str, value: Any) -> None:
        """
        Set an agent parameter value.
        
        Args:
            key: Parameter key
            value: Parameter value
        """
        self.parameters[key] = value
    
    def is_enabled(self) -> bool:
        """Check if agent is enabled."""
        return self.enabled
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert configuration to dictionary."""
        return self.dict()


def load_agent_config(agent_type: str, config_dir: Optional[Path] = None) -> AgentConfig:
    """
    Load configuration for a specific agent type.
    
    Args:
        agent_type: Type of agent to load config for
        config_dir: Directory containing config files (defaults to ./configs)
        
    Returns:
        AgentConfig instance
        
    Raises:
        FileNotFoundError: If config file not found
    """
    if config_dir is None:
        config_dir = Path(__file__).parent / 'configs'
    
    config_file = config_dir / f"{agent_type}.yaml"
    
    if not config_file.exists():
        raise FileNotFoundError(f"Config file not found: {config_file}")
    
    return AgentConfig.from_yaml(config_file)


def load_all_configs(config_dir: Optional[Path] = None) -> Dict[str, AgentConfig]:
    """
    Load all agent configurations from directory.
    
    Args:
        config_dir: Directory containing config files (defaults to ./configs)
        
    Returns:
        Dictionary mapping agent types to their configurations
    """
    if config_dir is None:
        config_dir = Path(__file__).parent / 'configs'
    
    if not config_dir.exists():
        logger.warning(f"Config directory not found: {config_dir}")
        return {}
    
    configs = {}
    
    for config_file in config_dir.glob("*.yaml"):
        try:
            config = AgentConfig.from_yaml(config_file)
            configs[config.agent_type] = config
            logger.info(f"Loaded config for {config.agent_type}")
        except Exception as e:
            logger.error(f"Failed to load {config_file}: {e}")
    
    return configs
