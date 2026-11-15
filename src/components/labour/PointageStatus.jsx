import { ClipboardList } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Pointages of the period, each with the part of its workers already carried into a
// daily report of the same day, and the rest still to be ventilated.
const BADGES = {
  done: 'border-primary/30 bg-primary/10 text-primary',
  partial: 'border-clay/40 bg-clay/10 text-clay',
  pending: 'border-border bg-muted/40 text-muted-foreground',
};

const LABELS = {
  done: 'lab.ptgDone',
  partial: 'lab.ptgPartial',
  pending: 'lab.ptgPending',
};

export default function PointageStatus({ pointages = [], reports = [], loading }) {
  const { t } = useI18n();

  // Workers of the day already present in a daily report.
  const ventilatedByDate = new Map();
  reports.forEach((report) => {
    if (!ventilatedByDate.has(report.date)) ventilatedByDate.set(report.date, new Set());
    const set = ventilatedByDate.get(report.date);
    (report.labour || []).forEach((line) => {
      if (line.worker_id && (Number(line.days) || 0) > 0) set.add(line.worker_id);
    });
  });

  const rows = pointages
    .map((sheet) => {
      const workers = (sheet.lines || []).filter(
        (line) => line.worker_id && (Number(line.days) || 0) > 0,
      );
      const done = ventilatedByDate.get(sheet.date);
      const ventilated = workers.filter((line) => done?.has(line.worker_id)).length;
      const status =
        !workers.length
          ? 'pending'
          : ventilated === workers.length
            ? 'done'
            : ventilated > 0
              ? 'partial'
              : 'pending';
      return {
        id: sheet.id,
        date: sheet.date,
        farm: sheet.farm_name || '',
        total: workers.length,
        days: Number(sheet.total_days) || workers.reduce((sum, line) => sum + Number(line.days || 0), 0),
        ventilated,
        status,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date) || a.farm.localeCompare(b.farm));

  const pending = rows.filter((row) => row.status !== 'done').length;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-display text-lg tracking-tight">{t('lab.ptgTitle')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length ? t('lab.ptgSummary', { n: rows.length, pending }) : t('lab.ptgDesc')}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t('lab.ptgEmpty')} description={t('lab.ptgEmptyDesc')} />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{fmtDate(row.date)}</p>
                <p className="text-[11px] text-muted-foreground">{row.farm}</p>
              </div>
              <p className="text-[11px] tabular-nums text-muted-foreground">
                {t('lab.ptgWorkers', { n: row.total })} · {fmtNum(row.days, 1)} {t('lab.daysUnit')}
                {row.status === 'partial' && ` · ${row.ventilated}/${row.total}`}
              </p>
              <span
                className={cn(
                  'ms-auto rounded-full border px-2 py-0.5 text-[10px] font-medium',
                  BADGES[row.status],
                )}
              >
                {t(LABELS[row.status])}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}