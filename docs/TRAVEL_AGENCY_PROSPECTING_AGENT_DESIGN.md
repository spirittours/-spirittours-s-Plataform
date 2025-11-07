# 🌍 Travel Agency Prospecting AI Agent - Design Document

**Agent ID:** #26  
**Name:** Travel Agency Prospecting & Lead Generation Agent  
**Status:** Design Phase  
**Priority:** HIGH  
**Estimated Development Time:** 40-50 hours  

---

## 📋 Executive Summary

This AI agent will automatically discover, extract, validate, and manage contact information for travel agencies and tour operators worldwide. It operates 24/7, sources data from multiple channels, validates emails, prevents duplicates, and integrates with other AI agents for automated marketing campaigns.

---

## 🎯 Core Objectives

### Primary Goals
1. **Extract Agency Data** from multiple sources globally
2. **Validate Contact Information** (emails, phones, addresses)
3. **Prevent Duplicates** with intelligent deduplication
4. **Segment Agencies** (clients vs. prospects)
5. **Automate Outreach** with different campaigns per segment
6. **24/7 Operation** with anti-blocking mechanisms
7. **Integration** with all 25 existing AI agents

### Success Metrics
- **Agencies Discovered:** 10,000+ per month
- **Email Validation Rate:** 95%+ accuracy
- **Duplicate Prevention:** 99%+ effectiveness
- **Uptime:** 99.5% (24/7 operation)
- **Conversion Rate:** Track prospect → client conversion

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND DASHBOARD                            │
│  - Agency Database Viewer                                       │
│  - Search & Filter (country, city, status)                      │
│  - Manual Entry & Editing                                       │
│  - Campaign Management                                          │
│  - Statistics & Analytics                                       │
└─────────────────────────────────────────────────────────────────┘
                            ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                    API LAYER (Express Routes)                    │
│  /api/prospecting/agencies (CRUD)                               │
│  /api/prospecting/scrape (trigger scraping)                     │
│  /api/prospecting/validate (email validation)                   │
│  /api/prospecting/campaigns (email campaigns)                   │
│  /api/prospecting/statistics                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↕ Business Logic
┌─────────────────────────────────────────────────────────────────┐
│              PROSPECTING SERVICE (Node.js)                       │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 1. DATA EXTRACTION MODULE                                 │ │
│  │    - Government Sources Scraper                           │ │
│  │    - Association Scraper (FIAVET, AIAV, etc.)            │ │
│  │    - Google Maps API Integration                          │ │
│  │    - Yellow Pages Scraper                                 │ │
│  │    - Tourism Ministry Websites                            │ │
│  │    - Website Crawler (agency websites)                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 2. EMAIL EXTRACTION & VALIDATION                          │ │
│  │    - Email Pattern Extraction (regex)                     │ │
│  │    - DNS/MX Record Validation                             │ │
│  │    - SMTP Verification                                    │ │
│  │    - Deliverability Check                                 │ │
│  │    - Bounce Detection                                     │ │
│  │    - Email Reputation Check                               │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 3. ANTI-BLOCKING SYSTEM                                   │ │
│  │    - Rotating Proxies (residential/datacenter)            │ │
│  │    - User-Agent Rotation                                  │ │
│  │    - Random Delays (human-like behavior)                  │ │
│  │    - Session Management                                   │ │
│  │    - CAPTCHA Solver Integration                           │ │
│  │    - Rate Limiting Compliance                             │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 4. DEDUPLICATION ENGINE                                   │ │
│  │    - Fuzzy Name Matching                                  │ │
│  │    - Email Domain Matching                                │ │
│  │    - Phone Number Normalization                           │ │
│  │    - Address Geocoding & Matching                         │ │
│  │    - Confidence Scoring                                   │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 5. CAMPAIGN AUTOMATION                                    │ │
│  │    - Client Campaign (internal updates)                   │ │
│  │    - Prospect Campaign (sales outreach)                   │ │
│  │    - Drip Campaigns (multi-touch)                         │ │
│  │    - A/B Testing                                          │ │
│  │    - Response Tracking                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 6. AI AGENT INTEGRATION HUB                               │ │
│  │    - Shared Database Access                               │ │
│  │    - Event Broadcasting (new agency found)                │ │
│  │    - CRM Sync (customer onboarding)                       │ │
│  │    - Email Marketing Agent Trigger                        │ │
│  │    - Sales AI Agent Notification                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            ↕ Data Layer
┌─────────────────────────────────────────────────────────────────┐
│                    DATABASE (MongoDB)                            │
│  Collections:                                                   │
│  - travel_agencies (main database)                              │
│  - email_validations (validation history)                       │
│  - scraping_jobs (job queue)                                    │
│  - campaigns (email campaigns)                                  │
│  - campaign_logs (tracking)                                     │
│  - blacklist (invalid/bounced emails)                           │
└─────────────────────────────────────────────────────────────────┘
                            ↕ External APIs
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                             │
│  - Google Maps API (places, geocoding)                         │
│  - Email Verification APIs (ZeroBounce, NeverBounce)           │
│  - Proxy Services (Bright Data, Oxylabs)                       │
│  - CAPTCHA Solvers (2Captcha, Anti-Captcha)                    │
│  - SendGrid/Mailgun (email sending)                            │
│  - Twilio (SMS verification - optional)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↕ Job Scheduler
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULER (Bull Queue + Redis)                │
│  - Scraping Jobs (by country/city)                             │
│  - Email Validation Jobs                                        │
│  - Campaign Send Jobs                                           │
│  - Deduplication Jobs (daily)                                   │
│  - Database Cleanup Jobs (weekly)                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Database Schema

