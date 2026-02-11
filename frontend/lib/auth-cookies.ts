/**
 * Auth Cookie Utilities
 *
 * Syncs auth tokens to cookies so Next.js middleware can
 * enforce route protection server-side.
 */

const AUTH_COOKIE_NAME = 'hf_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Set the auth session cookie from an access token.
 * Called on login, register, and token refresh.
 */
export function setAuthCookie(token: string): void {
  if (typeof document === 'undefined') return;
  const isSecure = window.location.protocol === 'https:';
  const secureFlag = isSecure ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax${secureFlag}`;
}

/**
 * Clear the auth session cookie.
 * Called on logout.
 */
export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Check if the auth session cookie exists.
 */
export function hasAuthCookie(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}
