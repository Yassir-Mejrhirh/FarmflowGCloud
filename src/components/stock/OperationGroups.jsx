import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Movements of one input, grouped by day, then by machine (fuel, lubricants)
// or by farm (every other input).
export default function OperationGroups({ operations, groupBy, unit }) {
  const { t } = useI18n();

  const byDate = new Map();
  operations.forEach((operation) => {
    const dateKey = operation.date || '';
    if (!byDate.has(dateKey)) byDate.set(dateKey, new Map());
    const groups = byDate.get(dateKey);
    const subKey = (groupBy === 'machine' ? operation.machine : operation.farm) || '';
    if (!groups.has(subKey)) groups.set(subKey, []);
    groups.get(subKey).push(operation);
  });

  const days = [...byDate.entries()].map(([date, groups]) => ({
    date,
    groups: [...groups.entries()]
      .map(([key, lines]) => ({
        key,
        label: key || (groupBy === 'machine' ? t('stock.noMachine') : t('stock.noFarm')),
        quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
        lines,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));

  return (
    <div className="space-y-3">
      {days.map((day) => (
        <section key={day.date || 'none'} className="overflow-hidden rounded-xl border border-border/70">
          <header className="bg-secondary/40 px-3.5 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {fmtDate(day.date)}
            </p>
          </header>
          <div className="divide-y divide-border/60">
            {day.groups.map((group) => (
              <div key={group.key || 'none'}>
                <div className="flex items-center gap-2 bg-muted/30 px-3.5 py-1.5">
                  <span className="truncate text-xs font-medium">{group.label}</span>
                  <span className="ms-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {fmtNum(group.quantity, 1)} {unit}
                  </span>
                </div>
                <ul className="divide-y divide-border/40">
                  {group.lines.map((line) => (
                    <li key={line.key} className="flex flex-wrap items-start gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{line.source}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {[line.place, line.notes].filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      <div className="text-end">
                        <p
                          className={cn(
                            'text-sm tabular-nums',
                            line.kind === 'out' ? 'text-clay' : 'text-primary',
                          )}
                        >
                          {line.kind === 'out' ? '−' : '+'}
                          {fmtNum(line.quantity, 1)} {unit}
                        </p>
                        {!!line.amount && (
                          <p className="text-[11px] tabular-nums text-muted-foreground">
                            {fmtMoney(line.amount)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}