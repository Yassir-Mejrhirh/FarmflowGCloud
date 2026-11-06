import { AlertTriangle } from 'lucide-react';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function StockShortageAlert({ shortages = [], items = [] }) {
  const { t } = useI18n();
  if (!shortages.length) return null;

  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {t('stock.shortageTitle')}
      </p>
      <ul className="mt-1.5 space-y-1">
        {shortages.map((row) => {
          const item = items.find((entry) => entry.id === row.item_id);
          const unit = item?.unit ? ` ${item.unit}` : '';
          return (
            <li key={row.item_id} className="text-xs leading-relaxed text-destructive">
              {item?.name || t('stock.unknownItem')} ·{' '}
              {t('stock.shortageLine', {
                requested: `${fmtNum(row.requested, 1)}${unit}`,
                available: `${fmtNum(row.available, 1)}${unit}`,
              })}
            </li>
          );
        })}
      </ul>
    </div>
  );
}