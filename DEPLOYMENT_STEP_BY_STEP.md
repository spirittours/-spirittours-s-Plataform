# 🚀 Deployment Step-by-Step Guide

**Current Status:** Ready to deploy  
**Target:** Production (Vercel + Railway + MongoDB Atlas)  
**Estimated Time:** 30-45 minutes  

---

## ✅ Prerequisites Check

Before we start, confirm you have:
- [ ] GitHub account
- [ ] Code is in GitHub repository
- [ ] Email account for service signups

**You DON'T need:**
- ❌ Credit card (all free tiers)
- ❌ Domain name (we'll use free subdomains)
- ❌ Server access (all managed services)

---

## 📊 Deployment Architecture

```
┌─────────────────┐
│   Your Users    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Vercel (CDN)   │ ← Frontend React App
│  Free Hosting   │    (spirit-tours/)
└────────┬────────┘
         │ HTTPS API Calls
         ▼
┌─────────────────┐
│  Railway        │ ← Backend Node.js API
│  Free Tier      │    (backend/)
└────────┬────────┘
         │ MongoDB Connection
         ▼
┌─────────────────┐
│  MongoDB Atlas  │ ← Database
│  512MB Free     │    (Cloud)
└─────────────────┘
```

---

## Phase 1: MongoDB Atlas Setup (15 minutes)

### Step 1.1: Create MongoDB Atlas Account

1. **Open in browser:**
   ```
   https://www.mongodb.com/cloud/atlas/register
   ```

2. **Sign up with:**
   - Email + Password, OR
   - Google account, OR
   - GitHub account

3. **Verify email** (check inbox)

### Step 1.2: Create Free Cluster

1. **After login:**
   - Click "Build a Database"
   - Select **"M0 FREE"** (Shared)
   - **Cost: $0 forever**

2. **Choose Configuration:**
   ```
   Provider: AWS (recommended)
   Region: Choose closest to you:
     - USA: us-east-1 (N. Virginia)
     - Europe: eu-west-1 (Ireland)
     - Asia: ap-southeast-1 (Singapore)
   
   Cluster Name: spirit-tours-cms
   ```

3. **Click "Create"**
   - ⏱️ Wait 3-5 minutes for provisioning
   - Status will change from "Creating..." to "Active"

### Step 1.3: Create Database User

1. **Security Quickstart appears automatically**
   - Or navigate: Security → Database Access

2. **Create User:**
   ```
   Authentication: Password
   Username: cms_admin
   Password: [Click "Autogenerate Secure Password"]
   ```

3. **⚠️ IMPORTANT: Copy password immediately!**
   ```
   Example (yours will be different):
   cms_admin / K9#mP$vL2@qR8!xZ
   
   Save in notepad or password manager!
   ```

4. **Database User Privileges:**
   - Select: "Read and write to any database"

5. **Click "Add User"**

### Step 1.4: Configure Network Access

1. **Network Access configuration:**
   - Security → Network Access → Add IP Address

2. **For now (development):**
   - Click "Allow Access from Anywhere"
   - This adds: `0.0.0.0/0`
   - ⚠️ Note: For production, you'd add specific IPs

3. **Click "Confirm"**
   - Wait for status to change to "Active" (green)

### Step 1.5: Get Connection String

1. **Go to Database section:**
   - Click "Database" in left menu
   - Find your cluster

2. **Click "Connect" button**

3. **Choose "Connect your application"**

4. **Copy connection string:**
   ```
   mongodb+srv://cms_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

5. **Modify the string:**
   
   **Original:**
   ```
   mongodb+srv://cms_admin:<password>@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
   
   **Replace <password>:**
   ```
   mongodb+srv://cms_admin:K9#mP$vL2@qR8!xZ@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```
   
   **Add database name before ?:**
   ```
   mongodb+srv://cms_admin:K9#mP$vL2@qR8!xZ@cluster0.abc123.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority
   ```

6. **Save this connection string!** You'll need it for Railway and local testing.

### Step 1.6: Seed Database (Optional but Recommended)

If you have local Node.js installed:

```bash
# On your local machine:
cd /path/to/project/backend

# Create .env file
echo "MONGODB_URI=your_connection_string_here" > .env

# Install dependencies (if not done)
npm install

# Run seed script
cd ..
node scripts/seed-institutional-pages.js
```

**Expected output:**
```
✅ Created: 12 pages
   Published: 10
   Drafts: 2
   Time: 2.3s
```

**Skip this if you don't have local Node.js** - we'll seed after Railway deployment.

---

## Phase 2: Backend Deployment to Railway (15 minutes)

### Step 2.1: Create Railway Account

1. **Open:**
   ```
   https://railway.app/
   ```

2. **Sign up:**
   - Click "Start a New Project"
   - **Choose "Login with GitHub"** (recommended)
   - Authorize Railway to access your repositories

3. **Why GitHub login?**
   - Automatic deployments on git push
   - Easy repository connection
   - Secure authentication

### Step 2.2: Deploy Backend

1. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Choose Repository:**
   - Find your repository: `spirittours/-spirittours-s-Plataform`
   - Click to select

3. **Configure Deploy:**
   - Railway will scan your repo
   - It should detect Node.js automatically

4. **⚠️ IMPORTANT: Set Root Directory**
   
   Railway needs to know your backend is in a subfolder:
   
   - Click on the service (should say "spirittours-s-plataform" or similar)
   - Go to "Settings" tab
   - Find "Root Directory"
   - Set to: `backend`
   - Click "Save"

5. **Configure Build Settings:**
   - Build Command: `npm install` (auto-detected)
   - Start Command: `npm start` or `node server.js`

### Step 2.3: Add Environment Variables

This is critical! Click on "Variables" tab and add each one:

```env
# MongoDB Connection (REQUIRED)
MONGODB_URI=mongodb+srv://cms_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority

# Environment (REQUIRED)
NODE_ENV=production

# Port (Railway auto-assigns, but good to have)
PORT=5000

# CORS Origins (REQUIRED - update after Vercel deployment)
CORS_ORIGINS=http://localhost:3000,https://your-app.vercel.app

# Security (REQUIRED)
JWT_SECRET=your_random_secret_key_here_make_it_long_and_random
SESSION_SECRET=another_random_secret_key_different_from_jwt

# Optional but recommended
LOG_LEVEL=info
```

**To generate secrets:**
```bash
# On your terminal:
openssl rand -base64 32
# Use output for JWT_SECRET

openssl rand -base64 32
# Use output for SESSION_SECRET
```

Or use: https://randomkeygen.com/

### Step 2.4: Deploy

1. **Trigger Deployment:**
   - Railway auto-deploys when you add variables
   - Or click "Deploy" if needed

2. **Monitor Build:**
   - Click on "Deployments" tab
   - Watch the build logs
   - ⏱️ Usually takes 2-3 minutes

3. **Check for errors:**
   - ✅ Build succeeded = good!
   - ❌ Build failed = check logs for errors

### Step 2.5: Generate Public URL

1. **Go to Settings:**
   - Click "Settings" tab
   - Scroll to "Networking" section

2. **Generate Domain:**
   - Click "Generate Domain"
   - Railway creates: `your-app-production.up.railway.app`

3. **Copy URL:**
   ```
   Your backend URL: https://your-app-production.up.railway.app
   ```

4. **Test Backend:**
   ```bash
   # In your terminal:
   curl https://your-app-production.up.railway.app/api/cms/pages
   
   # Expected: JSON response with pages
   # If you seeded: {"success":true,"pages":[...],"total":12}
   # If not seeded: {"success":true,"pages":[],"total":0}
   ```

### Step 2.6: Seed Database (if not done locally)

If you didn't seed locally, connect to Railway and seed:

1. **Railway CLI** (optional advanced method):
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link to project
   railway link
   
   # Run seed script
   railway run node scripts/seed-institutional-pages.js
   ```

2. **Alternative: Use local Node.js with Railway's MongoDB URL**
   ```bash
   # On your machine:
   cd /path/to/project
   MONGODB_URI="your_railway_mongodb_uri" node scripts/seed-institutional-pages.js
   ```

---

## Phase 3: Frontend Deployment to Vercel (10 minutes)

### Step 3.1: Create Vercel Account

1. **Open:**
   ```
   https://vercel.com/signup
   ```

2. **Sign up:**
   - Choose "Continue with GitHub"
   - Authorize Vercel

### Step 3.2: Import Project

1. **Add New Project:**
   - Click "Add New..." → "Project"
   - Or click "Import Project"

2. **Select Repository:**
   - Find: `spirittours/-spirittours-s-Plataform`
   - Click "Import"

### Step 3.3: Configure Build

1. **Framework Preset:**
   - Vercel should detect: "Vite"
   - If not, select it manually

2. **Root Directory:**
   - ⚠️ IMPORTANT: Set to `spirit-tours`
   - Click "Edit" next to Root Directory
   - Type: `spirit-tours`

3. **Build Settings:**
   ```
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Environment Variables:**
   
   Click "Environment Variables" and add:
   
   ```env
   VITE_API_URL=https://your-app-production.up.railway.app
   ```
   
   Replace with your actual Railway URL from Step 2.5!

### Step 3.4: Deploy

1. **Click "Deploy"**
   - ⏱️ Takes 2-3 minutes
   - Watch the build logs

2. **Build Success:**
   - You'll see: "Congratulations! Your project has been deployed"
   - Vercel assigns URL: `your-project.vercel.app`

3. **Visit Your Site:**
   - Click "Visit" button
   - Or open the URL in browser

### Step 3.5: Update Backend CORS

**Critical!** Go back to Railway and update CORS:

1. **Railway Dashboard:**
   - Go to your backend service
   - Click "Variables" tab

2. **Update CORS_ORIGINS:**
   ```env
   CORS_ORIGINS=https://your-project.vercel.app,https://www.yourdomain.com
   ```
   
   Replace `your-project.vercel.app` with your actual Vercel URL!

3. **Redeploy:**
   - Railway auto-redeploys on variable change
   - Or manually trigger redeploy

---

## Phase 4: Verification & Testing (5 minutes)

### Step 4.1: Test Backend

```bash
# Get all pages
curl https://your-app-production.up.railway.app/api/cms/pages | jq '.total'

# Expected: 12 (if seeded) or 0 (if not seeded)
```

### Step 4.2: Test Frontend

1. **Open your Vercel URL in browser:**
   ```
   https://your-project.vercel.app
   ```

2. **Check homepage loads**

3. **Navigate to CMS admin:**
   ```
   https://your-project.vercel.app/admin/cms
   ```

4. **Verify pages load:**
   - Should see list of pages (if seeded)
   - Try creating a new page
   - Try editing a page

### Step 4.3: Test Integration

1. **Create New Page:**
   - Click "Create Page" in CMS
   - Add title: "Test Page"
   - Add a hero section
   - Save

2. **Verify in Database:**
   ```bash
   curl https://your-app-production.up.railway.app/api/cms/pages | jq '.total'
   # Should increase by 1
   ```

3. **Check MongoDB Atlas:**
   - Go to Atlas Dashboard
   - Browse Collections
   - Should see new page in `pages` collection

---

## Phase 5: Custom Domain (Optional - 5 minutes)

### If you have a domain:

#### For Frontend (Vercel):
1. Project Settings → Domains
2. Add your domain: `www.yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```
4. SSL auto-configured

#### For Backend (Railway):
1. Settings → Domains
2. Add: `api.yourdomain.com`
3. Configure DNS:
   ```
   Type: CNAME
   Name: api
   Value: your-app.up.railway.app
   ```

---

## 🎉 Deployment Complete!

### Your Live URLs:

```
Frontend: https://your-project.vercel.app
Backend:  https://your-app-production.up.railway.app
Database: MongoDB Atlas (managed)
```

### Dashboards:

```
Vercel:   https://vercel.com/dashboard
Railway:  https://railway.app/dashboard
MongoDB:  https://cloud.mongodb.com/
```

---

## 📊 Post-Deployment Checklist

- [ ] Backend responds to /api/cms/pages
- [ ] Frontend loads successfully
- [ ] CMS admin panel accessible
- [ ] Can create pages via UI
- [ ] Pages persist in database
- [ ] MongoDB Atlas shows data
- [ ] No CORS errors in browser console
- [ ] All environment variables set
- [ ] Both services showing "healthy" status

---

## 🔧 Common Issues & Solutions

### Issue: Backend shows "Connection refused"
**Solution:**
```bash
# Check Railway logs
# Verify MONGODB_URI is correct
# Ensure network access in Atlas is configured
```

### Issue: Frontend can't reach backend
**Solution:**
```bash
# Check VITE_API_URL in Vercel
# Verify CORS_ORIGINS in Railway
# Try with browser dev tools (Network tab)
```

### Issue: "Authentication failed" from MongoDB
**Solution:**
```bash
# Double-check password in MONGODB_URI
# Ensure no < > brackets around password
# Verify user exists in Atlas Database Access
```

### Issue: Build fails on Railway/Vercel
**Solution:**
```bash
# Check build logs for specific error
# Verify package.json has all dependencies
# Check Node.js version compatibility
```

---

## 🎯 Next Steps After Deployment

1. **Monitor Performance:**
   - Railway: Check metrics tab
   - Vercel: Enable analytics
   - MongoDB: Review Atlas metrics

2. **Set Up Monitoring:**
   - Configure health checks
   - Set up error alerts
   - Monitor uptime

3. **Create Content:**
   - Add real pages via CMS
   - Upload media assets
   - Create templates

4. **Optimize:**
   - Review slow queries
   - Enable caching
   - Optimize images

---

## 💡 Pro Tips

### Railway:
- Enable automatic deployments on git push
- Set up staging environment (separate service)
- Monitor resource usage (free tier limits)

### Vercel:
- Use preview deployments for PRs
- Enable Vercel Analytics (free)
- Set up custom domains early

### MongoDB:
- Create indexes for frequent queries
- Set up backup alerts
- Monitor slow operations

---

## 📞 Support Resources

### If you get stuck:

**Railway:**
- Docs: https://docs.railway.app/
- Discord: https://discord.gg/railway

**Vercel:**
- Docs: https://vercel.com/docs
- Community: https://github.com/vercel/vercel/discussions

**MongoDB:**
- Docs: https://www.mongodb.com/docs/atlas/
- Support: https://support.mongodb.com/

**Project-Specific:**
- API Docs: `API_ENDPOINTS.md`
- Testing: `CMS_TESTING_GUIDE.md`
- User Guide: `CMS_USER_GUIDE.md`

---

## ✅ Success Criteria

You've successfully deployed when:
- ✅ Frontend loads at Vercel URL
- ✅ Backend responds at Railway URL
- ✅ CMS admin works
- ✅ Can create/edit/delete pages
- ✅ Data persists in MongoDB
- ✅ No console errors
- ✅ All services show "healthy"

**Congratulations! Your CMS is now live! 🎊🚀**

---

**Deployment Time:** ~45 minutes  
**Difficulty:** ⭐⭐☆☆☆  
**Cost:** $0 (all free tiers)  
**Maintenance:** Automatic updates & scaling
