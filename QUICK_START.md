# Spirit Tours CMS - Quick Start Guide

## ⚡ Get Started in 15 Minutes

This guide will get your CMS up and running quickly. For detailed documentation, see the full guides.

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js** v18+ installed
- ✅ **MongoDB** running (local or Atlas)
- ✅ **Git** installed
- ✅ **Terminal** access

---

## 🚀 Step 1: Clone & Install (2 minutes)

```bash
# Navigate to project
cd /home/user/webapp

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../spirit-tours
npm install

# Return to project root
cd ..
```

---

## 🗄️ Step 2: Setup MongoDB (5 minutes)

### Option A: MongoDB Atlas (Recommended)

1. Create free account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create cluster (free tier M0)
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (or your IP)
5. Get connection string

### Option B: Docker (Easiest)

```bash
docker run -d \
  --name spirit-tours-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=spirit-tours \
  mongo:7.0
```

### Option C: Local Installation

**Ubuntu/Debian:**
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community@7.0
brew services start mongodb-community@7.0
```

---

## 🔧 Step 3: Configure Environment (1 minute)

Edit `.env` file in project root:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/spirit-tours
# Or for Atlas:
# MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/spirit-tours

# JWT Secret (change in production!)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Server Configuration
NODE_ENV=development
PORT=5001
CORS_ORIGINS=http://localhost:3000
```

---

## 🌱 Step 4: Seed Data (1 minute)

```bash
# Run seed script to create 12 institutional pages
node scripts/seed-institutional-pages.js
```

**Expected output:**
```
✅ Connected to MongoDB
🌱 Starting institutional pages seed...
📄 Creating page: about-us
✅ Created: About Us (about-us)
... (11 more pages)
✨ All done! The 12 institutional pages have been created.
```

**Verify:**
```bash
# Check page count
bash scripts/cms-utils.sh count
# Should show: Total pages: 12
```

---

## 🖥️ Step 5: Start Backend (1 minute)

```bash
cd backend
npm start
```

**Look for these logs:**
```
✅ Mongoose connected successfully for CMS
✅ CMS Pages routes registered
✅ CMS Media routes registered
🚀 Spirit Tours Backend Server running on port 5001
```

**Keep this terminal open!**

---

## 🌐 Step 6: Start Frontend (1 minute)

**Open a NEW terminal:**

```bash
cd /home/user/webapp/spirit-tours
npm start
```

**Frontend will open automatically at:**
```
http://localhost:3000
```

**Keep this terminal open too!**

---

## 🎨 Step 7: Access CMS (30 seconds)

1. Open browser: **http://localhost:3000/admin**
2. Login with admin credentials
3. Click **"📝 CMS Dinámico"** tab
4. You'll see all 12 institutional pages!

---

## ✅ Step 8: Verify Installation (3 minutes)

Run the verification script:

```bash
bash scripts/cms-utils.sh verify
```

**Expected output:**
```
============================================
CMS Installation Verification
============================================
ℹ️  Checking MongoDB...
✅ MongoDB: OK
ℹ️  Checking pages...
  Pages found: 12
✅ Pages: OK (expected 12, found 12)
ℹ️  Checking backend server...
✅ Backend: Running on port 5001
ℹ️  Checking frontend server...
✅ Frontend: Running on port 3000
============================================
Verification Summary
============================================
✅ CMS installation verified!
```

---

## 🎯 Next Steps

### Test the CMS

1. **View Pages**: Click on any page to see details
2. **Edit Page**: Click "Edit" button
3. **Add Section**: Try adding a new block
4. **Drag & Drop**: Reorder sections
5. **Upload Media**: Test image upload
6. **Change SEO**: Update meta title/description
7. **Preview**: Test different viewport sizes
8. **Publish**: Save and publish changes

### Customize Content

Edit the 12 institutional pages for your brand:

- ✏️ **About Us** - Update company story
- ✏️ **Contact Us** - Configure form email
- ✏️ **Services** - Add your tour packages
- ✏️ **FAQ** - Update questions
- ✏️ **Team** - Upload team photos
- ... and 7 more pages!

### Upload Assets

1. Go to Media Library
2. Upload:
   - Logo (PNG with transparency)
   - Hero images (1920x1080px)
   - Team photos (square format)
   - Destination images
3. Add alt text to all images (SEO!)

---

## 🛠️ Useful Commands

