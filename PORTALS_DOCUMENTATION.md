# 🏢 B2B/B2C/B2B2C Portals Documentation

## Overview

Complete portal system for Spirit Tours supporting multiple business models: Business-to-Business (B2B), Business-to-Consumer (B2C), and hybrid B2B2C operations.

## 📊 Portal Types

### 1. Agency Dashboard (B2B)
**Purpose**: Travel agency partner management and commission tracking

**Target Users**: Travel agencies, tour operators, corporate partners

**Key Features**:
- Performance metrics and KPIs
- Commission tracking with tier system
- Client portfolio management
- White-label booking widget
- Marketing materials library
- Real-time analytics and reports
- Multi-currency support

**Commission Tiers**:
- **Bronze**: 0-50 bookings (10% commission)
- **Silver**: 51-150 bookings (12% commission)
- **Gold**: 151-300 bookings (15% commission)
- **Platinum**: 301+ bookings (18% commission)

### 2. Customer Portal (B2C)
**Purpose**: Direct consumer booking and trip management

**Target Users**: Individual travelers, families, groups

**Key Features**:
- Tour discovery and booking
- Booking history management
- Loyalty program and rewards
- Wishlist functionality
- Review and rating system
- Customer support integration
- Personalized recommendations

**Loyalty Tiers**:
- **Bronze**: 0-5 bookings
- **Silver**: 6-15 bookings
- **Gold**: 16-30 bookings
- **Platinum**: 31+ bookings

### 3. Hybrid Interface (B2B2C)
**Purpose**: Combined portal for agencies managing direct customer bookings

**Features**:
- Agency dashboard with customer portal integration
- Client sub-accounts management
- Revenue sharing and commission splits
- Branded customer experience
- Agency override controls
- Consolidated reporting

## 🚀 Usage

### Agency Dashboard

```tsx
import { AgencyDashboard } from '@/components/Portals/AgencyDashboard';

function AgencyApp() {
  return (
    <AgencyDashboard agencyId="agency-123" />
  );
}
```

**Features Available**:
1. **Metrics Dashboard** - Real-time performance KPIs
2. **Recent Bookings** - Client booking history
3. **Clients** - Portfolio management
4. **Marketing** - Downloadable materials
5. **Widget** - White-label booking embed
6. **Reports** - Analytics and statements

### Customer Portal

```tsx
import { CustomerPortal } from '@/components/Portals/CustomerPortal';

function CustomerApp() {
  return (
    <CustomerPortal customerId="customer-123" />
  );
}
```

**Features Available**:
1. **Discover Tours** - Browse and search tours
2. **My Bookings** - Manage reservations
3. **Wishlist** - Save favorite tours
4. **Loyalty Rewards** - Points and benefits

## 📝 API Integration

### Agency Dashboard APIs

**Get Agency Metrics**:
```typescript
GET /api/agencies/:agencyId/metrics

Response: {
  totalBookings: number;
  totalRevenue: number;
  totalCommission: number;
  activeClients: number;
  conversionRate: number;
  averageBookingValue: number;
  monthlyGrowth: number;
}
```

**Get Agency Bookings**:
```typescript
GET /api/agencies/:agencyId/bookings

Response: Booking[] {
  id: string;
  clientName: string;
  tourName: string;
  date: string;
  amount: number;
  commission: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}
```

### Customer Portal APIs

**Get Featured Tours**:
```typescript
GET /api/tours/featured

Response: Tour[] {
  id: string;
  title: string;
  description: string;
  image: string;
  duration: string;
  price: number;
  rating: number;
  reviews: number;
  category: string;
}
```

**Get Customer Bookings**:
```typescript
GET /api/customers/:customerId/bookings

Response: Booking[] {
  id: string;
  tourTitle: string;
  tourImage: string;
  date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  guests: number;
  totalAmount: number;
}
```

**Get Loyalty Info**:
```typescript
GET /api/customers/:customerId/loyalty

Response: {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  nextTierPoints: number;
  benefits: string[];
}
```

## 🎨 Customization

### White-Label Widget

Agencies can embed the booking widget on their website:

```html
<iframe 
  src="https://spirit-tours.com/widget/agency-123" 
  width="100%" 
  height="600px" 
  frameborder="0">
</iframe>
```

**Customization Options**:
- Brand colors and logo
- Custom domain (CNAME)
- Language preferences
- Currency settings
- Featured tours selection

### Branding

Both portals support custom branding:

```typescript
const brandConfig = {
  primaryColor: '#2196F3',
  secondaryColor: '#FF9800',
  logo: '/path/to/logo.png',
  favicon: '/path/to/favicon.ico',
  companyName: 'Your Company',
};
```

## 📊 Reporting & Analytics

### Agency Reports

Available reports:
1. **Monthly Performance** - Revenue, bookings, commissions
2. **Commission Statement** - Detailed commission breakdown
3. **Client Activity** - Per-client booking analysis
4. **Booking Trends** - Seasonal and category trends

### Customer Reports

