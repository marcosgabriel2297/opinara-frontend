import { describe, expect, it } from 'vitest';

import { reviewListReturn, reviewListState } from './list-return';

describe('reviewListReturn', () => {
  it('vuelve al listado tal como se dejó: filtros y página', () => {
    const state = reviewListState('/reviews', '?location=urn%3Alocation%3A1&replied=no&page=2');
    expect(reviewListReturn(state)).toBe('/reviews?location=urn%3Alocation%3A1&replied=no&page=2');
  });

  it('sin estado (link directo o recarga) va al listado limpio', () => {
    expect(reviewListReturn(undefined)).toBe('/reviews');
    expect(reviewListReturn(null)).toBe('/reviews');
    expect(reviewListReturn({})).toBe('/reviews');
    expect(reviewListReturn({ reviewsList: 42 })).toBe('/reviews');
  });

  it.each([
    'https://evil.example/reviews',
    '//evil.example/reviews',
    '/\\evil.example/reviews',
    'javascript:alert(1)',
    'reviews?replied=no',
    '/reviews/urn%3Alocation%3A1/urn%3Areview%3A1',
    '/reviewsx',
    '/campaigns',
    '/settings?next=/reviews',
  ])('no acepta %s: vuelve al listado limpio', (reviewsList) => {
    expect(reviewListReturn({ reviewsList })).toBe('/reviews');
  });
});
