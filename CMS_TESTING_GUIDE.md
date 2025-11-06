# CMS Dinámico - Complete Testing Guide

## 📋 Overview

This comprehensive testing guide covers all aspects of the Spirit Tours CMS Dinámico, from basic functionality to advanced features and edge cases.

---

## 🎯 Testing Checklist

### Prerequisites ✅
- [ ] MongoDB running and connected
- [ ] Backend server running (port 5001)
- [ ] Frontend development server running (port 3000)
- [ ] Admin user credentials available
- [ ] Browser DevTools open (Console + Network tabs)

---

## 1️⃣ Phase 1: Backend API Testing

### 1.1 MongoDB Connection Test

```bash
# Check server logs for Mongoose connection
cd backend
npm start

# Expected log output:
# ✅ Mongoose connected successfully for CMS
```

**✅ Pass Criteria:**
- No connection errors in logs
- Server starts without crashes
- CMS routes registered successfully

**❌ Common Issues:**
- `ECONNREFUSED` - MongoDB not running
- `Authentication failed` - Check credentials
- `Server selection timeout` - Check network/firewall

---

### 1.2 Seed Script Execution

```bash
# Run from project root
node scripts/seed-institutional-pages.js
```

**✅ Expected Output:**
```
✅ Connected to MongoDB
🌱 Starting institutional pages seed...
📄 Creating page: about-us
✅ Created: About Us (about-us)
... (11 more pages)
✨ All done! The 12 institutional pages have been created.
```

**Verify in MongoDB:**
```javascript
mongosh mongodb://localhost:27017/spirit-tours

> db.pages.countDocuments()
// Should return: 12

> db.pages.find({}, {title: 1, slug: 1, status: 1})
// Should list all 12 pages
```

**✅ Pass Criteria:**
- All 12 pages created successfully
- No duplicate errors on re-run
- All pages have `status: 'published'`

---

### 1.3 API Endpoint Tests

#### Test 1: List All Pages

```bash
curl -X GET http://localhost:5001/api/cms/pages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq
```

**✅ Expected Response:**
```json
{
  "success": true,
  "pages": [...], // Array of 12 pages
  "total": 12,
  "page": 1,
  "limit": 20
}
```

#### Test 2: Get Page by ID

```bash
curl -X GET http://localhost:5001/api/cms/pages/{PAGE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq
```

**✅ Expected Response:**
```json
{
  "success": true,
  "page": {
    "_id": "...",
    "slug": "about-us",
    "title": "About Us - Spirit Tours",
    "sections": [...],
    "seo": {...}
  }
}
```

#### Test 3: Get Page by Slug (Public)

```bash
curl -X GET http://localhost:5001/api/cms/pages/by-slug/about-us \
  | jq
```

**✅ Expected Response:**
```json
{
  "success": true,
  "page": {...}
}
```

#### Test 4: Create New Page

```bash
curl -X POST http://localhost:5001/api/cms/pages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "slug": "test-page",
    "title": "Test Page",
    "type": "standard",
    "status": "draft",
    "sections": []
  }' | jq
```

**✅ Expected Response:**
```json
{
  "success": true,
  "page": {
    "_id": "...",
    "slug": "test-page",
    "status": "draft"
  }
}
```

#### Test 5: Update Page

```bash
curl -X PUT http://localhost:5001/api/cms/pages/{PAGE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Test Page"
  }' | jq
```

#### Test 6: Delete Page

```bash
curl -X DELETE http://localhost:5001/api/cms/pages/{PAGE_ID} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq
```

**✅ Pass Criteria for All API Tests:**
- Correct HTTP status codes (200, 201, 204, 404, 401)
- JSON responses match schema
- Authentication enforced
- Error messages are descriptive

---

## 2️⃣ Phase 2: Frontend UI Testing

### 2.1 Access CMS Dashboard

**Steps:**
1. Navigate to: `http://localhost:3000/admin`
2. Log in with admin credentials
3. Click **"📝 CMS Dinámico"** tab

**✅ Expected Behavior:**
- CMS tab visible in navigation
- Smooth navigation without errors
- URL changes to `/admin/cms/pages`

**❌ Troubleshooting:**
- **Tab not visible**: Check user role (requires admin/manager)
- **404 error**: Verify Routes configured in AdminDashboard.jsx
- **Blank screen**: Check browser console for errors

---

### 2.2 Pages List View

**Test 2.2.1: Display All Pages**

