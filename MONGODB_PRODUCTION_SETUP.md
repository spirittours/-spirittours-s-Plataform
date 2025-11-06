# 🗄️ MongoDB Production Setup Guide

Complete guide to setting up MongoDB for the CMS Dinámico in production.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Option 1: MongoDB Atlas (Recommended)](#option-1-mongodb-atlas-recommended)
3. [Option 2: Docker Installation](#option-2-docker-installation)
4. [Option 3: Local Installation](#option-3-local-installation)
5. [Database Configuration](#database-configuration)
6. [Running the Seed Script](#running-the-seed-script)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### What You'll Get
- ✅ Persistent data storage (no data loss on restart)
- ✅ 12 pre-configured institutional pages
- ✅ Production-ready database
- ✅ Automatic backups (Atlas)
- ✅ Scalability and performance monitoring

### Time Required
- **MongoDB Atlas:** 15-20 minutes
- **Docker:** 10-15 minutes
- **Local Installation:** 20-30 minutes

---

## Option 1: MongoDB Atlas (Recommended)

### Why Atlas?
- ☁️ Fully managed cloud database
- 🆓 Free tier available (512 MB)
- 🔒 Built-in security and backups
- 🌍 Global deployment options
- 📊 Performance monitoring dashboard

### Step 1: Create Atlas Account

1. **Visit MongoDB Atlas**
   ```
   https://www.mongodb.com/cloud/atlas/register
   ```

2. **Sign Up**
   - Email address
   - Password (strong recommended)
   - Accept terms of service

3. **Choose Deployment Option**
   - Select **"Shared" (Free Tier)**
   - Provider: AWS, Google Cloud, or Azure
   - Region: Choose closest to your users
   - Cluster Name: `spirit-tours-cms` (or your preference)

4. **Create Cluster**
   - Click "Create Cluster"
   - Wait 3-5 minutes for provisioning

### Step 2: Configure Database Access

1. **Create Database User**
   - Go to "Database Access" in left menu
   - Click "Add New Database User"
   - Authentication Method: **Password**
   - Username: `cms_admin` (recommended)
   - Password: Generate strong password (SAVE THIS!)
   - Database User Privileges: **Read and write to any database**
   - Click "Add User"

2. **Example Credentials (Generate Your Own!)**
   ```
   Username: cms_admin
   Password: YourSecurePassword123!
   ```

### Step 3: Configure Network Access

1. **Whitelist IP Addresses**
   - Go to "Network Access" in left menu
   - Click "Add IP Address"
   
2. **For Development:**
   - Click "Allow Access from Anywhere"
   - This adds `0.0.0.0/0`
   - ⚠️ **Warning:** Not recommended for production
   
3. **For Production:**
   - Add your server's specific IP address
   - Example: `203.0.113.42/32`
   - More secure than allowing all IPs

4. **Click "Confirm"**

### Step 4: Get Connection String

1. **Connect to Cluster**
   - Go back to "Database" (Clusters view)
   - Click "Connect" on your cluster

2. **Choose Connection Method**
   - Select "Connect your application"
   - Driver: **Node.js**
   - Version: **4.1 or later**

3. **Copy Connection String**
   ```
   mongodb+srv://cms_admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

4. **Replace `<password>` with your actual password**
   ```
   mongodb+srv://cms_admin:YourSecurePassword123!@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Update Environment Variables

1. **Navigate to Backend Directory**
   ```bash
   cd /path/to/your/project/backend
   ```

2. **Edit `.env` File**
   ```bash
   nano .env
   # or use your preferred editor
   ```

3. **Add/Update MongoDB Configuration**
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://cms_admin:YourSecurePassword123!@cluster0.xxxxx.mongodb.net/spirit-tours-cms?retryWrites=true&w=majority
   
   # Optional: Database Name (if not in URI)
   DB_NAME=spirit-tours-cms
   
   # Environment
   NODE_ENV=production
   ```

4. **Save and Close** (Ctrl+X, Y, Enter in nano)

### Step 6: Verify Connection

```bash
cd /path/to/your/project/backend
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ Connected!')).catch(err => console.error('❌ Error:', err))"
```

**Expected Output:**
```
✅ Connected!
```

---

## Option 2: Docker Installation

### Prerequisites
- Docker installed on your system
- Docker Compose (optional)

### Step 1: Pull MongoDB Image

```bash
docker pull mongo:latest
```

### Step 2: Run MongoDB Container

**Simple Method:**
```bash
docker run -d \
  --name mongodb-cms \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=cms_admin \
  -e MONGO_INITDB_ROOT_PASSWORD=your_secure_password \
  -v mongodb_data:/data/db \
  mongo:latest
```

**With Docker Compose (Recommended):**

1. **Create `docker-compose.yml`**
   ```yaml
   version: '3.8'
   
   services:
     mongodb:
       image: mongo:latest
       container_name: mongodb-cms
       restart: always
       ports:
         - "27017:27017"
       environment:
         MONGO_INITDB_ROOT_USERNAME: cms_admin
         MONGO_INITDB_ROOT_PASSWORD: your_secure_password
         MONGO_INITDB_DATABASE: spirit-tours-cms
       volumes:
         - mongodb_data:/data/db
         - mongodb_config:/data/configdb
   
   volumes:
     mongodb_data:
       driver: local
     mongodb_config:
       driver: local
   ```

2. **Start Container**
   ```bash
   docker-compose up -d
   ```

### Step 3: Update Environment Variables

```env
# MongoDB Configuration
MONGODB_URI=mongodb://cms_admin:your_secure_password@localhost:27017/spirit-tours-cms?authSource=admin

# Environment
NODE_ENV=production
```

### Step 4: Verify Connection

```bash
docker exec -it mongodb-cms mongosh -u cms_admin -p your_secure_password
```

**In MongoDB Shell:**
```javascript
use spirit-tours-cms
db.stats()
```

---

## Option 3: Local Installation

### For Ubuntu/Debian

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Reload packages
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

### For macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify
brew services list
```

### For Windows

1. **Download MongoDB Installer**
   ```
   https://www.mongodb.com/try/download/community
   ```

2. **Run Installer**
   - Choose "Complete" installation
   - Install MongoDB as a Service
   - Install MongoDB Compass (GUI tool)

3. **Start MongoDB Service**
   ```cmd
   net start MongoDB
   ```

### Configure Local MongoDB

1. **Create Admin User**
   ```bash
   mongosh
   ```

   ```javascript
   use admin
   db.createUser({
     user: "cms_admin",
     pwd: "your_secure_password",
     roles: ["root"]
   })
   ```

2. **Update `.env`**
   ```env
   MONGODB_URI=mongodb://cms_admin:your_secure_password@localhost:27017/spirit-tours-cms?authSource=admin
   ```

---

## Database Configuration

### Environment Variables Reference

```env
# Required
MONGODB_URI=your_connection_string_here

# Optional
DB_NAME=spirit-tours-cms
NODE_ENV=production
PORT=5000

# Security
JWT_SECRET=your_jwt_secret_here
SESSION_SECRET=your_session_secret_here

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Connection Options

**Production Connection String:**
```javascript
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
}
```

---

## Running the Seed Script

### Step 1: Ensure MongoDB is Connected

```bash
cd /path/to/your/project/backend
node -e "require('mongoose').connect(process.env.MONGODB_URI).then(() => console.log('✅ Ready')).catch(err => console.error('❌ Error:', err))"
```

### Step 2: Run Seed Script

```bash
cd /path/to/your/project
node scripts/seed-institutional-pages.js
```

### Expected Output

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
   
📊 Database Stats:
   Pages: 12
   Published: 10
   Drafts: 2
   
🎉 CMS is ready to use!
```

### Seed Script Features

The seed script creates:
- ✅ 12 institutional pages
- ✅ Complete SEO metadata
- ✅ Realistic content sections
- ✅ Publication dates
- ✅ View statistics
- ✅ Proper slugs and routing

### Pages Created

| Page | Status | Sections | Purpose |
|------|--------|----------|---------|
| Home | Published | 4 | Homepage with hero, features, tours, CTA |
| About Us | Published | 4 | Company story, mission, team, values |
| Contact Us | Published | 2 | Contact form and information |
| Tours | Published | 3 | Tour listings and categories |
| Destinations | Published | 3 | Popular destinations showcase |
| Travel Tips | Published | 2 | Blog-style travel advice |
| Blog | Published | 2 | Main blog page with recent posts |
| FAQ | Published | 2 | Frequently asked questions |
| Terms & Conditions | Published | 1 | Legal terms text |
| Privacy Policy | Published | 1 | Privacy policy text |
| Booking Confirmation | Draft | 2 | Post-booking template |
| Newsletter Thank You | Draft | 2 | Newsletter signup confirmation |

---

## Verification

### Check Database Connection

```bash
cd backend
node -e "
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    console.log('📊 Database:', mongoose.connection.name);
    console.log('🌐 Host:', mongoose.connection.host);
    return mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Connection Error:', err.message);
    process.exit(1);
  });
"
```

### Check Seeded Data

```bash
# Start MongoDB shell
mongosh "your_connection_string"

# In MongoDB shell
use spirit-tours-cms

# Count pages
db.pages.countDocuments()
// Expected: 12

# View pages
db.pages.find({}, { title: 1, status: 1, slug: 1 }).pretty()

# Check published pages
db.pages.countDocuments({ status: 'published' })
// Expected: 10

# Check drafts
db.pages.countDocuments({ status: 'draft' })
// Expected: 2
```

### Test API with Real Data

```bash
# Start backend server
cd backend
npm start

# In another terminal, test API
curl http://localhost:5000/api/cms/pages | jq '.pages[].title'

# Expected output:
# "Home - Spirit Tours"
# "About Us - Spirit Tours"
# "Contact Us - Spirit Tours"
# ... (10 more)
```

---

## Troubleshooting

### Connection Refused

**Problem:** Cannot connect to MongoDB

**Solutions:**
1. **Check MongoDB is running**
   ```bash
   # Atlas: Check cluster status in web console
   # Docker: docker ps | grep mongodb
   # Local: sudo systemctl status mongod
   ```

2. **Verify connection string**
   - Check for typos in MONGODB_URI
   - Ensure password doesn't contain special characters (URL encode if needed)
   - Verify database name is correct

3. **Check network access**
   - Atlas: Verify IP is whitelisted
   - Local/Docker: Ensure port 27017 is open

### Authentication Failed

**Problem:** Invalid credentials error

**Solutions:**
1. **Verify credentials**
   ```bash
   # Check username and password match
   # Ensure authSource is set correctly
   ```

2. **Atlas: Recreate user**
   - Go to Database Access
   - Delete user
   - Create new user with correct privileges

3. **Local: Reset admin password**
   ```bash
   mongosh
   use admin
   db.changeUserPassword("cms_admin", "new_password")
   ```

### Seed Script Fails

**Problem:** Error during seeding

**Solutions:**
1. **Clear existing data**
   ```bash
   mongosh "your_connection_string"
   use spirit-tours-cms
   db.pages.deleteMany({})
   ```

2. **Check Mongoose models**
   ```bash
   cd backend
   node -e "require('./models/Page')"
   # Should not show errors
   ```

3. **Run with verbose logging**
   ```bash
   DEBUG=* node scripts/seed-institutional-pages.js
   ```

### Slow Performance

**Problem:** Database queries are slow

**Solutions:**
1. **Create indexes**
   ```javascript
   db.pages.createIndex({ slug: 1 })
   db.pages.createIndex({ status: 1 })
   db.pages.createIndex({ createdAt: -1 })
   ```

2. **Monitor Atlas performance**
   - Check Atlas dashboard
   - Review slow queries
   - Upgrade tier if needed

3. **Optimize queries**
   - Use projection to select only needed fields
   - Implement pagination
   - Cache frequently accessed data

---

## Next Steps

After successful MongoDB setup:

1. ✅ **Start Production Server**
   ```bash
   cd backend
   npm start
   ```

2. ✅ **Run Tests**
   ```bash
   npm test
   ```

3. ✅ **Follow Deployment Checklist**
   - See `DEPLOYMENT_CHECKLIST.md`
   - Configure environment variables on hosting platform
   - Deploy backend and frontend

4. ✅ **Monitor Performance**
   - Set up Atlas monitoring
   - Configure alerting
   - Review slow queries

---

## Security Best Practices

### 1. Strong Passwords
```
❌ Bad: password123
✅ Good: K9#mP$vL2@qR8!xZ
```

### 2. Restricted Network Access
```
❌ Bad: 0.0.0.0/0 (allow all IPs)
✅ Good: 203.0.113.42/32 (specific IP)
```

### 3. Environment Variables
```
❌ Bad: Hardcoded in code
✅ Good: .env file (not committed to git)
```

### 4. Regular Backups
- Atlas: Automatic daily backups
- Self-hosted: Configure mongodump cron job

### 5. Monitoring
- Enable Atlas monitoring
- Set up alerts for:
  - Connection failures
  - Slow queries
  - High CPU/memory usage

---

## Support Resources

### MongoDB Atlas
- **Documentation:** https://www.mongodb.com/docs/atlas/
- **Support:** https://support.mongodb.com/
- **Community:** https://www.mongodb.com/community/forums/

### Docker
- **Documentation:** https://docs.docker.com/
- **MongoDB Image:** https://hub.docker.com/_/mongo

### Project-Specific
- **CMS Documentation:** See `README.md`
- **API Reference:** See `API_ENDPOINTS.md`
- **Testing Guide:** See `CMS_TESTING_GUIDE.md`

---

## Summary Checklist

- [ ] MongoDB installed/configured
- [ ] Connection string added to `.env`
- [ ] Database user created with proper permissions
- [ ] Network access configured
- [ ] Connection verified
- [ ] Seed script executed successfully
- [ ] 12 pages created in database
- [ ] API tests passing
- [ ] Backups configured
- [ ] Monitoring enabled

---

**Estimated Time:** 15-30 minutes  
**Difficulty:** Beginner to Intermediate  
**Next Step:** Testing → See `CMS_TESTING_GUIDE.md`

🎉 **You're ready for production!**