### Collection: `travel_agencies`

```javascript
{
  _id: ObjectId,
  
  // Basic Information
  name: String,                    // Agency name
  tradeName: String,               // Commercial name (if different)
  type: String,                    // 'agency' | 'tour_operator' | 'dmc' | 'wholesaler'
  
  // Contact Information
  emails: [{
    email: String,
    type: String,                  // 'general' | 'sales' | 'info' | 'support'
    verified: Boolean,
    verifiedAt: Date,
    deliverable: Boolean,
    bounced: Boolean,
    source: String                 // Where found
  }],
  
  phones: [{
    number: String,
    type: String,                  // 'main' | 'sales' | 'whatsapp'
    countryCode: String,
    verified: Boolean
  }],
  
  website: String,
  socialMedia: {
    facebook: String,
    instagram: String,
    linkedin: String,
    twitter: String
  },
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    countryCode: String,           // ISO 3166-1 alpha-2
    postalCode: String,
    region: String,                // Geographic region
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Business Details
  businessInfo: {
    registrationNumber: String,
    taxId: String,
    licenseNumber: String,
    foundedYear: Number,
    employeeCount: String,         // '1-10', '11-50', '51-200', '200+'
    annualRevenue: String          // Range
  },
  
  // Services & Specialization
  services: [{
    type: String,                  // 'packages', 'custom', 'corporate', 'leisure', 'luxury'
    destinations: [String],        // Countries/regions served
    specialties: [String]          // 'cruises', 'adventure', 'honeymoon', etc.
  }],
  
  // Client Status
  clientStatus: {
    isClient: Boolean,
    clientSince: Date,
    accountManager: ObjectId,      // Reference to User
    subscriptionPlan: String,
    monthlyTransactions: Number,
    totalRevenue: Number
  },
  
  // Prospecting Information
  prospecting: {
    status: String,                // 'new' | 'contacted' | 'interested' | 'not_interested' | 'client'
    leadScore: Number,             // 0-100
    lastContactDate: Date,
    contactAttempts: Number,
    campaignIds: [ObjectId],
    notes: [String],
    assignedTo: ObjectId           // Sales rep
  },
  
  // Data Sources
  sources: [{
    type: String,                  // 'government' | 'association' | 'google_maps' | 'website' | 'manual'
    name: String,                  // Specific source name
    url: String,
    scrapedAt: Date,
    confidence: Number             // 0-100
  }],
  
  // Validation & Quality
  dataQuality: {
    completeness: Number,          // 0-100 (% of fields filled)
    accuracy: Number,              // 0-100 (verified data)
    lastVerified: Date,
    needsReview: Boolean,
    duplicateOf: ObjectId          // If duplicate found
  },
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,               // 'ai_agent' | 'manual' | userId
  lastScrapedAt: Date,
  tags: [String],
  
  // Indexes
  indexes: [
    { name: 'text' },
    { 'address.country': 1, 'address.city': 1 },
    { 'clientStatus.isClient': 1 },
    { 'prospecting.status': 1 },
    { 'emails.email': 1 }
  ]
}
```

