import { useMemo } from 'react';
import { Wrench } from 'lucide-react';
import ConsumptionSection from '@/components/machinery/ConsumptionSection';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { isFuelItem, isLubricantItem, logTotalCost } from '@/lib/machineryCosts';
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

export default function MachineStatusDetail({ row, movements, logs, items, itemCost, onClose }) {
  const { t } = useI18n();
  const itemMap = useMemo(() => byId(items), [items]);

  // One line per date and per nature: gasoil on one side, lubricants on the other.
  const grouped = useMemo(() => {
    const build = (matches) => {
      if (!row) return [];
      const byDate = new Map();
      movements.forEach((movement) => {
        if (movement.machine_id !== row.id || movement.kind !== 'out') return;
        const quantity = Number(movement.quantity) || 0;
        const item = itemMap[movement.item_id];
        if (!(quantity > 0) || !item || !matches(item)) return;
        const entry = byDate.get(movement.date) || { key: movement.date, date: movement.date, names: new Set(), unit: '', quantity: 0, cost: 0 };
        entry.names.add(item.name || t('inv.unknownInput'));
        entry.unit = item.unit || entry.unit;
        entry.quantity += quantity;
        entry.cost += quantity * itemCost(movement.item_id);
        byDate.set(movement.date, entry);
      });
      return [...byDate.values()]
        .map((entry) => ({ ...entry, name: [...entry.names].join(' · ') }))
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    };

    return { fuel: build(isFuelItem), lubricants: build(isLubricantItem) };
  }, [row, movements, itemMap, itemCost, t]);

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

            <ConsumptionSection
              title={t('msd.fuel')}
              empty={t('msd.fuelEmpty')}
              lines={grouped.fuel}
            />

            <ConsumptionSection
              title={t('msd.lubricants')}
              empty={t('msd.lubricantsEmpty')}
              lines={grouped.lubricants}
              tone="sage"
            />

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