# Institutional Pages Seed Script

## Overview

This seed script (`seed-institutional-pages.js`) creates 12 pre-configured institutional pages for the Spirit Tours CMS. These pages provide a complete foundation for a professional tourism website.

## Prerequisites

1. **MongoDB Running**: Ensure MongoDB is running and accessible
2. **Environment Configuration**: Set `MONGODB_URI` in `.env` file
3. **Backend Dependencies**: Run `npm install` in the `/backend` directory

## Usage

### Basic Usage

```bash
# From project root
cd /home/user/webapp
node scripts/seed-institutional-pages.js
```

### With Custom MongoDB URI

```bash
MONGODB_URI=mongodb://your-host:27017/your-database node scripts/seed-institutional-pages.js
```

### Expected Output

```
✅ Connected to MongoDB

🌱 Starting institutional pages seed...

📄 Creating page: about-us
✅ Created: About Us (about-us)

📄 Creating page: contact-us
✅ Created: Contact Us (contact-us)

📄 Creating page: our-services
✅ Created: Our Services (our-services)

📄 Creating page: faq
✅ Created: FAQ (faq)

📄 Creating page: privacy-policy
✅ Created: Privacy Policy (privacy-policy)

📄 Creating page: terms-and-conditions
✅ Created: Terms & Conditions (terms-and-conditions)

📄 Creating page: cancellation-policy
✅ Created: Cancellation Policy (cancellation-policy)

📄 Creating page: our-team
✅ Created: Our Team (our-team)

📄 Creating page: careers
✅ Created: Careers (careers)

📄 Creating page: blog
✅ Created: Blog (blog)

📄 Creating page: press-media
✅ Created: Press & Media (press-media)

📄 Creating page: partners
✅ Created: Partners (partners)

✨ All done! The 12 institutional pages have been created.

You can now view them in the CMS at: /admin/cms/pages
```

## Pages Created

### 1. About Us (`/about-us`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with heading "About Us" and subheading
- Rich text block with company story and mission
- Gallery block showcasing team photos

**SEO:**
- Meta title: "About Spirit Tours - Our Story & Mission"
- Meta description: Company overview and values
- Keywords: spirit tours, about us, tour company

**Use Case:** Company introduction and brand story

---

### 2. Contact Us (`/contact-us`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Get in Touch" heading
- Form block with 5 fields:
  - Name (text, required)
  - Email (email, required)
  - Phone (tel)
  - Subject (select dropdown)
  - Message (textarea, required)

**SEO:**
- Meta title: "Contact Spirit Tours - Get in Touch"
- Meta description: Contact information and inquiry form
- Keywords: contact spirit tours, customer service

**Use Case:** Customer inquiries and support requests

---

### 3. Our Services (`/our-services`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Our Services" heading
- Rich text block listing service categories:
  - Guided Tours
  - Custom Itineraries
  - Group Travel
  - Accommodation Booking
  - Transportation

**SEO:**
- Meta title: "Tour Services - Spirit Tours Offerings"
- Meta description: Comprehensive tour services
- Keywords: tour services, travel packages

**Use Case:** Service showcase and offerings

---

### 4. FAQ (`/faq`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Frequently Asked Questions"
- Accordion block with 6 Q&A items:
  1. What is included in the tour price?
  2. Do I need travel insurance?
  3. What is your cancellation policy?
  4. Are your tours suitable for solo travelers?
  5. What level of fitness is required?
  6. Can dietary restrictions be accommodated?

**Settings:**
- Allow multiple open: false
- Start all closed: true
- Bordered style

**SEO:**
- Meta title: "FAQ - Spirit Tours | Common Questions"
- Meta description: Answers to frequently asked questions
- Keywords: spirit tours faq, travel questions

**Use Case:** Customer self-service and common inquiries

---

### 5. Privacy Policy (`/privacy-policy`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Rich text block with comprehensive privacy policy:
  - Data collection practices
  - Usage of information
  - Cookie policy
  - Data protection rights
  - Contact for privacy concerns

