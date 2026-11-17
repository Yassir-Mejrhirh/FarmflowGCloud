import { AlertTriangle, Plus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

// Shown under the inputs of a line: when the depot lacks the quantity, the purchase
// invoice is the only way back in stock; a missing input is created from here.
export default function InputSupplyActions({ shortages = [], itemMap = {}, onInvoice, onCreateItem }) {
  const { t } = useI18n();
  const missing = shortages.map((row) => itemMap[row.item_id]?.name).filter(Boolean);

  if (!missing.length) {
    return (
      <button
        type="button"
        onClick={onCreateItem}
        className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
      >
        <Plus className="h-3 w-3" /> {t('supply.newItem')}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" /> {t('supply.shortTitle')}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-destructive">
        {t('supply.shortHint', { items: missing.join(' · ') })}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => onInvoice(shortages[0].item_id)} className="rounded-lg">
          <Receipt className="h-3.5 w-3.5" /> {t('supply.invoice')}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onCreateItem} className="rounded-lg">
          <Plus className="h-3.5 w-3.5" /> {t('supply.createItem')}
        </Button>
      </div>
    </div>
  );
}