# MongoDB Setup Guide for Spirit Tours CMS

## Overview

The Spirit Tours CMS Dinámico requires MongoDB for data persistence. This guide explains how to set up MongoDB for development and production environments.

## Environment Configuration

### Required Environment Variable

Add the following to your `.env` file:

```bash
MONGODB_URI=mongodb://localhost:27017/spirit-tours
```

**For Production with MongoDB Atlas:**

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/spirit-tours?retryWrites=true&w=majority
```

## Setup Options

### Option 1: MongoDB Atlas (Recommended for Production)

MongoDB Atlas provides a free tier with 512MB storage, perfect for getting started.

1. **Create Account**: Go to https://www.mongodb.com/cloud/atlas/register
2. **Create Cluster**: 
   - Choose "Shared" (Free Tier)
   - Select region closest to your deployment
   - Cluster name: `spirit-tours-cluster`
3. **Database Access**:
   - Create database user
   - Username: `spirit-tours-admin`
   - Generate secure password
   - Set role: "Atlas admin" or "Read and write to any database"
4. **Network Access**:
   - Add IP address: `0.0.0.0/0` (allow from anywhere) for development
   - For production, restrict to specific IPs
5. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password
   - Update `.env` with the connection string

### Option 2: Local MongoDB Installation

#### Ubuntu/Debian

```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify installation
mongosh --eval "db.version()"
```

#### macOS

```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify installation
mongosh --eval "db.version()"
```

#### Windows

1. Download MongoDB Community Server from https://www.mongodb.com/try/download/community
2. Run the installer (choose "Complete" installation)
3. Install MongoDB as a Windows Service
4. Verify installation by opening Command Prompt and running:
   ```cmd
   mongosh --eval "db.version()"
   ```

### Option 3: Docker (Easiest for Development)

```bash
# Pull MongoDB image
docker pull mongo:7.0

# Run MongoDB container
docker run -d \
  --name spirit-tours-mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_DATABASE=spirit-tours \
  -v mongodb_data:/data/db \
  mongo:7.0

# Verify container is running
docker ps | grep spirit-tours-mongodb

# Connect to MongoDB
mongosh mongodb://localhost:27017/spirit-tours
```

**Docker Compose** (recommended):

Create `docker-compose.mongodb.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    container_name: spirit-tours-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: spirit-tours
    volumes:
      - mongodb_data:/data/db
      - ./scripts:/docker-entrypoint-initdb.d
    networks:
      - spirit-tours-network

volumes:
  mongodb_data:
    driver: local

networks:
  spirit-tours-network:
    driver: bridge
```

Start with:
```bash
docker-compose -f docker-compose.mongodb.yml up -d
```

## Backend Configuration

The backend server (`backend/server.js`) automatically connects to MongoDB on startup using Mongoose:

```javascript
const mongoose = require('mongoose');
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/spirit-tours';

await mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
```

## Seeding Institutional Pages

Once MongoDB is connected, run the seed script to create the 12 institutional pages:

```bash
# From the project root
cd /home/user/webapp
node scripts/seed-institutional-pages.js
```

**Expected Output:**
```
✅ Connected to MongoDB

🌱 Starting institutional pages seed...

📄 Creating page: about-us
✅ Created: About Us (about-us)

📄 Creating page: contact-us
✅ Created: Contact Us (contact-us)

... (10 more pages)

✨ All done! The 12 institutional pages have been created.

You can now view them in the CMS at: /admin/cms/pages
```

## Institutional Pages Created

The seed script creates the following pages:

1. **about-us** - About Us page with company story and team gallery
2. **contact-us** - Contact page with form (5 fields)
3. **our-services** - Services overview page
4. **faq** - FAQ page with accordion (6 questions)
5. **privacy-policy** - Privacy policy content
6. **terms-and-conditions** - Terms and conditions
7. **cancellation-policy** - Cancellation and refund policy
8. **our-team** - Team page with photos
9. **careers** - Careers page with job openings
10. **blog** - Blog landing page
11. **press-media** - Press and media information
12. **partners** - Partner network information

## Verifying Setup

### 1. Check MongoDB Connection

```bash
# Using mongosh
mongosh mongodb://localhost:27017/spirit-tours

