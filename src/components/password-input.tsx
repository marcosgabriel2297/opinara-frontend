import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useState, type ComponentProps } from 'react';

import { Input } from '@/components/ui/input';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';

/** Input de contraseña con mostrar/ocultar. El botón queda fuera del tab order del formulario. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOffIcon : EyeIcon;

  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className={cn('pr-11', className)} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setVisible((current) => !current);
        }}
        aria-label={visible ? t.auth.fields.hidePassword : t.auth.fields.showPassword}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md focus-visible:-outline-offset-2"
      >
        <Icon aria-hidden className="size-4" />
      </button>
    </div>
  );
}
