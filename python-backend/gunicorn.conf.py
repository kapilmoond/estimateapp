# Gunicorn configuration for Cloud Run deployment
import os

# Bind to the PORT environment variable (Cloud Run requirement)
bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"

# Worker configuration
workers = 1
worker_class = "sync"
worker_connections = 1000

# Timeout configuration (important for ezdxf operations)
timeout = 300
keepalive = 30

# Logging
loglevel = "info"
access_logfile = "-"
error_logfile = "-"

# Performance settings
preload_app = True
max_requests = 1000
max_requests_jitter = 100

# Cloud Run optimizations
forwarded_allow_ips = "*"
secure_scheme_headers = {
    "X-FORWARDED-PROTOCOL": "ssl",
    "X-FORWARDED-PROTO": "https",
    "X-FORWARDED-SSL": "on"
}