# Spirit Tours CMS - Demo Mode

## 🎭 Overview

Demo Mode allows you to test and demonstrate the full CMS functionality **without MongoDB**. Perfect for:

- Frontend development
- Client demonstrations
- Training sessions
- Quick testing
- Development without database setup

---

## ⚡ Quick Start (30 seconds)

```bash
# Start demo servers (backend + frontend)
bash scripts/start-demo.sh

# Access CMS
# Open browser: http://localhost:3000/admin/cms/pages

# Stop when done
bash scripts/stop-demo.sh
```

That's it! No MongoDB, no complex setup required.

---

## 🎯 What's Included

### Demo Server Features

✅ **Full CMS API** - All endpoints working with mock data  
✅ **4 Pre-loaded Pages** - About Us, Contact, Services, FAQ  
✅ **Media Library** - Mock uploads and media management  
✅ **Templates** - Pre-configured page templates  
✅ **SEO Analysis** - Mock SEO scoring  
✅ **In-Memory Storage** - No database needed  

### Available Pages in Demo

1. **About Us** - Hero + Company story + Team gallery
2. **Contact Us** - Hero + 5-field contact form
3. **Our Services** - Hero + Services list  
4. **FAQ** - Hero + 6-item accordion

### All CMS Features Work

- ✅ Create new pages
- ✅ Edit existing pages
- ✅ Delete pages
- ✅ Duplicate pages
- ✅ Drag-and-drop sections
- ✅ Rich text editing
- ✅ Media uploads (simulated)
- ✅ SEO settings
- ✅ Preview modes
- ✅ Page statistics

---

## 📋 Demo Server Details

### Backend Demo Server

**File:** `backend/demo-server.js`  
**Port:** 5002  
**Mode:** In-memory mock data  

**Endpoints:**
```
GET  /health
GET  /api/cms/pages
POST /api/cms/pages
GET  /api/cms/pages/:id
PUT  /api/cms/pages/:id
DELETE /api/cms/pages/:id
POST /api/cms/pages/:id/duplicate
GET  /api/cms/pages/by-slug/:slug
GET  /api/cms/pages/stats
GET  /api/cms/media
POST /api/cms/media/upload
DELETE /api/cms/media/:id
GET  /api/cms/templates
POST /api/cms/seo/analyze
```

### Frontend Configuration

**Port:** 3000  
**API URL:** http://localhost:5002  
**Access:** http://localhost:3000/admin/cms/pages  

---

## 🚀 Usage Instructions

### Starting Demo Mode

```bash
# Method 1: Use convenience script
bash scripts/start-demo.sh

# Method 2: Manual start
# Terminal 1 - Backend
cd backend
node demo-server.js

# Terminal 2 - Frontend  
cd spirit-tours
REACT_APP_API_URL=http://localhost:5002 npm start
```

### Accessing the CMS

1. **Open browser:** http://localhost:3000
2. **Navigate to:** Admin → CMS Dinámico
3. **Or direct:** http://localhost:3000/admin/cms/pages

### Testing Features

**Create a Page:**
1. Click "Create New Page"
2. Enter title and slug
3. Add sections using drag-and-drop
4. Configure SEO settings
5. Save and publish

**Edit a Page:**
1. Click "Edit" on any page
2. Modify sections
3. Reorder with drag-and-drop
4. Update content
5. Save changes

**Upload Media:**
1. Click on Image block
2. Open Media Library
3. Click "Upload"
4. Note: Uploads are simulated with placeholder images

### Stopping Demo Mode

```bash
# Method 1: Use convenience script
bash scripts/stop-demo.sh

# Method 2: Press Ctrl+C in the terminal running start-demo.sh

# Method 3: Kill processes manually
lsof -ti:5002 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

---

## 💡 Important Notes

### What Demo Mode IS:

✅ **Full CMS functionality** - All features work  
✅ **Perfect for testing** - No database required  
✅ **Quick setup** - Start in seconds  
✅ **Safe to experiment** - Data resets on restart  
✅ **Client demos** - Show CMS capabilities  

### What Demo Mode IS NOT:

❌ **Not for production** - Data is in-memory only  
❌ **Not persistent** - All changes lost on restart  
❌ **Not for real uploads** - Files are simulated  
❌ **Not multi-user** - No authentication  
❌ **Not for load testing** - Single process only  

### Limitations

- **Data Persistence:** None - all data resets when server restarts
- **File Uploads:** Simulated - returns placeholder images
- **Authentication:** Disabled - no login required
- **Multi-user:** Not supported in demo mode
- **Performance:** Single-threaded, not optimized
- **Scalability:** Not designed for concurrent users

---

## 🔄 Demo vs Production

| Feature | Demo Mode | Production Mode |
|---------|-----------|-----------------|
| **Database** | In-memory | MongoDB |
| **Data Persistence** | ❌ No | ✅ Yes |
| **File Uploads** | Simulated | Real (disk/S3) |
| **Authentication** | Disabled | ✅ Required |
| **Multi-user** | ❌ No | ✅ Yes |
| **Page Count** | 4 pre-loaded | Unlimited |
| **Media Assets** | 2 pre-loaded | Unlimited |
| **API Port** | 5002 | 5001 |
| **Setup Time** | 30 seconds | 15-30 minutes |

---

## 🛠️ Customizing Demo Data

### Adding More Pages

Edit `backend/demo-server.js`:

```javascript
let mockPages = [
  // Add your custom pages here
  {
    _id: '5',
    slug: 'your-page',
    title: 'Your Page Title',
    type: 'standard',
    status: 'published',
    sections: [
      // Your sections
    ],
    seo: {
      // Your SEO data
    },
    // ... rest of page data
  },
];
```

### Adding Mock Media

```javascript
let mockMedia = [
  // Add your mock media
  {
    _id: 'm3',
    filename: 'your-image.jpg',
    url: 'https://your-image-url.com/image.jpg',
    alt: 'Your image description',
    // ... rest of media data
  },
];
```

### Changing Ports

```bash
# Backend port
DEMO_PORT=5003 node backend/demo-server.js

