import { useState } from 'react';
import { Check, ChevronDown, Plus, Trash2, Users } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

// Labour is picked from collapsible team sections: the workers fixed to the chosen
// farm come first, then the rest grouped by team.
export default function LabourField({
  title, placeholder, lines, onChange, groups, workerMap, qtyLabel, emptyLabel, renderMeta, suggested,
}) {
  const { t } = useI18n();
  // A section opens on demand; the first one (the farm's own workers) opens by default.
  const [opened, setOpened] = useState({});

  const picked = (workerId) => lines.some((line) => line.worker_id === workerId);
  const addWorker = (workerId) => {
    if (picked(workerId)) return;
    // A worker pointed that day arrives with the days already written on the pointage.
    const pointed = suggested instanceof Map ? Number(suggested.get(workerId)) || 0 : 0;
    onChange([...lines, { worker_id: workerId, days: pointed > 0 ? String(pointed) : '1' }]);
  };
  const update = (index, patch) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <Users className="h-3.5 w-3.5" strokeWidth={1.8} /> {title}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className={cn('truncate text-left', !lines.length && 'text-muted-foreground')}>
              {lines.length ? t('report.usageSelected', { n: lines.length }) : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[22rem] space-y-3 p-3">
          {lines.length === 0 ? (
            <p className="text-xs text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul className="space-y-2">
              {lines.map((line, index) => (
                <li key={`${line.worker_id}-${index}`} className="flex items-start gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {workerMap[line.worker_id]?.name || '—'}
                    </p>
                    {renderMeta && renderMeta(line)}
                  </div>
                  <Input
                    type="number"
                    step="0.5"
                    className="w-16 shrink-0"
                    value={line.days}
                    onChange={(event) => update(index, { days: event.target.value })}
                    placeholder={qtyLabel}
                    aria-label={qtyLabel}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label={t('report.removeLine')}
                    className="mt-1 shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-1.5 border-t border-border/60 pt-2">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t('report.labourPick')}
            </p>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('report.labourNone')}</p>
            ) : (
              <div className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
                {groups.map((group, index) => {
                  const isOpen = opened[group.key] ?? index === 0;
                  return (
                    <div key={group.key} className="rounded-lg border border-border/60">
                      <button
                        type="button"
                        onClick={() => setOpened((prev) => ({ ...prev, [group.key]: !isOpen }))}
                        className="flex w-full items-center gap-2 px-2.5 py-2 text-start"
                      >
                        <ChevronDown
                          className={cn('h-3.5 w-3.5 shrink-0 opacity-60 transition-transform', !isOpen && '-rotate-90')}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{group.label}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{group.workers.length}</span>
                      </button>
                      {isOpen && (
                        <div className="grid gap-1.5 border-t border-border/60 p-2 sm:grid-cols-2">
                          {group.workers.map((worker) => {
                            const isPicked = picked(worker.id);
                            return (
                              <button
                                key={worker.id}
                                type="button"
                                disabled={isPicked}
                                onClick={() => addWorker(worker.id)}
                                className={cn(
                                  'flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-start text-[13px] transition-colors',
                                  isPicked
                                    ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                                    : 'border-border/70 hover:bg-accent/50',
                                )}
                              >
                                {isPicked ? (
                                  <Check className="h-3 w-3 shrink-0" />
                                ) : (
                                  <Plus className="h-3 w-3 shrink-0 opacity-60" />
                                )}
                                <span className="truncate">{worker.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[10px] leading-snug text-muted-foreground">{t('report.labourHidden')}</p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}