Available for customers:
1. **Booking History** - All past and upcoming bookings
2. **Spending Summary** - Total spent and average booking value
3. **Loyalty Statement** - Points earned and redeemed
4. **Review History** - Tours reviewed and ratings given

## 🔒 Security & Permissions

### Agency Dashboard Permissions

- **Admin**: Full access to all features
- **Agent**: Booking management, client view
- **Marketing**: Marketing materials only
- **Finance**: Reports and statements only

### Customer Portal Permissions

All features available to authenticated customers. Guest browsing available for tour discovery.

## 💳 Payment Integration

### Agency Payments

- Commission payments via bank transfer
- Monthly automatic payouts
- Net-30 payment terms
- Multi-currency support

### Customer Payments

- Credit/debit cards
- PayPal
- Bank transfers
- Split payments
- Installment plans (for tours >$1000)

## 📱 Mobile Responsiveness

Both portals are fully responsive:

**Breakpoints**:
- Mobile: < 600px
- Tablet: 600px - 960px
- Desktop: > 960px

**Mobile-Specific Features**:
- Touch-optimized interfaces
- Swipe gestures
- Bottom navigation
- Progressive Web App (PWA) support

## ♿ Accessibility

WCAG 2.1 Level AA compliance:

- Keyboard navigation
- Screen reader support
- ARIA labels
- Color contrast compliance
- Focus indicators
- Alternative text for images

## 🌐 Internationalization

Supported languages:
- English (en)
- Spanish (es)
- Hebrew (he)
- Arabic (ar)

RTL support for Hebrew and Arabic.

## 🧪 Testing

### Agency Dashboard Tests

```typescript
import { render, screen } from '@testing-library/react';
import { AgencyDashboard } from './AgencyDashboard';

test('renders agency metrics', async () => {
  render(<AgencyDashboard agencyId="test-123" />);
  
  await waitFor(() => {
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Commission/i)).toBeInTheDocument();
  });
});
```

### Customer Portal Tests

```typescript
import { render, screen } from '@testing-library/react';
import { CustomerPortal } from './CustomerPortal';

test('renders tour discovery', async () => {
  render(<CustomerPortal customerId="test-123" />);
  
  await waitFor(() => {
    expect(screen.getByPlaceholderText(/Search tours/i)).toBeInTheDocument();
  });
});
```

## 📈 Performance Optimization

### Implemented Optimizations

1. **Code Splitting**
   - Lazy loading of tabs
   - Dynamic imports for heavy components

2. **Caching**
   - React Query for API caching
   - 5-minute stale time for metrics
   - Infinite cache for static content

3. **Image Optimization**
   - Lazy loading with Intersection Observer
   - WebP format with fallbacks
   - Responsive images

4. **Bundle Size**
   - Tree shaking
   - Code minification
   - Dynamic imports

## 🐛 Troubleshooting

### Common Issues

**Issue**: Metrics not loading
**Solution**: Check API endpoint and authentication token

**Issue**: Widget not displaying
**Solution**: Verify iframe source URL and CORS settings

**Issue**: Payments failing
**Solution**: Check payment gateway configuration

## 💡 Best Practices

### For Agencies

1. **Regular Reports** - Review monthly performance
2. **Client Communication** - Keep clients informed
3. **Marketing Materials** - Use provided resources
4. **Widget Integration** - Test thoroughly before launch

### For Customers

1. **Book Early** - Better availability and prices
2. **Read Reviews** - Make informed decisions
3. **Loyalty Program** - Take advantage of points
4. **Wishlist** - Save tours for later

## 🎓 Training Resources

### Agency Training

- Video tutorials (15 videos, 2 hours total)
- User manual (50 pages)
- Live webinars (weekly)
- Dedicated support channel

### Customer Help

- FAQ section (50+ questions)
- Video guides
- Live chat support
- Email support

## 📞 Support

### For Agencies

- **Email**: agencies@spirit-tours.com
- **Phone**: +972-2-XXX-XXXX
- **Hours**: Sun-Thu 9:00-18:00 IST

### For Customers

- **Email**: support@spirit-tours.com
- **Phone**: +972-2-XXX-XXXX
- **Live Chat**: 24/7
- **WhatsApp**: +972-5X-XXX-XXXX

## 🚀 Future Enhancements

### Planned Features

- [ ] Mobile apps (iOS/Android)
- [ ] Advanced analytics dashboard
- [ ] AI-powered recommendations
- [ ] Virtual tour previews (VR)
- [ ] Social media integration
- [ ] Automated marketing campaigns
- [ ] Blockchain-based loyalty tokens
- [ ] Real-time chat with guides

## 📚 Additional Resources

- [API Documentation](https://docs.spirit-tours.com/api)
- [Widget Customization Guide](https://docs.spirit-tours.com/widget)
- [Integration Examples](https://github.com/spirit-tours/examples)
- [Video Tutorials](https://spirit-tours.com/tutorials)

---

**Last Updated**: 2024-11-02  
**Version**: 1.0.0  
**Maintainer**: Spirit Tours Development Team
