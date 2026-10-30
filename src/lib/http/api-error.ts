import { z } from 'zod';

/**
 * Forma unica de error que devuelve el backend. `errorCode` es el contrato estable:
 * `message` viene en ingles y puede cambiar, asi que nunca se muestra ni se parsea.
 */
const errorBodySchema = z.object({
  statusCode: z.number(),
  message: z.string().optional(),
  errorCode: z.string(),
  timestamp: z.string().optional(),
  path: z.string().optional(),
  details: z.unknown().optional(),
});

/** Codigos que genera el cliente, no el backend. Se distinguen por el prefijo. */
export const ClientErrorCodes = {
  /** No hubo respuesta: red caida, CORS, timeout. */
  NETWORK_ERROR: 'CLIENT_NETWORK_ERROR',
  /** Hubo respuesta pero no valida contra el schema Zod esperado. */
  INVALID_RESPONSE: 'CLIENT_INVALID_RESPONSE',
  /** La sesion se perdio: el refresh fallo o no habia refresh token. */
  SESSION_EXPIRED: 'CLIENT_SESSION_EXPIRED',
} as const;

export type ClientErrorCode = (typeof ClientErrorCodes)[keyof typeof ClientErrorCodes];

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly path: string | undefined;
  readonly details: unknown;

  constructor(params: { statusCode: number; errorCode: string; message?: string; path?: string; details?: unknown }) {
    super(params.message ?? params.errorCode);
    this.name = 'ApiError';
    this.statusCode = params.statusCode;
    this.errorCode = params.errorCode;
    this.path = params.path;
    this.details = params.details;
  }

  /**
   * Construye el error a partir del cuerpo de la respuesta. Si el cuerpo no tiene la forma
   * esperada (un 502 de un proxy, por ejemplo) se sintetiza un codigo a partir del status:
   * el resto de la app siempre puede confiar en que `errorCode` existe.
   */
  static fromResponse(status: number, body: unknown, path: string): ApiError {
    const parsed = errorBodySchema.safeParse(body);

    if (parsed.success) {
      return new ApiError({
        statusCode: parsed.data.statusCode,
        errorCode: parsed.data.errorCode,
        ...(parsed.data.message === undefined ? {} : { message: parsed.data.message }),
        path: parsed.data.path ?? path,
        details: parsed.data.details,
      });
    }

    return new ApiError({ statusCode: status, errorCode: statusToErrorCode(status), path });
  }

  static network(path: string, cause?: unknown): ApiError {
    return new ApiError({
      statusCode: 0,
      errorCode: ClientErrorCodes.NETWORK_ERROR,
      message: cause instanceof Error ? cause.message : 'Network request failed',
      path,
    });
  }

  static invalidResponse(path: string, issues: unknown): ApiError {
    return new ApiError({
      statusCode: 0,
      errorCode: ClientErrorCodes.INVALID_RESPONSE,
      message: `La respuesta de ${path} no coincide con el contrato esperado`,
      path,
      details: issues,
    });
  }

  static sessionExpired(path: string): ApiError {
    return new ApiError({ statusCode: 401, errorCode: ClientErrorCodes.SESSION_EXPIRED, path });
  }

  is(errorCode: string): boolean {
    return this.errorCode === errorCode;
  }
}

function statusToErrorCode(status: number): string {
  const byStatus: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'TOO_MANY_REQUESTS',
    503: 'SERVICE_UNAVAILABLE',
  };

  return byStatus[status] ?? 'INTERNAL_SERVER_ERROR';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
