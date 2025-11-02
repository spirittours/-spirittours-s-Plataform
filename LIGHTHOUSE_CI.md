# 🔦 Lighthouse CI - Performance Monitoring

## Overview

Automated performance, accessibility, SEO, and best practices auditing using Google Lighthouse CI integrated with GitHub Actions.

## 📊 What Gets Measured

### Core Web Vitals

1. **First Contentful Paint (FCP)** - Target: < 2.0s
   - Time until first text/image is painted

2. **Largest Contentful Paint (LCP)** - Target: < 2.5s  
   - Time until largest content element is visible

3. **Cumulative Layout Shift (CLS)** - Target: < 0.1
   - Visual stability metric

4. **Total Blocking Time (TBT)** - Target: < 300ms
   - Time the main thread is blocked

5. **Speed Index** - Target: < 3.4s
   - How quickly content is visually displayed

6. **Time to Interactive (TTI)** - Target: < 3.5s
   - Time until page is fully interactive

### Categories

- **Performance** (85%+) - Load speed and runtime performance
- **Accessibility** (90%+) - WCAG compliance and usability
- **Best Practices** (85%+) - Modern web development standards
- **SEO** (90%+) - Search engine optimization
- **PWA** (80%+) - Progressive Web App capabilities

## 🚀 How It Works

### Automatic Triggers

The Lighthouse CI workflow runs automatically on:

1. **Push to main/develop** - When frontend code changes
2. **Pull Requests** - For code review with results posted as comment
3. **Manual trigger** - Via GitHub Actions UI

### Workflow Steps

1. **Checkout code** - Get latest repository code
2. **Setup Node.js** - Install Node 20 with npm cache
3. **Install dependencies** - Run `npm ci` in frontend/
4. **Build production** - Create optimized production bundle
5. **Run Lighthouse** - Audit 4 pages, 3 runs each
6. **Upload artifacts** - Store reports for 30 days
7. **Comment on PR** - Post results to pull request
8. **Check budgets** - Fail if performance budgets exceeded

## 📝 Configuration

### Pages Audited

Located in `frontend/lighthouserc.json`:

```json
{
  "url": [
    "http://localhost:4173",           // Home page
    "http://localhost:4173/tours",     // Tours listing
    "http://localhost:4173/bookings",  // Bookings page
    "http://localhost:4173/about"      // About page
  ]
}
```

### Performance Budgets

#### Core Metrics

| Metric | Budget | Level |
|--------|--------|-------|
| Performance Score | 85%+ | Error |
| Accessibility Score | 90%+ | Error |
| Best Practices Score | 85%+ | Error |
| SEO Score | 90%+ | Error |
| PWA Score | 80%+ | Warning |

#### Load Times

| Metric | Budget | Level |
|--------|--------|-------|
| First Contentful Paint | < 2.0s | Warning |
| Largest Contentful Paint | < 2.5s | Error |
| Cumulative Layout Shift | < 0.1 | Error |
| Total Blocking Time | < 300ms | Warning |
| Speed Index | < 3.4s | Warning |
| Time to Interactive | < 3.5s | Warning |

#### Resource Optimization

- ✅ Text compression (gzip/brotli) - Required
- ✅ Modern image formats (WebP/AVIF) - Recommended
- ✅ Optimized images - Recommended
- ✅ Responsive images - Warning
- ⚠️ Unused CSS - 1 warning allowed
- ⚠️ Unused JavaScript - 1 warning allowed
- ✅ HTTP/2 enabled - Required

#### Accessibility

- ✅ Color contrast - Required
- ✅ Image alt text - Required
- ✅ Form labels - Required
- ✅ Button names - Required
- ✅ ARIA roles - Required
- ✅ ARIA attributes - Required
- ⚠️ Tab index - Warning

#### SEO

- ✅ Viewport meta tag - Required
- ✅ Document title - Required
- ✅ Meta description - Required
- ✅ Crawlable anchors - Required
- ✅ Robots.txt - Warning
- ✅ Canonical URLs - Warning

## 📈 Viewing Results

### GitHub Actions

1. Go to **Actions** tab in repository
2. Select **Lighthouse CI** workflow
3. Click on latest run
4. View summary and download artifacts

### PR Comments

Lighthouse automatically posts results to pull requests:

```markdown
## 🔦 Lighthouse CI Results

### http://localhost:4173

| Category | Score |
|----------|-------|
| 🟢 performance | 95 |
| 🟢 accessibility | 98 |
| 🟢 best-practices | 92 |
| 🟢 seo | 100 |
| 🟠 pwa | 75 |
```

### Artifacts

Download detailed HTML reports from GitHub Actions:

1. Navigate to workflow run
2. Scroll to **Artifacts** section
3. Download `lighthouse-reports`
4. Open HTML files in browser

## 🔧 Local Testing

### Install Lighthouse CLI

```bash
npm install -g @lhci/cli
```

### Run Lighthouse Locally