# In mongosh:
> show collections
> db.pages.countDocuments()
```

### 2. Check Backend Logs

When starting the backend server, you should see:

```
🍃 Connecting to MongoDB (Mongoose for CMS)...
✅ Mongoose connected successfully for CMS
```

### 3. Test CMS API

```bash
# Get all pages
curl http://localhost:5001/api/cms/pages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get page by slug
curl http://localhost:5001/api/cms/pages/by-slug/about-us
```

### 4. Access Admin Dashboard

1. Navigate to http://localhost:3000/admin
2. Click on "📝 CMS Dinámico" tab
3. You should see all 12 institutional pages listed

## Troubleshooting

### Connection Refused Error

```
MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017
```

**Solutions:**
- Verify MongoDB is running: `sudo systemctl status mongod`
- Check MongoDB is listening on port 27017: `sudo netstat -tulpn | grep 27017`
- Check firewall settings
- For Docker: Ensure container is running: `docker ps`

### Authentication Error

```
MongoServerError: Authentication failed
```

**Solutions:**
- Verify username and password in connection string
- Check MongoDB user has proper permissions
- For Atlas: Ensure IP whitelist includes your server IP

### Timeout Error

```
MongooseServerSelectionError: Server selection timeout
```

**Solutions:**
- Check network connectivity
- For Atlas: Verify network access settings
- Increase timeout in connection options

### Buffering Timeout

```
MongooseError: Operation buffering timed out
```

**Solutions:**
- Ensure MongoDB connection is established before making queries
- Check MongoDB service is running
- Verify connection string is correct

## Production Deployment

### MongoDB Atlas Production Checklist

- [ ] Create production cluster (not free tier for production loads)
- [ ] Enable backup and point-in-time recovery
- [ ] Configure IP whitelist with specific server IPs
- [ ] Use strong passwords and store securely (environment variables)
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring and alerts
- [ ] Configure connection pooling appropriately
- [ ] Enable SSL/TLS for connections
- [ ] Regular database backups
- [ ] Monitor database performance metrics

### Self-Hosted Production Checklist

- [ ] MongoDB replica set (minimum 3 nodes for high availability)
- [ ] Enable authentication and authorization
- [ ] Configure SSL/TLS certificates
- [ ] Set up automated backups
- [ ] Monitor disk space and performance
- [ ] Configure proper firewall rules
- [ ] Use MongoDB monitoring tools
- [ ] Document disaster recovery procedures
- [ ] Regular security updates

## Database Schema

### Page Model

```javascript
{
  slug: String,              // URL-friendly identifier
  title: String,             // Page title
  type: String,              // 'landing', 'standard', 'article', 'custom'
  status: String,            // 'draft', 'published', 'archived'
  sections: [{              // Array of content blocks
    id: String,
    type: String,           // 'hero', 'text', 'gallery', etc.
    content: Object,        // Block-specific content
    settings: Object,       // Block-specific settings
    order: Number
  }],
  seo: {                    // SEO metadata
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    ogImage: String,
    canonicalUrl: String
  },
  stats: {                  // Analytics
    views: Number,
    lastViewed: Date
  },
  createdBy: ObjectId,
  lastModifiedBy: ObjectId,
  publishedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)

## Support

For issues related to:
- **MongoDB setup**: Check official MongoDB documentation
- **CMS functionality**: See `CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md`
- **API integration**: See API documentation at `/api` endpoint
- **Deployment**: Contact Spirit Tours development team

---

**Last Updated:** November 6, 2025  
**CMS Version:** 1.0.0  
**MongoDB Version:** 7.0+  
**Mongoose Version:** 8.0+
