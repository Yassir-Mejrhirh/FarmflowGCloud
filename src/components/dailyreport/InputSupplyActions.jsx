import { AlertTriangle, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

// Shown under the inputs of a line: the purchase invoice is always reachable, so an
// input that is out of stock (or not yet on the line) can be supplied without leaving
// the report. When the depot lacks a requested quantity, the reason is spelled out.
export default function InputSupplyActions({ shortages = [], itemMap = {}, onInvoice, onCreateItem, suggestedItemId = '' }) {
  const { t } = useI18n();
  const missing = shortages.map((row) => itemMap[row.item_id]?.name).filter(Boolean);
  const seed = shortages[0]?.item_id || suggestedItemId || '';
  const blocked = missing.length > 0;

  return (
    <div className="space-y-2">
      {blocked && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" /> {t('supply.shortTitle')}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-destructive">
            {t('supply.shortHint', { items: missing.join(' · ') })}
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={blocked ? 'default' : 'outline'}
          onClick={() => onInvoice(seed)}
          className="rounded-lg"
        >
          <Receipt className="h-3.5 w-3.5" /> {t('supply.invoice')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCreateItem} className="rounded-lg">
          <Plus className="h-3.5 w-3.5" /> {blocked ? t('supply.createItem') : t('supply.newItem')}
        </Button>
      </div>
    </div>
  );
}