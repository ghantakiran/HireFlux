# OAuth Setup Guide - HireFlux

This guide explains how to configure OAuth authentication for Google and LinkedIn.

## Overview

OAuth is **fully implemented** in both backend and frontend. You just need to configure the OAuth credentials from Google and LinkedIn.

## What's Already Implemented

### Backend ✅
- Google OAuth endpoints (`/auth/google/authorize`, `/auth/google/callback`)
- LinkedIn OAuth endpoints (`/auth/linkedin/authorize`, `/auth/linkedin/callback`)
- OAuth service with token verification
- User model with OAuth fields (`oauth_provider`, `oauth_provider_id`, `oauth_picture`)
- Account linking (OAuth accounts can link to existing email accounts)

### Frontend ✅
- OAuth buttons on signin page
- OAuth buttons on signup page
- OAuth callback handler (`/auth/callback`)
- Return URL preservation for post-login navigation
- Error handling with user-friendly messages
- Loading states during OAuth flow

## Configuration Steps

### 1. Google OAuth Setup

#### A. Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable "Google+ API" or "People API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen:
   - Application name: HireFlux
   - User support email: your-email@example.com
   - Authorized domains: `localhost` (dev), `hireflux.com` (prod)
   - Scopes: `openid`, `email`, `profile`
6. Create OAuth Client ID:
   - Application type: Web application
   - Name: HireFlux Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000` (development)
     - `https://hireflux.com` (production)
   - Authorized redirect URIs:
     - `http://localhost:3000/auth/callback/google` (development)
     - `https://hireflux.com/auth/callback/google` (production)

7. Copy the **Client ID** and **Client Secret**

#### B. Configure Backend Environment

Add to `/backend/.env`:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
OAUTH_REDIRECT_URI="http://localhost:3000/auth/callback"  # For development
# OAUTH_REDIRECT_URI="https://hireflux.com/auth/callback"  # For production
```

### 2. LinkedIn OAuth Setup

#### A. Create LinkedIn App

1. Go to [LinkedIn Developers](https://www.linkedin.com/developers/apps)
2. Create a new app:
   - App name: HireFlux
   - LinkedIn Page: Create a company page if needed
   - App logo: Upload your logo
3. Go to "Auth" tab
4. Add OAuth 2.0 settings:
   - Authorized redirect URLs:
     - `http://localhost:3000/auth/callback/linkedin` (development)
     - `https://hireflux.com/auth/callback/linkedin` (production)
5. Request "Sign In with LinkedIn using OpenID Connect" product access
6. In "Auth" tab, copy:
   - **Client ID**
   - **Client Secret**
7. Under "OpenID Connect" scopes, ensure you have:
   - `openid`
   - `profile`
   - `email`

#### B. Configure Backend Environment

Add to `/backend/.env`:

```bash
# LinkedIn OAuth
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"
```

### 3. Frontend Environment Setup

No additional frontend configuration needed! The frontend uses:
- `NEXT_PUBLIC_API_URL` (already configured) to redirect to backend OAuth endpoints

Example `/frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_API_URL=https://api.hireflux.com  # For production
```

## Testing OAuth Flow

### Development Testing

1. **Start Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn app.main:app --reload
   ```

2. **Start Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Google OAuth**:
   - Visit http://localhost:3000/signin
   - Click "Google" button
   - Should redirect to Google login
   - After approval, redirects to `/auth/callback?access_token=...&refresh_token=...`
   - Should auto-redirect to dashboard

4. **Test LinkedIn OAuth**:
   - Visit http://localhost:3000/signin
   - Click "LinkedIn" button
   - Should redirect to LinkedIn login
   - After approval, redirects to `/auth/callback?access_token=...&refresh_token=...`
   - Should auto-redirect to dashboard

### Testing Account Linking

OAuth accounts automatically link to existing email accounts:

1. **Scenario**: User has account with email `john@example.com`
2. User clicks "Sign in with Google" using same email
3. System finds existing account by email
4. Links Google OAuth to existing account
5. Updates `oauth_provider`, `oauth_provider_id`, `oauth_picture` fields
6. User can now sign in with either password OR Google OAuth

## OAuth Flow Diagram

```
User clicks "Sign in with Google"
    ↓