**Steps:**
1. Access `/admin/cms/pages`
2. Observe page list

**✅ Expected Display:**
- Table with 12 institutional pages
- Columns: Title, Slug, Status, Type, Last Modified
- Status badges with colors (Published=green, Draft=yellow)
- Action buttons: Edit, View, Delete
- Search bar at top
- Filter dropdowns (Status, Type)
- "Create New Page" button

**Test 2.2.2: Search Functionality**

**Steps:**
1. Type "about" in search bar
2. Observe filtered results

**✅ Expected Behavior:**
- Instant filtering (no page reload)
- Only matching pages shown
- Clear search button appears
- Empty state if no results

**Test 2.2.3: Filter by Status**

**Steps:**
1. Select "Published" from status filter
2. All pages should be shown (seed pages are published)
3. Select "Draft"
4. Should show "No pages found"

**Test 2.2.4: Sort by Column**

**Steps:**
1. Click "Title" column header
2. Pages sort alphabetically
3. Click again for reverse order

**✅ Pass Criteria:**
- All 12 pages load correctly
- Search works instantly
- Filters apply correctly
- Sorting doesn't break layout
- No console errors

---

### 2.3 Page Editor - View Mode

**Test 2.3.1: Open Page for Editing**

**Steps:**
1. Click "Edit" on "About Us" page
2. Wait for page to load

**✅ Expected Display:**
- URL: `/admin/cms/pages/{id}/edit`
- Top toolbar with:
  - Page title input
  - Status dropdown
  - Save button
  - Publish button
  - Settings button (SEO)
  - Preview button
  - Back button
- Left sidebar: Block Palette with block types
- Center area: Page sections
- Each section has:
  - Block type indicator
  - Content preview
  - Edit button
  - Delete button
  - Drag handle (⋮⋮)
- Bottom: "Add Section" button

**Test 2.3.2: Section Display**

**For "About Us" page, verify:**
1. **Hero Section** (section 1)
   - Heading: "About Us"
   - Subheading: "Our Story"
   - Edit and delete buttons visible

2. **Text Section** (section 2)
   - Rich text content visible
   - Paragraph about company story

3. **Gallery Section** (section 3)
   - Placeholder for team images
   - Gallery settings

**✅ Pass Criteria:**
- All sections load in correct order
- No visual glitches
- Buttons are clickable
- Content is readable

---

### 2.4 Page Editor - Edit Mode

**Test 2.4.1: Edit Hero Block**

**Steps:**
1. Click "Edit" on Hero section
2. Modal/inline editor opens
3. Change heading to "About Spirit Tours"
4. Change subheading to "Our Mission & Vision"
5. Click "Save" or outside modal

**✅ Expected Behavior:**
- Editor opens smoothly
- Text inputs are pre-filled
- Changes apply immediately on save
- No page reload
- Auto-save indicator shows

**Test 2.4.2: Edit Rich Text Block**

**Steps:**
1. Click "Edit" on Text section
2. TipTap editor appears
3. Test formatting toolbar:
   - Bold, Italic, Underline
   - Headings (H1, H2, H3)
   - Lists (ordered, unordered)
   - Links
   - Text alignment
   - Color picker
4. Add new paragraph with formatting
5. Save changes

**✅ Expected Behavior:**
- WYSIWYG editor loads
- All toolbar buttons work
- Formatting applies in real-time
- HTML output is clean
- Changes persist after save

**Test 2.4.3: Block Settings**

**Steps:**
1. Click settings icon on any block
2. Settings panel/modal opens
3. Modify settings (e.g., background color, padding)
4. Save settings

**✅ Expected Behavior:**
- Settings modal opens
- Current settings pre-filled
- Visual preview updates
- Changes apply immediately

---

### 2.5 Drag-and-Drop Testing

**Test 2.5.1: Reorder Sections**

**Steps:**
1. Click and hold drag handle (⋮⋮) on Hero section
2. Drag to bottom of page
3. Release
4. Observe new order

**✅ Expected Behavior:**
- Visual feedback during drag (highlight, cursor change)
- Drop zones indicated
- Smooth animation on drop
- Order persists after save
- Auto-save triggers
- No console errors

**Test 2.5.2: Drag Multiple Times**

**Steps:**
1. Reorder sections multiple times
2. Check order is maintained
3. Save page
4. Refresh page
5. Verify order persists

**Test 2.5.3: Drag Edge Cases**

