import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/lib/query-keys';

import { inviteMember, getTeam, removeMember, revokeInvitation, updateMemberRole } from './api/team-api';
import { type InvitableRole } from './api/schemas';

export function useTeam(businessUrn: string) {
  return useQuery({ queryKey: queryKeys.team(businessUrn), queryFn: () => getTeam(businessUrn) });
}

/** Todo lo que cambia el equipo, con la lista recargada al terminar. */
export function useTeamActions(businessUrn: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.team(businessUrn) });

  return {
    invite: useMutation({
      mutationFn: ({ email, role }: { email: string; role: InvitableRole }) => inviteMember(businessUrn, email, role),
      onSuccess: refresh,
    }),
    revoke: useMutation({
      mutationFn: (invitationUrn: string) => revokeInvitation(businessUrn, invitationUrn),
      onSettled: refresh,
    }),
    changeRole: useMutation({
      mutationFn: ({ memberUrn, role }: { memberUrn: string; role: InvitableRole }) =>
        updateMemberRole(businessUrn, memberUrn, role),
      onSettled: refresh,
    }),
    remove: useMutation({
      mutationFn: (memberUrn: string) => removeMember(businessUrn, memberUrn),
      onSettled: refresh,
    }),
  };
}
