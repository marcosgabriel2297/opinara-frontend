import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import * as loyaltyApi from './api/loyalty-api';
import * as publicApi from './api/public-loyalty-api';
import { type CreateProgramInput, type MembersQuery, type UpdateProgramInput } from './api/loyalty-api';
import { type RegisterInput } from './api/public-loyalty-api';

export function usePrograms(businessUrn: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.loyaltyPrograms(businessUrn),
    queryFn: () => loyaltyApi.listPrograms(businessUrn),
    enabled,
  });
}

export function useProgram(businessUrn: string, programUrn: string) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgram(businessUrn, programUrn),
    queryFn: () => loyaltyApi.getProgram(businessUrn, programUrn),
  });
}

export function useCreateProgram(businessUrn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProgramInput) => loyaltyApi.createProgram(businessUrn, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.loyalty(businessUrn) }),
  });
}

export function useUpdateProgram(businessUrn: string, programUrn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProgramInput) => loyaltyApi.updateProgram(businessUrn, programUrn, input),
    onSuccess: (program) => {
      queryClient.setQueryData(queryKeys.loyaltyProgram(businessUrn, programUrn), program);
      return queryClient.invalidateQueries({ queryKey: queryKeys.loyalty(businessUrn) });
    },
  });
}

/** Como el QR de las campañas: un POST idempotente que se cachea como una lectura. */
export function useProgramQr(businessUrn: string, programUrn: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.loyaltyProgramQr(businessUrn, programUrn),
    queryFn: () => loyaltyApi.generateProgramQr(businessUrn, programUrn),
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}

export function useMembers(businessUrn: string, programUrn: string | null, query: MembersQuery) {
  return useQuery({
    queryKey: queryKeys.loyaltyMembers(businessUrn, programUrn ?? '', { ...query }),
    queryFn: () => loyaltyApi.listMembers(businessUrn, programUrn ?? '', query),
    enabled: programUrn !== null,
    // Al tipear en el buscador no se vacía la lista entre letra y letra.
    placeholderData: keepPreviousData,
  });
}

export function useMemberByCode(businessUrn: string, memberCode: string | null) {
  return useQuery({
    queryKey: queryKeys.loyaltyMember(businessUrn, memberCode ?? ''),
    queryFn: () => loyaltyApi.getMemberByCode(businessUrn, memberCode ?? ''),
    enabled: memberCode !== null,
    // En la caja, una tarjeta que no existe es un dato, no una falla para reintentar.
    retry: false,
  });
}

/** Sellar, canjear y deshacer cambian el saldo, la lista y los contadores: se invalida todo `loyalty`. */
export function useRegisterActions(businessUrn: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.loyalty(businessUrn) });

  return {
    stamp: useMutation({
      mutationFn: (input: { programUrn: string; memberCode: string }) =>
        loyaltyApi.addStamp(businessUrn, input.programUrn, input.memberCode),
      onSettled: refresh,
    }),
    redeem: useMutation({
      mutationFn: (input: { programUrn: string; memberCode: string }) =>
        loyaltyApi.redeemReward(businessUrn, input.programUrn, input.memberCode),
      onSettled: refresh,
    }),
    undo: useMutation({
      mutationFn: (eventUrn: string) => loyaltyApi.undoEvent(businessUrn, eventUrn),
      onSettled: refresh,
    }),
  };
}

/** El link de la tarjeta para la caja. Se pide al abrir al cliente: así el botón de WhatsApp ya es un link. */
export function useCardLink(businessUrn: string, memberCode: string, enabled: boolean) {
  return useQuery({
    queryKey: [...queryKeys.loyaltyMember(businessUrn, memberCode), 'card-link'],
    queryFn: () => loyaltyApi.getCardLink(businessUrn, memberCode),
    enabled,
    staleTime: Infinity,
    retry: false,
  });
}

export function useDeleteMember(businessUrn: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberCode: string) => loyaltyApi.deleteMember(businessUrn, memberCode),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.loyalty(businessUrn) }),
  });
}

export function useSignup(businessSlug: string, programSlug: string) {
  return useQuery({
    queryKey: queryKeys.loyaltySignup(businessSlug, programSlug),
    queryFn: () => publicApi.getSignup(businessSlug, programSlug),
    retry: false,
  });
}

export function useRegister(businessSlug: string, programSlug: string) {
  return useMutation({
    mutationFn: (input: RegisterInput) => publicApi.register(businessSlug, programSlug, input),
  });
}

/** Cada tanto vuelve a pedirla: así el cliente ve aparecer el sello mientras está en la caja. */
export const CARD_REFRESH_MS = 10_000;

export function useCard(token: string | null) {
  return useQuery({
    queryKey: queryKeys.loyaltyCard(token ?? ''),
    queryFn: () => publicApi.getCard(token ?? ''),
    enabled: token !== null,
    retry: false,
    refetchInterval: CARD_REFRESH_MS,
  });
}

export function useDeleteCard() {
  return useMutation({ mutationFn: (token: string) => publicApi.deleteCard(token) });
}
