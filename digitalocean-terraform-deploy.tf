# Spirit Tours - DigitalOcean Infrastructure as Code
# Terraform configuration for automated deployment

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
  
  # Optional: Store state in DigitalOcean Spaces
  # backend "s3" {
  #   endpoint                    = "nyc3.digitaloceanspaces.com"
  #   key                        = "terraform/spirit-tours.tfstate"
  #   bucket                     = "your-spaces-bucket"
  #   region                     = "us-east-1"
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  # }
}

# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

# Variables
variable "do_token" {
  description = "DigitalOcean API Token"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc3"
}

variable "environment" {
  description = "Environment (staging/production)"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Your domain name"
  type        = string
  default     = "spirittours.com"
}

variable "ssh_fingerprint" {
  description = "SSH key fingerprint"
  type        = string
}

# Create VPC
resource "digitalocean_vpc" "spirit_tours_vpc" {
  name     = "spirit-tours-vpc-${var.environment}"
  region   = var.region
  ip_range = "10.10.10.0/24"
}

# Create Main Droplet
resource "digitalocean_droplet" "spirit_tours_main" {
  name     = "spirit-tours-${var.environment}"
  size     = "s-4vcpu-8gb"  # $48/month
  image    = "ubuntu-22-04-x64"
  region   = var.region
  vpc_uuid = digitalocean_vpc.spirit_tours_vpc.id
  ssh_keys = [var.ssh_fingerprint]
  
  # Enable backups
  backups = true
  
  # Enable monitoring
  monitoring = true
  
  # User data script for initial setup
  user_data = file("${path.module}/cloud-init.yaml")
  
  tags = ["spirit-tours", var.environment, "web", "api"]
}

# Create Database Cluster
resource "digitalocean_database_cluster" "postgres" {
  name       = "spirit-tours-db-${var.environment}"
  engine     = "pg"
  version    = "15"
  size       = "db-s-2vcpu-4gb"  # $60/month
  region     = var.region
  node_count = 1
  
  private_network_uuid = digitalocean_vpc.spirit_tours_vpc.id
  
  tags = ["spirit-tours", var.environment, "database"]
  
  maintenance_window {
    day  = "sunday"
    hour = "02:00"
  }
}

# Create Redis Cluster
resource "digitalocean_database_cluster" "redis" {
  name       = "spirit-tours-redis-${var.environment}"
  engine     = "redis"
  version    = "7"
  size       = "db-s-1vcpu-1gb"  # $15/month
  region     = var.region
  node_count = 1
  
  private_network_uuid = digitalocean_vpc.spirit_tours_vpc.id
  
  eviction_policy = "allkeys_lru"
  
  tags = ["spirit-tours", var.environment, "cache"]
}

# Create Database Firewall
resource "digitalocean_database_firewall" "postgres_firewall" {
  cluster_id = digitalocean_database_cluster.postgres.id
  
  rule {
    type  = "droplet"
    value = digitalocean_droplet.spirit_tours_main.id
  }
  
  # Allow access from VPC
  rule {
    type  = "ip_addr"
    value = "10.10.10.0/24"
  }
}

# Create Redis Firewall
resource "digitalocean_database_firewall" "redis_firewall" {
  cluster_id = digitalocean_database_cluster.redis.id
  
  rule {
    type  = "droplet"
    value = digitalocean_droplet.spirit_tours_main.id
  }
  
  # Allow access from VPC
  rule {
    type  = "ip_addr"
    value = "10.10.10.0/24"
  }
}

# Create Load Balancer
resource "digitalocean_loadbalancer" "spirit_tours_lb" {
  name   = "spirit-tours-lb-${var.environment}"
  region = var.region
  size   = "lb-small"  # $12/month
  
  vpc_uuid = digitalocean_vpc.spirit_tours_vpc.id
  
  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"
    
    target_port     = 80
    target_protocol = "http"
  }
  
  forwarding_rule {
    entry_port     = 443
    entry_protocol = "https"
    
    target_port     = 80
    target_protocol = "http"
    
    tls_passthrough = false
    certificate_name = digitalocean_certificate.cert.name
  }
  
  healthcheck {
    port     = 80
    protocol = "http"
    path     = "/health"
  }
  
  droplet_ids = [digitalocean_droplet.spirit_tours_main.id]
  
  tags = ["spirit-tours", var.environment, "load-balancer"]
}

# Create Spaces Object Storage
resource "digitalocean_spaces_bucket" "spirit_tours_assets" {
  name   = "spirit-tours-assets-${var.environment}"
  region = var.region
  acl    = "private"
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["https://${var.domain_name}", "https://www.${var.domain_name}"]
    max_age_seconds = 3000
  }
  
  lifecycle_rule {
    id      = "cleanup-old-files"
    enabled = true
    
    expiration {
      days = 365
    }
  }
}

