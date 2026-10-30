import { BrandMark } from '@/components/brand-mark';
import { Spinner } from '@/components/ui/spinner';

export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <BrandMark className="size-8" />
      <Spinner label={label} />
    </div>
  );
}
