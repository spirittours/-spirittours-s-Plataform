# OAuth Social Authentication Documentation

## Overview

Complete OAuth 2.0 social authentication system supporting Google and Facebook login for Spirit Tours platform.

## Features

✅ **Google OAuth 2.0**
- Authorization code flow
- User profile retrieval
- Token refresh
- Account linking

✅ **Facebook OAuth 2.0**
- Authorization code flow
- User profile retrieval
- Long-lived tokens
- Account linking

✅ **JWT Token Management**
- Access tokens (24h expiration)
- Refresh tokens (30d expiration)
- Token refresh endpoint
- Secure token signing

✅ **Account Management**
- Link social accounts
- Unlink social accounts
- Multiple auth methods
- Profile syncing

## Architecture

### Backend Structure

```
backend/auth/oauth/
├── __init__.py
├── oauth_config.py         # Configuration
├── google_oauth.py         # Google integration
├── facebook_oauth.py       # Facebook integration
└── oauth_service.py        # Unified service
```

### API Endpoints

```
GET    /api/auth/oauth/google/login          # Initiate Google login
GET    /api/auth/oauth/google/callback       # Google callback
GET    /api/auth/oauth/facebook/login        # Initiate Facebook login
GET    /api/auth/oauth/facebook/callback     # Facebook callback
POST   /api/auth/oauth/refresh              # Refresh JWT token
POST   /api/auth/oauth/link/{provider}      # Link account
DELETE /api/auth/oauth/unlink/{provider}    # Unlink account
GET    /api/auth/oauth/status               # Provider status
GET    /api/auth/oauth/health               # Health check
```

## Configuration

### Environment Variables

```bash
# Base URLs
BASE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-app-id
FACEBOOK_APP_SECRET=your-app-secret

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:8000/api/auth/oauth/google/callback`
   - `https://yourdomain.com/api/auth/oauth/google/callback`
6. Copy Client ID and Client Secret

### Facebook OAuth Setup

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URIs:
   - `http://localhost:8000/api/auth/oauth/facebook/callback`
   - `https://yourdomain.com/api/auth/oauth/facebook/callback`
5. Copy App ID and App Secret

## Usage

### Frontend Integration

#### React Component

```tsx
import { SocialLoginButtons } from '@/components/OAuth';

function LoginPage() {
  return (
    <div>
      <h1>Login</h1>
      <SocialLoginButtons
        onSuccess={(tokens) => {
          localStorage.setItem('access_token', tokens.access_token);
          navigate('/dashboard');
        }}
        onError={(error) => console.error(error)}
      />
    </div>
  );
}
```

#### Callback Handler

```tsx
// pages/oauth/success.tsx
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      navigate('/dashboard');
    }
  }, []);

  return <div>Completing login...</div>;
}
```

### Backend Integration

#### User Creation/Update

```python
from backend.api.oauth import oauth_service

async def handle_oauth_callback(provider, code, state):
    result = await oauth_service.authenticate(provider, code, state)
    
    if result['success']:
        user_data = result['user_data']
        
        # Get or create user
        user = db.query(User).filter(
            User.oauth_provider == user_data['oauth_provider'],
            User.oauth_id == user_data['oauth_id']
        ).first()
        
        if not user:
            user = User(
                email=user_data['email'],
                first_name=user_data['first_name'],
                last_name=user_data['last_name'],
                oauth_provider=user_data['oauth_provider'],
                oauth_id=user_data['oauth_id']
            )
            db.add(user)
            db.commit()
        
        return result['tokens']
```

## OAuth Flow

### Google OAuth Flow

```
1. User clicks "Login with Google"
   ↓
2. GET /api/auth/oauth/google/login
   ↓
3. Redirect to Google OAuth consent screen
   ↓
4. User grants permission
   ↓
5. Google redirects to callback
   ↓
6. GET /api/auth/oauth/google/callback?code=xxx&state=yyy
   ↓
7. Exchange code for access token
   ↓
8. Fetch user profile from Google
   ↓
9. Create/update user in database
   ↓
10. Generate JWT tokens
   ↓
11. Redirect to frontend with tokens
```

### Token Refresh Flow

```
1. Access token expires
   ↓
2. POST /api/auth/oauth/refresh
   Body: { "refresh_token": "..." }
   ↓
3. Verify refresh token
   ↓
4. Generate new access token
   ↓
5. Return new token
```

## Security

### CSRF Protection

- State tokens with 10-minute expiration
- Token verification on callback
- Cryptographically secure random generation

### JWT Security

- HS256 algorithm
- Secret key from environment
- Access token: 24h expiration
- Refresh token: 30d expiration
- Token type validation

### OAuth Token Storage

- Never expose OAuth tokens to frontend
- Store in database (encrypted)
- Use for background operations only
- Implement token refresh

## API Examples

### Initiate Google Login

```bash
curl http://localhost:8000/api/auth/oauth/google/login
```

Response:
```json
{
  "authorization_url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "random-state-token"
}
```

### Refresh Token

```bash
curl -X POST http://localhost:8000/api/auth/oauth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."}'
```

Response:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

### Check OAuth Status

```bash
curl http://localhost:8000/api/auth/oauth/status
```

Response:
```json
{
  "google_enabled": true,
  "facebook_enabled": true,
  "jwt_configured": true
}
```

## Testing

### Test Accounts

- **Google**: Use real Google account in development
- **Facebook**: Use Facebook test users

### Manual Testing

1. Start backend: `cd backend && uvicorn main:app --reload`
2. Start frontend: `cd frontend && npm start`
3. Navigate to login page
4. Click "Continue with Google/Facebook"
5. Complete OAuth flow
6. Verify tokens received

## Troubleshooting

### "Invalid redirect URI"

- Verify redirect URI in OAuth provider console
- Check BASE_URL environment variable
- Ensure URIs match exactly (http vs https)

### "Invalid state token"

- State token expired (10 min lifetime)
- Try login flow again
- Clear cookies/cache

### "JWT token invalid"

- Check JWT_SECRET_KEY matches
- Verify token not expired
- Check token format (Bearer token)

## Production Deployment

1. **Set secure JWT secret**:
   ```bash
   JWT_SECRET_KEY=$(openssl rand -hex 32)
   ```

2. **Use HTTPS only**:
   ```bash
   BASE_URL=https://api.spirit-tours.com
   FRONTEND_URL=https://spirit-tours.com
   ```

3. **Update OAuth redirect URIs** in provider consoles

4. **Enable token refresh** in frontend

5. **Implement token rotation** for security

## License

Proprietary - Spirit Tours Ltd.
