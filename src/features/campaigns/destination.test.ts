import { describe, expect, it } from 'vitest';

import { type Location } from '@/features/locations/api/schemas';
import { mockCampaigns } from '@/mocks/fixtures';

import { branchLabel, isLocalOnlyUrl, printableUrl, resolveDestination } from './destination';

const campaign = mockCampaigns[0]!;
const location: Location = {
  urn: campaign.locationUrn,
  title: 'Café de la Esquina — Centro',
  hasVoiceOfMerchant: true,
  isActive: true,
  createdAt: '2026-06-16T02:26:10.637Z',
  googleReviewUrl: 'https://search.google.com/local/writereview?placeid=x',
};

describe('resolveDestination', () => {
  it('campaña activa y sucursal activa con link https: lleva a Google', () => {
    expect(resolveDestination(campaign, [location])).toEqual({
      ok: true,
      location,
      reviewUrl: location.googleReviewUrl,
    });
  });

  it.each([
    ['PAUSED', 'campaign-paused'],
    ['ARCHIVED', 'campaign-archived'],
  ] as const)('campaña %s: no', (status, problem) => {
    expect(resolveDestination({ ...campaign, status }, [location])).toMatchObject({ ok: false, problem });
  });

  it.each(['PAUSED', 'ARCHIVED'] as const)('campaña %s: igual informa su sucursal real', (status) => {
    expect(resolveDestination({ ...campaign, status }, [location])).toMatchObject({ ok: false, location });
  });

  it('el estado de la campaña pesa antes que la sucursal', () => {
    expect(resolveDestination({ ...campaign, status: 'PAUSED' }, [])).toMatchObject({ problem: 'campaign-paused' });
  });

  it('sucursal inexistente', () => {
    expect(resolveDestination(campaign, [])).toMatchObject({ ok: false, problem: 'location-missing' });
  });

  it('sucursal inactiva', () => {
    expect(resolveDestination(campaign, [{ ...location, isActive: false }])).toMatchObject({
      ok: false,
      problem: 'location-inactive',
    });
  });

  it.each([undefined, '', 'no es una url', 'http://search.google.com/x', 'javascript:alert(1)'])(
    'sucursal con link %s: no',
    (googleReviewUrl) => {
      const { googleReviewUrl: _, ...withoutLink } = location;
      const candidate = googleReviewUrl === undefined ? withoutLink : { ...location, googleReviewUrl };
      expect(resolveDestination(campaign, [candidate])).toMatchObject({
        ok: false,
        problem: 'location-no-review-link',
      });
    },
  );
});

describe('branchLabel', () => {
  it('saca el nombre del negocio del de la sucursal', () => {
    expect(branchLabel('Café de la Esquina', 'Café de la Esquina — Centro')).toBe('Centro');
    expect(branchLabel('Café de la Esquina', 'café de la esquina - Palermo')).toBe('Palermo');
  });

  it('si es el mismo nombre no agrega nada', () => {
    expect(branchLabel('Café de la Esquina', 'Café de la Esquina')).toBeNull();
  });

  it('un nombre distinto queda como está', () => {
    expect(branchLabel('Café de la Esquina', 'Local Belgrano')).toBe('Local Belgrano');
  });
});

describe('isLocalOnlyUrl', () => {
  it.each([
    'http://localhost:5173/r/a/b',
    'http://127.0.0.1/r/a/b',
    'http://127.1.2.3:80/x',
    'http://[::1]:5173/',
    'http://0.0.0.0/',
  ])('%s no abre en un teléfono', (url) => {
    expect(isLocalOnlyUrl(url)).toBe(true);
  });

  it.each(['https://app.opinara.com/r/a/b', 'http://192.168.1.26:5173/r/a/b', 'https://127.example.com/'])(
    '%s sí',
    (url) => {
      expect(isLocalOnlyUrl(url)).toBe(false);
    },
  );
});

describe('printableUrl', () => {
  it('saca el protocolo', () => {
    expect(printableUrl('https://app.opinara.com/r/cafe/mostrador')).toBe('app.opinara.com/r/cafe/mostrador');
  });
});
