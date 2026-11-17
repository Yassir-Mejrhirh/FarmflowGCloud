import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import Field from '@/components/Field';
import WorkerName from '@/components/WorkerName';
import ReconcileSalaryDays from '@/components/reconcile/ReconcileSalaryDays';
import DayField from '@/components/labour/DayField';
import { Input } from '@/components/ui/input';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Troisième temps : période, taux journaliers, journées et écarts avant la mise en attente.
export default function ReconcileReviewStep({
  from, to, onChangeFrom, onChangeTo, lines = [], rates = {}, onChangeRate,
  differences = [], newCells = 0, unmatched = [], noFarm = 0, loading = false,
  salaryChanges = [], salaryDate = '', salaryDays = [],
}) {
  const { t } = useI18n();

  const workers = useMemo(() => {
    const found = new Map();
    lines.forEach((line) => {
      const current =
        found.get(line.worker_id) || {
          id: line.worker_id,
          name: line.worker_name,
          days: 0,
          farms: 0,
          rate: rates[line.worker_id] !== undefined ? rates[line.worker_id] : line.daily_rate,
        };
      current.days += line.total_days;
      current.farms += 1;
      found.set(line.worker_id, current);
    });
    return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [lines, rates]);

  const totalDays = workers.reduce((sum, worker) => sum + worker.days, 0);
  const totalCost = workers.reduce((sum, worker) => sum + worker.days * (Number(worker.rate) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <h2 className="font-display text-lg leading-tight tracking-tight">{t('rec.reviewTitle')}</h2>
        <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{t('rec.reviewHint')}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label={t('rec.from')}>
            <DayField value={from} onChange={onChangeFrom} />
          </Field>
          <Field label={t('rec.to')}>
            <DayField value={to} onChange={onChangeTo} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          <span>
            {t('rec.days')} : <span className="font-medium tabular-nums text-foreground">{fmtNum(totalDays, 1)}</span>
          </span>
          <span>
            {t('rec.total')} : <span className="font-medium tabular-nums text-foreground">{fmtMoney(totalCost)}</span>
          </span>
          <span className="tabular-nums">{t('rec.newCells', { n: newCells })}</span>
          {noFarm > 0 && <span className="text-clay">{t('rec.noFarmCells', { n: noFarm })}</span>}
        </div>
      </div>

      <section className="rounded-2xl border border-border/70 bg-card">
        <header className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <h3 className="text-[12.5px] font-medium">{t('rec.linesTitle')}</h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">{fmtNum(workers.length, 0)}</span>
        </header>
        <div className="divide-y divide-border/60">
          {workers.map((worker) => (
            <div key={worker.id} className="flex items-center gap-2 px-4 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] leading-snug">
                  <WorkerName name={worker.name} />
                </p>
                <p className="text-[10.5px] tabular-nums text-muted-foreground">
                  {fmtNum(worker.days, 1)} j
                  {worker.farms > 1 ? ` · ${worker.farms}` : ''}
                </p>
              </div>
              <Input
                value={worker.rate ?? ''}
                onChange={(event) => onChangeRate(worker.id, event.target.value)}
                inputMode="decimal"
                aria-label={t('rec.rate')}
                className="h-8 w-[4.75rem] shrink-0 text-end text-[12px] tabular-nums"
              />
              <span className="w-[5.5rem] shrink-0 text-end text-[11.5px] tabular-nums text-muted-foreground">
                {fmtMoney(worker.days * (Number(worker.rate) || 0))}
              </span>
            </div>
          ))}
          {!workers.length && (
            <p className="px-4 py-4 text-[12px] text-muted-foreground">{t('rec.noLines')}</p>
          )}
        </div>
      </section>

      {salaryChanges.length > 0 && (
        <section className="rounded-2xl border border-clay/40 bg-clay/5 p-4">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium text-clay">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.9} />
            {t('rec.salaryTitle')}
          </h3>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {t('rec.salaryHint', { date: fmtDate(salaryDate) })}
          </p>
          <ul className="mt-2 divide-y divide-clay/20">
            {salaryChanges.map((change) => (
              <li key={change.worker_id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]">
                <span className="min-w-0 truncate">
                  <WorkerName name={change.worker_name} />
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {fmtMoney(change.current)}
                  <span className="mx-1.5 text-clay">→</span>
                  <span className="font-medium text-foreground">{fmtMoney(change.salary)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium">
          {differences.length ? (
            <AlertTriangle className="h-3.5 w-3.5 text-clay" strokeWidth={1.9} />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.9} />
          )}
          {t('rec.diffTitle')}
        </h3>
        {loading ? (
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{t('common.loading')}</p>
        ) : !differences.length ? (
          <p className="mt-1.5 text-[11.5px] text-muted-foreground">{t('rec.diffNone')}</p>
        ) : (
          <>
            <p className="mt-1 text-[11px] text-muted-foreground">{t('rec.diffHint')}</p>
            <ul className="mt-2 space-y-1 text-[11.5px]">
              {differences.slice(0, 6).map((item) => (
                <li key={`${item.date}-${item.worker_name}-${item.farm_name}`} className="text-muted-foreground">
                  {t('rec.diffRow', {
                    date: fmtDate(item.date),
                    farm: item.farm_name,
                    worker: item.worker_name,
                    from: fmtNum(item.from, 1),
                    to: fmtNum(item.to, 1),
                  })}
                </li>
              ))}
            </ul>
            {differences.length > 6 && (
              <p className="mt-1 text-[11px] text-muted-foreground">{t('rec.diffMore', { n: differences.length - 6 })}</p>
            )}
          </>
        )}
      </section>

      <ReconcileSalaryDays rows={salaryDays} loading={loading} />

      {unmatched.length > 0 && (
        <section className="rounded-2xl border border-clay/40 bg-clay/5 p-4">
          <h3 className="text-[12.5px] font-medium text-clay">{t('rec.unmatchedTitle')}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {unmatched.map((item) => (
              <span key={item.name} className="rounded-full bg-background px-2 py-0.5 text-[10.5px]">
                {item.name} · {fmtNum(item.days, 1)} j
              </span>
            ))}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('rec.unmatchedHint')}</p>
        </section>
      )}
    </div>
  );
}