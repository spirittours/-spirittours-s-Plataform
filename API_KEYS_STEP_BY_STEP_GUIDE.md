# 🔑 API KEYS ACQUISITION GUIDE - Step by Step

**Purpose**: Get all API credentials needed for Social Media AI system  
**Audience**: Spirit Tours administrators (non-technical)  
**Time Required**: 3-4 hours total (spread over 1-2 weeks for TikTok approval)

---

## 📋 CHECKLIST

Track your progress:

- [ ] **Facebook/Instagram** (30-45 minutes)
- [ ] **YouTube** (20-30 minutes)
- [ ] **Twitter/X** (20-30 minutes)  
- [ ] **LinkedIn** (15-20 minutes)
- [ ] **TikTok** (10 minutes to apply, 1-2 weeks for approval)
- [ ] **Create TikTok Account** @spirittoursusa (5 minutes)

---

## 🎯 PRIORITY ORDER

**Start with these first** (critical platforms):

1. **Facebook/Instagram** ⭐⭐⭐ (Your main platforms)
2. **TikTok Application** ⭐⭐⭐ (Takes 1-2 weeks approval - start NOW!)
3. **YouTube** ⭐⭐ (You have existing content)
4. **Twitter/X** ⭐
5. **LinkedIn** ⭐

---

# 1️⃣ FACEBOOK & INSTAGRAM

**Time**: 30-45 minutes  
**Difficulty**: Medium  
**Prerequisites**: Facebook Business Account, Instagram Business Account

## Step 1: Create Facebook App

### 1.1 Go to Facebook Developers

🔗 Open: **https://developers.facebook.com/**

Click **"Get Started"** (if first time) or **"My Apps"** → **"Create App"**

### 1.2 Choose App Type

- Select: **"Business"**
- Click **"Next"**

### 1.3 Fill App Details

```
Display Name: Spirit Tours Social Manager
App Contact Email: [your_admin_email]@spirittours.com
Business Account: [Select or create "Spirit Tours"]
```

Click **"Create App"**

### 1.4 Add Facebook Login Product

In your app dashboard:
- Scroll to **"Add Products"**
- Find **"Facebook Login"**
- Click **"Set Up"**

### 1.5 Get App Credentials

Go to **Settings** → **Basic**:

```
📋 COPY THESE:
App ID: _________________ (e.g., 123456789012345)
App Secret: _____________ (click "Show" to reveal)
```

**⚠️ IMPORTANT**: Keep App Secret confidential!

### 1.6 Configure App Settings

Still in **Settings** → **Basic**:

```
App Domains: spirittours.com
Privacy Policy URL: https://spirittours.com/privacy
Terms of Service URL: https://spirittours.com/terms
```

Save changes.

---

## Step 2: Get Access Token

### 2.1 Open Graph API Explorer

🔗 Go to: **https://developers.facebook.com/tools/explorer/**

- Select your app from dropdown
- Click **"Generate Access Token"**

### 2.2 Select Permissions

Check these permissions:
```
✅ pages_show_list
✅ pages_read_engagement
✅ pages_manage_posts
✅ pages_manage_engagement
✅ pages_read_user_content
✅ pages_manage_metadata
✅ instagram_basic
✅ instagram_content_publish
✅ instagram_manage_comments
✅ instagram_manage_insights
```

Click **"Generate Access Token"** → **"Continue"** → **"OK"**

### 2.3 Get Long-Lived Token

The token you just generated expires in 1-2 hours. Convert it to a long-lived token (60 days):

**Method 1: Use curl (if you have terminal access)**

```bash
curl -G "https://graph.facebook.com/v19.0/oauth/access_token" \
  -d "grant_type=fb_exchange_token" \
  -d "client_id=YOUR_APP_ID" \
  -d "client_secret=YOUR_APP_SECRET" \
  -d "fb_exchange_token=SHORT_TOKEN_FROM_STEP_2.2"
```

Response:
```json
{
  "access_token": "EAAxxxxxxxx...",  👈 This is your long-lived token
  "token_type": "bearer",
  "expires_in": 5183944
}
```

**Method 2: Use online tool**

🔗 Go to: **https://developers.facebook.com/tools/accesstoken/**

- Find your short-lived token
- Click **"Extend Access Token"**
- Copy the new long-lived token

---

## Step 3: Get Page Access Token (Never Expires!)

### 3.1 Get Your Pages

