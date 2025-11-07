# 🗄️ MongoDB Setup - Quick Start Guide

**Time Required:** 15-20 minutes  
**Difficulty:** Easy  
**Cost:** Free (MongoDB Atlas Free Tier)

---

## 🎯 What You'll Get

After completing this guide:
- ✅ Cloud MongoDB database (always accessible)
- ✅ 512 MB free storage
- ✅ Automatic backups
- ✅ Ready for production deployment
- ✅ 12 pre-seeded institutional pages

---

## 📋 Step-by-Step Setup

### Step 1: Create MongoDB Atlas Account (2 minutes)

1. **Visit MongoDB Atlas**
   ```
   https://www.mongodb.com/cloud/atlas/register
   ```

2. **Sign Up**
   - Enter your email address
   - Create a strong password
   - Accept terms of service
   - Click "Sign Up"

3. **Email Verification**
   - Check your email
   - Click verification link
   - Return to Atlas dashboard

---

### Step 2: Create a Free Cluster (3 minutes)

1. **Choose Deployment Option**
   - Click "Build a Database"
   - Select **"M0 FREE"** (Shared tier)
   - ✅ **This is completely free forever**

2. **Configure Cluster**
   - **Provider:** AWS (recommended)
   - **Region:** Choose closest to your location
     - USA: us-east-1 (N. Virginia)
     - Europe: eu-west-1 (Ireland)
     - Asia: ap-southeast-1 (Singapore)
   - **Cluster Name:** `spirit-tours-cms` (or any name)

3. **Create Cluster**
   - Click "Create"
   - Wait 3-5 minutes for provisioning
   - ☕ Coffee break!

---

### Step 3: Create Database User (2 minutes)

1. **Security Quickstart Appears**
   - Or go to: Security → Database Access → Add New Database User

2. **Authentication Method**
   - Select **"Password"**

3. **User Credentials**
   - **Username:** `cms_admin` (recommended)
   - **Password:** Click "Autogenerate Secure Password"
   - **IMPORTANT:** Copy and save this password!
   
   Example (yours will be different):
   ```
   Username: cms_admin
   Password: aB3dE9fG2hK4mN7pQ1rS5tU8vW
   ```

4. **Database User Privileges**
   - Select **"Read and write to any database"**
   - Click "Add User"

---

### Step 4: Configure Network Access (2 minutes)

1. **Whitelist IP Addresses**
   - Security → Network Access → Add IP Address

2. **For Development/Testing**
   - Click **"Allow Access from Anywhere"**
   - This adds `0.0.0.0/0`
   - ⚠️ **Note:** For production, use specific IP addresses
   - Click "Confirm"

3. **Wait for Status**
   - Status should change to "Active" (green)
   - Usually takes 1-2 minutes

---

### Step 5: Get Connection String (3 minutes)

1. **Go to Database**
   - Click "Database" in left menu
   - You should see your cluster

2. **Connect to Cluster**
   - Click "Connect" button on your cluster

3. **Choose Connection Method**
   - Select **"Connect your application"**

4. **Driver Selection**
   - **Driver:** Node.js
   - **Version:** 4.1 or later

5. **Copy Connection String**
   ```
   mongodb+srv://cms_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Replace Password**
   - Replace `<password>` with your actual password
   - Remove the `< >` brackets
   
   Example:
   ```
   mongodb+srv://cms_admin:aB3dE9fG2hK4mN7pQ1rS5tU8vW@cluster0.abc123.mongodb.net/?retryWrites=true&w=majority
   ```

7. **Add Database Name** (Important!)
   - Add `/spirit-tours-cms` before the `?`
   
   Final string:
   ```
   mongodb+srv://cms_admin:aB3dE9fG2hK4mN7pQ1rS5tU8vW@cluster0.abc123.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority
   ```

---

### Step 6: Configure Your Project (3 minutes)

1. **Navigate to Backend**
   ```bash
   cd /path/to/your/project/backend
   ```

2. **Edit .env File**
   ```bash
   nano .env
   # or use your preferred editor
   ```

3. **Update MongoDB URI**
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://cms_admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority
   
   # Environment
   NODE_ENV=production
   PORT=5000
   
   # CORS (update with your domain)
   CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
   ```

