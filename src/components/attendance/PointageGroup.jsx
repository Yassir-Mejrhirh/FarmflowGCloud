import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import PointageRow from '@/components/attendance/PointageRow';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// One group of workers, folded or unfolded by its header; the days already
// written stay untouched while the group is closed.
export default function PointageGroup({ group, days, onChange, onFillGroup, onClearGroup }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(true);
  const pointed = group.workers.filter((worker) => (Number(days[worker.id]) || 0) > 0).length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          title={open ? t('att.collapseGroup') : t('att.expandGroup')}
          className="flex min-w-0 flex-1 items-center gap-2 text-start"
        >
          <ChevronDown
            className={cn('h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 rtl:rotate-180', !open && '-rotate-90 rtl:rotate-90')}
            strokeWidth={2.2}
          />
          <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.label}</span>
        </button>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
          {pointed}/{group.workers.length}
        </span>
        <button
          type="button"
          onClick={() => onFillGroup(group.workers)}
          className="shrink-0 rounded-lg border border-border/70 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {t('att.allInGroup')}
        </button>
        <button
          type="button"
          onClick={() => onClearGroup(group.workers)}
          disabled={!pointed}
          className="shrink-0 rounded-lg border border-border/70 px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
        >
          {t('att.clearGroup')}
        </button>
      </div>
      {open && (
        <ul className="divide-y divide-border/60">
          {group.workers.map((worker) => (
            <PointageRow
              key={worker.id}
              worker={worker}
              value={days[worker.id]}
              onChange={(value) => onChange(worker.id, value)}
            />
          ))}
        </ul>
      )}
    </section>
  );
}