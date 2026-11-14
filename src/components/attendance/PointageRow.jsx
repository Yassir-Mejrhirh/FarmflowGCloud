import { Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

// One worker of the pointage: tapping the name marks him pointed for one day,
// the field beside it allows half days.
export default function PointageRow({ worker, value, onChange }) {
  const { t } = useI18n();
  const days = Number(value) || 0;
  const pointed = days > 0;

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        onClick={() => onChange(pointed ? '' : '1')}
        className="flex min-w-0 flex-1 items-center gap-2 text-start"
      >
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
            pointed ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <span className="min-w-0">
          <span className={cn('block truncate text-sm', pointed && 'font-medium')}>{worker.name}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {[worker.worker_function, worker.team].filter(Boolean).join(' · ') || '—'}
          </span>
        </span>
      </button>
      <Input
        type="number"
        min="0"
        step="0.5"
        inputMode="decimal"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder="0"
        aria-label={t('att.days')}
        className="w-16 shrink-0 text-center tabular-nums"
      />
    </li>
  );
}