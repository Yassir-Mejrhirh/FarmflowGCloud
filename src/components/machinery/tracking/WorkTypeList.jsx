import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function WorkTypeList({ rows = [] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
      {rows
        .slice()
        .sort((a, b) => b.hours - a.hours)
        .map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{row.label || t(`tt.${row.type}`)}</p>
              <p className="text-[11px] text-muted-foreground">
                {row.count} {t('mtr.interventions')}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums">{fmtNum(row.hours, 1)} h</span>
          </li>
        ))}
    </ul>
  );
}