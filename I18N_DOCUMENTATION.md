# Multi-language Internationalization (i18n) System

## Overview

The Spirit Tours platform includes comprehensive internationalization (i18n) support for 6 languages with full Right-to-Left (RTL) support for Hebrew and Arabic. This document provides complete implementation details and usage guidelines.

## Supported Languages

| Code | Language | Native Name | Direction | Status |
|------|----------|-------------|-----------|--------|
| `en` | English | English | LTR | ✅ Complete |
| `es` | Spanish | Español | LTR | ✅ Complete |
| `he` | Hebrew | עברית | RTL | ✅ Complete |
| `ar` | Arabic | العربية | RTL | ✅ Complete |
| `fr` | French | Français | LTR | ✅ Complete |
| `de` | German | Deutsch | LTR | ✅ Complete |

## Architecture

### Frontend Stack

- **i18next** - Core internationalization framework
- **react-i18next** - React bindings for i18next
- **i18next-browser-languagedetector** - Automatic language detection
- **i18next-http-backend** - Dynamic translation loading

### Backend Stack

- **FastAPI** - Translation management API
- **JSON** - Translation file format
- **Pydantic** - Request/response validation

## Directory Structure

```
spirit-tours/
├── frontend/
│   ├── src/
│   │   ├── i18n/
│   │   │   └── i18n.config.ts          # i18next configuration
│   │   ├── locales/
│   │   │   ├── en/
│   │   │   │   └── translation.json    # English translations
│   │   │   ├── es/
│   │   │   │   └── translation.json    # Spanish translations
│   │   │   ├── he/
│   │   │   │   └── translation.json    # Hebrew translations
│   │   │   ├── ar/
│   │   │   │   └── translation.json    # Arabic translations
│   │   │   ├── fr/
│   │   │   │   └── translation.json    # French translations
│   │   │   └── de/
│   │   │       └── translation.json    # German translations
│   │   ├── components/
│   │   │   └── LanguageSelector/
│   │   │       ├── LanguageSelector.tsx # Language switcher component
│   │   │       └── index.ts
│   │   ├── hooks/
│   │   │   └── useTranslation.ts       # Custom translation hooks
│   │   ├── utils/
│   │   │   └── localization.ts         # Formatting utilities
│   │   └── styles/
│   │       └── rtl.css                 # RTL styles
│   └── public/
│       └── locales/                    # (Alternative) Static translations
└── backend/
    ├── i18n/
    │   ├── __init__.py
    │   ├── translation_models.py       # Pydantic models
    │   └── translation_service.py      # Translation management service
    ├── api/
    │   └── translations.py             # Translation API endpoints
    └── middleware/
        └── language_middleware.py      # Language detection middleware
```

## Frontend Implementation

### 1. Configuration Setup

The i18n system is configured in `frontend/src/i18n/i18n.config.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es', 'he', 'ar', 'fr', 'de'],
    // ... additional configuration
  });
```

**Key Features:**
- Automatic language detection from localStorage, navigator, or query parameters
- Fallback to English if translation missing
- RTL support with automatic direction switching
- Lazy loading of translation files

### 2. Using Translations in Components

#### Basic Usage

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
}
```

#### With Interpolation

```tsx
function TourPrice() {
  const { t } = useTranslation();
  const price = 99.99;
  
  return <span>{t('tours.from_price', { price })}</span>;
  // Output: "From $99.99"
}
```

#### With Pluralization

```tsx
function ReviewCount() {
  const { t } = useTranslation();
  const count = 42;
  
  return <span>{t('tours.reviews', { count })}</span>;
  // Output: "42 reviews" (en) or "42 reseñas" (es)
}
```

#### Using Custom Hook

```tsx
import { useTranslation } from '../hooks/useTranslation';

function LanguageInfo() {
  const { 
    t, 
    currentLanguage, 
    isRTL, 
    changeLanguage 
  } = useTranslation();
  
  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <p>Current: {currentLanguage}</p>
      <button onClick={() => changeLanguage('es')}>
        Switch to Spanish
      </button>
    </div>
  );
}
```

### 3. Language Selector Component

Add the language selector to your app:

```tsx
import LanguageSelector from './components/LanguageSelector';