# Create CDN for Spaces
resource "digitalocean_cdn" "spirit_tours_cdn" {
  origin         = digitalocean_spaces_bucket.spirit_tours_assets.bucket_domain_name
  ttl            = 3600
  custom_domain  = "cdn.${var.domain_name}"
  
  certificate_name = digitalocean_certificate.cert.name
}

# Create Domain
resource "digitalocean_domain" "spirit_tours_domain" {
  name = var.domain_name
}

# Create DNS Records
resource "digitalocean_record" "www" {
  domain = digitalocean_domain.spirit_tours_domain.id
  type   = "A"
  name   = "www"
  value  = digitalocean_loadbalancer.spirit_tours_lb.ip
  ttl    = 300
}

resource "digitalocean_record" "root" {
  domain = digitalocean_domain.spirit_tours_domain.id
  type   = "A"
  name   = "@"
  value  = digitalocean_loadbalancer.spirit_tours_lb.ip
  ttl    = 300
}

resource "digitalocean_record" "api" {
  domain = digitalocean_domain.spirit_tours_domain.id
  type   = "A"
  name   = "api"
  value  = digitalocean_loadbalancer.spirit_tours_lb.ip
  ttl    = 300
}

resource "digitalocean_record" "cdn" {
  domain = digitalocean_domain.spirit_tours_domain.id
  type   = "CNAME"
  name   = "cdn"
  value  = "${digitalocean_spaces_bucket.spirit_tours_assets.bucket_domain_name}."
  ttl    = 300
}

# SSL Certificate
resource "digitalocean_certificate" "cert" {
  name    = "spirit-tours-cert-${var.environment}"
  type    = "lets_encrypt"
  domains = [var.domain_name, "www.${var.domain_name}", "api.${var.domain_name}"]
  
  lifecycle {
    create_before_destroy = true
  }
}

# Create Firewall
resource "digitalocean_firewall" "spirit_tours_firewall" {
  name = "spirit-tours-firewall-${var.environment}"
  
  droplet_ids = [digitalocean_droplet.spirit_tours_main.id]
  
  # Allow SSH
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  # Allow HTTP
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  # Allow HTTPS
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  # Allow API port
  inbound_rule {
    protocol         = "tcp"
    port_range       = "8000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  # Allow all outbound traffic
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
  
  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Create Project
resource "digitalocean_project" "spirit_tours_project" {
  name        = "Spirit Tours ${var.environment}"
  description = "Spirit Tours Platform - ${var.environment} environment"
  purpose     = "Web Application"
  environment = var.environment
  
  resources = [
    digitalocean_droplet.spirit_tours_main.urn,
    digitalocean_database_cluster.postgres.urn,
    digitalocean_database_cluster.redis.urn,
    digitalocean_loadbalancer.spirit_tours_lb.urn,
    digitalocean_domain.spirit_tours_domain.urn,
    digitalocean_spaces_bucket.spirit_tours_assets.urn,
  ]
}

# Create Monitoring Alert Policies
resource "digitalocean_monitor_alert" "cpu_alert" {
  alerts {
    email = ["admin@spirittours.com"]
    slack {
      channel = "#alerts"
      url     = "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
    }
  }
  
  window      = "10m"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 80
  enabled     = true
  
  entities = [digitalocean_droplet.spirit_tours_main.id]
  
  description = "Alert when CPU usage exceeds 80%"
}

resource "digitalocean_monitor_alert" "memory_alert" {
  alerts {
    email = ["admin@spirittours.com"]
  }
  
  window      = "10m"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 85
  enabled     = true
  
  entities = [digitalocean_droplet.spirit_tours_main.id]
  
  description = "Alert when memory usage exceeds 85%"
}

# Outputs
output "droplet_ip" {
  value       = digitalocean_droplet.spirit_tours_main.ipv4_address
  description = "The public IP address of the main droplet"
}

output "loadbalancer_ip" {
  value       = digitalocean_loadbalancer.spirit_tours_lb.ip
  description = "The public IP address of the load balancer"
}

output "database_host" {
  value       = digitalocean_database_cluster.postgres.host
  sensitive   = true
  description = "The hostname of the PostgreSQL database"
}

output "database_port" {
  value       = digitalocean_database_cluster.postgres.port
  description = "The port of the PostgreSQL database"
}

output "database_uri" {
  value       = digitalocean_database_cluster.postgres.uri
  sensitive   = true
  description = "The connection URI for the PostgreSQL database"
}

output "redis_host" {
  value       = digitalocean_database_cluster.redis.host
  sensitive   = true
  description = "The hostname of the Redis cache"
}

output "redis_port" {
  value       = digitalocean_database_cluster.redis.port
  description = "The port of the Redis cache"
}

output "spaces_endpoint" {
  value       = digitalocean_spaces_bucket.spirit_tours_assets.endpoint
  description = "The endpoint for the Spaces bucket"
}

output "cdn_endpoint" {
  value       = digitalocean_cdn.spirit_tours_cdn.endpoint
  description = "The CDN endpoint URL"
}