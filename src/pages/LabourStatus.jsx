import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Truck, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import FarmFilter from '@/components/labour/FarmFilter';
import LabourDailyDetail from '@/components/labour/LabourDailyDetail';
import TransportersList from '@/components/labour/TransportersList';
import MonthCalendar from '@/components/labour/MonthCalendar';
import DayField from '@/components/labour/DayField';
import Segmented from '@/components/Segmented';
import SelectField from '@/components/SelectField';
import { fetchList } from '@/lib/data';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { buildRateIndex, labourRate } from '@/lib/wageRates';
import { buildTransportCosts } from '@/lib/transportRates';
import ExportMenu from '@/components/ExportMenu';
import { exportExcel, exportPdf } from '@/lib/reportExport';

export default function LabourStatus() {
  const { t } = useI18n();
  const [mode, setMode] = useState('month');
  const [month, setMonth] = useState('');
  const [half, setHalf] = useState('');
  const [freeFrom, setFreeFrom] = useState('');
  const [freeTo, setFreeTo] = useState('');
  const [blocks, setBlocks] = useState([]);
  const [farmNames, setFarmNames] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const halfOptions = [
    { value: 'first', label: t('lab.halfFirst') },
    { value: 'second', label: t('lab.halfSecond') },
  ];

  // Month mode: 1–15 or 16 to the end of the month. Free mode: the two chosen days, in order.
  const period = useMemo(() => {
    if (mode === 'free') {
      if (!freeFrom || !freeTo) return null;
      return freeFrom <= freeTo ? { from: freeFrom, to: freeTo } : { from: freeTo, to: freeFrom };
    }
    if (!month || !half) return null;
    const [year, monthNumber] = month.split('-').map(Number);
    const lastDay = new Date(year, monthNumber, 0).getDate();
    return half === 'first'
      ? { from: `${month}-01`, to: `${month}-15` }
      : { from: `${month}-16`, to: `${month}-${String(lastDay).padStart(2, '0')}` };
  }, [mode, month, half, freeFrom, freeTo]);

  const from = period?.from || '';
  const to = period?.to || '';

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [blockRows, farmRows] = await Promise.all([
        fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
        fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      ]);
      if (!active) return;
      setBlocks(blockRows);
      const names = new Set();
      farmRows.forEach((farm) => farm.name && names.add(farm.name));
      blockRows.forEach((block) => block.farm && names.add(block.farm));
      setFarmNames([...names].sort((a, b) => a.localeCompare(b)));
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    // Before a period is chosen, nothing is loaded and nothing is shown.
    if (!period) {
      setReports([]);
      setLoading(false);
      return () => {
        active = false;
      };
    }
    const load = async () => {
      setLoading(true);
      const query = { date: { $gte: period.from, $lte: period.to } };
      const [workerRows, reportRows, rateRows, transportRows] = await Promise.all([
        fetchList(base44.entities.Worker, {}, { sort: 'name' }),
        fetchList(base44.entities.DailyReport, query),
        fetchList(base44.entities.WageRate, {}),
        fetchList(base44.entities.TransportRate, {}),
      ]);
      if (!active) return;
      setWorkers(workerRows);
      setReports(reportRows);
      setWageRates(rateRows);
      setTransportRates(transportRows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [period]);

  const blockMap = useMemo(() => new Map(blocks.map((block) => [block.id, block])), [blocks]);
  const workerMap = useMemo(() => new Map(workers.map((worker) => [worker.id, worker])), [workers]);
  const rateIndex = useMemo(() => buildRateIndex(wageRates), [wageRates]);

  const filteredReports = useMemo(() => {
    if (!selectedFarms.length || !blocks.length) return reports;
    return reports.filter((report) => {
      const farm = blockMap.get(report.block_id)?.farm;
      return farm ? selectedFarms.includes(farm) : false;
    });
  }, [reports, selectedFarms, blocks.length, blockMap]);

  // Transport is valued apart from the wage: a per-person amount for each day worked,
  // or a fixed amount counted once for the transporter and the team of the day.
  const transport = useMemo(
    () => buildTransportCosts({ reports: filteredReports, workers, rates: transportRates }),
    [filteredReports, workers, transportRates],
  );

  const rowsByWorker = {};
  filteredReports.forEach((report) => {
    (report.labour || []).forEach((line) => {
      const days = Number(line.days) || 0;
      if (!line.worker_id || days <= 0) return;
      const worker = workerMap.get(line.worker_id);
      const current = rowsByWorker[line.worker_id] || { days: 0, cost: 0 };
      rowsByWorker[line.worker_id] = {
        days: current.days + days,
        cost: current.cost + days * labourRate(line, worker, rateIndex, report.date),
      };
    });
  });

  const rows = Object.entries(rowsByWorker)
    .map(([workerId, { days, cost }]) => {
      const worker = workerMap.get(workerId);
      return {
        id: workerId,
        name: worker?.name || t('workers.unknown'),
        job: worker?.worker_function || '',
        rate: days ? cost / days : 0,
        days,
        cost,
        transport: transport.byWorker.get(workerId) || 0,
      };
    })
    .sort((a, b) => b.days - a.days);

  const totalDays = rows.reduce((sum, row) => sum + row.days, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
  const totalTransport = transport.total;

  // Export of the whole period, not only the rows visible on screen.
  const exportBase = t('lab.title');
  const exportColumns = [
    { key: 'name', label: t('common.worker'), width: 30 },
    { key: 'job', label: t('exp.function'), width: 22 },
    { key: 'days', label: t('lab.days'), digits: 1, align: 'end', width: 14 },
    { key: 'rate', label: t('lab.rate'), money: true, align: 'end', width: 18 },
    { key: 'cost', label: t('lab.cost'), money: true, align: 'end', width: 18 },
    { key: 'transport', label: t('lab.transportCost'), money: true, align: 'end', width: 18 },
  ];
  const exportSubtitle = [
    t('exp.period', { from: from || '—', to: to || '—' }),
    selectedFarms.length ? selectedFarms.join(', ') : t('lab.allFarms'),
  ].join(' · ');
  const runExcel = () => exportExcel({ base: exportBase, columns: exportColumns, rows });
  const runPdf = () =>
    exportPdf({ base: exportBase, title: exportBase, subtitle: exportSubtitle, columns: exportColumns, rows });

  const dayGroups = useMemo(() => {
    const byDate = new Map();
    filteredReports.forEach((report) => {
      const block = blockMap.get(report.block_id);
      (report.labour || []).forEach((line) => {
        const days = Number(line.days) || 0;
        if (!line.worker_id || days <= 0) return;
        const worker = workerMap.get(line.worker_id);
        if (!byDate.has(report.date)) {
          byDate.set(report.date, { date: report.date, entries: new Map(), days: 0, cost: 0 });
        }
        const group = byDate.get(report.date);
        const entry = group.entries.get(line.worker_id) || {
          key: line.worker_id,
          worker: worker?.name || t('workers.unknown'),
          days: 0,
          places: new Set(),
          blocks: new Set(),
        };
        entry.days += days;
        if (block?.farm) entry.places.add(block.farm);
        if (block?.name) entry.blocks.add(block.name);
        group.entries.set(line.worker_id, entry);
        group.days += days;
        group.cost += days * labourRate(line, worker, rateIndex, report.date);
      });
    });

    return [...byDate.values()]
      .map((group) => ({
        ...group,
        transport: transport.byDate.get(group.date) || 0,
        entries: [...group.entries.values()]
          .map((entry) => ({
            ...entry,
            place: [...entry.places].join(', '),
            block: [...entry.blocks].join(', '),
            transport: transport.byDateWorker.get(`${group.date}|${entry.key}`) || 0,
          }))
          .sort((a, b) => a.worker.localeCompare(b.worker)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReports, blockMap, workerMap, rateIndex, transport, t]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('lab.eyebrow')}
        title={t('lab.title')}
        description={t('lab.description')}
        action={
          <ExportMenu
            hasData={rows.length > 0}
            disabled={loading || !period}
            onExcel={runExcel}
            onPdf={runPdf}
          />
        }
      />

      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{t('lab.mode')}</span>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'month', label: t('lab.modeMonth') },
              { value: 'free', label: t('lab.modeFree') },
            ]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {mode === 'month' ? (
            <>
              <Field label={t('lab.month')}>
                <MonthCalendar value={month} onChange={setMonth} />
              </Field>
              <Field label={t('lab.half')}>
                <SelectField value={half} onChange={setHalf} options={halfOptions} disabled={!month} />
              </Field>
            </>
          ) : (
            <>
              <Field label={t('lab.from')}>
                <DayField value={freeFrom} onChange={setFreeFrom} />
              </Field>
              <Field label={t('lab.to')}>
                <DayField value={freeTo} onChange={setFreeTo} />
              </Field>
            </>
          )}
          <Field label={t('lab.farms')}>
            <FarmFilter options={farmNames} selected={selectedFarms} onChange={setSelectedFarms} />
          </Field>
          <div className="flex items-end">
            <p className="w-full rounded-xl border border-dashed border-border/70 px-3 py-2 text-center text-xs tabular-nums text-muted-foreground">
              {period ? `${from} → ${to}` : '—'}
            </p>
          </div>
        </div>
      </section>

      {!period ? (
        <EmptyState
          icon={CalendarDays}
          title={t('lab.periodRequiredTitle')}
          description={t('lab.periodRequiredDesc')}
        />
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label={t('lab.workers')} value={rows.length} tone="moss" />
        <StatCard label={t('lab.days')} value={fmtNum(totalDays, 1)} tone="sand" />
        <StatCard label={t('lab.cost')} value={fmtMoney(totalCost)} tone="clay" />
        <StatCard icon={Truck} label={t('lab.transportCost')} value={fmtMoney(totalTransport)} tone="sand" />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={t('lab.emptyTitle')} description={t('lab.emptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          <li className="hidden bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex sm:gap-3">
            <span className="flex-1">{t('common.worker')}</span>
            <span className="w-20 text-end">{t('lab.days')}</span>
            <span className="w-28 text-end">{t('lab.rate')}</span>
            <span className="w-32 text-end">{t('lab.cost')}</span>
            <span className="w-24 text-end">{t('lab.transport')}</span>
          </li>
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                {row.job && <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.job}</p>}
              </div>
              <span className="w-20 text-end text-sm tabular-nums">
                {fmtNum(row.days, 1)} <span className="text-xs text-muted-foreground">{t('lab.daysShort')}</span>
              </span>
              <span className="hidden w-28 text-end text-xs tabular-nums text-muted-foreground sm:block">
                {row.rate ? fmtMoney(row.rate) : t('workers.noRate')}
              </span>
              <span className="w-32 text-end text-sm tabular-nums">{fmtMoney(row.cost)}</span>
              <span className="w-24 text-end text-sm tabular-nums text-muted-foreground">
                {row.transport ? fmtMoney(row.transport) : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <TransportersList rows={transport.transporters} total={totalTransport} loading={loading} />

      <LabourDailyDetail groups={dayGroups} loading={loading} />
        </>
      )}
    </div>
  );
}