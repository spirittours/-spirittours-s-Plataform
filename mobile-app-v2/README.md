# 📱 Spirit Tours Mobile App

## 🚀 Overview

Native mobile application for Spirit Tours built with React Native, supporting both iOS and Android platforms. The app provides a seamless booking experience with AI-powered recommendations, real-time chat support, and comprehensive tour management.

## ✨ Features

### Core Features
- 🔐 **Authentication & Security**
  - Email/Password login
  - Social login (Google, Facebook)
  - Biometric authentication
  - JWT token management
  - Secure storage with Keychain

- 🗺️ **Tour Discovery**
  - AI-powered personalized recommendations
  - Advanced search with filters
  - Interactive maps with tour locations
  - AR tour previews (upcoming)
  - 360° virtual tours

- 📅 **Booking Management**
  - Real-time availability checking
  - Multiple payment methods (Stripe, PayPal)
  - QR code tickets
  - Calendar integration
  - Booking modifications/cancellations

- 💬 **Communication**
  - Real-time chat with support
  - AI chatbot assistance
  - Push notifications
  - In-app messaging
  - Video calls with guides

- 👤 **User Experience**
  - Multi-language support (ES, EN, FR, DE)
  - Offline mode with sync
  - Dark/Light themes
  - Accessibility features
  - Customizable preferences

### AI Features
- 🤖 25 AI agents integration
- 🎯 Personalized recommendations
- 🌍 Smart itinerary planning
- 💬 Intelligent chat support
- 📊 Predictive booking suggestions

## 🏗️ Architecture

```
mobile-app-v2/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # Screen components
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API and external services
│   ├── store/            # Redux state management
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── contexts/         # React contexts
│   ├── assets/           # Images, fonts, etc.
│   ├── types/            # TypeScript definitions
│   ├── constants/        # App constants
│   └── i18n/            # Internationalization
├── ios/                  # iOS specific code
├── android/              # Android specific code
└── __tests__/           # Test files
```

## 🛠️ Tech Stack

- **Framework**: React Native 0.76.6
- **Language**: TypeScript
- **State Management**: Redux Toolkit + Redux Persist
- **Navigation**: React Navigation 6
- **UI Components**: React Native Paper
- **API Client**: Axios with interceptors
- **Storage**: AsyncStorage + MMKV
- **Authentication**: JWT + Keychain
- **Maps**: React Native Maps
- **Payments**: Stripe SDK
- **Analytics**: Firebase Analytics
- **Push Notifications**: Firebase Cloud Messaging
- **Internationalization**: i18next

## 📲 Installation

### Prerequisites
- Node.js >= 18
- React Native development environment
- Xcode (for iOS)
- Android Studio (for Android)

### Setup

1. **Install dependencies:**
```bash
cd mobile-app-v2
npm install
```

2. **iOS setup:**
```bash
cd ios && pod install
cd ..
```

3. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys
```

4. **Run the app:**
```bash
# iOS
npm run ios

# Android
npm run android

# Start Metro bundler
npm start
```

## 🔧 Configuration

### API Configuration
Edit `src/services/api/apiClient.ts`:
```typescript
const API_BASE_URL = 'https://api.spirittours.com/api/v1';
```

### Firebase Setup
1. Add `google-services.json` to `android/app/`
2. Add `GoogleService-Info.plist` to `ios/`

### Payment Configuration
Configure Stripe in `src/services/PaymentService.ts`:
```typescript
const STRIPE_PUBLISHABLE_KEY = 'pk_live_...';
```

## 📱 Screens

### Authentication Flow
- Login Screen
- Registration Screen
- Password Recovery
- Email Verification
- Biometric Setup

### Main App
- Home Dashboard
- Tour Discovery
- Tour Details
- Booking Flow
- Payment Processing
- Booking Confirmation
- My Bookings
- User Profile
- Settings
- Chat Support

## 🚀 Key Features Implementation

### Offline Support
```typescript
// Automatic offline detection and data sync
NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncOfflineData();
  }
});
```

### Push Notifications
```typescript
// Firebase messaging setup
messaging().onMessage(async remoteMessage => {
  showLocalNotification(remoteMessage);
});
```

### Biometric Authentication
```typescript
// Touch ID / Face ID
const biometryType = await Keychain.getSupportedBiometryType();
if (biometryType) {
  enableBiometricLogin();
}
```

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (Detox)
npm run e2e:ios
npm run e2e:android

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📦 Building for Production

### iOS
```bash
# Create release build
cd ios
fastlane release
```

### Android
```bash
# Generate signed APK
cd android
./gradlew assembleRelease

# Generate AAB for Play Store
./gradlew bundleRelease
```

## 🔒 Security Features

- Certificate pinning
- Encrypted storage
- Biometric authentication
- Secure communication (HTTPS)
- Token refresh mechanism
- Input validation
- Code obfuscation (production)

## 🌍 Localization

Supported languages:
- 🇪🇸 Spanish (default)
- 🇬🇧 English
- 🇫🇷 French
- 🇩🇪 German
- 🇮🇹 Italian
- 🇵🇹 Portuguese

## 📊 Performance Optimization

- Lazy loading
- Image caching with Fast Image
- Memoization with useMemo/useCallback
- FlatList optimization
- Bundle splitting
- Hermes JavaScript engine

## 🎨 UI/UX Features

- Material Design 3
- Smooth animations (Reanimated 3)
- Gesture handling
- Haptic feedback
- Skeleton loading
- Pull-to-refresh
- Infinite scroll

## 📈 Analytics & Monitoring

- Firebase Analytics
- Crashlytics
- Performance monitoring
- User behavior tracking
- A/B testing support

## 🤝 Contributing

Please follow our contribution guidelines and code style guide.

## 📄 License

Proprietary - Spirit Tours © 2024

## 🆘 Support

- Documentation: [docs.spirittours.com](https://docs.spirittours.com)
- Support: support@spirittours.com
- Issues: GitHub Issues

## 🚀 Deployment

The app is configured for CI/CD with:
- GitHub Actions
- Fastlane
- CodePush for OTA updates

## 📱 App Store Links

- [iOS App Store](#) (Coming soon)
- [Google Play Store](#) (Coming soon)

---

**Version**: 1.0.0  
**Last Updated**: October 2024  
**Developed by**: Spirit Tours Tech Team