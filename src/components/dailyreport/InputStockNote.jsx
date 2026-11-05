import { AlertTriangle } from 'lucide-react';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function InputStockNote({ item, stock, used }) {
  const { t } = useI18n();
  if (!item) return null;

  const unit = item.unit ? ` ${item.unit}` : '';
  const low = item.min_stock_enabled && stock <= (Number(item.min_stock) || 0);
  const over = Number(used) > stock;

  return (
    <div className="space-y-0.5">
      <p className={cn('text-[11px] text-muted-foreground', low && 'font-medium text-destructive')}>
        {t('report.stockOnHand', { value: `${fmtNum(stock, 1)}${unit}` })}
        {item.min_stock_enabled ? ` · ${t('inv.minPrefix')} ${fmtNum(item.min_stock, 0)}${unit}` : ''}
      </p>
      {over && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-destructive">
          <AlertTriangle className="h-3 w-3" /> {t('report.stockOver')}
        </p>
      )}
    </div>
  );
}