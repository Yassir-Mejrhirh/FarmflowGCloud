import { useMemo } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Journées du classeur et journées déjà pointées, rapprochées par date, ferme et salaire.
// Rien n'est modifié : les groupes sans équivalent en face sont signalés tels quels.
export default function ReconcileSalaryDays({ rows = [], loading = false }) {
  const { t } = useI18n();

  const groups = useMemo(() => {
    const found = new Map();
    rows.forEach((row) => {
      const key = `${row.date}|${row.farm_id}`;
      const group =
        found.get(key) ||
        { key, date: row.date, farm_name: row.farm_name, rows: [], imported: 0, existing: 0 };
      group.rows.push(row);
      group.imported += row.imported;
      group.existing += row.existing;
      found.set(key, group);
    });
    return [...found.values()].sort(
      (a, b) => a.date.localeCompare(b.date) || String(a.farm_name).localeCompare(String(b.farm_name)),
    );
  }, [rows]);

  const hasGap = rows.some((row) => Math.abs(row.gap) > 0.001);

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <h3 className="flex items-center gap-1.5 text-[12.5px] font-medium">
        {hasGap ? (
          <AlertTriangle className="h-3.5 w-3.5 text-clay" strokeWidth={1.9} />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" strokeWidth={1.9} />
        )}
        {t('rec.salaryDaysTitle')}
      </h3>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('rec.salaryDaysHint')}</p>

      {loading ? (
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">{t('common.loading')}</p>
      ) : !groups.length ? (
        <p className="mt-1.5 text-[11.5px] text-muted-foreground">{t('rec.salaryDaysNone')}</p>
      ) : (
        <div className="mt-2.5 space-y-3">
          <div className="flex items-center gap-2 border-b border-border/60 pb-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
            <span className="min-w-0 flex-1">{t('rec.salaryDaysFarm')}</span>
            <span className="w-[4.5rem] shrink-0 text-end">{t('rec.salaryDaysRate')}</span>
            <span className="w-[3.5rem] shrink-0 text-end">{t('rec.salaryDaysWorkbook')}</span>
            <span className="w-[3.5rem] shrink-0 text-end">{t('rec.salaryDaysExisting')}</span>
            <span className="w-[3.25rem] shrink-0 text-end">{t('rec.salaryDaysGap')}</span>
          </div>

          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-baseline justify-between gap-2 text-[11.5px]">
                <span className="min-w-0 truncate font-medium">
                  {fmtDate(group.date)} · {group.farm_name || '—'}
                </span>
                <span className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
                  {fmtNum(group.imported, 1)} / {fmtNum(group.existing, 1)} j
                </span>
              </div>
              <div className="mt-0.5 divide-y divide-border/40">
                {group.rows.map((row) => (
                  <div key={row.key} className="flex items-center gap-2 py-1 text-[11.5px]">
                    <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted-foreground">
                      {row.imported === 0
                        ? t('rec.salaryDaysOnlyExisting')
                        : row.existing === 0
                          ? t('rec.salaryDaysOnlyWorkbook')
                          : ''}
                    </span>
                    <span className="w-[4.5rem] shrink-0 text-end text-[11px] tabular-nums text-muted-foreground">
                      {row.rate > 0 ? fmtMoney(row.rate) : t('rec.salaryDaysNoRate')}
                    </span>
                    <span className="w-[3.5rem] shrink-0 text-end tabular-nums">{fmtNum(row.imported, 1)}</span>
                    <span className="w-[3.5rem] shrink-0 text-end tabular-nums text-muted-foreground">
                      {fmtNum(row.existing, 1)}
                    </span>
                    <span
                      className={cn(
                        'w-[3.25rem] shrink-0 text-end tabular-nums',
                        Math.abs(row.gap) > 0.001 ? 'font-medium text-clay' : 'text-muted-foreground',
                      )}
                    >
                      {row.gap > 0 ? '+' : ''}
                      {fmtNum(row.gap, 1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}