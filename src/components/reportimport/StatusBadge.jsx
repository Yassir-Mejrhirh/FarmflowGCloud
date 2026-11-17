import { cn } from '@/lib/utils';

const TONES = {
  ok: 'border-primary/25 bg-primary/10 text-primary',
  warn: 'border-clay/30 bg-clay/10 text-clay',
  error: 'border-destructive/25 bg-destructive/10 text-destructive',
  neutral: 'border-border bg-secondary text-secondary-foreground',
};

export default function StatusBadge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium leading-normal',
        TONES[tone] || TONES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}