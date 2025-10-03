#!/usr/bin/env python3
"""
Load Balancer Deployment Script for Spirit Tours System
Automated deployment and configuration of load balancers (Nginx/HAProxy)
with SSL certificates, health checks, and monitoring setup.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import yaml
from datetime import datetime

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from backend.config.load_balancer_config import (
    get_load_balancer_config,
    generate_nginx_config_file,
    generate_haproxy_config_file
)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class LoadBalancerDeployer:
    """
    Automated load balancer deployment and configuration manager
    """
    
    def __init__(self, deployment_type: str = "nginx", environment: str = "production"):
        self.deployment_type = deployment_type.lower()  # nginx or haproxy
        self.environment = environment
        self.config = get_load_balancer_config()
        self.deployment_log = []
        
        # Deployment paths
        self.nginx_config_path = "/etc/nginx/sites-available/spirittours"
        self.nginx_enabled_path = "/etc/nginx/sites-enabled/spirittours"
        self.haproxy_config_path = "/etc/haproxy/haproxy.cfg"
        self.ssl_cert_path = "/etc/ssl/certs/spirittours.com"
        self.ssl_key_path = "/etc/ssl/private/spirittours.com"
        
        logger.info(f"Initialized LoadBalancerDeployer for {deployment_type} in {environment} environment")
    
    def deploy_load_balancer(self) -> Dict[str, Any]:
        """
        Complete load balancer deployment process
        """
        deployment_result = {
            "deployment_type": self.deployment_type,
            "environment": self.environment,
            "timestamp": datetime.utcnow().isoformat(),
            "steps_completed": [],
            "steps_failed": [],
            "warnings": [],
            "success": False
        }
        
        try:
            logger.info(f"Starting {self.deployment_type} deployment for {self.environment} environment")
            
            # Step 1: Validate configuration
            if self._validate_configuration():
                deployment_result["steps_completed"].append("Configuration validation")
            else:
                deployment_result["steps_failed"].append("Configuration validation")
                return deployment_result
            
            # Step 2: Backup existing configuration
            if self._backup_existing_config():
                deployment_result["steps_completed"].append("Configuration backup")
            else:
                deployment_result["warnings"].append("Failed to backup existing configuration")
            
            # Step 3: Generate configuration files
            if self._generate_config_files():
                deployment_result["steps_completed"].append("Configuration file generation")
            else:
                deployment_result["steps_failed"].append("Configuration file generation")
                return deployment_result
            
            # Step 4: Install SSL certificates (if needed)
            if self.environment != "development":
                if self._install_ssl_certificates():
                    deployment_result["steps_completed"].append("SSL certificate installation")
                else:
                    deployment_result["warnings"].append("SSL certificate installation failed")
            
            # Step 5: Deploy configuration files
            if self._deploy_config_files():
                deployment_result["steps_completed"].append("Configuration file deployment")
            else:
                deployment_result["steps_failed"].append("Configuration file deployment")
                return deployment_result
            
            # Step 6: Test configuration
            if self._test_configuration():
                deployment_result["steps_completed"].append("Configuration testing")
            else:
                deployment_result["steps_failed"].append("Configuration testing")
                return deployment_result
            
            # Step 7: Reload/Restart load balancer
            if self._reload_load_balancer():
                deployment_result["steps_completed"].append("Load balancer reload")
            else:
                deployment_result["steps_failed"].append("Load balancer reload")
                return deployment_result
            
            # Step 8: Verify deployment
            if self._verify_deployment():
                deployment_result["steps_completed"].append("Deployment verification")
                deployment_result["success"] = True
            else:
                deployment_result["steps_failed"].append("Deployment verification")
                return deployment_result
            
            # Step 9: Setup monitoring
            if self._setup_monitoring():
                deployment_result["steps_completed"].append("Monitoring setup")
            else:
                deployment_result["warnings"].append("Monitoring setup failed")
            
            logger.info("Load balancer deployment completed successfully")
            
        except Exception as e:
            logger.error(f"Deployment failed with error: {e}")
            deployment_result["steps_failed"].append(f"Unexpected error: {str(e)}")
        
        return deployment_result
    
    def _validate_configuration(self) -> bool:
        """Validate load balancer configuration"""
        try:
            logger.info("Validating load balancer configuration...")
            
            # Validate configuration using the config class
            issues = self.config.validate_configuration()
            
            if issues:
                logger.error(f"Configuration validation failed with {len(issues)} issues:")
                for issue in issues:
                    logger.error(f"  - {issue}")
                return False
            
            logger.info("Configuration validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Configuration validation error: {e}")
            return False
    
    def _backup_existing_config(self) -> bool:
        """Backup existing configuration files"""
        try:
            logger.info("Backing up existing configuration files...")
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_dir = f"/tmp/spirittours_lb_backup_{timestamp}"
            
            # Create backup directory
            subprocess.run(["mkdir", "-p", backup_dir], check=True)
            
            # Backup based on deployment type
            if self.deployment_type == "nginx":
                # Backup Nginx configuration
                if os.path.exists(self.nginx_config_path):
                    subprocess.run([
                        "cp", self.nginx_config_path, 
                        f"{backup_dir}/nginx_spirittours.conf.bak"
                    ], check=True)
                
                if os.path.exists("/etc/nginx/nginx.conf"):
                    subprocess.run([
                        "cp", "/etc/nginx/nginx.conf", 
                        f"{backup_dir}/nginx.conf.bak"
                    ], check=True)
            
            elif self.deployment_type == "haproxy":
                # Backup HAProxy configuration
                if os.path.exists(self.haproxy_config_path):
                    subprocess.run([
                        "cp", self.haproxy_config_path,
                        f"{backup_dir}/haproxy.cfg.bak"
                    ], check=True)
            
            logger.info(f"Configuration backup completed: {backup_dir}")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Backup failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Backup error: {e}")
            return False
    
    def _generate_config_files(self) -> bool:
        """Generate load balancer configuration files"""
        try:
            logger.info("Generating configuration files...")
            
            if self.deployment_type == "nginx":
                # Generate Nginx configuration
                config_path = generate_nginx_config_file("/tmp/nginx_spirittours.conf")
                logger.info(f"Nginx configuration generated: {config_path}")
                
            elif self.deployment_type == "haproxy":
                # Generate HAProxy configuration
                config_path = generate_haproxy_config_file("/tmp/haproxy_spirittours.cfg")
                logger.info(f"HAProxy configuration generated: {config_path}")
            
            else:
                logger.error(f"Unsupported deployment type: {self.deployment_type}")
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Configuration generation error: {e}")
            return False
    
    def _install_ssl_certificates(self) -> bool:
        """Install SSL certificates"""
        try:
            logger.info("Installing SSL certificates...")
            
            # This would typically involve:
            # 1. Obtaining certificates from Let's Encrypt or CA
            # 2. Installing them in the correct locations
            # 3. Setting proper permissions
            
            # For now, create self-signed certificates for testing
            if not os.path.exists("/etc/ssl/certs") or not os.path.exists("/etc/ssl/private"):
                logger.warning("SSL directories not found, creating...")
                subprocess.run(["mkdir", "-p", "/etc/ssl/certs", "/etc/ssl/private"], check=True)
            
            # Generate self-signed certificate (production should use real certificates)
            cert_command = [
                "openssl", "req", "-x509", "-newkey", "rsa:4096", 
                "-keyout", f"{self.ssl_key_path}.key",
                "-out", f"{self.ssl_cert_path}.crt",
                "-days", "365", "-nodes",
                "-subj", "/C=US/ST=CA/L=San Francisco/O=Spirit Tours/CN=spirittours.com"
            ]
            
            result = subprocess.run(cert_command, capture_output=True, text=True)
            if result.returncode != 0:
                logger.warning(f"SSL certificate generation failed: {result.stderr}")
                return False
            
            # Set proper permissions
            subprocess.run(["chmod", "600", f"{self.ssl_key_path}.key"], check=True)
            subprocess.run(["chmod", "644", f"{self.ssl_cert_path}.crt"], check=True)
            
            logger.info("SSL certificates installed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"SSL certificate installation failed: {e}")
            return False
        except Exception as e:
            logger.error(f"SSL installation error: {e}")
            return False
    
    def _deploy_config_files(self) -> bool:
        """Deploy configuration files to their target locations"""
        try:
            logger.info("Deploying configuration files...")
            
            if self.deployment_type == "nginx":
                # Deploy Nginx configuration
                subprocess.run([
                    "cp", "/tmp/nginx_spirittours.conf", self.nginx_config_path
                ], check=True)
                
                # Create symbolic link to enable site
                if os.path.exists(self.nginx_enabled_path):
                    os.remove(self.nginx_enabled_path)
                
                subprocess.run([
                    "ln", "-s", self.nginx_config_path, self.nginx_enabled_path
                ], check=True)
                
            elif self.deployment_type == "haproxy":
                # Deploy HAProxy configuration
                subprocess.run([
                    "cp", "/tmp/haproxy_spirittours.cfg", self.haproxy_config_path
                ], check=True)
            
            logger.info("Configuration files deployed successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Configuration deployment failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Configuration deployment error: {e}")
            return False
    
    def _test_configuration(self) -> bool:
        """Test load balancer configuration"""
        try:
            logger.info("Testing configuration...")
            
            if self.deployment_type == "nginx":
                # Test Nginx configuration
                result = subprocess.run(["nginx", "-t"], capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"Nginx configuration test failed: {result.stderr}")
                    return False
                
            elif self.deployment_type == "haproxy":
                # Test HAProxy configuration
                result = subprocess.run([
                    "haproxy", "-c", "-f", self.haproxy_config_path
                ], capture_output=True, text=True)
                if result.returncode != 0:
                    logger.error(f"HAProxy configuration test failed: {result.stderr}")
                    return False
            
            logger.info("Configuration test passed")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Configuration test failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Configuration test error: {e}")
            return False
    
    def _reload_load_balancer(self) -> bool:
        """Reload/restart load balancer service"""
        try:
            logger.info(f"Reloading {self.deployment_type} service...")
            
            if self.deployment_type == "nginx":
                # Reload Nginx
                result = subprocess.run(["systemctl", "reload", "nginx"], capture_output=True, text=True)
                if result.returncode != 0:
                    # Try restart if reload fails
                    result = subprocess.run(["systemctl", "restart", "nginx"], capture_output=True, text=True)
                    if result.returncode != 0:
                        logger.error(f"Nginx restart failed: {result.stderr}")
                        return False
                
            elif self.deployment_type == "haproxy":
                # Reload HAProxy
                result = subprocess.run(["systemctl", "reload", "haproxy"], capture_output=True, text=True)
                if result.returncode != 0:
                    # Try restart if reload fails
                    result = subprocess.run(["systemctl", "restart", "haproxy"], capture_output=True, text=True)
                    if result.returncode != 0:
                        logger.error(f"HAProxy restart failed: {result.stderr}")
                        return False
            
            logger.info(f"{self.deployment_type} service reloaded successfully")
            return True
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Service reload failed: {e}")
            return False
        except Exception as e:
            logger.error(f"Service reload error: {e}")
            return False
    
    def _verify_deployment(self) -> bool:
        """Verify load balancer deployment"""
        try:
            logger.info("Verifying deployment...")
            
            # Check service status
            service_name = self.deployment_type
            result = subprocess.run([
                "systemctl", "is-active", service_name
            ], capture_output=True, text=True)
            
            if result.stdout.strip() != "active":
                logger.error(f"{service_name} service is not active")
                return False
            
            # Test HTTP connectivity (basic check)
            import urllib.request
            import socket
            
            try:
                # Test local connectivity
                response = urllib.request.urlopen("http://localhost", timeout=10)
                if response.getcode() not in [200, 301, 302]:
                    logger.warning(f"Unexpected HTTP response code: {response.getcode()}")
                
                logger.info("HTTP connectivity test passed")
                
            except socket.timeout:
                logger.warning("HTTP connectivity test timed out")
            except Exception as e:
                logger.warning(f"HTTP connectivity test failed: {e}")
            
            logger.info("Deployment verification completed")
            return True
            
        except Exception as e:
            logger.error(f"Deployment verification error: {e}")
            return False
    
    def _setup_monitoring(self) -> bool:
        """Setup load balancer monitoring"""
        try:
            logger.info("Setting up monitoring...")
            
            # Create monitoring script
            monitoring_script = f"""#!/bin/bash
