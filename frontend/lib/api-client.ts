/**
 * Shared API client utilities for Zustand stores
 *
 * Centralizes auth token retrieval, API URL config, and
 * authenticated Axios instance creation.
 */

import axios from 'axios';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

export function createAuthAxios() {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
