# 🚀 DEPLOYMENT QUICK REFERENCE CARD

**Copy this to keep handy during deployment**

---

## 📋 PHASE 1: MongoDB Atlas
**URL:** https://www.mongodb.com/cloud/atlas/register

**Settings:**
- Deployment: M0 FREE
- Provider: AWS
- Region: us-east-1
- Name: spirit-tours-cms

**User:**
- Username: cms_admin
- Password: [AUTOGENERATE - SAVE IT!]

**Network:** Allow 0.0.0.0/0

**Connection String Template:**
```
mongodb+srv://cms_admin:PASSWORD@cluster0.xxxxx.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority
```

---

## 📋 PHASE 2: Railway Backend
**URL:** https://railway.app/

**Settings:**
- Root Directory: `backend`
- Build: npm install
- Start: npm start

**Environment Variables:**
```env
MONGODB_URI=[from Phase 1]
NODE_ENV=production
PORT=5000
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=[openssl rand -base64 32]
SESSION_SECRET=[openssl rand -base64 32]
```

**Generate Secrets:**
```bash
openssl rand -base64 32
```

---

## 📋 PHASE 3: Vercel Frontend
**URL:** https://vercel.com/signup

**Settings:**
- Root Directory: `spirit-tours`
- Framework: Vite
- Build: npm run build
- Output: dist

**Environment Variable:**
```env
VITE_API_URL=[Railway URL from Phase 2]
```

**Update Railway CORS:**
```
CORS_ORIGINS=[Vercel URL from Phase 3]
```

---

## ✅ VERIFICATION COMMANDS

**Test Backend:**
```bash
curl https://your-railway-url.up.railway.app/api/cms/pages
```

**Test Frontend:**
```
Open: https://your-vercel-url.vercel.app
Navigate to: /admin/cms
Create test page
```

---

## 🔗 QUICK LINKS

**Signup:**
- MongoDB: https://www.mongodb.com/cloud/atlas/register
- Railway: https://railway.app/
- Vercel: https://vercel.com/signup

**Dashboards:**
- MongoDB: https://cloud.mongodb.com/
- Railway: https://railway.app/dashboard
- Vercel: https://vercel.com/dashboard

**Tools:**
- Generate Secret: https://randomkeygen.com/
- Test JSON: https://jsonlint.com/

---

## 🚨 QUICK TROUBLESHOOTING

**MongoDB won't connect:**
- Check password (no < >)
- Verify /spirit-tours-cms in URI
- Check network access is Active

**Railway build fails:**
- Verify root directory: backend
- Check all env vars set
- Review deployment logs

**Vercel build fails:**
- Verify root directory: spirit-tours
- Check VITE_API_URL set
- Review deployment logs

**CORS errors:**
- Update CORS_ORIGINS in Railway
- Include full Vercel URL
- No trailing slash
- Hard refresh (Ctrl+Shift+R)

---

## 📝 YOUR CREDENTIALS

**MongoDB:**
```
Username: cms_admin
Password: ________________
Connection: ________________
```

**Secrets:**
```
JWT_SECRET: ________________
SESSION_SECRET: ________________
```

**URLs:**
```
Railway:  https://________________.up.railway.app
Vercel:   https://________________.vercel.app
```

---

**Time:** ~45 minutes total
**Cost:** $0 (all free tiers)
**Status:** Ready to deploy! 🚀