**Test:**
- Drag first section to last
- Drag last section to first
- Drag to middle position
- Rapid consecutive drags
- Drag without dropping (cancel)

**✅ Pass Criteria:**
- All drag operations smooth
- No visual glitches
- Order always correct
- No data loss

---

### 2.6 Block Palette Testing

**Test 2.6.1: Add New Block**

**Steps:**
1. Click "Add Section" or "+" button
2. Block palette opens
3. Click "Text" block
4. New text block appears

**✅ Expected Behavior:**
- Palette opens as modal or sidebar
- All block types displayed with icons
- Click adds block at correct position
- New block is in edit mode
- Palette closes after selection

**Test 2.6.2: Add All Block Types**

**Create test page with all block types:**
1. Hero
2. Text
3. Image
4. Video
5. Gallery
6. Form
7. Accordion
8. Button
9. Divider
10. Spacer
11. CTA

**✅ Pass Criteria:**
- Each block adds successfully
- No duplicate IDs
- Edit mode works for each type
- Settings panel works for each type

---

### 2.7 Media Library Testing

**Test 2.7.1: Open Media Library**

**Steps:**
1. Edit Image block
2. Click "Select Image" button
3. Media Library modal opens

**✅ Expected Display:**
- Modal overlay
- Search bar
- Filter by type (images, videos, documents)
- Upload button
- Grid of assets with thumbnails
- Asset details on hover (name, size, date)
- Select button on each asset

**Test 2.7.2: Upload Single File**

**Steps:**
1. Click "Upload" button
2. Select image file (< 10MB)
3. Wait for upload

**✅ Expected Behavior:**
- File picker opens
- Progress bar shows upload progress
- Success message on completion
- New asset appears in grid
- Asset immediately selectable

**Test 2.7.3: Upload Multiple Files**

**Steps:**
1. Click "Upload"
2. Select multiple images (Ctrl/Cmd + Click)
3. Upload all

**✅ Expected Behavior:**
- All files show in upload queue
- Individual progress bars
- Parallel uploads
- Success count displayed
- All assets appear in grid

**Test 2.7.4: Search Assets**

**Steps:**
1. Type filename in search
2. Results filter instantly

**Test 2.7.5: Filter by Type**

**Steps:**
1. Select "Images" filter
2. Only images shown
3. Select "All"
4. All assets shown again

**Test 2.7.6: Select Asset**

**Steps:**
1. Click asset thumbnail
2. Click "Select" button
3. Modal closes
4. Image appears in block

**✅ Pass Criteria:**
- All upload scenarios work
- Search is instant
- Filters work correctly
- Selection applies to block
- No console errors

---

### 2.8 SEO Settings Testing

**Test 2.8.1: Open SEO Modal**

**Steps:**
1. In page editor, click "SEO" button
2. SEO settings modal opens

**✅ Expected Display:**
- Meta Title input (pre-filled)
- Meta Description textarea (pre-filled)
- Keywords input (tags/chips)
- OG Image upload
- Canonical URL input
- Character count indicators
- Preview card (Google/Facebook)
- Save button

**Test 2.8.2: Edit Meta Title**

**Steps:**
1. Edit meta title
2. Character counter updates
3. Preview updates
4. Save changes

**✅ Expected Behavior:**
- Real-time character count
- Warning if too long (>60 chars)
- Preview shows new title
- Changes persist

**Test 2.8.3: Add Keywords**

**Steps:**
1. Type keyword and press Enter
2. Keyword appears as chip/tag
3. Add multiple keywords
4. Remove keyword by clicking X
5. Save

**Test 2.8.4: SEO Analysis**

**Expected Features:**
- Title length indicator (green/yellow/red)
- Description length indicator
- Keyword density check
- Readability score (if implemented)

**✅ Pass Criteria:**
- All fields editable
- Validation works
- Preview accurate
- Changes save correctly

---

### 2.9 Auto-Save Testing

**Test 2.9.1: Manual Edit Trigger**

**Steps:**
1. Edit any block
2. Make changes
3. Wait 60 seconds (auto-save interval)
4. Observe auto-save indicator

**✅ Expected Behavior:**
- "Saving..." indicator appears
- Changes persist without manual save
- No data loss
- Indicator shows "Saved" when complete

**Test 2.9.2: Rapid Changes**

**Steps:**
1. Make multiple rapid edits
2. Auto-save should debounce
3. All changes captured

**Test 2.9.3: Network Failure**

