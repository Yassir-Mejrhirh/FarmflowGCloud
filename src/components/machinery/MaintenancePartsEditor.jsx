import { Plus, X } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export const emptyPart = () => ({ item_id: '', quantity: '', unit_price: '' });

export default function MaintenancePartsEditor({ parts, onChange, items, unitCostFor, availableFor }) {
  const { t } = useI18n();

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: item.category ? `${item.name} · ${item.category}` : item.name,
  }));

  const update = (index, patch) =>
    onChange(parts.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const total = parts.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('maint.partsTitle')}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('maint.partsHint')}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => onChange([...parts, emptyPart()])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('maint.addPart')}
        </Button>
      </div>

      {parts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          {t('maint.partsEmpty')}
        </p>
      ) : (
        parts.map((line, index) => {
          const item = items.find((row) => row.id === line.item_id);
          const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
          return (
            <div key={index} className="rounded-xl border border-border/60 p-2.5">
              <div className="flex items-center gap-1.5">
                <SelectField
                  value={line.item_id}
                  onChange={(value) => update(index, { item_id: value, unit_price: unitCostFor(value) || '' })}
                  options={itemOptions}
                  placeholder={t('maint.pickPart')}
                  className="h-9 flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => onChange(parts.filter((_, i) => i !== index))}
                  aria-label={t('common.deleteEntry')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={line.quantity ?? ''}
                  onChange={(event) => update(index, { quantity: event.target.value })}
                  className="h-9 w-24 text-end tabular-nums"
                  aria-label={t('common.quantity')}
                />
                <span className="text-xs text-muted-foreground">{item?.unit || ''}</span>
                <span className="ms-auto text-sm tabular-nums">{fmtMoney(lineTotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t('maint.available')} {fmtNum(availableFor(line.item_id), 1)} {item?.unit || ''} ·{' '}
                {t('stock.unitPrice')} {fmtMoney(line.unit_price)}
              </p>
            </div>
          );
        })
      )}

      {parts.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
          <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            {t('maint.partsValue')}
          </span>
          <span className="text-sm font-medium tabular-nums">{fmtMoney(total)}</span>
        </div>
      )}
    </div>
  );
}