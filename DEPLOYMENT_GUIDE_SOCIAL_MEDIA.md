# 🚀 DEPLOYMENT GUIDE - Social Media AI System

**Date**: 2025-10-04  
**System**: Spirit Tours Social Media Management Platform  
**Status**: Ready for Production Deployment

---

## 📋 PRE-DEPLOYMENT CHECKLIST

Before deploying, ensure you have:

- [ ] PostgreSQL 14+ installed and running
- [ ] Python 3.9+ installed
- [ ] Node.js 16+ and npm installed
- [ ] Git repository cloned
- [ ] Admin access to database
- [ ] Domain/server access (if deploying to production)

---

## 🔧 STEP 1: GENERATE ENCRYPTION KEY

The system uses Fernet encryption to secure API credentials. Generate a unique encryption key:

### Option A: Using Python (Recommended)
```bash
cd /home/user/webapp

# Generate encryption key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

This will output something like:
```
vF8YXZq_F9YBZ7xK5MQ9c8HgN4pL6tRwJ2sD3mK1nE8=
```

**⚠️ IMPORTANT**: 
- Copy this key immediately
- Store it securely (password manager recommended)
- **NEVER commit this key to Git**
- If lost, you'll need to re-encrypt all credentials

### Option B: Using the Service Script
```bash
cd /home/user/webapp/backend
python3 -c "from services.social_media_encryption import CredentialsEncryptionService; print(CredentialsEncryptionService.generate_new_key())"
```

---

## 🗄️ STEP 2: DATABASE SETUP

### 2.1 Create Database (if not exists)

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database
CREATE DATABASE spirit_tours;

# Create user (if not exists)
CREATE USER spirit_tours_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE spirit_tours TO spirit_tours_user;

# Exit
\q
```

### 2.2 Configure Database Connection

