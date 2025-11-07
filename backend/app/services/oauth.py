"""OAuth Service for Third-Party Authentication"""

import httpx
import jwt as pyjwt
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.core.config import settings
from app.core.exceptions import UnauthorizedError, BadRequestError
from app.schemas.auth import OAuthUserInfo


class OAuthService:
    """Service for handling OAuth authentication with third-party providers"""

    @staticmethod
    async def verify_google_token(access_token: str) -> OAuthUserInfo:
        """
        Verify Google OAuth token and extract user information

        Args:
            access_token: Access token from Google OAuth

        Returns:
            OAuthUserInfo with user details

        Raises:
            UnauthorizedError: If token is invalid
        """
        try:
            async with httpx.AsyncClient() as client:
                # Verify token with Google
                response = await client.get(
                    "https://www.googleapis.com/oauth2/v3/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"},
                    timeout=10.0,
                )

                if response.status_code != 200:
                    raise UnauthorizedError("Invalid Google access token")

                user_data = response.json()

                # Extract user information
                return OAuthUserInfo(
                    email=user_data.get("email"),
                    email_verified=user_data.get("email_verified", False),
                    first_name=user_data.get("given_name"),
                    last_name=user_data.get("family_name"),
                    provider="google",
                    provider_user_id=user_data.get("sub"),
                )
        except httpx.RequestError as e:
            raise UnauthorizedError(f"Failed to verify Google token: {str(e)}")

    @staticmethod
    async def verify_facebook_token(access_token: str) -> OAuthUserInfo:
        """
        Verify Facebook OAuth token and extract user information

        Args:
            access_token: Access token from Facebook OAuth

        Returns:
            OAuthUserInfo with user details

        Raises:
            UnauthorizedError: If token is invalid
        """
        try:
            async with httpx.AsyncClient() as client:
                # First, verify the token
                verify_response = await client.get(
                    f"https://graph.facebook.com/debug_token",
                    params={
                        "input_token": access_token,
                        "access_token": f"{settings.FACEBOOK_CLIENT_ID}|{settings.FACEBOOK_CLIENT_SECRET}",
                    },
                    timeout=10.0,
                )

                if verify_response.status_code != 200:
                    raise UnauthorizedError("Invalid Facebook access token")

                verify_data = verify_response.json()
                if not verify_data.get("data", {}).get("is_valid"):
                    raise UnauthorizedError("Facebook token is not valid")

                # Get user information
                user_response = await client.get(
                    "https://graph.facebook.com/me",
                    params={
                        "fields": "id,email,first_name,last_name",
                        "access_token": access_token,
                    },
                    timeout=10.0,
                )

                if user_response.status_code != 200:
                    raise UnauthorizedError("Failed to get Facebook user info")

                user_data = user_response.json()

                # Facebook doesn't guarantee email, check if present
                email = user_data.get("email")
                if not email:
                    raise BadRequestError(
                        "Email permission not granted by Facebook user"
                    )

                return OAuthUserInfo(
                    email=email,
                    email_verified=True,  # Facebook verifies emails
                    first_name=user_data.get("first_name"),
                    last_name=user_data.get("last_name"),
                    provider="facebook",
                    provider_user_id=user_data.get("id"),
                )
        except httpx.RequestError as e:
            raise UnauthorizedError(f"Failed to verify Facebook token: {str(e)}")

    @staticmethod
    async def verify_linkedin_token(access_token: str) -> OAuthUserInfo:
        """
        Verify LinkedIn OAuth token and extract user information

        Args:
            access_token: Access token from LinkedIn OAuth

        Returns:
            OAuthUserInfo with user details

        Raises:
            UnauthorizedError: If token is invalid
        """
        try:
            async with httpx.AsyncClient() as client:
                # Get user profile using LinkedIn v2 API
                response = await client.get(
                    "https://api.linkedin.com/v2/userinfo",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    timeout=10.0,
                )

                if response.status_code != 200:
                    raise UnauthorizedError("Invalid LinkedIn access token")

                user_data = response.json()

                # LinkedIn v2 userinfo endpoint returns:
                # {
                #   "sub": "unique_id",
                #   "name": "Full Name",
                #   "given_name": "First",
                #   "family_name": "Last",
                #   "email": "email@example.com",
                #   "email_verified": true,
                #   "picture": "url"
                # }

                email = user_data.get("email")
                if not email:
                    raise BadRequestError(
                        "Email permission not granted by LinkedIn user"
                    )

                return OAuthUserInfo(
                    email=email,
                    email_verified=user_data.get("email_verified", False),
                    first_name=user_data.get("given_name"),
                    last_name=user_data.get("family_name"),
                    provider="linkedin",
                    provider_user_id=user_data.get("sub"),
                )

        except httpx.RequestError as e:
            raise UnauthorizedError(f"Failed to verify LinkedIn token: {str(e)}")

    @staticmethod
    async def verify_apple_token(id_token: str) -> OAuthUserInfo:
        """
        Verify Apple Sign In token and extract user information

        Args:
            id_token: ID token from Apple Sign In

        Returns:
            OAuthUserInfo with user details

        Raises:
            UnauthorizedError: If token is invalid
        """
        try:
            # Get Apple's public keys
            async with httpx.AsyncClient() as client:
                keys_response = await client.get(
                    "https://appleid.apple.com/auth/keys", timeout=10.0
                )

                if keys_response.status_code != 200:
                    raise UnauthorizedError("Failed to fetch Apple public keys")

                keys = keys_response.json().get("keys", [])

            # Decode the JWT token header to get the key ID
            unverified_header = pyjwt.get_unverified_header(id_token)
            key_id = unverified_header.get("kid")

            # Find the matching public key
            public_key = None
            for key in keys:
                if key.get("kid") == key_id:
                    public_key = pyjwt.algorithms.RSAAlgorithm.from_jwk(key)
                    break

            if not public_key:
                raise UnauthorizedError("Apple public key not found")

            # Verify and decode the token
            try:
                payload = pyjwt.decode(
                    id_token,
                    public_key,
                    algorithms=["RS256"],
                    audience=settings.APPLE_CLIENT_ID,
                    issuer="https://appleid.apple.com",
                )
            except pyjwt.InvalidTokenError as e:
                raise UnauthorizedError(f"Invalid Apple ID token: {str(e)}")

            # Extract user information
            email = payload.get("email")
            if not email:
                raise BadRequestError("Email not found in Apple ID token")

            # Apple doesn't provide first_name and last_name in the token
            # These should be provided separately by the client on first sign-in
            return OAuthUserInfo(
                email=email,
                email_verified=payload.get("email_verified", "true") == "true",
                first_name=None,
                last_name=None,
                provider="apple",
                provider_user_id=payload.get("sub"),
            )

        except pyjwt.PyJWTError as e:
            raise UnauthorizedError(f"Failed to verify Apple token: {str(e)}")

    @staticmethod
    async def verify_oauth_token(
        provider: str, access_token: str, id_token: Optional[str] = None
    ) -> OAuthUserInfo:
        """
        Verify OAuth token based on provider

        Args:
            provider: OAuth provider name (google, linkedin, facebook, apple)
            access_token: Access token from OAuth provider
            id_token: ID token (required for Apple)

        Returns:
            OAuthUserInfo with user details

        Raises:
            BadRequestError: If provider is unsupported
            UnauthorizedError: If token is invalid
        """
        provider = provider.lower()

        if provider == "google":
            return await OAuthService.verify_google_token(access_token)
        elif provider == "linkedin":
            return await OAuthService.verify_linkedin_token(access_token)
        elif provider == "facebook":
            return await OAuthService.verify_facebook_token(access_token)
        elif provider == "apple":
            if not id_token:
                raise BadRequestError("ID token is required for Apple Sign In")
            return await OAuthService.verify_apple_token(id_token)
        else:
            raise BadRequestError(f"Unsupported OAuth provider: {provider}")