**Steps:**
1. Disconnect network
2. Make changes
3. Auto-save fails
4. Error message shown
5. Reconnect network
6. Retry save

**✅ Pass Criteria:**
- Auto-save works reliably
- No duplicate saves
- Errors handled gracefully
- User notified of save status

---

### 2.10 Undo/Redo Testing

**Test 2.10.1: Undo Last Action**

**Steps:**
1. Edit text in block
2. Click "Undo" button (or Ctrl+Z)
3. Text reverts to previous state

**✅ Expected Behavior:**
- Undo button enabled when history exists
- Change reverts correctly
- Redo button becomes enabled
- History limit respected

**Test 2.10.2: Multiple Undos**

**Steps:**
1. Make 5 distinct changes
2. Undo all 5 changes
3. Verify each step reverts correctly

**Test 2.10.3: Redo After Undo**

**Steps:**
1. Undo change
2. Click "Redo" button (or Ctrl+Shift+Z)
3. Change reapplies

**Test 2.10.4: Edge Cases**

**Test:**
- Undo with no history (button disabled)
- Redo with no future (button disabled)
- New action clears redo history
- History persists across page refreshes (if implemented)

**✅ Pass Criteria:**
- Undo/Redo always accurate
- No data corruption
- Buttons enable/disable correctly
- User can recover from mistakes

---

### 2.11 Preview Mode Testing

**Test 2.11.1: Desktop Preview**

**Steps:**
1. Click "Preview" button
2. Select "Desktop" viewport
3. Page renders in preview

**✅ Expected Display:**
- Full-width desktop layout
- All sections visible
- Styling matches production
- Responsive at 1920px width

**Test 2.11.2: Tablet Preview**

**Steps:**
1. Select "Tablet" viewport (768px)
2. Layout adjusts

**✅ Expected Behavior:**
- Responsive layout applies
- Images scale properly
- Text remains readable
- No horizontal scroll

**Test 2.11.3: Mobile Preview**

**Steps:**
1. Select "Mobile" viewport (375px)
2. Mobile layout applies

**✅ Expected Behavior:**
- Single column layout
- Touch-friendly spacing
- Images optimize for small screen
- Navigation adapts

**Test 2.11.4: Exit Preview**

**Steps:**
1. Click "Exit Preview" or back button
2. Return to edit mode

**✅ Pass Criteria:**
- All viewports render correctly
- No layout breaks
- Transitions smooth
- Edit mode restores correctly

---

### 2.12 Page Publishing Workflow

**Test 2.12.1: Draft to Published**

**Steps:**
1. Create new page with status "draft"
2. Add content
3. Save page
4. Click "Publish" button
5. Confirm publication

**✅ Expected Behavior:**
- Confirmation dialog appears
- Status changes to "published"
- Published date set
- Page visible on public site
- Success notification shown

**Test 2.12.2: Unpublish Page**

**Steps:**
1. Open published page
2. Change status to "draft"
3. Save

**✅ Expected Behavior:**
- Status updates
- Page removed from public site
- Still accessible in admin
- Warning shown if page is linked

**Test 2.12.3: Schedule Publishing (if implemented)**

**Steps:**
1. Set future publish date
2. Save
3. Verify page not public until date

---

### 2.13 Template Selector Testing

**Test 2.13.1: Open Template Selector**

**Steps:**
1. Click "Create New Page"
2. Template selector opens (or separate button)
3. Browse templates

**✅ Expected Display:**
- Grid of template previews
- Template names and descriptions
- Category filters
- Search bar
- "Start from Scratch" option

**Test 2.13.2: Apply Template**

**Steps:**
1. Select "About Us Template"
2. Click "Use Template"
3. Template applies to page

**✅ Expected Behavior:**
- All sections copied to page
- Content placeholders filled
- Page immediately editable
- Original template unchanged

**Test 2.13.3: Preview Template**

**Steps:**
1. Click "Preview" on template card
2. Full preview opens
3. Can navigate sections

**✅ Pass Criteria:**
- Templates load correctly
- Application doesn't break page
- All template content preserved
- Variables populated correctly

---

## 3️⃣ Phase 3: Integration Testing

### 3.1 End-to-End Workflow

**Scenario: Create Complete Page from Scratch**

**Steps:**
1. Click "Create New Page"
2. Enter title: "Our Destinations"
3. Set slug: "our-destinations"
4. Set type: "standard"
5. Add Hero block
   - Heading: "Explore Destinations"
   - Subheading: "Discover spiritual journeys"