### Collection: `email_validations`

```javascript
{
  _id: ObjectId,
  email: String,
  agencyId: ObjectId,
  
  validation: {
    syntaxValid: Boolean,
    domainExists: Boolean,
    mxRecordsExist: Boolean,
    smtpValid: Boolean,
    deliverable: Boolean,
    isCatchAll: Boolean,
    isDisposable: Boolean,
    isRoleAccount: Boolean,        // info@, sales@, etc.
    riskScore: Number              // 0-100
  },
  
  verifiedAt: Date,
  verificationMethod: String,      // 'dns' | 'smtp' | 'api'
  provider: String,                // Email provider (Gmail, Outlook, etc.)
  
  bounceHistory: [{
    bouncedAt: Date,
    bounceType: String,            // 'hard' | 'soft' | 'general'
    reason: String
  }]
}
```

### Collection: `scraping_jobs`

```javascript
{
  _id: ObjectId,
  type: String,                    // 'country' | 'city' | 'association' | 'website'
  
  target: {
    country: String,
    city: String,
    region: String,
    source: String,                // 'google_maps' | 'fiavet' | 'government'
    url: String
  },
  
  status: String,                  // 'pending' | 'running' | 'completed' | 'failed'
  priority: Number,                // 1-10
  
  progress: {
    total: Number,
    processed: Number,
    found: Number,
    validated: Number,
    duplicates: Number
  },
  
  settings: {
    useProxy: Boolean,
    maxRetries: Number,
    delayMs: Number,
    userAgent: String
  },
  
  results: {
    agenciesFound: Number,
    emailsExtracted: Number,
    errors: [String]
  },
  
  scheduledAt: Date,
  startedAt: Date,
  completedAt: Date,
  error: String,
  
  createdBy: ObjectId
}
```

### Collection: `campaigns`

```javascript
{
  _id: ObjectId,
  name: String,
  type: String,                    // 'client_update' | 'prospect_intro' | 'prospect_follow_up'
  
  targeting: {
    clientStatus: String,          // 'client' | 'prospect'
    countries: [String],
    cities: [String],
    agencyTypes: [String],
    minLeadScore: Number,
    excludeTags: [String]
  },
  
  content: {
    subject: String,
    bodyHtml: String,
    bodyText: String,
    language: String,
    personalization: [{
      field: String,
      default: String
    }]
  },
  
  schedule: {
    type: String,                  // 'immediate' | 'scheduled' | 'drip'
    sendAt: Date,
    dripSequence: [{
      dayOffset: Number,
      subject: String,
      body: String
    }]
  },
  
  tracking: {
    sent: Number,
    delivered: Number,
    opened: Number,
    clicked: Number,
    replied: Number,
    bounced: Number,
    unsubscribed: Number
  },
  
  status: String,                  // 'draft' | 'scheduled' | 'sending' | 'completed'
  
  createdAt: Date,
  createdBy: ObjectId,
  sentAt: Date
}
```

---

## 🔍 Data Sources & Extraction Methods

### 1. Government Tourism Ministry Websites