# Frontend port
PORT=3001 npm start
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Problem:** Port 5002 or 3000 already occupied

**Solution:**
```bash
# Kill processes on ports
bash scripts/stop-demo.sh

# Or manually
lsof -ti:5002 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Frontend Can't Connect to Backend

**Problem:** API calls failing

**Solutions:**
1. Check backend is running: `curl http://localhost:5002/health`
2. Verify API URL in frontend: Should be `http://localhost:5002`
3. Check CORS settings in demo-server.js

### Changes Not Persisting

**This is normal!** Demo mode uses in-memory storage. All changes are lost when the server restarts.

**For persistent storage:** Use production mode with MongoDB.

### Page Not Loading in Frontend

**Solutions:**
1. Check browser console for errors
2. Verify backend is running: `curl http://localhost:5002/api/cms/pages`
3. Clear browser cache
4. Restart both servers

---

## 📊 Demo Server Logs

### Viewing Logs

```bash
# Backend logs
tail -f /tmp/demo-backend.log

# Frontend logs
tail -f /tmp/demo-frontend.log

# Or view all logs
tail -f /tmp/demo-*.log
```

### Log Locations

- Backend: `/tmp/demo-backend.log`
- Frontend: `/tmp/demo-frontend.log`
- PID files: `/tmp/demo-backend.pid`, `/tmp/demo-frontend.pid`

---

## 🎓 Demo Scenarios

### Scenario 1: Client Presentation

**Time: 10 minutes**

1. Start demo: `bash scripts/start-demo.sh`
2. Open CMS in browser
3. Show existing pages (About, Contact, Services, FAQ)
4. Create new page live:
   - "Our Destinations"
   - Add Hero block
   - Add Text block with description
   - Add Gallery block
5. Demonstrate drag-and-drop
6. Show SEO settings
7. Preview in different viewports
8. Publish page

### Scenario 2: Developer Testing

**Time: 15 minutes**

1. Start demo
2. Test all CRUD operations:
   - Create page
   - Edit page
   - Duplicate page
   - Delete page
3. Test all block types
4. Test media library
5. Test SEO analyzer
6. Check API responses in DevTools
7. Test error handling (invalid data)

### Scenario 3: Training Session

**Time: 30 minutes**

1. Explain CMS architecture
2. Walk through each component
3. Demonstrate page creation workflow
4. Practice with attendees
5. Show best practices
6. Answer questions

---

## 🔗 Related Documentation

- **Setup Production:** `MONGODB_SETUP.md`
- **Quick Start:** `QUICK_START.md`
- **Testing Guide:** `CMS_TESTING_GUIDE.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`
- **CMS Architecture:** `CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md`

---

## ⏭️ Next Steps

### After Demo Mode

Once you're ready for production:

1. **Set up MongoDB:**
   - Read `MONGODB_SETUP.md`
   - Choose: Atlas / Docker / Local
   - Configure connection string

2. **Run seed script:**
   ```bash
   node scripts/seed-institutional-pages.js
   ```

3. **Start production servers:**
   ```bash
   # Backend
   cd backend && npm start
   
   # Frontend
   cd spirit-tours && npm start
   ```

4. **Deploy to production:**
   - Follow `DEPLOYMENT_CHECKLIST.md`
   - Configure environment variables
   - Set up SSL/HTTPS
   - Configure backups

---

## 📞 Support

**Questions about demo mode?**

- Check troubleshooting section above
- Review logs: `tail -f /tmp/demo-*.log`
- Verify servers running: `ps aux | grep demo`
- Restart: `bash scripts/stop-demo.sh && bash scripts/start-demo.sh`

**Ready for production?**

- Read `MONGODB_SETUP.md` first
- Follow `QUICK_START.md` for 15-minute setup
- Use `DEPLOYMENT_CHECKLIST.md` for deployment

---

**Demo Mode Version:** 1.0  
**Last Updated:** November 6, 2025  
**Maintained By:** Spirit Tours Development Team

---

**Enjoy testing the CMS!** 🎉

Remember: Demo mode is for testing only. For production use with persistent storage, follow the MongoDB setup guide.
