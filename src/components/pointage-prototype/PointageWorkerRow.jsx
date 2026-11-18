import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PointageWorkerRow({ worker, status, disabled, onMark }) {
  const initials = worker.name.trim().slice(0, 2);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-3 transition-colors duration-200',
        status === 'present' && 'border-primary/50',
        status === 'absent' && 'border-destructive/40',
        !status && 'border-border/80',
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
            status === 'present'
              ? 'bg-primary text-primary-foreground'
              : status === 'absent'
                ? 'bg-destructive/10 text-destructive'
                : 'bg-secondary text-secondary-foreground',
          )}
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">{worker.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {[worker.worker_function, worker.team].filter(Boolean).join(' · ') || 'Sans équipe'}
          </p>
        </div>
        {status && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]',
              status === 'present' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive',
            )}
          >
            {status === 'present' ? 'Présent' : 'Absent'}
          </span>
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMark(worker.id, 'present')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11.5px] font-medium transition-colors duration-200 disabled:opacity-40',
            status === 'present'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.1} />
          Présent
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onMark(worker.id, 'absent')}
          className={cn(
            'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11.5px] font-medium transition-colors duration-200 disabled:opacity-40',
            status === 'absent'
              ? 'border-destructive bg-destructive text-destructive-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-destructive/40 hover:text-foreground',
          )}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.1} />
          Absent
        </button>
      </div>
    </div>
  );
}