**Countries to Start:**
- 🇪🇸 **Spain** (Ministerio de Industria, Comercio y Turismo)
- 🇮🇹 **Italy** (Ministero del Turismo)
- 🇫🇷 **France** (Ministère de l'Europe et des Affaires étrangères)
- 🇲🇽 **Mexico** (SECTUR)
- 🇧🇷 **Brazil** (Ministério do Turismo)
- 🇦🇷 **Argentina** (Ministerio de Turismo)
- 🇺🇸 **USA** (State tourism boards)

**Extraction Method:**
```javascript
// Example: Spanish tourism ministry
const scrapeTourismMinistry = async (country) => {
  const sources = {
    spain: 'https://www.mincotur.gob.es/es-es/Paginas/index.aspx',
    italy: 'https://www.ministeroturismo.gov.it',
    mexico: 'https://www.sectur.gob.mx'
  };
  
  // 1. Find registry/database section
  // 2. Extract agency listings
  // 3. Parse contact information
  // 4. Validate and store
};
```

### 2. Travel Association Databases

**Major Associations:**
- **FIAVET** (Italy) - https://www.fiavet.it
- **AIAV** (Italy) - https://www.aiav.it
- **ABAV** (Brazil) - https://www.abav.com.br
- **ASTA** (USA) - https://www.asta.org
- **CLIA** (Cruises) - https://www.cruising.org
- **WTTC** (World Travel & Tourism Council)
- **UNWTO** Affiliate Members

**Extraction Method:**
```javascript
const scrapeAssociation = async (association) => {
  // 1. Access member directory
  // 2. Handle authentication if needed
  // 3. Paginate through listings
  // 4. Extract member details
  // 5. Visit member websites for emails
};
```

### 3. Google Maps API

**Advantages:**
- Most comprehensive
- Accurate location data
- Phone numbers included
- Reviews and ratings
- Operating hours

**Implementation:**
```javascript
const searchGoogleMaps = async (query, location) => {
  const searchQueries = [
    'travel agency',
    'tour operator',
    'agencia de viajes',
    'operador turístico',
    'agenzia viaggi'
  ];
  
  for (const q of searchQueries) {
    const results = await googleMaps.placesNearby({
      query: q,
      location: location,
      radius: 50000  // 50km
    });
    
    // Extract: name, address, phone, website, rating
    // Visit website to extract emails
  }
};
```

### 4. Yellow Pages & Business Directories

**Global Directories:**
- **Yelp** (USA, international)
- **Yellow Pages** (country-specific)
- **Pagine Gialle** (Italy)
- **Pages Jaunes** (France)
- **Sección Amarilla** (Mexico)

### 5. Agency Website Crawling

**Email Extraction Patterns:**
```javascript
const emailPatterns = [
  /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
  // Contact page patterns
  /mailto:([^"'>\s]+)/gi,
  // Hidden in JavaScript
  /email["\s:=]+["']([^"']+)["']/gi
];

const extractEmailsFromWebsite = async (url) => {
  const pages = [
    '/',
    '/contact',
    '/contacto',
    '/contatti',
    '/about',
    '/nosotros'
  ];
  
  const emails = [];
  for (const page of pages) {
    const html = await fetch(url + page);
    const found = extractEmails(html);
    emails.push(...found);
  }
  
  return [...new Set(emails)]; // Remove duplicates
};
```

---

## ✉️ Email Validation System

### 3-Layer Validation Process

#### Layer 1: Syntax Validation (Instant)
```javascript
const validateSyntax = (email) => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
};
```

#### Layer 2: DNS/MX Record Check (1-2 seconds)
```javascript
const validateDNS = async (email) => {
  const domain = email.split('@')[1];
  const mxRecords = await dns.resolveMx(domain);
  return mxRecords.length > 0;
};
```

#### Layer 3: SMTP Verification (5-10 seconds)
```javascript
const validateSMTP = async (email) => {
  const domain = email.split('@')[1];
  const mxRecords = await dns.resolveMx(domain);
  const smtp = net.createConnection(25, mxRecords[0].exchange);
  
  // Send SMTP commands
  smtp.write('HELO example.com\r\n');
  smtp.write(`MAIL FROM:<verify@example.com>\r\n`);
  smtp.write(`RCPT TO:<${email}>\r\n`);
  
  // Check response code
  // 250 = valid, 550 = invalid
};
```

#### Layer 4: External API Validation (Premium)
```javascript
const validateWithAPI = async (email) => {
  // Use ZeroBounce, NeverBounce, or Hunter.io
  const response = await zerobounce.validate(email);
  return {
    valid: response.status === 'valid',
    deliverable: response.sub_status === 'none',
    isCatchAll: response.sub_status === 'antispam_system',
    isDisposable: response.sub_status === 'disposable',
    riskScore: response.risk_score
  };
};
```

---

## 🛡️ Anti-Blocking Mechanisms

### 1. Rotating Proxies
```javascript
const proxyPool = [
  'http://proxy1.example.com:8080',
  'http://proxy2.example.com:8080',
  // ... residential proxies from Bright Data, Oxylabs
];

const getRandomProxy = () => {
  return proxyPool[Math.floor(Math.random() * proxyPool.length)];
};
```

### 2. User-Agent Rotation
```javascript
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit...',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...'
];
```

### 3. Human-like Delays
```javascript
const randomDelay = (min = 2000, max = 5000) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

await sleep(randomDelay(3000, 8000));
```

### 4. Session Management
```javascript
const sessions = new Map();

const getSession = (domain) => {
  if (!sessions.has(domain)) {
    sessions.set(domain, {
      cookies: new Map(),
      lastRequest: Date.now(),
      requestCount: 0
    });
  }
  return sessions.get(domain);
};
```

### 5. CAPTCHA Solving
```javascript
const solveCaptcha = async (siteKey, pageUrl) => {
  const solution = await twoCaptcha.solve({
    googlekey: siteKey,
    pageurl: pageUrl
  });
  return solution;
};
```

---

## 🔄 Deduplication Algorithm

```javascript
const findDuplicates = async (newAgency) => {
  const candidates = await TravelAgency.find({
    $or: [
      // Exact email match
      { 'emails.email': { $in: newAgency.emails.map(e => e.email) } },
      
      // Fuzzy name match + same city
      {
        $and: [
          { 'address.city': newAgency.address.city },
          { name: { $regex: createFuzzyRegex(newAgency.name) } }
        ]
      },
      
      // Same phone number
      { 'phones.number': { $in: newAgency.phones.map(p => normalizePhone(p.number)) } }
    ]
  });
  
  // Calculate confidence scores
  const matches = candidates.map(candidate => ({
    agency: candidate,
    score: calculateSimilarity(newAgency, candidate)
  }));
  
  // Return matches with score > 80%
  return matches.filter(m => m.score > 0.8);
};

const calculateSimilarity = (a, b) => {
  let score = 0;
  
  // Name similarity (40%)
  score += stringSimilarity(a.name, b.name) * 0.4;
  
  // Email domain match (30%)
  const domainMatch = hasCommonEmailDomain(a.emails, b.emails);
  score += domainMatch ? 0.3 : 0;
  
  // Address similarity (20%)
  score += addressSimilarity(a.address, b.address) * 0.2;
  
  // Phone match (10%)
  score += hasCommonPhone(a.phones, b.phones) ? 0.1 : 0;
  
  return score;
};
```

---

## 📧 Campaign Automation System

### Campaign Types

#### 1. Client Campaign (Internal Updates)
```javascript
const clientCampaign = {
  name: 'Monthly Newsletter - Clients',
  type: 'client_update',
  targeting: {
    clientStatus: 'client',
    minLeadScore: 0
  },
  content: {
    subject: '🌍 Spirit Tours - Novedades del Mes',
    bodyHtml: `
      <h2>Hola {{agencyName}},</h2>
      <p>Te compartimos las últimas actualizaciones...</p>
      <ul>
        <li>Nuevos destinos disponibles</li>
        <li>Promociones especiales</li>
        <li>Mejoras en la plataforma</li>
      </ul>
    `
  },
  schedule: {
    type: 'scheduled',
    sendAt: new Date('2025-12-01T09:00:00')
  }
};
```

#### 2. Prospect Campaign (Sales Outreach)
```javascript
const prospectCampaign = {
  name: 'Cold Outreach - Tour Operators',
  type: 'prospect_intro',
  targeting: {
    clientStatus: 'prospect',
    agencyTypes: ['tour_operator'],
    minLeadScore: 60
  },
  content: {
    subject: '¿Buscas simplificar la gestión de tus tours?',
    bodyHtml: `
      <h2>Hola desde Spirit Tours,</h2>
      <p>Somos una plataforma que ayuda a agencias como {{agencyName}}...</p>
      <ul>
        <li>✅ Gestión integral de reservas</li>
        <li>✅ Pagos automatizados</li>
        <li>✅ 25 AI agents para automatizar tareas</li>
      </ul>
      <p><a href="{{demoLink}}">Ver Demo</a></p>
    `
  },
  schedule: {
    type: 'drip',
    dripSequence: [
      { dayOffset: 0, subject: 'Intro', body: '...' },
      { dayOffset: 3, subject: 'Follow-up 1', body: '...' },
      { dayOffset: 7, subject: 'Follow-up 2', body: '...' },
      { dayOffset: 14, subject: 'Final offer', body: '...' }
    ]
  }
};
```

### Personalization Engine
```javascript
const personalize = (template, agency) => {
  const variables = {
    '{{agencyName}}': agency.name,
    '{{city}}': agency.address.city,
    '{{country}}': agency.address.country,
    '{{website}}': agency.website,
    '{{demoLink}}': `https://spirittours.com/demo?ref=${agency._id}`
  };
  
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  return result;
};
```

---

## 🤖 Integration with Other AI Agents

### Event Broadcasting System

```javascript
// When new agency is found
eventBus.emit('agency:discovered', {
  agencyId: agency._id,
  name: agency.name,
  country: agency.address.country,
  isClient: false
});