Frontend redirects to: /api/v1/auth/google/authorize
    ↓
Backend redirects to: Google OAuth consent screen
    ↓
User approves access
    ↓
Google redirects to: /api/v1/auth/google/callback?code=...
    ↓
Backend exchanges code for access token
    ↓
Backend fetches user info from Google
    ↓
Backend finds/creates user in database
    ↓
Backend generates JWT tokens
    ↓
Backend redirects to: /auth/callback?access_token=...&refresh_token=...
    ↓
Frontend stores tokens in localStorage
    ↓
Frontend fetches user info
    ↓
Frontend redirects to: /dashboard or /onboarding
```

## Error Handling

The implementation handles:

- **Missing credentials**: Shows "OAuth is not configured" error
- **Token exchange failure**: Shows "Failed to get access token" error
- **Invalid tokens**: Shows "Invalid authentication response" error
- **Email missing**: Shows "Email permission not granted" error
- **Network errors**: Shows user-friendly error with redirect to signin

## Security Features

✅ **State parameter**: Can be added for CSRF protection (optional enhancement)
✅ **PKCE**: Not required for server-side flows (backend handles secrets)
✅ **Token validation**: Backend verifies tokens with OAuth provider
✅ **Account linking**: Prevents duplicate accounts with same email
✅ **Secure redirects**: Only redirects to frontend origin (no open redirects)

## Production Considerations

### Before Production Launch:

1. **Update Redirect URIs**:
   - Google: Add `https://hireflux.com/auth/callback/google`
   - LinkedIn: Add `https://hireflux.com/auth/callback/linkedin`

2. **Update Environment Variables**:
   ```bash
   OAUTH_REDIRECT_URI="https://hireflux.com/auth/callback"
   CORS_ORIGINS=["https://hireflux.com"]
   ```

3. **Verify OAuth Consent Screens**:
   - Google: Complete verification for production use
   - LinkedIn: Ensure "Sign In with LinkedIn" is approved

4. **Add Monitoring**:
   - Track OAuth success/failure rates
   - Monitor OAuth API latency
   - Alert on high error rates

## Troubleshooting

### Common Issues

**Issue**: "OAuth is not configured" error
- **Fix**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in backend `.env`

**Issue**: "Redirect URI mismatch" error
- **Fix**: Ensure redirect URI in OAuth provider matches `OAUTH_REDIRECT_URI` + `/google` or `/linkedin`

**Issue**: "Invalid credentials" after OAuth
- **Fix**: Check that backend can reach OAuth provider APIs (no firewall blocking)

**Issue**: User stuck on callback page
- **Fix**: Check browser console for errors; ensure frontend can call `/api/v1/users/me`

**Issue**: OAuth works but user not logged in
- **Fix**: Check that tokens are being stored in localStorage; verify `/users/me` endpoint works

## Additional Providers (Optional)

The backend includes placeholder support for Facebook and Apple OAuth. To enable:

### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create app with "Facebook Login" product
3. Configure redirect URI: `http://localhost:3000/auth/callback/facebook`
4. Add credentials to `.env`:
   ```bash
   FACEBOOK_CLIENT_ID="your-facebook-app-id"
   FACEBOOK_CLIENT_SECRET="your-facebook-app-secret"
   ```
5. Add button to frontend signin/signup pages

### Apple Sign In

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create "Sign in with Apple" service
3. Configure return URLs
4. Add credentials to `.env`:
   ```bash
   APPLE_CLIENT_ID="your-apple-client-id"
   APPLE_TEAM_ID="your-team-id"
   APPLE_KEY_ID="your-key-id"
   APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----..."
   ```
5. Add button to frontend signin/signup pages

## Summary

✅ **Backend**: Fully implemented for Google and LinkedIn
✅ **Frontend**: Fully implemented with callback handling
✅ **Security**: Account linking, error handling, secure redirects
✅ **UX**: Loading states, error messages, return URL preservation

**Next Steps**:
1. Obtain OAuth credentials from Google and LinkedIn
2. Add credentials to `.env` file
3. Test OAuth flow in development
4. Deploy to production with production redirect URIs

---

*Last Updated*: October 29, 2025
*Sprint 6 - OAuth Implementation*
