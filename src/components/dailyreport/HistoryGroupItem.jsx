import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import StatusPill from '@/components/StatusPill';
import { fmtDayDate, fmtNum } from '@/lib/format';
import { natureLabel } from '@/lib/taskNature';

// One validated report: a compact summary that opens its parcel records on click.
export default function HistoryGroupItem({ group, open, onToggle, blockMap, machineMap, natures, t, onEdit, onDelete }) {
  return (
    <li
      className={cn(
        'overflow-hidden rounded-xl border transition-colors',
        open ? 'border-primary/40' : 'border-border/60',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 px-3 py-2.5 text-start"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium tabular-nums">{fmtDayDate(group.date)}</span>
            <span className="text-[11px] text-muted-foreground">{group.farm || '—'}</span>
            {group.tasks.slice(0, 3).map((label) => (
              <StatusPill key={label} tone="moss">
                {label}
              </StatusPill>
            ))}
            {group.tasks.length > 3 && (
              <span className="text-[11px] text-muted-foreground">+{group.tasks.length - 3}</span>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{t('report.blockCount', { n: group.blockCount })}</span>
            <span>{t('report.blockArea', { area: fmtNum(group.area) })}</span>
            <span>{t('report.labourCount', { n: group.labourCount })}</span>
            <span>{t('report.machineCount', { n: group.machineryCount })}</span>
            <span>{t('report.inputCount', { n: group.inputCount })}</span>
          </span>
        </span>
        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul className="divide-y divide-border/60 border-t border-border/70">
          {group.reports.map((report) => {
            const block = blockMap[report.block_id];
            const pump = Number(report.pump_hours) || 0;
            const water = Number(report.water_m3) || 0;
            return (
              <li key={report.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {block?.name || '—'}
                      {block?.area_ha ? (
                        <span className="ms-1.5 text-[11px] font-normal text-muted-foreground">
                          {t('report.blockArea', { area: fmtNum(block.area_ha) })}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                      {report.description || '—'}
                    </p>
                  </div>
                  <StatusPill tone="moss">{natureLabel(report.operation, natures, t)}</StatusPill>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{t('report.labourCount', { n: report.labour?.length || 0 })}</span>
                  <span>{t('report.machineCount', { n: report.machinery?.length || 0 })}</span>
                  <span>{t('report.inputCount', { n: report.inputs?.length || 0 })}</span>
                  {(pump > 0 || water > 0) && (
                    <span>
                      {machineMap[report.pump_station_id]?.name || t('report.pumpStation')} · {pump} H · {water} m³
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onEdit(report)}
                    className="ms-auto inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" /> {t('common.edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(report)}
                    className="inline-flex items-center gap-1 text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3" /> {t('common.delete')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}