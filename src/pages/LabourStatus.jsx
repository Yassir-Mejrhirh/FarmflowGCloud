import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { fetchList } from '@/lib/data';
import { currentMonthKey, fmtMoney, fmtNum, monthLabel, monthRange } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const shiftMonth = (month, delta) => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function LabourStatus() {
  const { t } = useI18n();
  const [month, setMonth] = useState(currentMonthKey());
  const [workers, setWorkers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const { start, end } = monthRange(month);
      const [workerRows, reportRows] = await Promise.all([
        fetchList(base44.entities.Worker, {}, { sort: 'name' }),
        fetchList(base44.entities.DailyReport, { date: { $gte: start, $lt: end } }),
      ]);
      if (!active) return;
      setWorkers(workerRows);
      setReports(reportRows);
      setLoading(false);
    };
    load();
    return () => {
      active = false;
    };
  }, [month]);

  const workerMap = new Map(workers.map((worker) => [worker.id, worker]));
  const rowsByWorker = {};
  reports.forEach((report) => {
    (report.labour || []).forEach((line) => {
      if (!line.worker_id) return;
      rowsByWorker[line.worker_id] = (rowsByWorker[line.worker_id] || 0) + (Number(line.days) || 0);
    });
  });

  const rows = Object.entries(rowsByWorker)
    .map(([workerId, days]) => {
      const worker = workerMap.get(workerId);
      return {
        id: workerId,
        name: worker?.name || t('workers.unknown'),
        job: worker?.worker_function || '',
        rate: Number(worker?.daily_rate) || 0,
        days,
        cost: days * (Number(worker?.daily_rate) || 0),
      };
    })
    .sort((a, b) => b.days - a.days);

  const totalDays = rows.reduce((sum, row) => sum + row.days, 0);
  const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('lab.eyebrow')}
        title={t('lab.title')}
        description={t('lab.description')}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-medium">{monthLabel(month)}</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {month !== currentMonthKey() && (
              <Button variant="ghost" size="sm" onClick={() => setMonth(currentMonthKey())}>
                {t('lab.thisMonth')}
              </Button>
            )}
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label={t('lab.workers')} value={rows.length} tone="moss" />
        <StatCard label={t('lab.days')} value={fmtNum(totalDays, 1)} tone="sand" />
        <StatCard label={t('lab.cost')} value={fmtMoney(totalCost)} tone="clay" />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t('lab.emptyTitle')}
          description={t('lab.emptyDesc')}
        />
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
    </div>
  );
}