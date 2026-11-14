import { Users } from 'lucide-react';
import PointageRow from '@/components/attendance/PointageRow';
import { useI18n } from '@/lib/I18nContext';

// The workers of the pointage, the farm's own first, then one section per team.
export default function PointageWorkerList({ groups, days, onChange, onFillGroup }) {
  const { t } = useI18n();

  if (!groups.length) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
        {t('att.noWorkers')}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const pointed = group.workers.filter((worker) => (Number(days[worker.id]) || 0) > 0).length;
        return (
          <section key={group.key} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <div className="flex items-center gap-2 border-b border-border/70 bg-muted/20 px-3 py-2">
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.label}</span>
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
            </div>
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
          </section>
        );
      })}
    </div>
  );
}