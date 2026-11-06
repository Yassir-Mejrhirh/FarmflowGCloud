import { useEffect, useMemo, useState } from 'react';
import { Coins, Fuel, Timer, Tractor, Wrench } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList, byId } from '@/lib/data';
import { buildMachineCosts } from '@/lib/machineryCosts';
import { currentMonthKey, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const monthStart = () => `${currentMonthKey()}-01`;

function Metric({ label, value }) {
  return (
    <div className="rounded-xl bg-secondary/50 px-2.5 py-2">
      <dt className="truncate text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm tabular-nums">{value}</dd>
    </div>
  );
}

export default function MachineStatus() {
  const { t } = useI18n();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [counts, setCounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  // Catalogue and purchase history, needed to value gasoil and withdrawals.
  useEffect(() => {
    let active = true;
    const load = async () => {
      const [machineRows, itemRows, invoiceRows, countRows] = await Promise.all([
        fetchList(base44.entities.Machine, {}, { sort: 'name' }),
        fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
        fetchList(base44.entities.InputInvoice, {}),
        fetchList(base44.entities.InventoryCount, {}),
      ]);
      if (!active) return;
      setMachines(machineRows);
      setItems(itemRows);
      setInvoices(invoiceRows);
      setCounts(countRows);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // Hours, gasoil and maintenance operations of the selected period.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const range = {};
      if (from) range.$gte = from;
      if (to) range.$lte = to;
      const [reportRows, logRows] = await Promise.all([
        fetchList(base44.entities.DailyReport, { date: range }),
        fetchList(base44.entities.MaintenanceLog, { date: { ...range } }, { sort: '-date' }),
      ]);
      if (!active) return;
      setReports(reportRows);
      setLogs(logRows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

  const machineMap = useMemo(() => byId(machines), [machines]);
  const itemMap = useMemo(() => byId(items), [items]);

  const machineCosts = useMemo(
    () => buildMachineCosts({ machines, logs, reports, items, invoices, counts }),
    [machines, logs, reports, items, invoices, counts],
  );

  const rows = useMemo(() => {
    const quantities = new Map();

    reports.forEach((report) => {
      (report.machinery || []).forEach((line) => {
        const hours = Number(line.hours) || 0;
        const fuel = Number(line.fuel_quantity) || 0;
        if (!line.machine_id) return;
        const entry = quantities.get(line.machine_id) || { hours: 0, fuel: {} };
        entry.hours += hours;
        if (line.fuel_item_id && fuel > 0) {
          entry.fuel[line.fuel_item_id] = (entry.fuel[line.fuel_item_id] || 0) + fuel;
        }
        quantities.set(line.machine_id, entry);
      });
    });

    return Object.entries(machineCosts)
      .map(([id, costs]) => {
        const counted = quantities.get(id) || { hours: 0, fuel: {} };
        const machine = machineMap[id];
        const fuels = Object.entries(counted.fuel).map(([itemId, quantity]) => {
          const item = itemMap[itemId];
          return { key: itemId, name: item?.name || t('inv.unknownInput'), unit: item?.unit || '', quantity };
        });
        return {
          id,
          name: machine?.name || t('ms.unknown'),
          hours: costs.hours || counted.hours,
          fuels,
          fuelTotal: fuels.reduce((sum, line) => sum + line.quantity, 0),
          fuelCost: costs.fuel,
          maintenanceCost: costs.maintenance,
          totalCost: costs.total,
          chmp: costs.hourly,
        };
      })
      .filter((row) => row.hours > 0 || row.fuelTotal > 0 || row.maintenanceCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost || b.hours - a.hours);
  }, [reports, machineCosts, machineMap, itemMap, t]);

  const totalHours = rows.reduce((sum, row) => sum + row.hours, 0);
  const totalFuel = rows.reduce((sum, row) => sum + row.fuelTotal, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.totalCost, 0);
  const averageChmp = totalHours > 0 ? totalCost / totalHours : null;

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
        <StatCard icon={Coins} label={t('ms.totalCost')} value={fmtMoney(totalCost)} tone="clay" />
        <StatCard
          icon={Wrench}
          label={t('ms.avgChmp')}
          value={averageChmp === null ? '—' : fmtMoney(averageChmp)}
          hint={t('ms.chmpHint')}
          tone="moss"
        />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Tractor} title={t('ms.emptyTitle')} description={t('ms.emptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((row) => (
            <li key={row.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  {row.fuels.length > 0 && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {row.fuels
                        .map((line) => `${line.name} · ${fmtNum(line.quantity, 1)} ${line.unit}`)
                        .join(' · ')}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{t('ms.chmp')}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {row.chmp === null ? '—' : fmtMoney(row.chmp)}
                  </p>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label={t('ms.hoursShort')} value={`${fmtNum(row.hours, 1)} h`} />
                <Metric label={t('ms.fuel')} value={`${fmtNum(row.fuelTotal, 1)}`} />
                <Metric label={t('ms.fuelCost')} value={fmtMoney(row.fuelCost)} />
                <Metric label={t('ms.maintenanceCost')} value={fmtMoney(row.maintenanceCost)} />
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}