// When agency becomes client
eventBus.emit('agency:converted', {
  agencyId: agency._id,
  name: agency.name,
  convertedAt: new Date()
});

// Listeners from other agents
eventBus.on('agency:discovered', async (data) => {
  // CRM Agent: Create lead
  await crmAgent.createLead(data);
  
  // Email Marketing Agent: Add to prospect list
  await emailAgent.addToList('prospects', data.agencyId);
  
  // Sales AI Agent: Assign to sales rep
  await salesAgent.assignLead(data.agencyId);
});
```

### Shared Database Access

```javascript
// Expose agency database to other agents
const AgencyAPI = {
  findByCountry: async (country) => {
    return await TravelAgency.find({ 'address.country': country });
  },
  
  getClients: async () => {
    return await TravelAgency.find({ 'clientStatus.isClient': true });
  },
  
  getProspects: async (filters = {}) => {
    return await TravelAgency.find({
      'clientStatus.isClient': false,
      'prospecting.status': { $in: ['new', 'contacted', 'interested'] },
      ...filters
    });
  },
  
  updateClientStatus: async (agencyId, status) => {
    return await TravelAgency.updateOne(
      { _id: agencyId },
      { $set: { 'clientStatus.isClient': status } }
    );
  }
};

// Export for other agents
module.exports = { AgencyAPI };
```

---

## 📅 24/7 Job Scheduler

### Queue System with Bull

```javascript
const Queue = require('bull');
const Redis = require('ioredis');

