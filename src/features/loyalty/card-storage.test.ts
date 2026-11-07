import { beforeEach, describe, expect, it } from 'vitest';

import { cardTokenFromHash, forgetCardToken, readCardTokens, rememberCardToken } from './card-storage';

beforeEach(() => {
  localStorage.clear();
});

describe('tarjetas guardadas en el teléfono', () => {
  it('guarda la más reciente primero y sin repetir', () => {
    rememberCardToken('a');
    rememberCardToken('b');
    rememberCardToken('a');

    expect(readCardTokens()).toEqual(['a', 'b']);
  });

  it('olvida una tarjeta borrada', () => {
    rememberCardToken('a');
    rememberCardToken('b');
    forgetCardToken('a');

    expect(readCardTokens()).toEqual(['b']);
  });

  it('aguanta un valor roto en el almacenamiento', () => {
    localStorage.setItem('opinara.loyalty-cards', '{no es json');

    expect(readCardTokens()).toEqual([]);
  });

  it('lee el token del link', () => {
    expect(cardTokenFromHash('#token=abc_DEF-123')).toBe('abc_DEF-123');
    expect(cardTokenFromHash('#otra=1&token=xyz')).toBe('xyz');
    expect(cardTokenFromHash('')).toBeNull();
  });
});
