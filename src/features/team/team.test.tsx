import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { session } from '@/lib/http';
import { mockBusiness, mockInvitationToken, mockUser } from '@/mocks/fixtures';
import { TEMPORARY_PASSWORD } from '@/mocks/handlers/auth';
import { givenMock, mockState } from '@/mocks/state';
import { renderApp, signIn } from '@/test/render';

beforeEach(() => {
  session.clear();
  signIn();
  localStorage.removeItem('opinara.business');
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

const teamCard = async () =>
  (await screen.findByRole('heading', { name: 'Equipo' })).closest<HTMLElement>('[data-slot="card"]')!;

describe('equipo en Configuración', () => {
  it('lista a quienes entran, con su rol, y marca quién sos vos', async () => {
    renderApp(['/settings']);
    const card = await teamCard();

    const rows = await within(card).findAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(mockUser.name);
    expect(within(rows[0]!).getByText('Vos')).toBeInTheDocument();
    // Al dueño nadie le cambia el rol: no hay selector en su fila.
    expect(within(rows[0]!).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(rows[1]!).getByRole('combobox', { name: 'Rol de Martina Gómez' })).toHaveValue('ADMIN');
  });

  it('invita por mail y deja el link para pasarlo por WhatsApp', async () => {
    const { user } = renderApp(['/settings']);
    const card = await teamCard();

    await user.type(within(card).getByLabelText('Email'), 'Nuevo@Opinara.test');
    await user.selectOptions(within(card).getByLabelText('Rol'), 'ADMIN');
    expect(within(card).getByText('Responde, arma los QR e invita miembros.')).toBeInTheDocument();
    await user.click(within(card).getByRole('button', { name: 'Invitar' }));

    expect(await within(card).findByText('Invitamos a nuevo@opinara.test')).toBeInTheDocument();
    expect(within(card).getByRole('link', { name: 'Mandar por WhatsApp' }).getAttribute('href')).toContain(
      encodeURIComponent('#token=invitacion-nuevo@opinara.test'),
    );
    const pending = within(card).getByRole('heading', { name: 'Invitaciones pendientes' }).closest('section')!;
    expect(within(pending).getByText('nuevo@opinara.test')).toBeInTheDocument();
  });

  it('no invita a quien ya está en el equipo', async () => {
    const { user } = renderApp(['/settings']);
    const card = await teamCard();

    await user.type(within(card).getByLabelText('Email'), 'gerente@opinara.test');
    await user.click(within(card).getByRole('button', { name: 'Invitar' }));

    expect(await within(card).findByText('Esa persona ya está en el equipo.')).toBeInTheDocument();
  });

  it('no invita a quien no tiene cuenta: la crea un administrador', async () => {
    const { user } = renderApp(['/settings']);
    const card = await teamCard();

    await user.type(within(card).getByLabelText('Email'), 'sin-cuenta@opinara.test');
    await user.click(within(card).getByRole('button', { name: 'Invitar' }));

    expect(await within(card).findByText(/No hay una cuenta con ese email/)).toBeInTheDocument();
  });

  it('el dueño cambia el rol de alguien', async () => {
    const { user } = renderApp(['/settings']);
    const card = await teamCard();

    await user.selectOptions(await within(card).findByRole('combobox', { name: 'Rol de Martina Gómez' }), 'MEMBER');

    expect(await screen.findByText('Martina Gómez ahora es miembro.')).toBeInTheDocument();
    expect(mockState.team.members[1]?.role).toBe('MEMBER');
  });

  describe('sacar a alguien', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('se deshace en vez de confirmarse, y se saca al cerrarse el aviso', async () => {
      const { user } = renderApp(['/settings']);
      const card = await teamCard();

      await user.click(await within(card).findByRole('button', { name: 'Sacar a Martina Gómez del equipo' }));
      expect(screen.getByText('Sacamos a Martina Gómez del equipo.')).toBeInTheDocument();
      expect(within(card).queryByText('Martina Gómez')).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Deshacer' }));
      expect(within(card).getByText('Martina Gómez')).toBeInTheDocument();
      await act(() => vi.advanceTimersByTimeAsync(7000));
      expect(mockState.team.members).toHaveLength(2);

      await user.click(within(card).getByRole('button', { name: 'Sacar a Martina Gómez del equipo' }));
      await act(() => vi.advanceTimersByTimeAsync(7000));
      await waitFor(() => {
        expect(mockState.team.members).toHaveLength(1);
      });
    });
  });

  it('un miembro ve el equipo pero no invita ni saca a nadie, y se puede ir', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'MEMBER' }]);
    mockState.team.members = mockState.team.members.map((member) =>
      member.user.urn === mockUser.urn ? { ...member, role: 'MEMBER' } : { ...member, role: 'OWNER' },
    );
    renderApp(['/settings']);
    const card = await teamCard();

    await within(card).findAllByRole('listitem');
    expect(within(card).queryByRole('button', { name: 'Invitar' })).not.toBeInTheDocument();
    expect(within(card).queryByRole('button', { name: /^Sacar/ })).not.toBeInTheDocument();
    expect(within(card).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Irme de este negocio' })).toBeInTheDocument();
  });

  it('un administrador invita solo miembros', async () => {
    givenMock.businesses([{ ...mockBusiness, role: 'ADMIN' }]);
    renderApp(['/settings']);
    const card = await teamCard();

    const role = await within(card).findByLabelText('Rol');
    expect(
      within(role)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Miembro']);
    expect(within(card).getByText('Como administrador, podés invitar miembros.')).toBeInTheDocument();
  });
});

