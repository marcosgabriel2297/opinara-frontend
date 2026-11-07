import { Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { Pagination } from '@/components/pagination';
import { useToast } from '@/components/toast-context';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { errorMessage, plural, t } from '@/i18n';
import { useDebouncedValue } from '@/lib/use-debounced-value';

import { type LoyaltyMember, type LoyaltyProgram } from '../api/schemas';
import { useDeleteMember, useMembers } from '../queries';
import { StampDots } from './stamp-dots';

const PAGE_SIZE = 20;

/** Los clientes de la tarjeta de una sucursal. Borrar (con deshacer) queda para OWNER y ADMIN. */
export function ProgramMembers({
  businessUrn,
  program,
  canManage,
}: {
  businessUrn: string;
  program: LoyaltyProgram;
  canManage: boolean;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<unknown>(null);
  const debounced = useDebouncedValue(search.trim());
  const membersQuery = useMembers(businessUrn, program.urn, { search: debounced, page, limit: PAGE_SIZE });
  const deleteMutation = useDeleteMember(businessUrn);
  const toast = useToast();

  const hide = (code: string, value: boolean) => {
    setHidden((current) => {
      const next = new Set(current);
      if (value) next.add(code);
      else next.delete(code);
      return next;
    });
  };

  /** Como en el equipo: se esconde ya y se borra al cerrarse el aviso, salvo que se deshaga. */
  const remove = (member: LoyaltyMember) => {
    setActionError(null);
    hide(member.memberCode, true);
    toast.undoable({
      message: t.loyalty.program.deleted.replace('{name}', member.name),
      run: () => {
        deleteMutation.mutateAsync(member.memberCode).catch((error: unknown) => {
          hide(member.memberCode, false);
          setActionError(error);
        });
      },
      onUndo: () => {
        hide(member.memberCode, false);
      },
    });
  };

  const members = (membersQuery.data?.items ?? []).filter((member) => !hidden.has(member.memberCode));

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2>{t.loyalty.program.membersTitle}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="members-search">{t.loyalty.program.searchLabel}</Label>
          <Input
            id="members-search"
            type="search"
            placeholder={t.loyalty.program.searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
          />
        </div>

        {actionError !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(actionError)}</AlertDescription>
          </Alert>
        )}

        {membersQuery.isPending && <Spinner label={t.common.loading} />}
        {membersQuery.isError && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage(membersQuery.error)}</AlertDescription>
          </Alert>
        )}

        {membersQuery.data !== undefined && members.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {debounced === ''
              ? t.loyalty.program.noMembers
              : t.loyalty.program.noResults.replace('{search}', debounced)}
          </p>
        )}

        {members.length > 0 && (
          <ul className="divide-y rounded-md border">
            {members.map((member) => (
              <li key={member.urn} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-3">
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <p className="truncate font-medium">{member.name}</p>
                  <p className="text-muted-foreground text-sm tabular-nums">{member.phone}</p>
                </div>
                <div className="grid justify-items-end gap-1">
                  <StampDots stamps={member.stamps} total={member.stampsRequired} />
                  <p className="text-muted-foreground text-xs">
                    {t.loyalty.program.memberStamps
                      .replace('{count}', String(member.stamps))
                      .replace('{total}', String(member.stampsRequired))}
                    {member.totalRedemptions > 0 &&
                      ` · ${plural(member.totalRedemptions, t.loyalty.program.memberRedemptions)}`}
                  </p>
                </div>
                {member.marketing && <Badge variant="outline">{t.loyalty.program.marketing}</Badge>}
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t.loyalty.program.deleteLabel.replace('{name}', member.name)}
                    onClick={() => {
                      remove(member);
                    }}
                  >
                    <Trash2Icon aria-hidden />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {membersQuery.data !== undefined && (
          <Pagination
            page={page}
            limit={PAGE_SIZE}
            total={membersQuery.data.total}
            onPageChange={setPage}
            disabled={membersQuery.isFetching}
          />
        )}
      </CardContent>
    </Card>
  );
}
