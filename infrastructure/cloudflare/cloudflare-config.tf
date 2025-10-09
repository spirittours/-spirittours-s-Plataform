terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Domain name"
  default     = "spirittours.com"
}

variable "cloudflare_zone_id" {
  description = "Cloudflare Zone ID"
  type        = string
}

# DNS Records
resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  value   = "lb.spirittours.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "www" {
  zone_id = var.cloudflare_zone_id
  name    = "www"
  value   = var.domain
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  value   = "backend-lb.spirittours.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "cdn" {
  zone_id = var.cloudflare_zone_id
  name    = "cdn"
  value   = "static.spirittours.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

# Page Rules
resource "cloudflare_page_rule" "cache_static_assets" {
  zone_id = var.cloudflare_zone_id
  target  = "${var.domain}/static/*"
  priority = 1

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 86400
    browser_cache_ttl = 86400
  }
}

resource "cloudflare_page_rule" "cache_images" {
  zone_id = var.cloudflare_zone_id
  target  = "${var.domain}/images/*"
  priority = 2

  actions {
    cache_level = "cache_everything"
    edge_cache_ttl = 2592000  # 30 days
    browser_cache_ttl = 604800  # 7 days
    polish = "lossless"
    mirage = "on"
  }
}

resource "cloudflare_page_rule" "api_no_cache" {
  zone_id = var.cloudflare_zone_id
  target  = "api.${var.domain}/*"
  priority = 3

  actions {
    cache_level = "bypass"
    disable_performance = false
  }
}

# WAF Rules
resource "cloudflare_ruleset" "waf_custom_rules" {
  zone_id = var.cloudflare_zone_id
  name    = "Spirit Tours WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(cf.threat_score > 50) or (cf.bot_score < 30)"
    description = "Block high threat score and bot traffic"
  }

  rules {
    action = "challenge"
    expression = "(http.request.uri.path contains \"admin\" and not ip.src in {10.0.0.0/8})"
    description = "Challenge admin access from non-internal IPs"
  }

  rules {
    action = "block"
    expression = "(http.request.method eq \"POST\" and not http.request.headers[\"content-type\"][0] contains \"application/json\")"
    description = "Block non-JSON POST requests to API"
  }
}

# Rate Limiting
resource "cloudflare_rate_limit" "api_rate_limit" {
  zone_id = var.cloudflare_zone_id
  threshold = 100
  period = 60
  match {
    request {
      url_pattern = "api.${var.domain}/*"
      schemes = ["HTTP", "HTTPS"]
      methods = ["GET", "POST", "PUT", "DELETE"]
    }
  }
  action {
    mode = "simulate"
    timeout = 3600
    response {
      content_type = "application/json"
      body = "{\"error\": \"Rate limit exceeded\"}"
    }
  }
  disabled = false
  description = "API Rate Limiting"
}

# DDoS Protection
resource "cloudflare_zone_settings_override" "spirit_tours_settings" {
  zone_id = var.cloudflare_zone_id

  settings {
    # Security Settings
    security_level = "high"
    challenge_ttl = 1800
    
    # SSL/TLS
    ssl = "full"
    always_use_https = "on"
    automatic_https_rewrites = "on"
    tls_1_3 = "on"
    min_tls_version = "1.2"
    
    # Performance
    brotli = "on"
    minify {
      css = "on"
      js = "on"
      html = "on"
    }
    
    # Caching
    browser_cache_ttl = 14400
    always_online = "on"
    
    # Network
    http3 = "on"
    websockets = "on"
    ip_geolocation = "on"
    
    # Bot Management
    bot_management {
      enable_js = true
      fight_mode = true
    }
  }
}

# Load Balancing
resource "cloudflare_load_balancer" "main_lb" {
  zone_id = var.cloudflare_zone_id
  name = "spirit-tours-lb"
  fallback_pool_id = cloudflare_load_balancer_pool.primary_pool.id
  default_pool_ids = [cloudflare_load_balancer_pool.primary_pool.id]
  description = "Main load balancer for Spirit Tours"
  proxied = true
  steering_policy = "geo"
  session_affinity = "cookie"
  session_affinity_ttl = 1800

  rules {
    name = "API routing"
    condition = "http.host eq \"api.${var.domain}\""
    fixed_response {
      location = "https://backend-lb.spirittours.com"
      status_code = 302
    }
  }

  adaptive_routing {
    failover_across_pools = true
  }

  location_strategy {
    prefer_ecs = "proximity"
    mode = "resolver_ip"
  }
}

resource "cloudflare_load_balancer_pool" "primary_pool" {
  name = "spirit-tours-primary"
  
  origins {
    name = "origin-1"
    address = "1.2.3.4"
    enabled = true
    weight = 1
  }
  
  origins {
    name = "origin-2"
    address = "1.2.3.5"
    enabled = true
    weight = 1
  }
  
  check_regions = ["WNAM", "ENAM", "WEU", "EEU"]
  description = "Primary origin pool"
  monitor = cloudflare_load_balancer_monitor.http_monitor.id
  notification_email = "ops@spirittours.com"
}

resource "cloudflare_load_balancer_monitor" "http_monitor" {
  type = "http"
  expected_codes = "2xx"
  method = "GET"
  timeout = 5
  path = "/health"
  interval = 60
  retries = 2
  description = "Health check monitor"
  
  header {
    header = "X-Health-Check"
    values = ["cloudflare"]
  }
}

# Workers for Edge Computing
resource "cloudflare_worker_script" "image_optimization" {
  name = "image-optimization"
  content = file("${path.module}/workers/image-optimization.js")
  
  plain_text_binding {
    name = "API_KEY"
    text = var.image_optimization_api_key
  }
  
  kv_namespace_binding {
    name = "IMAGE_CACHE"
    namespace_id = cloudflare_workers_kv_namespace.image_cache.id
  }
}

resource "cloudflare_workers_kv_namespace" "image_cache" {
  title = "image_cache"
}

resource "cloudflare_worker_route" "image_route" {
  zone_id = var.cloudflare_zone_id
  pattern = "${var.domain}/images/*"
  script_name = cloudflare_worker_script.image_optimization.name
}

# Cache Reserve
resource "cloudflare_cache_reserve" "main_cache" {
  zone_id = var.cloudflare_zone_id
  enabled = true
}

# Argo Smart Routing
resource "cloudflare_argo" "smart_routing" {
  zone_id = var.cloudflare_zone_id
  tiered_caching = "on"
  smart_routing = "on"
}

# Spectrum for non-HTTP services
resource "cloudflare_spectrum_application" "websocket" {
  protocol = "tcp/443"
  dns {
    type = "CNAME"
    name = "ws.${var.domain}"
  }
  origin_direct = ["tcp://websocket-server.spirittours.com:8080"]
  origin_port = 8080
  tls = "full"
}