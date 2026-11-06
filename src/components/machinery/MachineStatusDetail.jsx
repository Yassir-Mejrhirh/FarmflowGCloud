import { useMemo } from 'react';
import { Fuel, Wrench } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { logTotalCost } from '@/lib/machineryCosts';
import { useI18n } from '@/lib/I18nContext';

function Tile({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2.5 py-2">
      <dt className="truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </h3>
  );
}

export default function MachineStatusDetail({ row, reports, logs, items, itemCost, onClose }) {
  const { t } = useI18n();
  const itemMap = useMemo(() => byId(items), [items]);

  const fuelLines = useMemo(() => {
    if (!row) return [];
    const lines = [];
    reports.forEach((report) => {
      (report.machinery || []).forEach((line) => {
        if (line.machine_id !== row.id) return;
        const quantity = Number(line.fuel_quantity) || 0;
        if (!line.fuel_item_id || quantity <= 0) return;
        const item = itemMap[line.fuel_item_id];
        lines.push({
          key: `${report.id}-${line.fuel_item_id}`,
          date: report.date,
          name: item?.name || t('inv.unknownInput'),
          unit: item?.unit || '',
          quantity,
          cost: quantity * itemCost(line.fuel_item_id),
        });
      });
    });
    return lines.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [row, reports, itemMap, itemCost, t]);

  const logRows = useMemo(
    () => (row ? logs.filter((log) => log.machine_id === row.id) : []),
    [row, logs],
  );

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] gap-5 overflow-y-auto sm:max-w-xl">
        {row && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl tracking-tight">{row.name}</DialogTitle>
              <DialogDescription className="text-xs">
                {[
                  `${fmtNum(row.hours, 1)} h`,
                  `${fmtNum(row.fuelTotal, 1)} ${t('ms.fuel').toLowerCase()}`,
                  row.chmp === null ? null : `${t('ms.chmp')} ${fmtMoney(row.chmp)}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Tile label={t('ms.fuelCost')} value={fmtMoney(row.fuelCost)} />
              <Tile label={t('ms.maintenanceCost')} value={fmtMoney(row.maintenanceCost)} />
              <Tile label={t('ms.totalCost')} value={fmtMoney(row.totalCost)} />
              <Tile label={t('ms.chmp')} value={row.chmp === null ? '—' : fmtMoney(row.chmp)} />
            </dl>

            <section className="space-y-2">
              <SectionTitle icon={Fuel}>{t('msd.fuel')}</SectionTitle>
              {fuelLines.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t('msd.fuelEmpty')}</p>
              ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                  {fuelLines.map((line) => (
                    <li key={line.key} className="flex flex-wrap items-start gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{line.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">{fmtDate(line.date)}</p>
                      </div>
                      <div className="text-end">
                        <p className="text-sm tabular-nums text-clay">
                          {fmtNum(line.quantity, 1)} {line.unit}
                        </p>
                        <p className="text-[11px] tabular-nums text-muted-foreground">{fmtMoney(line.cost)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <SectionTitle icon={Wrench}>{t('msd.logs')}</SectionTitle>
              {logRows.length === 0 ? (
                <EmptyState icon={Wrench} title={t('msd.logsEmpty')} />
              ) : (
                <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                  {logRows.map((log) => (
                    <li key={log.id} className="px-3.5 py-2.5">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">
                            {t(`mk.${log.kind || 'service'}`)} · {fmtDate(log.date)}
                          </p>
                          {(log.description || !!log.hours_reading) && (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {[
                                log.description,
                                log.hours_reading ? `${t('msd.hoursReading')} : ${fmtNum(log.hours_reading, 1)} h` : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                        </div>
                        <p className="text-sm tabular-nums">{fmtMoney(logTotalCost(log))}</p>
                      </div>
                      {log.parts?.length > 0 && (
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t('msd.parts')} :{' '}
                          {log.parts
                            .map((part) => {
                              const item = itemMap[part.item_id];
                              return `${item?.name || t('inv.unknownInput')} ${fmtNum(part.quantity, 1)} ${part.unit || item?.unit || ''}`;
                            })
                            .join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}