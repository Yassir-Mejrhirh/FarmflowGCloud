import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function VidangeList({ rows = [] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
      {rows.slice(0, 5).map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="text-xs font-medium">{fmtDate(row.date)}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {row.first ? t('mtr.sinceCounter') : t('mtr.since')}
              {row.reading > 0 ? ` · ${t('mtr.reading')} ${fmtNum(row.reading, 0)} h` : ''}
            </p>
          </div>
          <span className="shrink-0 text-xs tabular-nums">{fmtNum(row.since, 1)} h</span>
        </li>
      ))}
    </ul>
  );
}