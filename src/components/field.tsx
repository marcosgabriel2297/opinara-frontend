import { type ReactNode } from 'react';

import { Label } from '@/components/ui/label';

interface FieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}

/**
 * Campo de formulario accesible: el error se anuncia (`role="alert"`) y queda enlazado al input
 * por `aria-describedby`, que arma `describedBy()` del lado del que renderiza el input.
 */
export function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint !== undefined && error === undefined && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {error !== undefined && (
        <p id={`${id}-error`} role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