function Header() {
  return (
    <header>
      <nav>
        {/* Other navigation items */}
        <LanguageSelector />
      </nav>
    </header>
  );
}
```

### 4. Localization Utilities

#### Date Formatting

```tsx
import { formatDate, formatTime, formatDateTime } from '../utils/localization';

const date = new Date();

// Format date by locale
formatDate(date, 'en', 'long');    // "January 1, 2025"
formatDate(date, 'es', 'long');    // "1 de enero de 2025"
formatDate(date, 'he', 'long');    // "1 בינואר 2025"

// Format time
formatTime(date, 'en');            // "3:45 PM"
formatTime(date, 'fr');            // "15:45"
```

#### Currency Formatting

```tsx
import { formatCurrency } from '../utils/localization';

formatCurrency(1234.56, 'USD', 'en');  // "$1,234.56"
formatCurrency(1234.56, 'EUR', 'es');  // "1.234,56 €"
formatCurrency(1234.56, 'ILS', 'he');  // "‏1,234.56 ₪"
```

#### Using Hooks

```tsx
import { useCurrencyFormatter, useDateFormatter } from '../hooks/useTranslation';

function PriceDisplay() {
  const { formatCurrency } = useCurrencyFormatter();
  const { formatDate } = useDateFormatter();
  
  return (
    <div>
      <p>{formatCurrency(99.99, 'USD')}</p>
      <p>{formatDate(new Date(), 'long')}</p>
    </div>
  );
}
```

### 5. RTL Support

RTL styles are automatically applied when the language changes to Hebrew or Arabic.

#### Automatic Direction

```tsx
// The document direction is set automatically
useEffect(() => {
  i18n.on('languageChanged', (lng) => {
    const direction = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
    document.documentElement.dir = direction;
  });
}, []);
```

#### Manual RTL Handling

```tsx
import { useTranslation } from '../hooks/useTranslation';

function CustomComponent() {
  const { isRTL } = useTranslation();
  
  return (
    <div style={{
      textAlign: isRTL ? 'right' : 'left',
      marginLeft: isRTL ? '0' : '1rem',
      marginRight: isRTL ? '1rem' : '0'
    }}>
      Content
    </div>
  );
}
```

#### Import RTL Styles

Add to your main app file:

```tsx
import './styles/rtl.css';
```

## Backend Implementation

### 1. Translation Management API

The backend provides a REST API for managing translations:

#### Get Supported Languages

```http
GET /api/translations/languages
```

**Response:**
```json
{
  "languages": [
    {
      "code": "en",
      "name": "English",
      "native_name": "English",
      "direction": "ltr",
      "is_rtl": false
    },
    {
      "code": "he",
      "name": "Hebrew",
      "native_name": "עברית",
      "direction": "rtl",
      "is_rtl": true
    }
  ],
  "total": 6,
  "default_language": "en"
}
```

#### Get Translations for Language

```http
GET /api/translations/{language}?namespace=translation
```

**Response:**
```json
{
  "namespace": "translation",
  "language": "en",
  "translations": {
    "common": {
      "welcome": "Welcome",
      "login": "Login"
    }
  },
  "total_keys": 150
}
```

#### Update Translations

```http
PUT /api/translations/{language}
Content-Type: application/json

