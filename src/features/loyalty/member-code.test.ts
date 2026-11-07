import { describe, expect, it } from 'vitest';

import { formatMemberCode, memberCodeFromQr } from './member-code';

describe('memberCodeFromQr', () => {
  it('lee el código del QR de una tarjeta', () => {
    expect(memberCodeFromQr('opinara-card:K3F9QX')).toBe('K3F9QX');
    expect(memberCodeFromQr(' OPINARA-CARD:k3f9qx ')).toBe('K3F9QX');
  });

  it.each([
    'https://app.opinara.com.ar/r/cafe/mostrador',
    'K3F9QX',
    'opinara-card:K3F9Q',
    'opinara-card:K3F9QO',
    'opinara-card:K3F9QX-extra',
  ])('no confunde otro QR con una tarjeta: %s', (content) => {
    expect(memberCodeFromQr(content)).toBeNull();
  });

  it('formatea el código para dictarlo', () => {
    expect(formatMemberCode('K3F9QX')).toBe('K3F 9QX');
  });
});