**SEO:**
- Meta title: "Privacy Policy - Spirit Tours"
- Meta description: Privacy and data protection policy
- Keywords: privacy policy, data protection

**Use Case:** Legal compliance and transparency

---

### 6. Terms & Conditions (`/terms-and-conditions`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Rich text block with terms of service:
  - Booking terms
  - Payment conditions
  - Travel documents
  - Liability limitations
  - Dispute resolution

**SEO:**
- Meta title: "Terms & Conditions - Spirit Tours"
- Meta description: Terms of service and booking conditions
- Keywords: terms and conditions, booking terms

**Use Case:** Legal protection and customer agreements

---

### 7. Cancellation Policy (`/cancellation-policy`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Rich text block with cancellation terms:
  - Cancellation periods and refunds
  - Force majeure conditions
  - Amendment procedures
  - No-show policy
  - Travel insurance recommendations

**SEO:**
- Meta title: "Cancellation Policy - Spirit Tours Refund Terms"
- Meta description: Cancellation and refund policy
- Keywords: cancellation policy, refund terms

**Use Case:** Clear customer expectations

---

### 8. Our Team (`/our-team`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Meet Our Team"
- Rich text block introducing the team
- Gallery block for team member photos

**SEO:**
- Meta title: "Our Team - Spirit Tours Expert Guides"
- Meta description: Meet our experienced tour guides
- Keywords: tour guides, travel experts

**Use Case:** Build trust and showcase expertise

---

### 9. Careers (`/careers`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Join Our Team"
- Rich text blocks describing:
  - Company culture
  - Benefits and perks
  - Current openings
  - Application process

**SEO:**
- Meta title: "Careers - Work at Spirit Tours"
- Meta description: Join our team of travel professionals
- Keywords: spirit tours careers, tour guide jobs

**Use Case:** Recruitment and talent acquisition

---

### 10. Blog (`/blog`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Spirit Tours Blog"
- Rich text placeholder for blog posts
- Note: Actual blog functionality requires custom development

**SEO:**
- Meta title: "Blog - Spirit Tours Travel Insights"
- Meta description: Travel tips, destination guides, and stories
- Keywords: travel blog, destination guides

**Use Case:** Content marketing and SEO

---

### 11. Press & Media (`/press-media`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Rich text block with:
  - Media contact information
  - Press release archive
  - Media kit download
  - Interview requests

**SEO:**
- Meta title: "Press & Media - Spirit Tours News"
- Meta description: Media resources and press releases
- Keywords: press releases, media contact

**Use Case:** Media relations and PR

---

### 12. Partners (`/partners`)
**Type:** Standard  
**Status:** Published  
**Sections:**
- Hero block with "Our Partners"
- Rich text block describing:
  - Partnership philosophy
  - Partner benefits
  - How to become a partner
  - Current partner network

**SEO:**
- Meta title: "Partners - Spirit Tours Collaborators"
- Meta description: Trusted partner network and collaboration
- Keywords: spirit tours partners, travel partnerships

**Use Case:** B2B relationships and network

---

## Features

### Duplicate Detection
The script checks for existing pages before creating new ones:
```javascript
const existing = await Page.findOne({ slug: pageData.slug });
if (existing) {
  console.log(`⚠️  Page already exists: ${existing.title} (${existing.slug})`);
  continue; // Skip creation
}
```

### Comprehensive SEO
Each page includes:
- Meta title (50-60 characters)
- Meta description (150-160 characters)
- Keywords array
- SEO-friendly slugs

### Pre-configured Blocks
Pages use various CMS block types:
- **Hero**: Eye-catching page headers
- **Text**: Rich formatted content
- **Form**: Contact and inquiry forms
- **Accordion**: Collapsible FAQ sections
- **Gallery**: Image galleries for teams/photos

### Published Status
All pages are created with `status: 'published'` and are immediately visible to users.

## Customization

### Modifying Page Content

Edit the `institutionalPages` array in `seed-institutional-pages.js`:

