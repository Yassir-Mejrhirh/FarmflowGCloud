import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function ResourceGroup({ icon: Icon, title, rows = [], total = 0 }) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />} {title}
      </p>
      {rows.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{t('itt.none')}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((row) => (
            <li key={row.key} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">{row.meta}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 border-t border-border/50 pt-1.5 text-end text-[11px] tabular-nums text-muted-foreground">
        {fmtMoney(total)}
      </p>
    </div>
  );
}