In Graph API Explorer (https://developers.facebook.com/tools/explorer/):

```
GET Request: /me/accounts?access_token=YOUR_LONG_LIVED_TOKEN
```

Click **"Submit"**

### 3.2 Find Your Spirit Tours Page

Response will look like:
```json
{
  "data": [
    {
      "access_token": "EAAxxxxxxxx...",  👈 THIS IS YOUR PAGE TOKEN (use this!)
      "category": "Travel Company",
      "name": "Spirit Tours",
      "id": "987654321098765",  👈 THIS IS YOUR PAGE ID
      "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT"]
    }
  ]
}
```

📋 **COPY THESE:**
```
Page Access Token: _________________________________
Page ID: ___________________________________________
```

**✅ This page token NEVER expires!**

---

## Step 4: Get Instagram Business Account ID

### 4.1 Link Instagram to Facebook Page

If not already linked:
1. Go to your Facebook Page
2. Settings → Instagram
3. Click **"Connect Account"**
4. Log in with your Instagram business account (@spirittoursusa)

### 4.2 Get Instagram Account ID

In Graph API Explorer:

```
GET Request: /me/accounts?fields=instagram_business_account{id,username}
```

Response:
```json
{
  "data": [
    {
      "instagram_business_account": {
        "id": "17841400123456789",  👈 THIS IS YOUR INSTAGRAM ID
        "username": "spirittoursusa"
      }
    }
  ]
}
```

📋 **COPY THIS:**
```
Instagram Business Account ID: _________________________
```

---

## ✅ FACEBOOK/INSTAGRAM FINAL CHECKLIST

You should now have:

```
✅ App ID: _________________
✅ App Secret: _____________
✅ Page Access Token: ______
✅ Page ID: ________________
✅ Instagram Account ID: ___
```

**Save these in a secure location!** You'll enter them in the admin dashboard later.

---

# 2️⃣ YOUTUBE DATA API

**Time**: 20-30 minutes  
**Difficulty**: Easy  
**Prerequisites**: Google Account, YouTube Channel

## Step 1: Go to Google Cloud Console

🔗 Open: **https://console.cloud.google.com/**

Sign in with your Google account (the one that owns Spirit Tours YouTube channel)

## Step 2: Create New Project

- Click **"Select a project"** dropdown (top left)
- Click **"New Project"**

```
Project Name: Spirit Tours Social Media
Organization: (leave blank or select your org)
Location: (leave default)
```

Click **"Create"**

## Step 3: Enable YouTube Data API v3

- Go to **"APIs & Services"** → **"Library"**
- Search for: **"YouTube Data API v3"**
- Click on it
- Click **"Enable"**

## Step 4: Create OAuth 2.0 Credentials

### 4.1 Configure OAuth Consent Screen

- Go to **"APIs & Services"** → **"OAuth consent screen"**
- Select **"External"** → **"Create"**

Fill in:
```
App name: Spirit Tours Social Manager
User support email: [your email]
Developer contact: [your email]
```

Click **"Save and Continue"**

### 4.2 Add Scopes

Click **"Add or Remove Scopes"**

Check these:
```
✅ .../auth/youtube
✅ .../auth/youtube.force-ssl
✅ .../auth/youtube.readonly
✅ .../auth/youtube.upload
```

Click **"Update"** → **"Save and Continue"**

### 4.3 Add Test Users (Optional for Development)

Add your email address → **"Save and Continue"**

## Step 5: Create OAuth Client ID

- Go to **"APIs & Services"** → **"Credentials"**
- Click **"Create Credentials"** → **"OAuth client ID"**

```
Application type: Web application
Name: Spirit Tours Web Client

Authorized redirect URIs:
https://spirittours.com/api/auth/youtube/callback
http://localhost:3000/api/auth/youtube/callback (for testing)
```

Click **"Create"**

### 5.1 Save Credentials

A dialog appears with:

📋 **COPY THESE:**
```
Client ID: ___________________________________
Client Secret: _______________________________
```

Click **"Download JSON"** (optional, for backup)

## Step 6: Create API Key

- Still in **"Credentials"** page
- Click **"Create Credentials"** → **"API key"**
- Copy the generated API key

📋 **COPY THIS:**
```
API Key: _____________________________________
```

**Optional**: Click **"Restrict Key"** and limit to YouTube Data API v3

---

## ✅ YOUTUBE FINAL CHECKLIST

You should now have:

```
✅ Client ID: ______________
✅ Client Secret: __________
✅ API Key: ________________
```

---

# 3️⃣ TWITTER / X API

**Time**: 20-30 minutes  
**Difficulty**: Easy  
**Prerequisites**: Twitter/X account  
**Cost**: Free tier (1,500 tweets/month) or Basic ($100/month for 10,000 tweets)

## Step 1: Apply for Developer Account

🔗 Go to: **https://developer.twitter.com/en/portal/petition/essential/basic-info**

- Sign in with your Twitter/X account (@SpiritToursUSA)
- Click **"Apply"**

## Step 2: Fill Application Form

### 2.1 Account Details
```
How will you use the Twitter API?
Answer: "Managing social media for Spirit Tours travel company. 
Posting tour updates, responding to customer inquiries, analyzing engagement."

In your words, describe your project:
Answer: "Automated social media management system for a travel agency. 
Will post about tours, respond to comments, track mentions, and analyze customer sentiment."

Are you planning to analyze Twitter data?
Answer: ✅ Yes - "Analyzing engagement metrics and customer sentiment"

Will your app use Tweet, Retweet, Like, Follow, or Direct Message functionality?
Answer: ✅ Yes - "Posting tweets, replying to mentions, liking customer posts"

Do you plan to display Tweets or aggregate data about Twitter content outside Twitter?
Answer: ❌ No
```

### 2.2 Accept Terms

- Read and accept Twitter Developer Agreement
- Check **"I have read and agree"**
- Click **"Submit Application"**

### 2.3 Verify Email

- Check your email
- Click verification link
- Application is now pending review (usually approved within 24 hours)

## Step 3: Create App (After Approval)

Once approved:

🔗 Go to: **https://developer.twitter.com/en/portal/dashboard**

- Click **"Create App"**

```
App name: Spirit Tours Social Manager
App description: Social media automation for Spirit Tours travel company
Website URL: https://spirittours.com
```

Click **"Complete"**

## Step 4: Get API Keys

### 4.1 API Key and Secret

In your app dashboard:
- Go to **"Keys and tokens"** tab

📋 **COPY THESE:**
```
API Key: _____________________________________
API Key Secret: ______________________________
```

**⚠️ IMPORTANT**: Save these immediately! They're only shown once.

### 4.2 Bearer Token

Scroll down to **"Bearer Token"**:
- Click **"Generate"**

📋 **COPY THIS:**
```
Bearer Token: ________________________________
```

### 4.3 Access Token and Secret

Scroll to **"Access Token and Secret"**:
- Click **"Generate"**

📋 **COPY THESE:**
```
Access Token: ________________________________
Access Token Secret: _________________________
```

## Step 5: Set App Permissions

- Go to **"Settings"** tab
- Under **"User authentication settings"** → **"Set up"**

```
App permissions:
✅ Read and write
✅ Direct Messages (optional)

Type of App: Web App

Callback URL: https://spirittours.com/api/auth/twitter/callback
Website URL: https://spirittours.com
```

Click **"Save"**

---

## ✅ TWITTER/X FINAL CHECKLIST

You should now have:

```
✅ API Key: ________________
✅ API Key Secret: _________
✅ Bearer Token: ___________
✅ Access Token: ___________
✅ Access Token Secret: ____
```

**Note**: Free tier = 1,500 tweets/month. For 10,000/month, upgrade to Basic ($100/month)

---

# 4️⃣ LINKEDIN API

**Time**: 15-20 minutes  
**Difficulty**: Easy  
**Prerequisites**: LinkedIn Company Page

## Step 1: Create LinkedIn App

🔗 Go to: **https://www.linkedin.com/developers/apps**

- Click **"Create app"**

```
App name: Spirit Tours Social Manager
LinkedIn Page: Spirit Tours (select your company page)
Privacy policy URL: https://spirittours.com/privacy
App logo: (upload Spirit Tours logo, 300x300px)
```

Check **"I have read and agree to these terms"**

Click **"Create app"**

## Step 2: Get Client Credentials

In your app dashboard:
- Go to **"Auth"** tab

📋 **COPY THESE:**
```
Client ID: ___________________________________
Client Secret: _______________________________
```

## Step 3: Request Product Access

- Go to **"Products"** tab
- Find **"Share on LinkedIn"** → Click **"Request access"**
- Find **"Marketing Developer Platform"** → Click **"Request access"**

Fill justification:
```
"Social media management for Spirit Tours travel company. 
Will post company updates, share tour information, and engage with followers."
```

Click **"Request access"** (approval usually instant for basic features)

## Step 4: Set Redirect URLs

- Go to **"Auth"** tab
- Scroll to **"Authorized redirect URLs"**
- Add:

```
https://spirittours.com/api/auth/linkedin/callback
http://localhost:3000/api/auth/linkedin/callback (for testing)
```

Click **"Update"**

---

## ✅ LINKEDIN FINAL CHECKLIST

You should now have:

```
✅ Client ID: ______________
✅ Client Secret: __________
✅ Company Page ID: ________
```

---

# 5️⃣ TIKTOK BUSINESS API

**Time**: 10 minutes to apply, **1-2 WEEKS for approval**  
**Difficulty**: Easy (but requires patience)  
**Prerequisites**: TikTok Business account

⚠️ **START THIS FIRST!** Approval takes 1-2 weeks.

## Step 1: Create TikTok Business Account

If you don't have one yet:

🔗 Go to: **https://business.tiktok.com/**

- Sign up with email
- Verify email
- Complete business profile

## Step 2: Apply for Developer Account

🔗 Go to: **https://developers.tiktok.com/**

- Click **"Register Now"** or **"Login"**
- Sign in with your TikTok Business account

## Step 3: Create App

- Go to **"My Apps"** → **"Create an app"**

```
App name: Spirit Tours Social Manager
Category: Business & Productivity
Description: Social media management system for Spirit Tours travel agency
```

Click **"Submit"**

## Step 4: Request API Access

- In your app dashboard, go to **"Add products"**
- Select **"Login Kit"** → Request
- Select **"Content Posting API"** → Request

Fill application form:
```
Use case: Social media management for travel company
Expected posts per day: 10-15
Business verification: Upload business documents if requested
```

## Step 5: Wait for Approval

- Approval time: **1-2 weeks**
- You'll receive email notification
- Meanwhile, continue with other platforms

## Step 6: Get Credentials (After Approval)

Once approved:
- Go to your app dashboard
- Click **"Credentials"**

📋 **COPY THESE:**
```
Client Key: __________________________________
Client Secret: _______________________________
```

---

## ✅ TIKTOK CHECKLIST

```
✅ Application submitted
⏳ Waiting for approval (check email daily)
⏳ Client Key: (will get after approval)
⏳ Client Secret: (will get after approval)
```

---

# 6️⃣ CREATE TIKTOK ACCOUNT

**Time**: 5 minutes  
**Difficulty**: Very Easy

## Step 1: Download TikTok App

- iOS: App Store
- Android: Google Play

Or use web: **https://www.tiktok.com/**

## Step 2: Create Account

```
Username: spirittoursusa
Email: [your business email]
Password: [create strong password]
```

## Step 3: Switch to Business Account

- Go to Profile
- Tap menu (☰)
- **Settings and privacy** → **Manage account**
- **Switch to Business Account**
- Select category: **Travel**

## Step 4: Complete Profile

```
Profile name: Spirit Tours
Bio: 
"✈️ Your Dream Tour Starts Here
🌎 Peru | Costa Rica | Latin America
📧 contact@spirittours.com
👇 Book your adventure"

Profile picture: Spirit Tours logo
Website: https://spirittours.com
```

## Step 5: Link Instagram (Optional)

- Settings → **Add Instagram account**
- Link @spirittoursusa

---

## ✅ TIKTOK ACCOUNT CHECKLIST

```
✅ Account created: @spirittoursusa
✅ Switched to Business Account
✅ Profile completed
✅ Ready for content!
```

---

# 📊 FINAL MASTER CHECKLIST

Track all your credentials:

## Facebook/Instagram ✅
- [ ] App ID: ________________
- [ ] App Secret: ____________
- [ ] Page Access Token: _____
- [ ] Page ID: _______________
- [ ] Instagram Account ID: __

## YouTube ✅
- [ ] Client ID: _____________
- [ ] Client Secret: _________
- [ ] API Key: _______________

## Twitter/X ✅
- [ ] API Key: _______________
- [ ] API Key Secret: ________
- [ ] Bearer Token: __________
- [ ] Access Token: __________
- [ ] Access Token Secret: ___

## LinkedIn ✅
- [ ] Client ID: _____________
- [ ] Client Secret: _________

## TikTok ⏳
- [ ] Application submitted
- [ ] Approval received (date: _____)
- [ ] Client Key: ____________
- [ ] Client Secret: _________

## TikTok Account ✅
- [ ] @spirittoursusa created
- [ ] Business account activated

---

# 🎯 NEXT STEPS

Once you have all credentials:

1. **Securely store them** (password manager recommended)
2. **Login to admin dashboard** (when ready)
3. **Navigate to Social Media section**
4. **Add credentials** for each platform
5. **Test connections** (one click per platform)
6. **Start automating!** 🚀

---

# 🆘 NEED HELP?

## Common Issues

### Facebook: "Invalid OAuth access token"
**Solution**: Token expired. Generate new long-lived token (Step 2.3)

### YouTube: "Access denied"
**Solution**: Check OAuth scopes include youtube.upload

### Twitter: "Forbidden - 403"
**Solution**: App permissions might be Read-only. Change to "Read and write"

### TikTok: "Application pending"
**Solution**: Normal. Wait 1-2 weeks. Check email daily.

---

# 📞 SUPPORT CONTACTS

- **Facebook/Instagram**: https://developers.facebook.com/support
- **YouTube**: https://support.google.com/youtube
- **Twitter**: https://developer.twitter.com/en/support
- **LinkedIn**: https://www.linkedin.com/help/linkedin/ask/API
- **TikTok**: https://developers.tiktok.com/support

---

**Created**: 2025-10-04  
**Updated**: 2025-10-04  
**Version**: 1.0