{
  "namespace": "translation",
  "language": "en",
  "updates": {
    "common.welcome": "Welcome to Spirit Tours",
    "tours.new_feature": "New Feature"
  }
}
```

#### Get Missing Translations

```http
GET /api/translations/{language}/missing?namespace=translation
```

**Response:**
```json
{
  "language": "fr",
  "namespace": "translation",
  "missing_keys": [
    "tours.new_feature",
    "booking.confirmation_email"
  ],
  "total_missing": 2,
  "completion_percentage": 98.5
}
```

#### Get Translation Statistics

```http
GET /api/translations/statistics?namespace=translation
```

**Response:**
```json
{
  "total_keys": 150,
  "total_languages": 6,
  "translations_by_language": {
    "en": 150,
    "es": 148,
    "he": 145
  },
  "completion_by_language": {
    "en": 100.0,
    "es": 98.7,
    "he": 96.7
  },
  "missing_translations": {
    "es": ["tours.new_feature"],
    "he": ["tours.new_feature", "booking.promo"]
  }
}
```

#### Detect Language from Header

```http
POST /api/translations/detect-language
Accept-Language: en-US,en;q=0.9,es;q=0.8
```

**Response:**
```json
{
  "detected_language": "en",
  "default_language": "en",
  "supported_languages": ["en", "es", "he", "ar", "fr", "de"]
}
```

### 2. Language Detection Middleware

The middleware automatically detects language from:

1. Query parameter (`?lang=es`)
2. Cookie (`language` cookie)
3. `Accept-Language` header
4. Default to English

**Register middleware in FastAPI:**

```python
from fastapi import FastAPI
from backend.middleware.language_middleware import LanguageMiddleware

app = FastAPI()
app.add_middleware(LanguageMiddleware)
```

**Access language in route handlers:**

```python
from fastapi import Request
from backend.middleware.language_middleware import get_language_from_request

@app.get('/some-endpoint')
async def some_endpoint(request: Request):
    language = get_language_from_request(request)
    # Use language for processing
```

## Translation File Structure

Translation files use nested JSON structure:

```json
{
  "common": {
    "welcome": "Welcome",
    "login": "Login",
    "logout": "Logout",
    "search": "Search",
    "filter": "Filter"
  },
  "navigation": {
    "home": "Home",
    "tours": "Tours",
    "about": "About Us",
    "contact": "Contact"
  },
  "tours": {
    "title": "Discover Amazing Tours",
    "search_placeholder": "Search tours...",
    "from_price": "From ${{price}}",
    "per_person": "per person",
    "duration": "{{days}} days",
    "reviews": "{{count}} reviews",
    "view_details": "View Details",
    "book_now": "Book Now"
  }
}
```

## Adding a New Language

### 1. Frontend Setup

1. **Add language to configuration:**

```typescript
// frontend/src/i18n/i18n.config.ts
export const supportedLanguages = {
  // ... existing languages
  it: { name: 'Italian', nativeName: 'Italiano', dir: 'ltr' }
};
```

2. **Create translation file:**

```bash
mkdir -p frontend/src/locales/it
cp frontend/src/locales/en/translation.json frontend/src/locales/it/translation.json
```

3. **Translate content:**

Edit `frontend/src/locales/it/translation.json` with Italian translations.

### 2. Backend Setup

1. **Add language to service:**

```python
# backend/i18n/translation_service.py
SUPPORTED_LANGUAGES = {
    # ... existing languages
    'it': {'name': 'Italian', 'native_name': 'Italiano', 'dir': 'ltr'},
}
```

2. **Translation file will be created automatically on first update.**

## Translation Workflow

### For Developers

1. **Add new translation keys to English file first:**
   ```json
   {
     "new_feature": {
       "title": "New Feature",
       "description": "This is a new feature"
     }
   }
   ```

2. **Use translation keys in code:**
   ```tsx
   const { t } = useTranslation();
   return <h1>{t('new_feature.title')}</h1>;
   ```

3. **Check missing translations:**
   ```http
   GET /api/translations/es/missing
   ```

4. **Update translations for other languages:**
   ```http
   PUT /api/translations/es
   {
     "updates": {
       "new_feature.title": "Nueva Función",
       "new_feature.description": "Esta es una nueva función"
     }
   }
   ```

### For Translators

1. **Get current translations:**
   ```http
   GET /api/translations/{language}
   ```

2. **Get list of missing translations:**
   ```http
   GET /api/translations/{language}/missing
   ```

3. **Submit translations:**
   ```http
   PUT /api/translations/{language}
   {
     "updates": {
       "key1": "translation1",
       "key2": "translation2"
     }
   }
   ```

## Best Practices

### Translation Keys

- Use descriptive, hierarchical keys: `tours.search.placeholder`
- Group related translations: `common.*`, `tours.*`, `booking.*`
- Use consistent naming conventions
- Keep keys in English for universal understanding

### Text Content

- Write neutral, inclusive language
- Avoid hardcoded text in components
- Use interpolation for dynamic content
- Consider text length variations across languages
- Plan for RTL languages from the start

### Formatting

- Use localization utilities for dates, times, numbers, currency
- Don't concatenate translated strings
- Use proper pluralization rules
- Respect cultural date/time formats

### RTL Support

- Test all UI components in RTL mode
- Use logical properties (start/end instead of left/right)
- Mirror icons and images when necessary
- Test layout with long RTL text

### Performance

- Use lazy loading for translation files
- Cache translations on the backend
- Minimize translation file size
- Load only needed namespaces

## Testing

### Manual Testing

1. **Test language switching:**
   - Switch between all languages
   - Verify persistence across page reloads
   - Check cookie and localStorage

2. **Test RTL layout:**
   - Switch to Hebrew or Arabic
   - Verify all components render correctly
   - Check text alignment and direction

3. **Test formatting:**
   - Verify dates, times, numbers, currency
   - Check pluralization rules
   - Test interpolation

### Automated Testing

```tsx
import { renderWithI18n } from './test-utils';

