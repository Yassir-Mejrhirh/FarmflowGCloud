import { useEffect, useMemo, useState } from 'react';
import { Fuel, Gauge, Timer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import MachineTrackingTable from '@/components/machinery/tracking/MachineTrackingTable';
import { fetchList } from '@/lib/data';
import { buildMachineReport, trackingStart } from '@/lib/machineTracking';
import { currentMonthKey, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import ExportMenu from '@/components/ExportMenu';
import { exportExcel, exportPdf } from '@/lib/reportExport';

const monthStart = () => `${currentMonthKey()}-01`;

export default function MachineTracking() {
  const { t } = useI18n();
  const [machineId, setMachineId] = useState('');
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    machines: [],
    logs: [],
    reports: [],
    movements: [],
    items: [],
    tasks: [],
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const [machines, items, tasks, logs] = await Promise.all([
        fetchList(base44.entities.Machine, {}, { sort: 'name' }),
        fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
        fetchList(base44.entities.Task, {}, { sort: 'title' }),
        fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
      ]);

      // The counter of a day needs the hours run after it, up to the current
      // reading, and the hours since the previous oil change.
      const start = trackingStart(from, logs);
      const query = start ? { date: { $gte: start } } : {};

      const [reports, movements] = await Promise.all([
        fetchList(base44.entities.DailyReport, query),
        fetchList(base44.entities.StockMovement, query),
      ]);

      if (!active) return;
      setData({ machines, items, tasks, logs, reports, movements });
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from]);

  const selected = data.machines.find((machine) => machine.id === machineId) || data.machines[0] || null;

  const report = useMemo(
    () =>
      buildMachineReport({
        machine: selected,
        logs: data.logs,
        reports: data.reports,
        movements: data.movements,
        items: data.items,
        tasks: data.tasks,
        from,
        to,
      }),
    [selected, data, from, to],
  );

  const options = data.machines.map((machine) => ({ value: machine.id, label: machine.name }));

  const exportBase = `${t('mtr.title')} ${selected?.name || ''}`.trim();
  const exportColumns = [
    { key: 'date', label: t('mtr.date'), width: 14 },
    { key: 'counter', label: t('mtr.counterHour'), digits: 0, align: 'end', width: 14 },
    { key: 'hours', label: t('mtr.hours'), digits: 1, align: 'end', width: 12 },
    { key: 'works', label: t('mtr.works'), width: 26 },
    { key: 'vidange', label: t('mtr.vidangeCol'), width: 16 },
    { key: 'maintenance', label: t('mtr.maintenanceCol'), width: 22 },
    { key: 'fuel', label: t('mtr.fuelCol'), digits: 1, align: 'end', width: 14 },
    { key: 'consumption', label: t('mtr.consumption'), digits: 2, align: 'end', width: 14 },
  ];
  const exportRows = report.rows.map((row) => ({
    date: row.date,
    counter: Number(row.counter) || 0,
    hours: row.hours,
    works: row.works.map((work) => work.label || t(`tt.${work.type}`)).filter(Boolean).join(', '),
    vidange: row.vidange
      .map((entry) => (entry.reading > 0 ? `${t('mtr.reading')} ${fmtNum(entry.reading, 0)} h` : `${fmtNum(entry.since, 0)} h`))
      .join(', '),
    maintenance: row.maintenance.map((log) => `${t(`mk.${log.kind}`)}${log.description ? ` — ${log.description}` : ''}`).join(', '),
    fuel: row.fuel,
    consumption: row.consumption ?? '',
  }));
  const exportSubtitle = [
    selected?.name || '',
    t('exp.period', { from: from || '—', to: to || '—' }),
  ].filter(Boolean).join(' · ');
  const runExcel = () => exportExcel({ base: exportBase, columns: exportColumns, rows: exportRows });
  const runPdf = () =>
    exportPdf({ base: exportBase, title: exportBase, subtitle: exportSubtitle, columns: exportColumns, rows: exportRows });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('mtr.eyebrow')}
        title={t('mtr.title')}
        description={t('mtr.description')}
        action={<ExportMenu hasData={exportRows.length > 0} disabled={loading} onExcel={runExcel} onPdf={runPdf} />}
      />

      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('mtr.machine')} className="sm:col-span-2 lg:col-span-1">
            <SelectField
              value={selected?.id || ''}
              onChange={setMachineId}
              options={options}
              placeholder={t('mtr.choose')}
              className="rounded-xl"
            />
          </Field>
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

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : !selected ? (
        <EmptyState icon={Gauge} title={t('mtr.emptyTitle')} description={t('mtr.emptyDesc')} />
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={Timer}
              label={t('mtr.hours')}
              value={`${fmtNum(report.totals.hours, 1)} h`}
              tone="sand"
            />
            <StatCard
              icon={Fuel}
              label={t('mtr.fuelCol')}
              value={`${fmtNum(report.totals.fuel, 1)}${report.totals.fuelUnit ? ` ${report.totals.fuelUnit}` : ''}`}
              tone="clay"
            />
            <StatCard
              icon={Gauge}
              label={t('mtr.avgConsumption')}
              value={
                report.totals.consumption === null
                  ? '—'
                  : `${fmtNum(report.totals.consumption, 2)}${
                      report.totals.fuelUnit ? ` ${report.totals.fuelUnit}/h` : ''
                    }`
              }
              tone="moss"
            />
          </section>

          <MachineTrackingTable rows={report.rows} totals={report.totals} />
        </>
      )}
    </div>
  );
}