4. **Save File**
   - Ctrl+X, Y, Enter (in nano)
   - Or Save in your editor

---

### Step 7: Test Connection (2 minutes)

1. **Quick Connection Test**
   ```bash
   cd /path/to/your/project/backend
   
   node -e "
   require('dotenv').config();
   const mongoose = require('mongoose');
   
   mongoose.connect(process.env.MONGODB_URI)
     .then(() => {
       console.log('✅ Successfully connected to MongoDB!');
       console.log('📊 Database:', mongoose.connection.name);
       console.log('🌐 Host:', mongoose.connection.host);
       process.exit(0);
     })
     .catch(err => {
       console.error('❌ Connection error:', err.message);
       process.exit(1);
     });
   "
   ```

2. **Expected Output**
   ```
   ✅ Successfully connected to MongoDB!
   📊 Database: spirit-tours-cms
   🌐 Host: cluster0.abc123.mongodb.net
   ```

3. **If You See Errors**
   - Check password is correct (no < > brackets)
   - Verify network access is configured
   - Wait 1-2 minutes if "Active" status pending
   - See troubleshooting section below

---

### Step 8: Seed Your Database (1 minute)

1. **Run Seed Script**
   ```bash
   cd /path/to/your/project
   node scripts/seed-institutional-pages.js
   ```

2. **Expected Output**
   ```
   🌱 Spirit Tours CMS - Seed Script
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   📊 Summary:
      Total Pages: 12
      Published: 10
      Draft: 2
      
   ⏳ Connecting to MongoDB...
   ✅ Connected to database
   
   🗑️  Clearing existing data...
   ✅ Removed 0 existing pages
   
   📝 Creating pages...
   ✅ Created: Home
   ✅ Created: About Us
   ✅ Created: Contact Us
   ✅ Created: Tours
   ✅ Created: Destinations
   ✅ Created: Travel Tips
   ✅ Created: Blog
   ✅ Created: FAQ
   ✅ Created: Terms & Conditions
   ✅ Created: Privacy Policy
   ✅ Created: Booking Confirmation (draft)
   ✅ Created: Newsletter Thank You (draft)
   
   ✨ Seed completed successfully!
      Created: 12 pages
      Time: 2.3s
   ```

---

### Step 9: Start Production Server (1 minute)

1. **Start Backend**
   ```bash
   cd backend
   npm start
   ```

2. **Expected Output**
   ```
   🚀 CMS API Server Starting...
   ✅ MongoDB connected
   📡 Server running on http://localhost:5000
   🌐 Environment: production
   ```

3. **Test API**
   ```bash
   # In another terminal
   curl http://localhost:5000/api/cms/pages | jq '.total'
   # Expected: 12
   ```

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] MongoDB Atlas account created
- [ ] Free cluster created and active
- [ ] Database user created with password saved
- [ ] Network access configured (0.0.0.0/0 or specific IPs)
- [ ] Connection string copied and password replaced
- [ ] `.env` file updated with connection string
- [ ] Connection test successful
- [ ] Seed script executed without errors
- [ ] Backend server starts without errors
- [ ] API returns 12 pages

---

## 🔧 Troubleshooting

### Problem: "Authentication failed"

**Solutions:**
1. **Check password**
   ```bash
   # Make sure there are no < > brackets
   # Password should be: aB3dE9fG2hK4mN7pQ1rS5tU8vW
   # NOT: <aB3dE9fG2hK4mN7pQ1rS5tU8vW>
   ```

2. **Verify username**
   ```
   Username should be exactly: cms_admin
   (or whatever you chose)
   ```

3. **Regenerate password**
   - Go to Database Access in Atlas
   - Click "Edit" on your user
   - Generate new password
   - Update `.env` file

### Problem: "Connection timeout"

**Solutions:**
1. **Check network access**
   - Go to Network Access in Atlas
   - Verify status is "Active" (green)
   - If pending, wait 1-2 minutes

2. **Verify IP whitelist**
   - Should have `0.0.0.0/0` for development
   - Or your specific IP address