test('renders translated text', () => {
  const { getByText } = renderWithI18n(<MyComponent />, {
    lng: 'es'
  });
  
  expect(getByText('Bienvenido')).toBeInTheDocument();
});
```

## Troubleshooting

### Translations not loading

- Check browser console for errors
- Verify translation file paths
- Check network tab for 404 errors
- Clear browser cache and localStorage

### RTL layout issues

- Import `rtl.css` in main app file
- Verify `document.dir` is set correctly
- Check for hardcoded left/right values
- Use Material-UI's RTL support

### Language detection not working

- Check `Accept-Language` header
- Verify cookie is being set
- Check middleware is registered
- Test with query parameter `?lang=es`

## Security Considerations

- Sanitize user input in translation updates
- Validate language codes against supported list
- Implement authentication for translation management API
- Use HTTPS in production
- Set secure cookie flags

## Performance Optimization

- Enable HTTP caching for translation files
- Use CDN for static translation resources
- Implement translation file compression
- Lazy load translation namespaces
- Cache translations on the backend

## Deployment

### Frontend

1. **Build with translations:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Serve translation files:**
   - Ensure `locales/` directory is included in build
   - Configure server to serve JSON files with correct MIME type

### Backend

1. **Set environment variables:**
   ```bash
   TRANSLATIONS_DIR=/path/to/frontend/locales
   ```

2. **Register API routes:**
   ```python
   app.include_router(translations_router)
   ```

3. **Add middleware:**
   ```python
   app.add_middleware(LanguageMiddleware)
   ```

## Future Enhancements

- [ ] Add more languages (Italian, Portuguese, Russian, Chinese, Japanese)
- [ ] Implement translation management UI
- [ ] Add translation memory/glossary
- [ ] Machine translation suggestions
- [ ] Translation versioning and history
- [ ] A/B testing for translations
- [ ] Context-aware translations
- [ ] Professional translator integration
- [ ] Translation quality scoring
- [ ] Automated missing translation detection

## Resources

- [i18next Documentation](https://www.i18next.com/)
- [react-i18next Documentation](https://react.i18next.com/)
- [MDN Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [RTL Styling Guidelines](https://rtlstyling.com/)
- [CLDR Locale Data](http://cldr.unicode.org/)

## Support

For issues or questions:
- Check the FAQ section
- Review existing translations
- Contact the development team
- Submit a bug report with language code and reproduction steps

---

**Version:** 1.0.0  
**Last Updated:** 2025-01-02  
**Status:** ✅ Production Ready
