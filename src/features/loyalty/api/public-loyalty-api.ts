import { api } from '@/lib/http';

import {
  loyaltyCardSchema,
  loyaltySignupSchema,
  registerResultSchema,
  type LoyaltyCard,
  type LoyaltySignup,
} from './schemas';

const enc = encodeURIComponent;
/** El token de la tarjeta viaja en un header: en la URL va después de `#`, que no llega al servidor. */
const CARD_TOKEN_HEADER = 'X-Loyalty-Card-Token';

export function getSignup(businessSlug: string, programSlug: string): Promise<LoyaltySignup> {
  return api.get(`/public/loyalty/${enc(businessSlug)}/${enc(programSlug)}`, {
    auth: false,
    schema: loyaltySignupSchema,
  });
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  acceptTerms: boolean;
  marketing: boolean;
  /** El campo trampa: lo completa solo un bot. */
  website?: string;
}

export async function register(businessSlug: string, programSlug: string, input: RegisterInput): Promise<string> {
  const { cardToken } = await api.post(`/public/loyalty/${enc(businessSlug)}/${enc(programSlug)}/members`, {
    auth: false,
    body: input,
    schema: registerResultSchema,
  });
  return cardToken;
}

export function getCard(token: string): Promise<LoyaltyCard> {
  return api.get('/public/loyalty/card', {
    auth: false,
    headers: { [CARD_TOKEN_HEADER]: token },
    schema: loyaltyCardSchema,
  });
}

export function deleteCard(token: string): Promise<void> {
  return api.delete('/public/loyalty/card', { auth: false, headers: { [CARD_TOKEN_HEADER]: token } });
}