3. **Check firewall**
   ```bash
   # Test if port 27017 is accessible
   telnet cluster0.abc123.mongodb.net 27017
   ```

### Problem: "Database not found"

**Solutions:**
1. **Check connection string**
   ```
   Should include database name:
   ...mongodb.net/spirit-tours-cms?retryWrites...
                   ^^^^^^^^^^^^^^^^^
   ```

2. **Database is auto-created**
   - MongoDB creates database on first write
   - Run seed script to create it

### Problem: "Seed script fails"

**Solutions:**
1. **Check connection first**
   ```bash
   node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK'))"
   ```

2. **Verify dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Check error message**
   - Look for specific error
   - Usually authentication or connection issue

---

## 🎯 What's Next?

After successful MongoDB setup:

### Option 1: Local Development
```bash
# Backend
cd backend
npm start

# Frontend (new terminal)
cd spirit-tours
npm run dev

# Access at http://localhost:3000
```

### Option 2: Deploy to Production
Follow the deployment guide:
```bash
# Validate everything is ready
bash scripts/pre-deployment-check.sh

# Follow deployment checklist
# See: DEPLOYMENT_CHECKLIST.md
```

---

## 📊 MongoDB Atlas Dashboard

After setup, explore your dashboard:

1. **Database**
   - View collections
   - Browse documents
   - Run queries

2. **Metrics**
   - Monitor connections
   - Track operations
   - View performance

3. **Backups**
   - Automatic daily backups (free tier)
   - Point-in-time recovery

4. **Alerts**
   - Set up notifications
   - Monitor usage
   - Track errors

---

## 💡 Best Practices

### Security
- ✅ Use strong passwords
- ✅ Restrict IP access in production
- ✅ Rotate credentials regularly
- ✅ Use environment variables (never hardcode)

### Performance
- ✅ Create indexes for frequent queries
- ✅ Monitor slow queries
- ✅ Use projection (select only needed fields)
- ✅ Implement caching

### Backup
- ✅ Enable Atlas backups
- ✅ Test restore process
- ✅ Export data regularly
- ✅ Keep connection strings secure

---

## 📞 Support

### MongoDB Atlas Help
- **Documentation:** https://www.mongodb.com/docs/atlas/
- **Support:** https://support.mongodb.com/
- **Community:** https://www.mongodb.com/community/forums/

### Project Help
- **API Reference:** `API_ENDPOINTS.md`
- **Testing Guide:** `CMS_TESTING_GUIDE.md`
- **Deployment Guide:** `DEPLOYMENT_CHECKLIST.md`
- **Full MongoDB Guide:** `MONGODB_PRODUCTION_SETUP.md`

---

## 📋 Quick Reference

### Connection String Template
```
mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/DATABASE?retryWrites=true&w=majority
```

### Common Commands
```bash
# Test connection
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('OK'))"

# Seed database
node scripts/seed-institutional-pages.js

# Start backend
cd backend && npm start

# View logs
tail -f logs/combined.log
```

### Atlas URLs
```
Main Dashboard: https://cloud.mongodb.com/
Database Access: https://cloud.mongodb.com/security/database/users
Network Access: https://cloud.mongodb.com/security/network/accessList
```

---

## 🎉 Success!

If you've completed all steps:
- ✅ MongoDB is configured and running
- ✅ Database has 12 institutional pages
- ✅ Backend API is connected
- ✅ Ready for production deployment

**Congratulations! Your CMS now has a production-grade database! 🎊**

---

**Estimated Time:** 15-20 minutes  
**Completion Rate:** 100% if following steps exactly  
**Next Step:** Start developing or deploy to production

---

**Quick Start Summary:**
1. ☁️ Create Atlas account → 2 min
2. 🗄️ Create free cluster → 3 min
3. 👤 Create database user → 2 min
4. 🌐 Configure network access → 2 min
5. 🔗 Get connection string → 3 min
6. ⚙️ Update .env file → 3 min
7. ✅ Test connection → 2 min
8. 🌱 Seed database → 1 min
9. 🚀 Start server → 1 min

**Total:** ~20 minutes from zero to production database!