6. Add Text block
   - Content: Description paragraph
7. Add Gallery block
   - Upload 5 destination images
8. Add CTA block
   - Text: "Book Your Journey"
   - Link: "/contact"
9. Configure SEO settings
   - Meta title: "Our Destinations - Spirit Tours"
   - Meta description: "Explore our curated spiritual destinations..."
   - Keywords: destinations, travel, spirit tours
10. Preview in all viewports
11. Publish page
12. Verify on public site

**✅ Expected Result:**
- Page created successfully
- All content displays correctly
- SEO optimized
- Mobile responsive
- No errors throughout process
- Page accessible at `/our-destinations`

**Time to Complete:** ~10-15 minutes

---

### 3.2 Multi-User Testing (if authentication implemented)

**Test 3.2.1: Concurrent Editing**

**Steps:**
1. User A opens page for editing
2. User B opens same page
3. Both make different changes
4. Both save

**✅ Expected Behavior:**
- Conflict detection (if implemented)
- Last save wins (with warning)
- OR real-time collaboration (if implemented)

**Test 3.2.2: Permission Levels**

**Test different roles:**
- **Admin**: Full access to all features
- **Editor**: Can edit but not delete
- **Viewer**: Read-only access

---

### 3.3 Performance Testing

**Test 3.3.1: Large Page Load**

**Steps:**
1. Create page with 50+ sections
2. Measure load time
3. Test drag-and-drop performance

**✅ Expected Performance:**
- Initial load < 3 seconds
- Smooth scrolling
- Drag-and-drop responsive
- No memory leaks

**Test 3.3.2: Image Upload**

**Test:**
- Upload large images (up to 10MB)
- Upload multiple images simultaneously
- Measure upload times

**Target:**
- 10MB image uploads in < 30 seconds
- No browser freeze
- Progress indicators accurate

**Test 3.3.3: Auto-Save Performance**

**Test:**
- Make 100 rapid edits
- Monitor network requests
- Check for debouncing

**✅ Expected:**
- Auto-save debounced properly
- No request flooding
- Changes not lost

---

### 3.4 Error Handling Testing

**Test 3.4.1: Network Errors**

**Simulate:**
- Disconnect network during save
- Timeout requests
- 500 server errors

**✅ Expected Behavior:**
- Error messages displayed
- Retry mechanism available
- Data not lost
- Graceful degradation

**Test 3.4.2: Validation Errors**

**Test:**
- Submit empty required fields
- Invalid slug characters
- Duplicate slugs
- Oversized meta descriptions

**✅ Expected:**
- Inline validation messages
- Fields highlighted
- Descriptive error text
- Cannot save until valid

**Test 3.4.3: Authorization Errors**

**Test:**
- Expired JWT token
- Insufficient permissions
- Invalid session

**✅ Expected:**
- Redirect to login
- Error message clear
- Return to page after login

---

## 4️⃣ Phase 4: Institutional Pages Verification

### 4.1 Verify Each Seeded Page

**For each of the 12 pages, verify:**

#### ✅ About Us (`/about-us`)
- [ ] Hero block displays correctly
- [ ] Company story text readable
- [ ] Team gallery placeholder visible
- [ ] SEO metadata present
- [ ] Published status

#### ✅ Contact Us (`/contact-us`)
- [ ] Contact form displays
- [ ] All 5 fields present (Name, Email, Phone, Subject, Message)
- [ ] Required fields marked
- [ ] Submit button functional
- [ ] Form validation works

#### ✅ Our Services (`/our-services`)
- [ ] Service list formatted correctly
- [ ] All 5 services visible
- [ ] Readable layout

#### ✅ FAQ (`/faq`)
- [ ] Accordion displays
- [ ] 6 Q&A items present
- [ ] Click to expand/collapse works
- [ ] Only one open at a time (if configured)
- [ ] Smooth animations

#### ✅ Privacy Policy (`/privacy-policy`)
- [ ] Legal content displays
- [ ] Sections clearly formatted
- [ ] Readable typography

#### ✅ Terms & Conditions (`/terms-and-conditions`)
- [ ] Terms content visible
- [ ] Proper formatting
- [ ] Links functional (if any)

#### ✅ Cancellation Policy (`/cancellation-policy`)
- [ ] Policy content clear
- [ ] Refund terms visible
- [ ] Contact information present

