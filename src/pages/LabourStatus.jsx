import { useEffect, useMemo, useState } from 'react';
import { Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import FarmFilter from '@/components/labour/FarmFilter';
import LabourDailyDetail from '@/components/labour/LabourDailyDetail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/data';
import { currentMonthKey, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { buildRateIndex, labourRate } from '@/lib/wageRates';

const monthStart = () => `${currentMonthKey()}-01`;

export default function LabourStatus() {
  const { t } = useI18n();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayISO());
  const [blocks, setBlocks] = useState([]);
  const [farmNames, setFarmNames] = useState([]);
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const load = async () => {
      setLoading(true);
      const query = {};
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      const [workerRows, reportRows, rateRows] = await Promise.all([
        fetchList(base44.entities.Worker, {}, { sort: 'name' }),
        fetchList(base44.entities.DailyReport, query),
        fetchList(base44.entities.WageRate, {}),
      ]);
      if (!active) return;
      setWorkers(workerRows);
      setReports(reportRows);
      setWageRates(rateRows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [from, to]);

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
      };
    })
    .sort((a, b) => b.days - a.days);

  const totalDays = rows.reduce((sum, row) => sum + row.days, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

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
        entries: [...group.entries.values()]
          .map((entry) => ({
            ...entry,
            place: [...entry.places].join(', '),
            block: [...entry.blocks].join(', '),
          }))
          .sort((a, b) => a.worker.localeCompare(b.worker)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReports, blockMap, workerMap, rateIndex, t]);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={t('lab.eyebrow')} title={t('lab.title')} description={t('lab.description')} />

      <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label={t('lab.from')}>
            <Input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('lab.to')}>
            <Input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={t('lab.farms')}>
            <FarmFilter options={farmNames} selected={selectedFarms} onChange={setSelectedFarms} />
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
        <StatCard icon={Users} label={t('lab.workers')} value={rows.length} tone="moss" />
        <StatCard label={t('lab.days')} value={fmtNum(totalDays, 1)} tone="sand" />
        <StatCard label={t('lab.cost')} value={fmtMoney(totalCost)} tone="clay" />
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
            </li>
          ))}
        </ul>
      )}

      <LabourDailyDetail groups={dayGroups} loading={loading} />
    </div>
  );
}