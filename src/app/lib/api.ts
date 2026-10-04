import { auth } from './firebase';

export async function apiRequest<T = any>(path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const base = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed');
  return data;
}