```bash
# Build production bundle
cd frontend
npm run build

# Start preview server
npm run preview

# Run Lighthouse CI in another terminal
lhci autorun --config=lighthouserc.json
```

### Manual Lighthouse Audit

```bash
# Using Chrome DevTools
# 1. Open DevTools (F12)
# 2. Go to Lighthouse tab
# 3. Select categories
# 4. Click "Generate report"
```

## 🎯 Optimization Tips

### Performance

1. **Code Splitting**
   ```tsx
   const Component = lazy(() => import('./Component'));
   ```

2. **Image Optimization**
   - Use WebP/AVIF formats
   - Implement lazy loading
   - Serve responsive images
   ```tsx
   <img 
     srcSet="image-320w.webp 320w, image-640w.webp 640w"
     sizes="(max-width: 600px) 320px, 640px"
     loading="lazy"
   />
   ```

3. **Bundle Size**
   - Tree shaking unused code
   - Dynamic imports
   - Minimize dependencies

4. **Caching**
   - Long cache headers for static assets
   - Service worker for offline support

### Accessibility

1. **Semantic HTML**
   ```tsx
   <nav aria-label="Main navigation">
     <button aria-label="Open menu">Menu</button>
   </nav>
   ```

2. **Color Contrast**
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text

3. **Keyboard Navigation**
   - Focus indicators
   - Logical tab order
   - Skip links

4. **Screen Readers**
   - Alt text for images
   - ARIA labels
   - Descriptive link text

### SEO

1. **Meta Tags**
   ```html
   <meta name="description" content="Spirit Tours - Holy Land Tours">
   <meta property="og:title" content="Spirit Tours">
   <meta name="twitter:card" content="summary_large_image">
   ```

2. **Structured Data**
   ```json
   {
     "@context": "https://schema.org",
     "@type": "TouristTrip",
     "name": "Jerusalem City Tour"
   }
   ```

3. **Sitemap & Robots**
   ```
   # robots.txt
   User-agent: *
   Allow: /
   Sitemap: https://spirit-tours.com/sitemap.xml
   ```

### Best Practices

1. **HTTPS Everywhere**
2. **CSP Headers**
3. **No console errors**
4. **Updated dependencies**
5. **Security headers**

## 📊 Performance Budget Details

### Budget Philosophy

- **Error** - Build fails, must fix
- **Warning** - Should improve, doesn't block
- **Off** - Audit disabled

### Adjusting Budgets

Edit `frontend/lighthouserc.json`:

```json
{
  "assert": {
    "assertions": {
      "categories:performance": ["error", { "minScore": 0.90 }],
      "largest-contentful-paint": ["error", { "maxNumericValue": 2000 }]
    }
  }
}
```

### Score Calculation

Lighthouse uses weighted scoring:

- **Performance**: 
  - FCP (10%)
  - Speed Index (10%)
  - LCP (25%)
  - TTI (10%)
  - TBT (30%)
  - CLS (15%)

## 🚨 Troubleshooting

### Build Fails

**Issue**: Workflow fails during build

**Solution**: 
```bash
cd frontend
npm run build
# Fix any build errors
```

### Budget Exceeded

**Issue**: Performance score below budget

**Solution**:
1. Run local audit to identify issues
2. Implement optimizations (see tips above)
3. Re-test locally before pushing

### Server Timeout

**Issue**: Preview server doesn't start

**Solution**:
- Check `startServerReadyPattern` in config
- Increase timeout in workflow
- Verify `npm run preview` works locally

### Inconsistent Scores

**Issue**: Scores vary between runs

**Solution**:
- Increase `numberOfRuns` (default: 3)
- Use median score
- Test on consistent environment

## 📚 Resources

- [Lighthouse Documentation](https://developer.chrome.com/docs/lighthouse/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI GitHub](https://github.com/GoogleChrome/lighthouse-ci)
- [Performance Budgets Guide](https://web.dev/performance-budgets-101/)

## 🔄 Continuous Monitoring

### Daily Reports (Optional)

Add scheduled workflow:

```yaml
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight
```

### Integration with Monitoring

Export metrics to:
- Google Analytics
- Datadog
- New Relic
- Sentry Performance

### Historical Tracking

Use Lighthouse CI Server for historical data:

```bash
npm install -g @lhci/server
lhci server
```

## 💡 Best Practices

1. **Run on every PR** - Catch regressions early
2. **Set realistic budgets** - Based on your baseline
3. **Monitor trends** - Track improvements over time
4. **Fix errors first** - Then address warnings
5. **Test on real devices** - Supplement with manual testing
6. **Document exceptions** - When budgets can't be met
7. **Share results** - With team and stakeholders

## 🎓 Next Steps

1. ✅ Review initial audit results
2. 📊 Establish baseline scores
3. 🎯 Set team performance goals
4. 🔧 Implement optimizations
5. 📈 Monitor improvements
6. 🚀 Iterate and improve

---

**Last Updated**: 2024-11-02  
**Version**: 1.0.0  
**Maintainer**: Spirit Tours Development Team
