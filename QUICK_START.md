# ⚡ QUICK START GUIDE - Social Media AI System

**Get up and running in 10 minutes!**

---

## 🚀 ONE-COMMAND SETUP

```bash
cd /home/user/webapp
./setup_social_media.sh
```

This automated script will:
- ✅ Check prerequisites
- ✅ Generate encryption key
- ✅ Create configuration files
- ✅ Install dependencies
- ✅ Run database migrations
- ✅ Test encryption

---

## 🎯 START SERVERS

### Terminal 1: Backend
```bash
cd /home/user/webapp/backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd /home/user/webapp/frontend
npm start
```

---

## 🌐 ACCESS DASHBOARD

Open browser: **http://localhost:3000/admin/social-media**

You'll see 6 platform cards ready to configure!

---

## 🔑 ADD YOUR FIRST PLATFORM (Facebook)

### Step 1: Get API Credentials
Follow `API_KEYS_STEP_BY_STEP_GUIDE.md` section 1️⃣

You'll need:
- App ID
- App Secret  
- Page Access Token
- Page ID

### Step 2: Add to Dashboard
1. Click **"Add Credentials"** on Facebook card
2. Paste your credentials
3. Click **"Save Credentials"**
4. Click **"Test"** button
5. Status changes to ✅ **Connected**

---

## ✅ VERIFY IT WORKS

```bash
# Test backend
curl http://localhost:8000/api/admin/social-media/credentials/health

# Test encryption
cd /home/user/webapp/backend && python3 << 'EOF'
from services.social_media_encryption import get_encryption_service
service = get_encryption_service()
print("✅ Encryption works!" if service.encrypt("test") else "❌ Failed")
EOF
```

---

## 🎯 WHAT YOU CAN DO NOW

✅ **Add credentials** for all 6 platforms  
✅ **Test connections** with one click  
✅ **Enable/disable** platforms on-the-fly  
✅ **View connection status** in real-time  
✅ **Track changes** with audit logs  

---

## 📚 NEED HELP?

- **Full Deployment Guide**: `DEPLOYMENT_GUIDE_SOCIAL_MEDIA.md`
- **API Keys Guide**: `API_KEYS_STEP_BY_STEP_GUIDE.md`
- **Features Documentation**: `FEATURE_16_SOCIAL_MEDIA_AI_COMPLETO.md`

---

## 🆘 TROUBLESHOOTING

### Backend won't start?
```bash
# Check .env file exists
cat backend/.env

# Reinstall dependencies
cd backend
pip install -r requirements.txt
```

### Frontend won't start?
```bash
# Reinstall dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Database connection error?
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Verify DATABASE_URL in backend/.env
```

---

## 🎉 YOU'RE READY!

Start collecting those API keys and managing your social media! 🚀

**Next**: Follow `API_KEYS_STEP_BY_STEP_GUIDE.md` to get credentials for:
- Facebook/Instagram (30-45 min)
- YouTube (20-30 min)
- Twitter/X (20-30 min)
- LinkedIn (15-20 min)
- TikTok (10 min + 1-2 weeks approval)
