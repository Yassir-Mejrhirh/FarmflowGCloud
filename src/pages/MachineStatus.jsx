import { useEffect, useMemo, useState } from 'react';
import { Fuel, Timer, Tractor } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList, byId } from '@/lib/data';
import { currentMonthKey, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const monthStart = () => `${currentMonthKey()}-01`;

export default function MachineStatus() {
  const { t } = useI18n();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [machineRows, itemRows] = await Promise.all([
        fetchList(base44.entities.Machine, {}, { sort: 'name' }),
        fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      ]);
      if (!active) return;
      setMachines(machineRows);
      setItems(itemRows);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const query = { date: {} };
      if (from) query.date.$gte = from;
      if (to) query.date.$lte = to;
      const reportRows = await fetchList(base44.entities.DailyReport, query);
      if (!active) return;
      setReports(reportRows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

  const machineMap = useMemo(() => byId(machines), [machines]);
  const itemMap = useMemo(() => byId(items), [items]);

  const rows = useMemo(() => {
    const acc = new Map();

    reports.forEach((report) => {
      (report.machinery || []).forEach((line) => {
        const hours = Number(line.hours) || 0;
        const fuel = Number(line.fuel_quantity) || 0;
        if (!line.machine_id || (hours <= 0 && fuel <= 0)) return;

        const entry = acc.get(line.machine_id) || { id: line.machine_id, hours: 0, fuel: {} };
        entry.hours += hours;
        if (line.fuel_item_id && fuel > 0) entry.fuel[line.fuel_item_id] = (entry.fuel[line.fuel_item_id] || 0) + fuel;
        acc.set(line.machine_id, entry);
      });
    });

    return [...acc.values()]
      .map((entry) => {
        const machine = machineMap[entry.id];
        const fuels = Object.entries(entry.fuel).map(([itemId, quantity]) => {
          const item = itemMap[itemId];
          return { key: itemId, name: item?.name || t('inv.unknownInput'), unit: item?.unit || '', quantity };
        });
        return {
          ...entry,
          name: machine?.name || t('ms.unknown'),
          fuels,
          fuelTotal: fuels.reduce((sum, line) => sum + line.quantity, 0),
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [reports, machineMap, itemMap, t]);

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalFuel = rows.reduce((sum, row) => sum + row.fuelTotal, 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t('ms.eyebrow')} title={t('ms.title')} description={t('ms.description')} />

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

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Tractor} label={t('ms.machines')} value={rows.length} tone="moss" />
        <StatCard icon={Timer} label={t('ms.hours')} value={fmtNum(totalHours, 1)} tone="sand" />
        <StatCard icon={Fuel} label={t('ms.fuel')} value={fmtNum(totalFuel, 1)} tone="clay" />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Tractor} title={t('ms.emptyTitle')} description={t('ms.emptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          <li className="hidden bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex sm:gap-3">
            <span className="flex-1">{t('common.machine')}</span>
            <span className="w-24 text-end">{t('ms.hours')}</span>
            <span className="w-40 text-end">{t('ms.fuel')}</span>
          </li>
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                {row.fuels.length > 0 && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {row.fuels.map((line) => `${line.name} · ${fmtNum(line.quantity, 1)} ${line.unit}`).join(' · ')}
                  </p>
                )}
              </div>
              <span className="w-24 text-end text-sm tabular-nums">
                {fmtNum(row.hours, 1)} <span className="text-xs text-muted-foreground">h</span>
              </span>
              <span className="w-40 text-end text-sm tabular-nums">
                {row.fuelTotal ? fmtNum(row.fuelTotal, 1) : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}