```javascript
{
  slug: 'about-us',
  title: 'About Us - Spirit Tours',  // Change title
  type: 'standard',
  status: 'published',               // Can be 'draft'
  sections: [
    {
      id: 'hero-1',
      type: 'hero',
      content: {
        heading: 'About Us',         // Customize heading
        subheading: 'Our Story',     // Customize subheading
      },
      // ... add more customization
    }
  ],
  seo: {
    metaTitle: 'Your Custom Title',  // Customize SEO
    // ... 
  },
}
```

### Adding New Pages

Add a new page object to the `institutionalPages` array:

```javascript
{
  slug: 'your-page-slug',
  title: 'Your Page Title',
  type: 'standard',
  status: 'draft',  // Start as draft
  sections: [
    // Add your sections
  ],
  seo: {
    // Add your SEO metadata
  },
}
```

### Running for Specific Pages

Modify the script to filter pages:

```javascript
const pagesToSeed = ['about-us', 'contact-us'];  // Only these pages

for (const pageData of institutionalPages) {
  if (!pagesToSeed.includes(pageData.slug)) continue;
  // ... rest of logic
}
```

## Troubleshooting

### MongoDB Connection Error

```
❌ MongoDB connection error: MongooseServerSelectionError
```

**Solutions:**
1. Verify MongoDB is running: `sudo systemctl status mongod`
2. Check connection string in `.env` file
3. Ensure network access (for Atlas)
4. Verify firewall settings

### Page Already Exists

```
⚠️  Page already exists: About Us (about-us)
```

This is expected behavior. The script skips existing pages to prevent duplicates.

To re-seed a page, delete it first:

```javascript
// In MongoDB shell or script
db.pages.deleteOne({ slug: 'about-us' });
```

Or modify the script to force update:

```javascript
const existing = await Page.findOne({ slug: pageData.slug });
if (existing) {
  await Page.findByIdAndUpdate(existing._id, pageData);
  console.log(`🔄 Updated: ${pageData.title}`);
  continue;
}
```

### Authentication Error

If CMS routes require authentication, ensure you have admin credentials set up.

## Database Cleanup

To remove all seeded pages:

```javascript
// In MongoDB shell
use spirit-tours;
db.pages.deleteMany({
  slug: { $in: [
    'about-us', 'contact-us', 'our-services', 'faq',
    'privacy-policy', 'terms-and-conditions', 'cancellation-policy',
    'our-team', 'careers', 'blog', 'press-media', 'partners'
  ]}
});
```

Or create a cleanup script:

```bash
# cleanup-pages.js
const mongoose = require('mongoose');
const Page = require('../backend/models/cms/Page');

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const slugs = ['about-us', 'contact-us', /* ... */];
  await Page.deleteMany({ slug: { $in: slugs } });
  console.log('✅ Pages removed');
  process.exit(0);
}

cleanup();
```

## Verification

After running the seed script, verify pages were created:

### Via MongoDB Shell

```javascript
mongosh mongodb://localhost:27017/spirit-tours

> db.pages.find({}, { title: 1, slug: 1, status: 1 }).pretty()
```

### Via CMS Admin UI

1. Navigate to http://localhost:3000/admin/cms/pages
2. You should see all 12 pages listed

### Via API

```bash
curl -X GET http://localhost:5001/api/cms/pages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  | jq '.pages[] | {title, slug, status}'
```

## Next Steps

After seeding pages:

1. **Review Content**: Edit pages in CMS to match your brand
2. **Add Media**: Upload images for hero sections and galleries
3. **Customize Forms**: Configure form submissions (email/webhook)
4. **SEO Optimization**: Review and enhance SEO metadata
5. **Publish Strategy**: Change drafts to published as content is finalized
6. **Analytics**: Monitor page views in CMS stats

## Related Documentation

- `MONGODB_SETUP.md` - MongoDB installation and configuration
- `CMS_DINAMICO_FRONTEND_IMPLEMENTATION.md` - CMS architecture and features
- Backend API docs at `/api` endpoint

---

**Script Version:** 1.0.0  
**Last Updated:** November 6, 2025  
**Total Pages:** 12  
**Block Types Used:** Hero, Text, Form, Accordion, Gallery
