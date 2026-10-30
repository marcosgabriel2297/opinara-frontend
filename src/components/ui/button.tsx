import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ComponentProps } from 'react';

import { cn } from '@/lib/utils';

// Transición explícita y no `transition-colors`: en Tailwind 4 esa también anima `outline-color`,
// y el anillo de foco aparecía en fundido desde el color del texto en vez de estar al instante.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0",
  {
    variants: {
      // Jerarquía: `default` es la acción principal de la vista (una sola); `outline` las
      // secundarias; `ghost` las terciarias (cancelar, limpiar). `destructive` solo confirma.
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-brand-strong',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        // El borde es el de los controles (`--input`, 3:1 sobre el papel), no el de las tarjetas:
        // con el tenue, una secundaria al lado de la principal se leía como texto suelto.
        outline: 'border border-input bg-card hover:bg-accent',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        link: 'text-foreground underline underline-offset-4 hover:no-underline',
      },
      // Debajo de `md` todo mide 44px de alto (el mínimo cómodo para el dedo); en escritorio
      // vuelven a la densidad de siempre. El foco lo pone la regla global de `index.css`.
      size: {
        default: 'h-11 px-4 py-2 has-[>svg]:px-3.5 md:h-10',
        sm: 'h-11 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 md:h-8',
        lg: 'h-12 rounded-md px-6 text-base has-[>svg]:px-5',
        /** Target táctil cómodo: se usa en la landing pública. */
        touch: 'min-h-14 rounded-lg px-6 text-base',
        icon: 'size-11 md:size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    /** Renderiza el hijo en vez de un `<button>` (por ejemplo un `<Link>`). */
    asChild?: boolean;
  };

export function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';

  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
