# OAuth Authentication Implementation

This document describes the OAuth authentication implementation for HireFlux, supporting Google, Facebook, and Apple Sign In.

## Overview

The OAuth implementation allows users to sign in or register using their Google, Facebook, or Apple accounts. The system automatically creates user accounts on first sign-in and handles subsequent logins seamlessly.

## Supported Providers

### 1. Google OAuth 2.0
- **Provider Name**: `google`
- **Required**: `access_token`
- **Optional**: None
- **Setup**: Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`

### 2. Facebook Login
- **Provider Name**: `facebook`
- **Required**: `access_token`
- **Optional**: None
- **Setup**: Configure `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` in `.env`

### 3. Apple Sign In
- **Provider Name**: `apple`
- **Required**: `access_token` and `id_token`
- **Optional**: None
- **Setup**: Configure `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_PRIVATE_KEY` in `.env`

## API Endpoint

### POST `/api/v1/auth/oauth/login`

Authenticate or register a user via OAuth provider.

**Request Body:**
```json
{
  "provider": "google|facebook|apple",
  "access_token": "token_from_provider",
  "id_token": "optional_id_token_for_apple"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Successfully authenticated with google",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "email_verified": true,
      "oauth_provider": "google"
    },
    "tokens": {
      "access_token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token",
      "token_type": "bearer"
    }
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid Google access token"
  }
}
```

## Implementation Details

### Architecture

```
Client → OAuth Provider → Get Token → Backend API
                                          ↓
                                    Verify Token
                                          ↓
                                    Get User Info
                                          ↓
                                  Login or Register
                                          ↓
                                   Return JWT Tokens
```

### Flow Diagram

1. **Client initiates OAuth flow** with provider (Google/Facebook/Apple)
2. **User authenticates** with provider and grants permissions
3. **Provider returns** access_token (and id_token for Apple)
4. **Client sends tokens** to HireFlux backend at `/api/v1/auth/oauth/login`
5. **Backend verifies tokens** with provider's API
6. **Backend checks** if user exists by email
   - If exists: Log in user
   - If not: Create new user account with OAuth details
7. **Backend generates** JWT access and refresh tokens
8. **Backend returns** user info and JWT tokens

### Database Schema

OAuth users are stored in the `users` table with the following fields:
- `email`: User's email from OAuth provider
- `oauth_provider`: Provider name (google, facebook, apple)
- `oauth_id`: User's ID from the OAuth provider
- `email_verified`: Verified status from provider
- `password_hash`: NULL for OAuth-only users

### Security Considerations

1. **Token Verification**: All OAuth tokens are verified with the provider's API before accepting them
2. **Email Verification**: OAuth providers' email verification status is trusted
3. **No Password Storage**: OAuth-only users have `password_hash` set to NULL
4. **Account Linking**: If a user signs up with email/password and later uses OAuth with the same email, the OAuth info is added to their account
5. **Secure Token Storage**: JWT tokens use HS256 algorithm with a secret key

### Provider-Specific Implementation

#### Google OAuth
- Verifies token using Google's `/oauth2/v3/userinfo` endpoint
- Requires valid `access_token`
- Returns: email, given_name, family_name, email_verified, sub (user ID)

#### Facebook Login
- First verifies token using `/debug_token` endpoint
- Then fetches user info from `/me` endpoint
- Requires: email permission
- Returns: id, email, first_name, last_name

#### Apple Sign In
- Verifies ID token using Apple's public keys from `/auth/keys`
- Decodes JWT with RS256 algorithm
- Requires both `access_token` and `id_token`
- Returns: sub (user ID), email, email_verified
- **Note**: First/last name only provided on initial sign-in (not in token)

## Environment Configuration

Add these variables to your `.env` file:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Facebook OAuth
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Apple Sign In
APPLE_CLIENT_ID=your_apple_service_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY=your_apple_private_key_content

# OAuth Redirect URI (for frontend)
OAUTH_REDIRECT_URI=http://localhost:3000/auth/callback
```

## Frontend Integration

### Example: Google OAuth Flow

```javascript
// 1. Initialize Google OAuth
const googleLogin = async () => {
  // Use Google's OAuth library to get access token
  const response = await gapi.auth2.getAuthInstance().signIn();
  const accessToken = response.getAuthResponse().access_token;

  // 2. Send to backend
  const result = await fetch('/api/v1/auth/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'google',
      access_token: accessToken
    })
  });

  const data = await result.json();

  // 3. Store JWT tokens
  localStorage.setItem('access_token', data.data.tokens.access_token);
  localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
};
```

### Example: Apple Sign In Flow

```javascript
// 1. Initialize Apple Sign In
const appleLogin = async () => {
  // Use Apple's JS SDK
  const response = await AppleID.auth.signIn();

  // 2. Send to backend (Apple requires both tokens)
  const result = await fetch('/api/v1/auth/oauth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'apple',
      access_token: response.authorization.id_token, // Apple uses id_token as access_token
      id_token: response.authorization.id_token
    })
  });

  const data = await result.json();

  // 3. Store JWT tokens
  localStorage.setItem('access_token', data.data.tokens.access_token);
  localStorage.setItem('refresh_token', data.data.tokens.refresh_token);
};
```

## Testing

### Manual Testing

1. **Get OAuth Tokens**: Use provider's OAuth playground or SDK to get test tokens
2. **Test Endpoint**: Use curl or Postman to test the endpoint

```bash
curl -X POST http://localhost:8000/api/v1/auth/oauth/login \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "access_token": "ya29.a0AfH6SMB..."
  }'
```

### Unit Testing

See `/backend/tests/test_oauth.py` for unit tests (to be implemented).

## Error Handling

### Common Errors

| Error Code | Status | Description | Solution |
|------------|--------|-------------|----------|
| `UNAUTHORIZED` | 401 | Invalid or expired OAuth token | User needs to re-authenticate with provider |
| `BAD_REQUEST` | 400 | Unsupported OAuth provider | Check provider name is correct |
| `BAD_REQUEST` | 400 | Missing ID token for Apple | Include both access_token and id_token for Apple |
| `BAD_REQUEST` | 400 | Email permission not granted | User must grant email permission |

## Dependencies

- `httpx`: HTTP client for API requests to OAuth providers
- `pyjwt[crypto]`: JWT decoding and verification for Apple tokens
- `bcrypt`: Password hashing (not used for OAuth users but required by system)

## Future Enhancements

1. **LinkedIn OAuth**: Add LinkedIn as another OAuth provider
2. **Account Merging**: Allow users to link multiple OAuth providers to one account
3. **OAuth Refresh**: Implement OAuth token refresh for long-lived sessions
4. **Profile Photo**: Fetch and store user's profile photo from OAuth provider
5. **Email Change**: Handle email changes from OAuth providers
6. **Revoke Access**: Allow users to revoke OAuth connections

## Troubleshooting

### Google OAuth Issues
- **Error**: "Invalid access token"
  - **Solution**: Ensure token is fresh and hasn't expired (typically 1 hour)
  - **Solution**: Verify Google Client ID matches your application

### Facebook OAuth Issues
- **Error**: "Email permission not granted"
  - **Solution**: Request email permission in OAuth scope
  - **Solution**: User must approve email permission in Facebook dialog

### Apple Sign In Issues
- **Error**: "ID token required"
  - **Solution**: Include both access_token and id_token in request
- **Error**: "Invalid Apple ID token"
  - **Solution**: Verify Apple Client ID, Team ID, and Key ID are correct
  - **Solution**: Ensure private key is properly formatted

## Support

For issues or questions about OAuth implementation, please contact the development team or create an issue in the repository.
