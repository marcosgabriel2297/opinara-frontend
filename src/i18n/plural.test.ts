import { describe, expect, it } from 'vitest';

import { plural } from './plural';

const sucursales = { one: '1 sucursal', other: '{count} sucursales' };

describe('plural', () => {
  it('usa el singular solo para 1', () => {
    expect(plural(1, sucursales)).toBe('1 sucursal');
    expect(plural(2, sucursales)).toBe('2 sucursales');
  });

  it('el cero va en plural, como en castellano', () => {
    expect(plural(0, sucursales)).toBe('0 sucursales');
  });

  it('formatea los miles en es-AR', () => {
    expect(plural(4096, { one: '', other: 'Quedan {count} caracteres' })).toBe('Quedan 4.096 caracteres');
  });
});