describe('aceptar una invitación', () => {
  /** El link del mail: el token viaja después de `#`. */
  const openInvitation = () => {
    window.history.replaceState(null, '', `/invitations#token=${mockInvitationToken}`);
    return renderApp(['/invitations']);
  };

  it('sin cuenta: avisa que la crea un administrador; con la cuenta nueva cambia la contraseña y se suma', async () => {
    session.clear();
    givenMock.noBusinesses();
    const { user, router } = openInvitation();

    expect(await screen.findByRole('heading', { name: `Te invitaron a ${mockBusiness.name}` })).toBeInTheDocument();
    expect(screen.getByText('Dueño de prueba te invitó a sumarte como miembro.')).toBeInTheDocument();
    expect(window.location.hash).toBe('');
    expect(screen.getByText(/Pedile a un administrador de Opinara que la cree/)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /crear/i })).not.toBeInTheDocument();

    // El administrador le creó la cuenta: entra con la provisoria y la tiene que cambiar primero.
    await user.click(screen.getByRole('link', { name: 'Entrar con nueva@opinara.test' }));
    await screen.findByRole('heading', { name: 'Entrá a tu cuenta' });
    expect(screen.getByLabelText('Email')).toHaveValue('nueva@opinara.test');
    await user.type(screen.getByLabelText('Contraseña'), TEMPORARY_PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    await screen.findByRole('heading', { name: 'Elegí tu contraseña' });
    await user.type(screen.getByLabelText('Contraseña provisoria'), TEMPORARY_PASSWORD);
    await user.type(screen.getByLabelText('Contraseña nueva'), 'miClaveNueva1');
    await user.type(screen.getByLabelText('Repetí la contraseña nueva'), 'miClaveNueva1');
    await user.click(screen.getByRole('button', { name: 'Guardar y seguir' }));

    const join = await screen.findByRole('button', { name: `Unirme a ${mockBusiness.name}` });
    expect(router.state.location.pathname).toBe('/invitations');
    await user.click(join);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/');
    });
    expect(await screen.findByText(`Ya sos parte de ${mockBusiness.name}.`)).toBeInTheDocument();
    expect(localStorage.getItem('opinara.business')).toBe(mockBusiness.urn);
    expect(sessionStorage.getItem('opinara.invitation')).toBeNull();
  });

  it('con la cuenta de otro email lo dice, en vez de sumar a la persona equivocada', async () => {
    givenMock.invitation({ email: 'otra@opinara.test', accountExists: true });
    openInvitation();

    expect(
      await screen.findByText(`Entraste como ${mockUser.email}, pero la invitación es para otra@opinara.test.`),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Unirme/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salir y entrar con otra@opinara.test' })).toBeInTheDocument();
  });

  it('si ya tiene cuenta, ofrece entrar con ese email', async () => {
    session.clear();
    givenMock.invitation({ accountExists: true });
    const { user } = openInvitation();

    await user.click(await screen.findByRole('link', { name: 'Entrar con nueva@opinara.test' }));
    await screen.findByRole('heading', { name: 'Entrá a tu cuenta' });
    expect(screen.getByLabelText('Email')).toHaveValue('nueva@opinara.test');
  });

  it('vencida, anulada o con un token que no existe: lo explica', async () => {
    givenMock.invitation({ status: 'EXPIRED' });
    const { unmount } = openInvitation();
    expect(await screen.findByText(/Esta invitación venció/)).toBeInTheDocument();
    unmount();
    sessionStorage.clear();

    window.history.replaceState(null, '', '/invitations#token=no-existe-0123456789-abcdef');
    renderApp(['/invitations']);
    expect(await screen.findByText(/No encontramos esta invitación/)).toBeInTheDocument();
  });

  it('sin token, avisa que el link está incompleto', async () => {
    renderApp(['/invitations']);
    expect(await screen.findByText(/Este link de invitación está incompleto/)).toBeInTheDocument();
  });
});
