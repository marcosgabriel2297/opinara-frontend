import { z } from 'zod';

import { ApiError } from './api-error';
import { session } from './session';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: QueryParams;
  /** `false` para endpoints publicos: no adjunta token ni intenta refrescar ante 401. */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Respuesta de `/auth/login`, `/auth/register` y `/auth/refresh`: lo minimo que el cliente necesita. */
const tokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});

let refreshInFlight: Promise<string | null> | null = null;

/**
 * Renueva el access token. *Single-flight*: si hay diez requests esperando, se dispara
 * un unico `POST /auth/refresh` y todas comparten su resultado.
 */
async function refreshAccessToken(): Promise<string | null> {
  refreshInFlight ??= performRefresh().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = session.getRefreshToken();
  if (refreshToken === null) return null;

  try {
    const tokens = await execute('/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
      schema: tokensSchema,
    });

    session.set(tokens);
    return tokens.accessToken;
  } catch {
    // Refresh vencido, revocado o invalido: la sesion se termino. El store avisa a la app,
    // que redirige al login (ver `useSession`).
    session.clear();
    return null;
  }
}

function buildUrl(path: string, query: QueryParams | undefined): string {
  // La base admite una ruta relativa ("/api", detrás del proxy del dev server): se resuelve
  // contra el origen de la página. Con una URL absoluta, el segundo argumento no cambia nada.
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

interface ExecuteOptions<TSchema extends z.ZodType> extends RequestOptions {
  schema?: TSchema;
  accessToken?: string | null;
}

/** Un unico viaje a la red, sin logica de reintento. */
async function execute<TSchema extends z.ZodType>(
  path: string,
  options: ExecuteOptions<TSchema>,
): Promise<z.output<TSchema>> {
  const headers = new Headers({ Accept: 'application/json' });

  // Un `Blob` (una imagen) viaja crudo con su propio tipo; el resto, como JSON. Se mandan sus
  // bytes y no el `Blob`: así anda con cualquier `fetch`, también el de los tests.
  let body: string | ArrayBuffer | undefined;
  if (options.body instanceof Blob) {
    headers.set('Content-Type', options.body.type);
    body = await options.body.arrayBuffer();
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  if (options.accessToken != null) headers.set('Authorization', `Bearer ${options.accessToken}`);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method: options.method ?? 'GET',
      headers,
      ...(body === undefined ? {} : { body }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw ApiError.network(path, cause);
  }

  const payload = await readBody(response);

  if (!response.ok) throw ApiError.fromResponse(response.status, payload, path);

  if (options.schema === undefined) return undefined as z.output<TSchema>;

  const parsed = options.schema.safeParse(payload);
  if (!parsed.success) throw ApiError.invalidResponse(path, z.treeifyError(parsed.error));

  return parsed.data;
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const text = await response.text();
  if (text === '') return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function request<TSchema extends z.ZodType>(
  path: string,
  options: RequestOptions & { schema: TSchema },
): Promise<z.output<TSchema>>;
export function request(path: string, options?: RequestOptions): Promise<void>;

/**
 * Cliente HTTP unico de la app.
 *
 * 1. Adjunta el access token.
 * 2. Ante 401 intenta refrescar **una sola vez** y reintenta el request original.
 * 3. Si el refresh falla, limpia la sesion y propaga el error.
 */
export async function request<TSchema extends z.ZodType>(
  path: string,
  options: RequestOptions & { schema?: TSchema } = {},
): Promise<z.output<TSchema> | void> {
  const withAuth = options.auth !== false;
  const tokenUsed = withAuth ? session.getAccessToken() : null;

  try {
    return await execute(path, { ...options, accessToken: tokenUsed });
  } catch (error) {
    if (!withAuth || !(error instanceof ApiError) || error.statusCode !== 401) throw error;

    // Otro request ya refresco mientras este estaba en vuelo: reintentar con el token vigente
    // alcanza, no hace falta otro refresh.
    const current = session.getAccessToken();
    const nextToken = current !== null && current !== tokenUsed ? current : await refreshAccessToken();

    if (nextToken === null) throw ApiError.sessionExpired(path);

    return await execute(path, { ...options, accessToken: nextToken });
  }
}

export const api = {
  get: <TSchema extends z.ZodType>(
    path: string,
    options: Omit<RequestOptions, 'method' | 'body'> & { schema: TSchema },
  ) => request(path, { ...options, method: 'GET' }),

  post: <TSchema extends z.ZodType>(path: string, options: Omit<RequestOptions, 'method'> & { schema: TSchema }) =>
    request(path, { ...options, method: 'POST' }),

  put: <TSchema extends z.ZodType>(path: string, options: Omit<RequestOptions, 'method'> & { schema: TSchema }) =>
    request(path, { ...options, method: 'PUT' }),

  /** Para 204 sin cuerpo. */
  delete: (path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request(path, { ...options, method: 'DELETE' }),
};

/** Solo para tests: limpia el refresh compartido entre casos. */
export function resetRefreshState(): void {
  refreshInFlight = null;
}
