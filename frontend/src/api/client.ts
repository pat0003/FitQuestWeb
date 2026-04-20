// Client HTTP con auto-attach del JWT da localStorage
// Usato da tutti i componenti che comunicano con il backend

const BASE_URL = '/api';
const TOKEN_KEY = 'fitquest_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Aggiungi JWT automaticamente se presente
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  // Per le risposte senza body (es. 204) non parsare JSON
  if (response.status === 204) return undefined as T;

  const data = await response.json() as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? `Errore ${response.status}`);
  }

  return data;
}

export const apiGet = <T>(path: string) =>
  apiFetch<T>(path, { method: 'GET' });

export const apiPost = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });

export const apiPatch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
