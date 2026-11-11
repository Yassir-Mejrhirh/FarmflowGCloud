import { fmtMoney, fmtNum, monthLabel } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function ChmpEvolution({ rows = [] }) {
  const { t } = useI18n();
  const filled = rows.filter((row) => row.hours > 0 || row.cost > 0);

  if (filled.length === 0) {
    return <p className="text-xs text-muted-foreground">{t('mtr.noMonths')}</p>;
  }

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
      {filled.map((row) => (
        <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium capitalize">{monthLabel(row.key)}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {fmtNum(row.hours, 1)} h · {fmtMoney(row.cost)}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums">{row.chmp === null ? '—' : fmtMoney(row.chmp)}</span>
        </li>
      ))}
    </ul>
  );
}