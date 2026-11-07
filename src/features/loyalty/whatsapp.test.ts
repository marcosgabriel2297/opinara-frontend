import { describe, expect, it } from 'vitest';

import { whatsAppUrl } from './whatsapp';

describe('whatsAppUrl', () => {
  it('arma el link con el número sin + y el mensaje codificado', () => {
    expect(whatsAppUrl('+5491123456789', 'Tu tarjeta: https://app.test/card#token=a_b-c')).toBe(
      'https://wa.me/5491123456789?text=Tu%20tarjeta%3A%20https%3A%2F%2Fapp.test%2Fcard%23token%3Da_b-c',
    );
  });
});
