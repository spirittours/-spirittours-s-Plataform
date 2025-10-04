# AI Content Generation System - Setup Guide

Complete guide for setting up and using the multi-provider AI content generation system.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [API Key Setup](#api-key-setup)
5. [Database Setup](#database-setup)
6. [Testing](#testing)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)
9. [Cost Management](#cost-management)
10. [Best Practices](#best-practices)

---

## 1. Prerequisites

### Required Software
- Python 3.9+
- PostgreSQL 14+
- Node.js 16+ (for frontend)
- pip (Python package manager)
- npm (Node package manager)

### Required Python Packages
```bash
# AI Provider SDKs
openai>=1.0.0          # OpenAI GPT-4
anthropic>=0.5.0       # Anthropic Claude
google-generativeai>=0.3.0  # Google Gemini
groq>=0.4.0           # Groq (Meta Llama)

# HTTP and async support
httpx>=0.24.0
asyncio

# FastAPI and dependencies (already installed)
fastapi
sqlalchemy
pydantic
```

### System Requirements
- **RAM**: Minimum 2GB, Recommended 4GB+
- **Storage**: 500MB for dependencies
- **Network**: Internet connection for API calls

---

## 2. Installation

### Step 1: Install Python Dependencies

```bash
cd /home/user/webapp/backend

# Install AI provider SDKs
pip install openai anthropic google-generativeai groq

# Install HTTP client
pip install httpx

# Verify installations
python -c "import openai; print('OpenAI:', openai.__version__)"
python -c "import anthropic; print('Anthropic:', anthropic.__version__)"
python -c "import google.generativeai; print('Gemini: OK')"
python -c "import groq; print('Groq:', groq.__version__)"
```

### Step 2: Verify File Structure

```bash
backend/
├── api/
│   ├── ai_content_api.py           # ✓ API endpoints
│   └── social_media_credentials_api.py  # ✓ Credentials API
├── services/
│   ├── ai_providers_base.py        # ✓ Base architecture
│   ├── ai_provider_adapters.py     # ✓ Provider implementations
│   ├── ai_provider_factory.py      # ✓ Factory and router
│   └── ai_content_service.py       # ✓ High-level service
└── main.py                          # ✓ Updated with routes

frontend/
├── src/
│   ├── api/
│   │   └── aiContentApi.ts         # ✓ TypeScript client
│   └── components/
│       └── admin/
│           ├── AIContentGenerator.tsx  # ✓ UI component
│           └── SocialMediaManager.tsx  # ✓ Updated with AI tab
```

---

## 3. Configuration

### Step 1: Environment Variables

Create or update your `.env` file in `/home/user/webapp/backend/`:

```bash
# ===== AI PROVIDER API KEYS =====

# OpenAI (Required - Primary Provider)
OPENAI_API_KEY=sk-...your-openai-api-key...
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=800
OPENAI_TEMPERATURE=0.7

# Anthropic Claude (Required - Quality Backup)
ANTHROPIC_API_KEY=sk-ant-...your-anthropic-api-key...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_MAX_TOKENS=800
ANTHROPIC_TEMPERATURE=0.7

# Google Gemini (Required - Free Tier)
GOOGLE_AI_API_KEY=AIza...your-google-api-key...
GOOGLE_AI_MODEL=gemini-pro
GOOGLE_AI_MAX_TOKENS=800
GOOGLE_AI_TEMPERATURE=0.7

# Groq - Meta Llama (Optional - Speed)
GROQ_API_KEY=gsk_...your-groq-api-key...
GROQ_MODEL=llama-3.1-70b-versatile
GROQ_MAX_TOKENS=800
GROQ_TEMPERATURE=0.7

# Provider Selection Strategy
AI_PRIMARY_PROVIDER=openai
AI_FALLBACK_PROVIDERS=gemini,anthropic,groq
AI_AUTO_FALLBACK=true

# ===== EXISTING CONFIGURATION =====
# (Keep all your existing database, encryption, and other settings)
```

### Step 2: Provider Priority Configuration

The system uses intelligent routing based on content type:

| Content Type | Primary Provider | Reason |
|--------------|-----------------|--------|
| Instagram/TikTok Posts | OpenAI GPT-4 | Best creativity |
| LinkedIn Posts | Anthropic Claude | Professional tone |
| High Volume | Google Gemini | Free tier |
| Comment Responses | Groq (Llama) | Fastest speed |

You can override by specifying `provider` in API requests.

---

## 4. API Key Setup

### 4.1 OpenAI (Required)

**Cost**: ~$18/month for typical usage

1. Go to https://platform.openai.com/signup
2. Sign up or log in
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Add to `.env`: `OPENAI_API_KEY=sk-...`

**Initial Credit**: $5 free trial credit

### 4.2 Anthropic Claude (Required)

**Cost**: ~$8/month for typical usage

1. Go to https://console.anthropic.com/
2. Sign up with email
3. Go to **Settings** → **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)
6. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-...`
7. Add $5 minimum deposit in billing

**Free Tier**: 50 requests/day

### 4.3 Google Gemini (Required - FREE!)

**Cost**: **FREE** (15 requests/min, 1M tokens/min)

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with Google account
3. Click **Get API Key**
4. Click **Create API key in new project**
5. Copy the key (starts with `AIza`)
6. Add to `.env`: `GOOGLE_AI_API_KEY=AIza...`

**No billing required for free tier!**

### 4.4 Groq - Meta Llama (Optional - FREE!)

**Cost**: **FREE** (30 requests/min)

1. Go to https://console.groq.com/
2. Sign up with email
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Copy the key (starts with `gsk_`)
6. Add to `.env`: `GROQ_API_KEY=gsk_...`

**Fastest inference speed (100+ tokens/second)**

### API Key Security Checklist

- [ ] Never commit `.env` file to Git
- [ ] Store keys in environment variables
- [ ] Use different keys for dev/prod
- [ ] Rotate keys every 90 days
- [ ] Monitor usage in provider dashboards
- [ ] Set up billing alerts

---

## 5. Database Setup

The AI content system doesn't require new database tables (uses existing social media tables), but you can optionally create a tracking table:

### Optional: Create AI Content Tracking Table

```sql
-- Run this migration if you want to track AI-generated content
CREATE TABLE ai_generated_content (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    prompt TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    tone VARCHAR(50) NOT NULL,
    generated_content TEXT NOT NULL,
    provider VARCHAR(50) NOT NULL,
    input_tokens INTEGER NOT NULL,
    output_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    generation_time_ms INTEGER,
    metadata JSONB,
    admin_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX idx_ai_content_platform ON ai_generated_content(platform);
CREATE INDEX idx_ai_content_provider ON ai_generated_content(provider);
CREATE INDEX idx_ai_content_created_at ON ai_generated_content(created_at);
```

---

## 6. Testing

### Step 1: Test Provider Connectivity

```bash
# Start backend server
cd /home/user/webapp/backend
python main.py

# In another terminal, test providers
curl http://localhost:8000/api/ai/providers/test
```

**Expected Response**:
```json
{
  "success": true,
  "providers": {
    "openai": {"connected": true, "model": "gpt-4-turbo-preview"},
    "anthropic": {"connected": true, "model": "claude-3-5-sonnet-20241022"},
    "google": {"connected": true, "model": "gemini-pro"},
    "groq": {"connected": true, "model": "llama-3.1-70b-versatile"}
  },
  "summary": {
    "total": 4,
    "connected": 4,
    "health_percentage": 100
  }
}
```

### Step 2: Test Content Generation

```bash
# Test post generation
curl -X POST http://localhost:8000/api/ai/generate/post \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Create an engaging Instagram post about meditation retreats in Sedona",
    "platform": "instagram",
    "language": "en",
    "tone": "inspirational"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "content": "🌵✨ Discover inner peace among Sedona's red rocks...",
  "provider": "openai",
  "metadata": {
    "platform": "instagram",
    "hashtags": ["#Meditation", "#Sedona", "#SpiritualRetreat"],
    "generation_time_ms": 1247
  },
  "tokens": {
    "input": 156,
    "output": 234,
    "total": 390
  },
  "cost_estimate": {
    "total": 0.008,
    "currency": "USD"
  }
}
```

### Step 3: Test Frontend

```bash
# Start frontend
cd /home/user/webapp/frontend
npm start

# Open browser: http://localhost:3000
# Navigate to: Social Media Manager → 🤖 AI Content tab
```

**UI Test Checklist**:
- [ ] Platform selection works
- [ ] Language dropdown populated
- [ ] Tone selector functional
- [ ] Generate button works
- [ ] Content appears in preview panel
- [ ] Copy to clipboard works
- [ ] Token usage displayed
- [ ] Cost estimate shown
- [ ] Hashtags rendered
- [ ] Regenerate button works

---

## 7. Usage Examples

### Example 1: Generate Instagram Post

```typescript
import { generatePost } from './api/aiContentApi';

const result = await generatePost({
  prompt: 'Announce our new spiritual retreat in Bali with yoga and meditation',
  platform: 'instagram',
  language: 'en',
  tone: 'enthusiastic',
  keywords: ['yoga', 'meditation', 'bali', 'retreat']
});

console.log(result.content);
// Output: "🌴✨ EXCITING NEWS! Join us in Bali for the ultimate spiritual journey..."
```

### Example 2: Generate Hashtags

```typescript
import { generateHashtags } from './api/aiContentApi';

const result = await generateHashtags({
  content: 'Amazing sunset meditation session at the beach',
  platform: 'instagram',
  language: 'en',
  count: 15
});

console.log(result.hashtags);
// Output: ["#SunsetMeditation", "#BeachYoga", "#Mindfulness", ...]
```

### Example 3: Repurpose Content

```typescript
import { repurposeContent } from './api/aiContentApi';

const result = await repurposeContent({
  source_content: 'Long LinkedIn post about spiritual tourism...',
  source_platform: 'linkedin',
  target_platforms: ['instagram', 'twitter', 'tiktok'],
  language: 'en'
});

// Get platform-specific versions
const instagramPost = result.repurposed.instagram.content;
const twitterPost = result.repurposed.twitter.content;
const tiktokScript = result.repurposed.tiktok.content;
```

### Example 4: Generate Comment Response

```typescript
import { generateCommentResponse } from './api/aiContentApi';

const result = await generateCommentResponse({
  comment_text: 'How much does the Sedona retreat cost?',
  platform: 'instagram',
  language: 'en',
  sentiment: 'neutral'
});

console.log(result.response);
// Output: "Great question! Our Sedona retreat starts at $899..."
```

### Example 5: A/B Testing Variants

```typescript
import { generateVariants } from './api/aiContentApi';

const result = await generateVariants({
  prompt: 'Promote our early bird discount',
  platform: 'facebook',
  language: 'en',
  variant_count: 3
});

// Test 3 different versions
result.variants.forEach((variant, index) => {
  console.log(`Variant ${index + 1} (${variant.tone}):`, variant.content);
});
```

---

## 8. Troubleshooting

### Problem: "No AI providers configured"

**Solution**:
```bash
# Check if API keys are set
echo $OPENAI_API_KEY
echo $GOOGLE_AI_API_KEY
echo $ANTHROPIC_API_KEY

# If empty, add to .env file and restart server
```

### Problem: "Invalid API key"

**Solution**:
1. Verify key format (OpenAI: `sk-`, Anthropic: `sk-ant-`, Google: `AIza`)
2. Check for extra spaces or quotes
3. Test key in provider's playground
4. Regenerate key if necessary

### Problem: "Rate limit exceeded"

**Solution**:
```python
# System automatically falls back to next provider
# Check which provider is being used:
curl http://localhost:8000/api/ai/providers

# Upgrade to paid tier if needed:
# - OpenAI: Tier 1 requires $50 spending
# - Anthropic: No free tier, add credits
# - Google: 15 RPM free tier (generous)
```

### Problem: "Generation too slow"

**Solution**:
```bash
# Use Groq for fastest responses
curl -X POST http://localhost:8000/api/ai/generate/post \
  -d '{"prompt": "...", "provider": "groq", ...}'

# Or set as primary in .env:
AI_PRIMARY_PROVIDER=groq
```

### Problem: "Content quality not good enough"

**Solution**:
```python
# Use Claude for highest quality
{
  "prompt": "Create a professional LinkedIn post...",
  "provider": "anthropic",  # Force Claude
  "tone": "professional"
}

# Or set as primary:
AI_PRIMARY_PROVIDER=anthropic
```

### Problem: "Language not supported well"

**Solution**:
| Language | Best Provider |
|----------|--------------|
| Chinese | Qwen 2.5 |
| French | Mistral Large |
| Spanish | OpenAI GPT-4 |
| English | Any (all excellent) |

---

## 9. Cost Management

### Monthly Cost Breakdown

**Scenario**: 3 posts/day × 6 platforms = 18 posts/day

| Provider | Usage % | Monthly Cost |
|----------|---------|-------------|
| OpenAI GPT-4 | 60% | $18 |
| Google Gemini | 30% | **FREE** |
| Anthropic Claude | 10% | $8 |
| **Total** | 100% | **$26/month** |

### Cost Optimization Strategies

1. **Use Free Tier First**: Set Gemini as primary for most content
   ```bash
   AI_PRIMARY_PROVIDER=google
   AI_FALLBACK_PROVIDERS=openai,anthropic
   ```

2. **Smart Routing**: Let system auto-select based on content type
   ```python
   # Don't specify provider - system chooses optimal
   await generatePost({prompt: "...", platform: "..."})
   ```

3. **Batch Operations**: Generate multiple posts at once
   ```python
   # More efficient than one-by-one
   await generateVariants({..., variant_count: 5})
   ```

4. **Monitor Usage**: Check provider dashboards weekly
   - OpenAI: https://platform.openai.com/usage
   - Anthropic: https://console.anthropic.com/settings/usage
   - Google: https://console.cloud.google.com/apis/dashboard

5. **Set Billing Alerts**:
   - OpenAI: Set to $30/month
   - Anthropic: Set to $15/month
   - Total: $50/month safety limit

### ROI Calculation

**Manual Content Creation**:
- Time: 2 hours/day × 30 days = 60 hours
- Rate: $20/hour
- **Cost**: $1,200/month

**AI Content Creation**:
- API costs: $26/month
- Review time: 15 min/day = 7.5 hours
- Rate: $20/hour × 7.5 = $150
- **Cost**: $176/month

**Savings**: $1,024/month (85% reduction)

---

## 10. Best Practices

### Content Generation

1. **Be Specific in Prompts**
   ```
   ❌ Bad: "Create a post about tours"
   ✅ Good: "Create an enthusiastic Instagram post announcing our new 7-day spiritual retreat in Sedona, highlighting meditation, energy healing, and red rock vortexes"
   ```

2. **Use Keywords Strategically**
   ```typescript
   keywords: ['meditation', 'wellness', 'spiritual', 'transformation']
   ```

3. **Match Tone to Platform**
   - Instagram: enthusiastic, inspirational
   - LinkedIn: professional, educational
   - Twitter: casual, conversational
   - TikTok: friendly, humorous

4. **Leverage Templates**
   ```typescript
   // Faster and more consistent
   await generateFromTemplate('tour_announcement', {
     destination: 'Sedona',
     key_features: 'red rocks, vortexes, meditation'
   });
   ```

### Provider Selection

1. **Use Auto-Selection** for most cases (system knows best)
2. **Force OpenAI** for creative content (Instagram, TikTok)
3. **Force Claude** for professional content (LinkedIn)
4. **Force Gemini** for high volume (hundreds of posts)
5. **Force Groq** for real-time responses (comments)

### Security

1. **Never expose API keys** in frontend
2. **Use environment variables** only
3. **Rotate keys** every 90 days
4. **Monitor for unusual usage** (potential key leak)
5. **Use HTTPS** in production

### Quality Control

1. **Always review** AI-generated content before publishing
2. **Test A/B variants** to optimize engagement
3. **Track performance** by provider
4. **Adjust prompts** based on results
5. **Maintain brand voice** consistency

---

## ✅ Setup Complete!

If you've followed this guide, you now have:

- ✅ Multi-provider AI system configured
- ✅ API keys for 3-4 providers
- ✅ Frontend UI integrated
- ✅ Cost-effective setup ($26/month vs $1,200/month manual)
- ✅ 85% time savings
- ✅ Intelligent fallback system
- ✅ Production-ready deployment

### Next Steps

1. **Test thoroughly** with your brand voice
2. **Create content templates** for common scenarios
3. **Set up billing alerts** to monitor costs
4. **Train team** on using the AI generator
5. **Track ROI** and adjust strategy

### Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting) section
- Review provider documentation
- Contact development team

---

**Last Updated**: 2025-10-04  
**Version**: 1.0  
**Status**: Production Ready ✅