// Create queues
const scrapingQueue = new Queue('scraping', {
  redis: { host: 'localhost', port: 6379 }
});

const validationQueue = new Queue('validation', {
  redis: { host: 'localhost', port: 6379 }
});

const campaignQueue = new Queue('campaigns', {
  redis: { host: 'localhost', port: 6379 }
});

// Add jobs
const scheduleCountryScrape = async (country, city = null) => {
  await scrapingQueue.add('scrape-country', {
    country,
    city,
    sources: ['google_maps', 'government', 'associations']
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000  // 1 minute
    }
  });
};

// Process jobs
scrapingQueue.process('scrape-country', async (job) => {
  const { country, city, sources } = job.data;
  
  for (const source of sources) {
    await job.progress(sources.indexOf(source) / sources.length * 100);
    
    switch (source) {
      case 'google_maps':
        await scrapeGoogleMaps(country, city);
        break;
      case 'government':
        await scrapeTourismMinistry(country);
        break;
      case 'associations':
        await scrapeAssociations(country);
        break;
    }
  }
  
  return { success: true, found: 150 };
});

// Schedule recurring jobs
const scheduleDailyJobs = () => {
  // Scrape different countries on rotation
  scrapingQueue.add('daily-scrape', {}, {
    repeat: { cron: '0 2 * * *' }  // 2 AM daily
  });
  
  // Validate emails that need re-validation (30 days old)
  validationQueue.add('revalidate', {}, {
    repeat: { cron: '0 3 * * *' }
  });
  
  // Send scheduled campaigns
  campaignQueue.add('send-campaigns', {}, {
    repeat: { cron: '0 9 * * *' }  // 9 AM daily
  });
};
```

---

## 📈 Recommended Implementation Plan

### Phase 1: Foundation (Week 1-2) - 20 hours
1. ✅ Database schema design
2. ✅ Basic scraping service
3. ✅ Email validation (DNS + SMTP)
4. ✅ Deduplication algorithm
5. ✅ API routes

### Phase 2: Data Sources (Week 3-4) - 15 hours
1. ✅ Google Maps integration
2. ✅ Government website scrapers (3-5 countries)
3. ✅ Association scrapers (FIAVET, AIAV, ABAV)
4. ✅ Website email extraction

### Phase 3: Anti-Blocking (Week 5) - 10 hours
1. ✅ Proxy rotation
2. ✅ User-agent rotation
3. ✅ Rate limiting
4. ✅ CAPTCHA solving integration

### Phase 4: Campaign System (Week 6) - 10 hours
1. ✅ Campaign builder
2. ✅ Email templates
3. ✅ Personalization engine
4. ✅ Tracking system

### Phase 5: Integration (Week 7) - 10 hours
1. ✅ Event broadcasting
2. ✅ API for other agents
3. ✅ CRM sync
4. ✅ Email marketing integration

### Phase 6: Frontend (Week 8) - 15 hours
1. ✅ Agency database viewer
2. ✅ Search and filters
3. ✅ Campaign management UI
4. ✅ Statistics dashboard

**Total Estimated Time: 80 hours (10 weeks at 8 hours/week)**

---

## 💰 Cost Considerations

### External Services (Monthly)

| Service | Purpose | Cost |
|---------|---------|------|
| Google Maps API | Places search | $200-500 |
| Email Validation API | ZeroBounce/NeverBounce | $100-300 |
| Proxy Service | Bright Data residential | $500-1000 |
| CAPTCHA Solver | 2Captcha | $50-100 |
| SendGrid/Mailgun | Email sending | $15-50 |
| Redis Cloud | Queue management | $0-30 |
| **TOTAL** | | **$865-1,980/month** |

### Cost Optimization
- Use free tier for low volumes initially
- Implement caching to reduce API calls
- Use datacenter proxies for less aggressive scraping (cheaper)
- Validate emails in batches

---

## 🎯 Success Metrics & KPIs

### Data Collection
- **Agencies Discovered:** 10,000+ per month
- **Email Extraction Rate:** 80%+ of agencies
- **Email Validation Rate:** 95%+ accuracy
- **Duplicate Prevention:** 99%+ effectiveness

### Campaign Performance
- **Open Rate:** 25%+ (industry average: 21%)
- **Click Rate:** 3%+ (industry average: 2.6%)
- **Reply Rate:** 1%+ for cold outreach
- **Conversion Rate:** 0.5%+ prospect → client

### System Performance
- **Uptime:** 99.5%
- **Scraping Speed:** 100-500 agencies/hour
- **Email Validation Speed:** 1000 emails/hour
- **Queue Processing Time:** < 1 hour for 1000 jobs

---

## ⚠️ Legal & Compliance

### GDPR Compliance (Europe)
- ✅ Collect only business contact information
- ✅ Provide unsubscribe mechanism
- ✅ Honor opt-out requests within 30 days
- ✅ Store consent records
- ✅ Allow data export/deletion requests

### CAN-SPAM Act (USA)
- ✅ Include physical address in emails
- ✅ Clear unsubscribe link
- ✅ Honor unsubscribe within 10 days
- ✅ Accurate "From" information
- ✅ Clearly marked as advertisement

### Robots.txt Compliance
- ✅ Respect robots.txt directives
- ✅ Rate limiting per domain
- ✅ Identify bot with proper user-agent

---

## 🚀 Quick Start Recommendations

### Option 1: Start Small (Recommended)
**Focus:** 1 country, 1-2 sources
- Choose Spain or Italy (good data availability)
- Use Google Maps API + 1 association
- Validate 1000 agencies
- Run pilot campaign
- Measure results
- Scale based on success

### Option 2: Aggressive Growth
**Focus:** Multiple countries simultaneously
- 5 countries in parallel
- All data sources
- 10,000+ agencies in first month
- Automated campaigns from day 1
- Higher costs but faster ROI

### My Recommendation: **Start with Option 1**
**Why:**
1. Lower initial costs ($500/month vs $2000/month)
2. Learn what works before scaling
3. Refine scraping strategies
4. Test email templates and campaigns
5. Validate technical approach
6. Easier to manage and debug

**Timeline:**
- **Month 1:** Build system, scrape Spain (1000 agencies)
- **Month 2:** Add Italy, optimize (3000 total)
- **Month 3:** Add Mexico, France (7000 total)
- **Month 4:** Add Brazil, Argentina (15,000 total)
- **Month 5+:** Scale to 20+ countries

---

## 📞 Integration with Current System

### Connect to Existing Agents

```javascript
// 1. CRM Integration
const onAgencyDiscovered = async (agency) => {
  // Create lead in CRM
  await crmAgent.createLead({
    company: agency.name,
    email: agency.emails[0].email,
    phone: agency.phones[0].number,
    country: agency.address.country,
    source: 'prospecting_agent',
    leadScore: agency.prospecting.leadScore
  });
};