# Spirit Tours Load Balancer Monitoring Script
# Generated on {datetime.now()}

LOG_FILE="/var/log/spirittours_lb_monitor.log"

# Function to log with timestamp
log_message() {{
    echo "$(date): $1" >> $LOG_FILE
}}

# Check {self.deployment_type} service status
if systemctl is-active --quiet {self.deployment_type}; then
    log_message "{self.deployment_type} service is running"
else
    log_message "ALERT: {self.deployment_type} service is not running"
    systemctl restart {self.deployment_type}
fi

# Check HTTP response
if curl -f -s http://localhost >/dev/null; then
    log_message "HTTP health check passed"
else
    log_message "ALERT: HTTP health check failed"
fi

# Check SSL (if enabled)
if [[ "{self.environment}" != "development" ]]; then
    if openssl s_client -connect localhost:443 -servername spirittours.com </dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
        log_message "SSL health check passed"
    else
        log_message "ALERT: SSL health check failed"
    fi
fi
"""
            
            # Write monitoring script
            with open("/tmp/spirittours_lb_monitor.sh", "w") as f:
                f.write(monitoring_script)
            
            # Make executable and install
            subprocess.run(["chmod", "+x", "/tmp/spirittours_lb_monitor.sh"], check=True)
            subprocess.run([
                "cp", "/tmp/spirittours_lb_monitor.sh", "/usr/local/bin/"
            ], check=True)
            
            # Create cron job for monitoring
            cron_entry = "*/5 * * * * /usr/local/bin/spirittours_lb_monitor.sh\n"
            
            # Add to root crontab
            try:
                result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
                current_crontab = result.stdout if result.returncode == 0 else ""
                
                if "spirittours_lb_monitor.sh" not in current_crontab:
                    new_crontab = current_crontab + cron_entry
                    subprocess.run(["crontab", "-"], input=new_crontab, text=True, check=True)
                    logger.info("Monitoring cron job installed")
                else:
                    logger.info("Monitoring cron job already exists")
                
            except subprocess.CalledProcessError as e:
                logger.warning(f"Failed to install monitoring cron job: {e}")
            
            logger.info("Monitoring setup completed")
            return True
            
        except Exception as e:
            logger.error(f"Monitoring setup error: {e}")
            return False
    
    def rollback_deployment(self) -> bool:
        """Rollback to previous configuration"""
        try:
            logger.info("Rolling back deployment...")
            
            # Find latest backup
            backup_dirs = [d for d in os.listdir("/tmp") if d.startswith("spirittours_lb_backup_")]
            if not backup_dirs:
                logger.error("No backup found for rollback")
                return False
            
            latest_backup = sorted(backup_dirs)[-1]
            backup_path = f"/tmp/{latest_backup}"
            
            if self.deployment_type == "nginx":
                # Restore Nginx configuration
                backup_file = f"{backup_path}/nginx_spirittours.conf.bak"
                if os.path.exists(backup_file):
                    subprocess.run(["cp", backup_file, self.nginx_config_path], check=True)
                    subprocess.run(["nginx", "-s", "reload"], check=True)
            
            elif self.deployment_type == "haproxy":
                # Restore HAProxy configuration
                backup_file = f"{backup_path}/haproxy.cfg.bak"
                if os.path.exists(backup_file):
                    subprocess.run(["cp", backup_file, self.haproxy_config_path], check=True)
                    subprocess.run(["systemctl", "reload", "haproxy"], check=True)
            
            logger.info("Deployment rollback completed")
            return True
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            return False
    
    def get_deployment_status(self) -> Dict[str, Any]:
        """Get current deployment status"""
        try:
            status = {
                "deployment_type": self.deployment_type,
                "environment": self.environment,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Check service status
            result = subprocess.run([
                "systemctl", "is-active", self.deployment_type
            ], capture_output=True, text=True)
            status["service_active"] = result.stdout.strip() == "active"
            
            # Check configuration file exists
            config_path = self.nginx_config_path if self.deployment_type == "nginx" else self.haproxy_config_path
            status["config_exists"] = os.path.exists(config_path)
            
            # Check SSL certificates (if not development)
            if self.environment != "development":
                status["ssl_cert_exists"] = os.path.exists(f"{self.ssl_cert_path}.crt")
                status["ssl_key_exists"] = os.path.exists(f"{self.ssl_key_path}.key")
            
            return status
            
        except Exception as e:
            logger.error(f"Status check error: {e}")
            return {"error": str(e)}

def main():
    """Main deployment script"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Deploy Spirit Tours Load Balancer")
    parser.add_argument("--type", choices=["nginx", "haproxy"], default="nginx",
                       help="Load balancer type (default: nginx)")
    parser.add_argument("--environment", choices=["development", "staging", "production"], 
                       default="production", help="Deployment environment (default: production)")
    parser.add_argument("--rollback", action="store_true", help="Rollback to previous configuration")
    parser.add_argument("--status", action="store_true", help="Check deployment status")
    parser.add_argument("--dry-run", action="store_true", help="Generate configs without deploying")
    
    args = parser.parse_args()
    
    # Set environment variable
    os.environ["ENVIRONMENT"] = args.environment
    
    deployer = LoadBalancerDeployer(args.type, args.environment)
    
    if args.status:
        # Get deployment status
        status = deployer.get_deployment_status()
        print(json.dumps(status, indent=2))
        return
    
    if args.rollback:
        # Rollback deployment
        success = deployer.rollback_deployment()
        sys.exit(0 if success else 1)
    
    if args.dry_run:
        # Generate configuration only
        logger.info("Dry run mode - generating configurations only")
        if deployer._generate_config_files():
            print(f"Configuration files generated in /tmp/")
            print(f"Review the files before actual deployment")
        return
    
    # Full deployment
    result = deployer.deploy_load_balancer()
    
    # Print result summary
    print(json.dumps(result, indent=2))
    
    # Exit with appropriate code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()