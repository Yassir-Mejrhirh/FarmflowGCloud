import { cn } from '@/lib/utils';

const TONES = {
  moss: 'bg-primary/10 text-primary',
  clay: 'bg-clay/10 text-clay',
  sand: 'bg-secondary text-secondary-foreground',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'sand' }) {
  return (
    <div className="group rounded-2xl border border-border/70 bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
            <Icon className="h-4 w-4" strokeWidth={1.75} />
          </span>
        )}
      </div>
      <p className="mt-4 font-display text-3xl leading-none tracking-tight tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}