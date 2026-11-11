import { useEffect, useMemo, useState } from 'react';
import { Coins, Fuel, Timer, Tractor } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MachineTrackingCard from '@/components/machinery/tracking/MachineTrackingCard';
import { fetchList } from '@/lib/data';
import { buildMachineTracking, trackingStart } from '@/lib/machineTracking';
import { currentMonthKey, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const monthStart = () => `${currentMonthKey()}-01`;

export default function MachineTracking() {
  const { t } = useI18n();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [data, setData] = useState({
    machines: [],
    logs: [],
    reports: [],
    movements: [],
    items: [],
    invoices: [],
    counts: [],
    tasks: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [machines, items, invoices, counts, tasks, logs] = await Promise.all([
        fetchList(base44.entities.Machine, {}, { sort: 'name' }),
        fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
        fetchList(base44.entities.InputInvoice, {}),
        fetchList(base44.entities.InventoryCount, {}),
        fetchList(base44.entities.Task, {}, { sort: 'title' }),
        fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
      ]);

      // The hours run since the previous oil change can start before the period.
      const start = trackingStart(from, logs);
      const dateRange = {};
      if (start) dateRange.$gte = start;
      if (to) dateRange.$lte = to;

      const [reports, movements] = await Promise.all([
        fetchList(base44.entities.DailyReport, { date: { ...dateRange } }),
        fetchList(base44.entities.StockMovement, { date: { ...dateRange } }),
      ]);

      if (!active) return;
      setData({ machines, items, invoices, counts, tasks, logs, reports, movements });
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

  const rows = useMemo(() => buildMachineTracking({ ...data, from, to }), [data, from, to]);

  const activeRows = rows.filter((row) => row.active);
  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalFuel = rows.reduce((sum, row) => sum + row.fuelQuantity, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const averageChmp = totalHours > 0 ? totalCost / totalHours : null;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t('mtr.eyebrow')} title={t('mtr.title')} description={t('mtr.description')} />

      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label={t('lab.from')}>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('lab.to')}>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onClick={() => {
                setFrom(monthStart());
                setTo(todayISO());
              }}
            >
              {t('lab.thisMonth')}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Tractor} label={t('mtr.machines')} value={activeRows.length} tone="moss" />
        <StatCard icon={Timer} label={t('mtr.hours')} value={`${fmtNum(totalHours, 1)} h`} tone="sand" />
        <StatCard icon={Fuel} label={t('mtr.fuel')} value={fmtNum(totalFuel, 1)} tone="clay" />
        <StatCard
          icon={Coins}
          label={t('mtr.avgChmp')}
          value={averageChmp === null ? '—' : fmtMoney(averageChmp)}
          hint={t('mtr.chmpHint')}
          tone="moss"
        />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Tractor} title={t('mtr.emptyTitle')} description={t('mtr.emptyDesc')} />
      ) : (
        <>
          <p className="px-1 text-[11px] text-muted-foreground">{t('mtr.hint')}</p>
          <div className="space-y-3">
            {rows.map((row) => (
              <MachineTrackingCard key={row.id} row={row} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}