#### ✅ Our Team (`/our-team`)
- [ ] Team introduction text
- [ ] Gallery placeholder for team photos
- [ ] Professional layout

#### ✅ Careers (`/careers`)
- [ ] Job openings section visible
- [ ] Benefits listed
- [ ] Application info clear

#### ✅ Blog (`/blog`)
- [ ] Landing page displays
- [ ] Placeholder content visible
- [ ] Note about custom development present

#### ✅ Press & Media (`/press-media`)
- [ ] Press contact information
- [ ] Media kit mention
- [ ] Professional tone

#### ✅ Partners (`/partners`)
- [ ] Partner philosophy explained
- [ ] Partnership benefits listed
- [ ] How to become partner info

---

## 5️⃣ Phase 5: Production Readiness

### 5.1 SEO Checklist

**For all pages:**
- [ ] Meta title present (50-60 chars)
- [ ] Meta description present (150-160 chars)
- [ ] Keywords defined (3-5 per page)
- [ ] OG image set (1200x630px)
- [ ] Canonical URL correct
- [ ] No duplicate content
- [ ] Structured data (if implemented)
- [ ] XML sitemap generated
- [ ] Robots.txt configured

### 5.2 Performance Checklist

- [ ] Images optimized (< 200KB each)
- [ ] Lazy loading implemented
- [ ] CDN configured (if applicable)
- [ ] Gzip compression enabled
- [ ] Browser caching configured
- [ ] Lighthouse score > 90

### 5.3 Accessibility Checklist

- [ ] Alt text on all images
- [ ] Semantic HTML used
- [ ] ARIA labels where needed
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible
- [ ] Focus indicators visible

### 5.4 Security Checklist

- [ ] Authentication enforced on admin routes
- [ ] JWT tokens expire appropriately
- [ ] XSS protection in place
- [ ] CSRF tokens used
- [ ] Input sanitization active
- [ ] SQL injection prevention
- [ ] Rate limiting enabled
- [ ] HTTPS enforced

### 5.5 Backup & Recovery

- [ ] Database backup strategy defined
- [ ] Automated backups scheduled
- [ ] Backup restoration tested
- [ ] Version control for content (if implemented)
- [ ] Rollback procedure documented

---

## 6️⃣ Bug Report Template

When issues are found, report using this format:

```markdown
### Bug Title
[Concise description of the issue]

**Severity:** Critical / High / Medium / Low

**Environment:**
- Browser: Chrome 120
- OS: macOS 14.1
- Backend: Node 20.x
- MongoDB: 7.0

**Steps to Reproduce:**
1. Step one
2. Step two
3. Step three

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Screenshots:**
[Attach screenshots if applicable]

**Console Errors:**
```
[Paste console errors]
```

**Network Requests:**
[Relevant failed requests]

**Additional Context:**
[Any other relevant information]
```

---

## 7️⃣ Testing Sign-Off

### Final Approval Checklist

- [ ] All Phase 1 tests passed (Backend API)
- [ ] All Phase 2 tests passed (Frontend UI)
- [ ] All Phase 3 tests passed (Integration)
- [ ] All Phase 4 tests passed (Institutional Pages)
- [ ] All Phase 5 checks passed (Production Readiness)
- [ ] No critical bugs remaining
- [ ] Documentation reviewed
- [ ] Stakeholder demo completed
- [ ] User acceptance testing passed

**Tested By:** ___________________  
**Date:** ___________________  
**Approved By:** ___________________  
**Date:** ___________________  

---

## 8️⃣ Continuous Testing

### Automated Tests (Future Implementation)

**Unit Tests:**
- Component rendering
- API endpoint responses
- Utility functions
- Validation logic

**Integration Tests:**
- Page creation workflow
- Block drag-and-drop
- Media upload
- Form submissions

**E2E Tests (Cypress/Playwright):**
- Complete user journeys
- Cross-browser testing
- Mobile responsiveness
- Performance benchmarks

**Suggested Test Runners:**
- Jest (unit tests)
- React Testing Library (component tests)
- Cypress (E2E tests)
- Lighthouse CI (performance)

---

## 📚 Additional Resources

- **CMS Architecture**: `CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md`
- **MongoDB Setup**: `MONGODB_SETUP.md`
- **Seed Script**: `scripts/README_SEED.md`
- **API Documentation**: http://localhost:5001/api

---

**Testing Guide Version:** 1.0  
**Last Updated:** November 6, 2025  
**Maintained By:** Spirit Tours Development Team
