import { fmtDate, fmtMoney } from '@/lib/format';
import { logTotalCost } from '@/lib/machineryCosts';
import { useI18n } from '@/lib/I18nContext';

export default function MaintenanceList({ rows = [] }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
      {rows.slice(0, 5).map((log) => (
        <li key={log.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium">
              {t(`mk.${log.kind || 'service'}`)} · {fmtDate(log.date)}
            </p>
            {log.description && (
              <p className="truncate text-[11px] text-muted-foreground">{log.description}</p>
            )}
          </div>
          <span className="shrink-0 text-xs tabular-nums">{fmtMoney(logTotalCost(log))}</span>
        </li>
      ))}
    </ul>
  );
}