```bash
# Utility scripts
bash scripts/cms-utils.sh help          # Show all commands
bash scripts/cms-utils.sh count         # Count pages
bash scripts/cms-utils.sh list          # List all pages
bash scripts/cms-utils.sh backup        # Backup pages
bash scripts/cms-utils.sh verify        # Verify installation
bash scripts/cms-utils.sh clean         # Remove test pages

# Backend
cd backend
npm start                               # Start backend
npm run dev                             # Start with nodemon (auto-reload)

# Frontend
cd spirit-tours
npm start                               # Start development server
npm run build                           # Build for production
npm test                                # Run tests
```

---

## ❓ Troubleshooting

### Backend won't start

**Error: `ECONNREFUSED mongodb`**
```bash
# Check if MongoDB is running
sudo systemctl status mongod          # Linux
brew services list | grep mongodb     # macOS

# Start MongoDB if stopped
sudo systemctl start mongod           # Linux
brew services start mongodb-community # macOS
```

**Error: `Port 5001 already in use`**
```bash
# Find and kill process using port 5001
lsof -ti:5001 | xargs kill -9

# Or change port in .env
PORT=5002
```

### Frontend won't start

**Error: `Port 3000 already in use`**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Error: `Module not found`**
```bash
# Reinstall dependencies
cd spirit-tours
rm -rf node_modules package-lock.json
npm install
```

### CMS pages not showing

```bash
# Re-run seed script
node scripts/seed-institutional-pages.js

# Check if pages exist in DB
bash scripts/cms-utils.sh count

# If count is 0, check MongoDB connection
# Check logs in backend terminal
```

### Can't access admin dashboard

**Issue: "Not authorized"**
- Make sure you're logged in with admin credentials
- Check user role in database
- Clear browser cache and cookies

**Issue: "CMS tab not visible"**
- Verify user has admin/manager role
- Check browser console for errors
- Refresh page

---

## 📚 Documentation

For detailed information, see:

- **MongoDB Setup**: `MONGODB_SETUP.md`
- **Testing Guide**: `CMS_TESTING_GUIDE.md`
- **Deployment Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **CMS Architecture**: `CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md`
- **Seed Script Docs**: `scripts/README_SEED.md`

---

## 🎓 Learn More

### Tutorials

1. **Creating Your First Page**
   - Use template selector
   - Add blocks (Hero, Text, Gallery)
   - Configure SEO
   - Publish

2. **Customizing Existing Pages**
   - Edit text content
   - Replace images
   - Reorder sections
   - Update metadata

3. **Advanced Features**
   - Custom blocks
   - Template creation
   - Multi-language support
   - A/B testing

### Video Guides (Coming Soon)

- CMS Overview (5 min)
- Page Creation Tutorial (10 min)
- Media Management (5 min)
- SEO Best Practices (8 min)

---

## 💡 Tips & Best Practices

### Content Creation

✅ **DO:**
- Use descriptive page titles
- Optimize images before upload (< 200KB)
- Write unique meta descriptions
- Test on mobile devices
- Use alt text on all images

❌ **DON'T:**
- Use very long page titles (> 60 chars)
- Upload huge images (> 5MB)
- Duplicate content across pages
- Forget to save changes
- Skip SEO configuration

### Performance

- Compress images with TinyPNG/ImageOptim
- Use WebP format when possible
- Enable lazy loading for images
- Minimize number of sections per page
- Use CDN for media assets

### SEO

- Unique title and description per page
- Include target keywords naturally
- Use heading hierarchy (H1 → H2 → H3)
- Internal linking between pages
- Set canonical URLs
- Add structured data (Schema.org)

---

## 🚀 Production Deployment

When ready to deploy to production:

1. **Read deployment checklist**: `DEPLOYMENT_CHECKLIST.md`
2. **Backup data**: `bash scripts/cms-utils.sh backup`
3. **Run tests**: See `CMS_TESTING_GUIDE.md`
4. **Deploy backend**: Use PM2 or Docker
5. **Deploy frontend**: Vercel, Netlify, or static host
6. **Configure DNS**: Point domain to servers
7. **Enable HTTPS**: Use Let's Encrypt or CloudFlare
8. **Monitor**: Set up uptime monitoring

---

## 🆘 Get Help

**Need assistance?**

- 📖 Check documentation in `/docs`
- 🐛 Report bugs on GitHub Issues
- 💬 Join community discussions
- 📧 Contact support: support@spirittours.com

---

## ✨ You're All Set!

Your CMS is ready to use. Start creating amazing content! 🎉

**Next:** Customize the 12 institutional pages for your brand and upload your media assets.

---

**Quick Start Guide Version:** 1.0  
**Last Updated:** November 6, 2025  
**Estimated Setup Time:** 15 minutes
