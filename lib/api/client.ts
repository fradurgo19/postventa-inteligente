/**
 * Cliente HTTP para el backend Node.js (Express) — placeholder.
 * Los servicios mock actuales no usan este cliente; se activará al conectar la API real.
 */

const DEFAULT_API_URL = 'http://localhost:4000/api';

export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
}

export function isApiConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_API_URL);
}

interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

/**
 * Wrapper fetch tipado hacia el backend REST.
 * @throws Error si la respuesta no es exitosa.
 */
export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { body, headers, ...rest } = options;
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

  const response = await fetch(url, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API ${response.status}: ${message}`);
  }

  return response.json() as Promise<T>;
}