// 2. Email Marketing Integration
const addToEmailList = async (agency) => {
  if (agency.clientStatus.isClient) {
    await emailAgent.addToList('clients', agency);
  } else {
    await emailAgent.addToList('prospects', agency);
  }
};

// 3. Sales AI Agent
const notifySalesTeam = async (agency) => {
  if (agency.prospecting.leadScore > 80) {
    await salesAgent.createOpportunity({
      agencyId: agency._id,
      estimatedValue: calculatePotentialRevenue(agency),
      priority: 'high'
    });
  }
};

// 4. Analytics Agent
const trackMetrics = async (agency) => {
  await analyticsAgent.recordEvent({
    type: 'agency_discovered',
    country: agency.address.country,
    source: agency.sources[0].type,
    timestamp: new Date()
  });
};
```

---

## ✅ Next Steps

1. **Approve Design** - Review this document
2. **Start Development** - Begin with Phase 1
3. **Choose Starting Country** - Spain recommended
4. **Set Budget** - Allocate for external services
5. **Define Success Metrics** - Track KPIs from day 1

---

**Document Version:** 1.0  
**Created:** November 4, 2025  
**Status:** DESIGN COMPLETE - Ready for Development  
**Estimated Total Cost:** $865-1,980/month (operational)  
**Estimated Development Time:** 80 hours (10 weeks)  
**Priority:** HIGH  
**ROI Potential:** VERY HIGH (thousands of qualified leads)
