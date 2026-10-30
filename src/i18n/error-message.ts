import { isApiError } from '@/lib/http';

import { errorMessages, fallbackErrorMessage } from './errors';

/** Traduce cualquier error a un mensaje mostrable, siempre a partir del `errorCode`. */
export function errorMessage(error: unknown): string {
  if (!isApiError(error)) return fallbackErrorMessage;

  return errorMessages[error.errorCode] ?? fallbackErrorMessage;
}