Edit `backend/.env` (or create if it doesn't exist):

```bash
cd /home/user/webapp/backend

# Create/edit .env file
cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://spirit_tours_user:your_secure_password@localhost:5432/spirit_tours

# Social Media Encryption Key (generated in Step 1)
SOCIAL_CREDENTIALS_ENCRYPTION_KEY=vF8YXZq_F9YBZ7xK5MQ9c8HgN4pL6tRwJ2sD3mK1nE8=

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://spirittours.com

# Security
SECRET_KEY=your-secret-key-here-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Admin User (for initial setup)
ADMIN_EMAIL=admin@spirittours.com
ADMIN_PASSWORD=change-this-password
EOF
```

**⚠️ SECURITY NOTE**:
- Replace `your_secure_password` with actual password
- Replace `your-secret-key-here` with a strong random key
- Change `ADMIN_PASSWORD` after first login
- Keep `.env` file secure (never commit to Git)

### 2.3 Run Database Migrations

```bash
cd /home/user/webapp/backend

# Install dependencies if not done
pip install -r requirements.txt

# Run migrations
alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade -> 001_initial_migration
INFO  [alembic.runtime.migration] Running upgrade 001_initial_migration -> 002_social_media_system
✅ Migrations completed successfully
```

### 2.4 Verify Database Tables

```bash
# Connect to database
psql -U spirit_tours_user -d spirit_tours

# List tables
\dt

# Expected tables (should include):
# - social_media_credentials
# - social_credentials_audit_log
# - social_media_accounts
# - social_media_posts
# - social_media_interactions
# - social_ai_config
# - social_content_templates
# - social_faq_responses
# - social_media_analytics
# - social_media_alerts
# - social_scheduled_jobs_log

# Exit
\q
```

---

## 🐍 STEP 3: BACKEND SETUP

### 3.1 Install Python Dependencies

```bash
cd /home/user/webapp/backend

# Create virtual environment (recommended)
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install additional dependencies for social media
pip install httpx cryptography python-dotenv
```

### 3.2 Test Encryption Service

```bash
cd /home/user/webapp/backend

# Test encryption
python3 -c "
from services.social_media_encryption import get_encryption_service
import os

# Set key from .env
os.environ['SOCIAL_CREDENTIALS_ENCRYPTION_KEY'] = 'vF8YXZq_F9YBZ7xK5MQ9c8HgN4pL6tRwJ2sD3mK1nE8='

service = get_encryption_service()
encrypted = service.encrypt('test_secret_123')
decrypted = service.decrypt(encrypted)

print(f'Original: test_secret_123')
print(f'Encrypted: {encrypted}')
print(f'Decrypted: {decrypted}')
print(f'Match: {decrypted == \"test_secret_123\"}')
"
```

Expected output:
```
Original: test_secret_123
Encrypted: gAAAAABh...
Decrypted: test_secret_123
Match: True
```

### 3.3 Register API Routes

Ensure the social media API is registered in `backend/main.py`:

```python
# backend/main.py

from fastapi import FastAPI
from backend.api import social_media_credentials_api

app = FastAPI(title="Spirit Tours API")

# Register social media routes
app.include_router(
    social_media_credentials_api.router,
    tags=["Social Media"]
)

# ... other routes
```

### 3.4 Start Backend Server

#### Development Mode:
```bash
cd /home/user/webapp/backend
source venv/bin/activate  # if using venv

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Production Mode (with Gunicorn):
```bash
cd /home/user/webapp/backend
source venv/bin/activate

gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Using PM2 (Recommended for Production):
```bash
cd /home/user/webapp/backend

# Install PM2 globally
npm install -g pm2

# Create ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'spirit-tours-api',
    script: 'venv/bin/uvicorn',
    args: 'main:app --host 0.0.0.0 --port 8000',
    cwd: '/home/user/webapp/backend',
    instances: 4,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
EOF

# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### 3.5 Verify Backend

Open browser: **http://localhost:8000/docs**

You should see the FastAPI Swagger documentation with social media endpoints:
- POST `/api/admin/social-media/credentials/add`
- GET `/api/admin/social-media/credentials/status`
- POST `/api/admin/social-media/credentials/{platform}/test`
- etc.

---

## ⚛️ STEP 4: FRONTEND SETUP

### 4.1 Install Node Dependencies

```bash
cd /home/user/webapp/frontend

# Install dependencies
npm install

# Install additional dependencies (if needed)
npm install @tanstack/react-query axios @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### 4.2 Configure API Base URL

Edit `frontend/src/config/api.ts` (or create if doesn't exist):

```typescript
// frontend/src/config/api.ts

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default API_BASE_URL;
```

Update axios configuration in `frontend/src/services/axios.ts`:

```typescript
// frontend/src/services/axios.ts

import axios from 'axios';
import API_BASE_URL from '../config/api';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default axiosInstance;
```

### 4.3 Configure Environment Variables

Create `frontend/.env`:

```bash
cd /home/user/webapp/frontend

cat > .env << 'EOF'
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
EOF
```

For production:
```bash
REACT_APP_API_URL=https://api.spirittours.com
REACT_APP_ENV=production
```

### 4.4 Add Route to Admin Panel

Edit `frontend/src/App.tsx` (or routing file):

```tsx
// frontend/src/App.tsx

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SocialMediaManager from './components/admin/SocialMediaManager';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ... other routes */}
        
        {/* Social Media Management Route */}
        <Route 
          path="/admin/social-media" 
          element={<SocialMediaManager />} 
        />
        
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### 4.5 Start Frontend Server

#### Development Mode:
```bash
cd /home/user/webapp/frontend

npm start
```

Frontend will start on **http://localhost:3000**

#### Production Build:
```bash
cd /home/user/webapp/frontend

# Build for production
npm run build

# Serve with nginx or serve
npx serve -s build -l 3000
```

### 4.6 Verify Frontend

Open browser: **http://localhost:3000/admin/social-media**

You should see:
- 6 platform cards (Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube)
- "Add Credentials" buttons
- Status indicators
- Tab navigation

---

## ✅ STEP 5: VERIFY DEPLOYMENT

### 5.1 System Health Checks

```bash
# Check backend health
curl http://localhost:8000/api/admin/social-media/credentials/health

# Expected response:
# {
#   "status": "healthy",
#   "service": "social_media_credentials_api",
#   "timestamp": "2025-10-04T12:00:00"
# }
```

### 5.2 Test Encryption

```bash
cd /home/user/webapp/backend

python3 << 'EOF'
from services.social_media_encryption import get_encryption_service

service = get_encryption_service()

# Test encryption
test_data = {
    'app_id': '123456789',
    'app_secret': 'secret_key_123',
    'access_token': 'token_abc456'
}

encrypted = service.encrypt_dict(test_data)
decrypted = service.decrypt_dict(encrypted)

print("✅ Encryption test passed" if test_data['app_secret'] == decrypted['app_secret'] else "❌ Failed")
EOF
```

### 5.3 Test API Endpoint (with curl)

```bash
# Test getting platforms status (requires authentication)
curl -X GET http://localhost:8000/api/admin/social-media/credentials/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🎯 STEP 6: FIRST USE

### 6.1 Login as Admin

Navigate to **http://localhost:3000/admin/login** and login with admin credentials.

### 6.2 Access Social Media Dashboard

Go to **http://localhost:3000/admin/social-media**

### 6.3 Add Your First Platform

1. Click **"Add Credentials"** on Facebook card
2. Fill in the form with credentials from `API_KEYS_STEP_BY_STEP_GUIDE.md`
3. Click **"Save Credentials"**
4. Click **"Test"** button to verify connection
5. If successful, status will change to ✅ **Connected**

### 6.4 Test Connection

```bash
# Alternative: Test via API
curl -X POST http://localhost:8000/api/admin/social-media/credentials/facebook/test \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 🔒 SECURITY CHECKLIST

Before going to production:

- [ ] Change default admin password
- [ ] Generate strong SECRET_KEY
- [ ] Use HTTPS in production
- [ ] Configure firewall rules
- [ ] Enable rate limiting
- [ ] Set up SSL certificates
- [ ] Configure CORS properly
- [ ] Review database permissions
- [ ] Enable database backups
- [ ] Set up monitoring alerts

---

## 📊 MONITORING

### Logs Locations

```bash
# Backend logs (if using PM2)
pm2 logs spirit-tours-api

# Backend logs (if using systemd)
sudo journalctl -u spirit-tours-api -f

# Nginx logs (if using nginx)
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Database logs
tail -f /var/log/postgresql/postgresql-14-main.log
```

### Health Checks

Add to monitoring system (Nagios, Zabbix, etc.):

```bash
# Backend health
curl http://localhost:8000/api/admin/social-media/credentials/health

# Database connectivity
psql -U spirit_tours_user -d spirit_tours -c "SELECT 1;"
```

---

## 🆘 TROUBLESHOOTING

### Issue: "Invalid encryption key"
**Solution**: Check `.env` file has correct `SOCIAL_CREDENTIALS_ENCRYPTION_KEY`

### Issue: "Database connection failed"
**Solution**: 
1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in `.env`
3. Check database user permissions

### Issue: "Module not found"
**Solution**: Reinstall dependencies:
```bash
cd /home/user/webapp/backend
pip install -r requirements.txt
```

### Issue: "CORS error"
**Solution**: Add frontend URL to CORS_ORIGINS in backend/.env

### Issue: "Port already in use"
**Solution**: 
```bash
# Find process using port
sudo lsof -i :8000

# Kill process
sudo kill -9 <PID>
```

---

## 🔄 UPDATES & MAINTENANCE

### Pull Latest Changes

```bash
cd /home/user/webapp
git pull origin main

# Update backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
pm2 restart spirit-tours-api

# Update frontend
cd ../frontend
npm install
npm run build
```

### Database Backups

```bash
# Backup database
pg_dump -U spirit_tours_user spirit_tours > backup_$(date +%Y%m%d).sql

# Restore database
psql -U spirit_tours_user spirit_tours < backup_20251004.sql
```

---

## ✅ DEPLOYMENT COMPLETE!

Your Social Media Management System is now deployed and ready to use! 🎉

**Next Steps**:
1. Follow `API_KEYS_STEP_BY_STEP_GUIDE.md` to obtain API credentials
2. Add credentials for each platform via admin dashboard
3. Test connections
4. Start managing your social media! 🚀

---

**Support**: For issues, check troubleshooting section or review logs  
**Documentation**: See `FEATURE_16_SOCIAL_MEDIA_AI_COMPLETO.md` for features  
**API Guide**: See `API_KEYS_STEP_BY_STEP_GUIDE.md` for obtaining credentials
