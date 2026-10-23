import { cn } from '@/lib/utils';

const TONES = {
  moss: 'bg-primary/10 text-primary ring-primary/15',
  clay: 'bg-clay/10 text-clay ring-clay/20',
  sand: 'bg-secondary text-secondary-foreground ring-border',
  stone: 'bg-muted text-muted-foreground ring-border',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200',
};

export default function StatusPill({ tone = 'stone', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}