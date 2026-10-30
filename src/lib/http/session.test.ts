import { beforeEach, describe, expect, it } from 'vitest';

import { session } from './session';

beforeEach(() => {
  session.clear();
});

describe('session', () => {
  it('guarda el refresh token en localStorage y el access token solo en memoria', () => {
    session.set({ accessToken: 'access', refreshToken: 'refresh' });

    expect(localStorage.getItem('opinara.refresh-token')).toBe('refresh');
    expect(JSON.stringify(localStorage)).not.toContain('access');
    expect(session.getAccessToken()).toBe('access');
  });

  it('limpiar borra las dos cosas', () => {
    session.set({ accessToken: 'access', refreshToken: 'refresh' });
    session.clear();

    expect(localStorage.getItem('opinara.refresh-token')).toBeNull();
    expect(session.getAccessToken()).toBeNull();
  });

  it('notifica a los suscriptores y devuelve un snapshot estable', () => {
    const seen: (string | null)[] = [];
    const unsubscribe = session.subscribe((snapshot) => seen.push(snapshot.accessToken));

    const before = session.getSnapshot();
    expect(session.getSnapshot()).toBe(before);

    session.set({ accessToken: 'access', refreshToken: 'refresh' });

    expect(seen).toEqual(['access']);
    expect(session.getSnapshot()).not.toBe(before);

    unsubscribe();
  });
});
