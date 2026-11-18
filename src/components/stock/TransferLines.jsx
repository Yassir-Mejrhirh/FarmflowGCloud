import { Plus, Trash2 } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Les intrants d'un même transfert : magasins et date sont communs, chaque ligne
// porte son intrant et sa quantité.
export default function TransferLines({ lines, items, availableFor, onChange, onAdd, onRemove }) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('stock.transferLines')}
        </span>
        <Button type="button" variant="ghost" size="sm" onClick={onAdd} className="rounded-lg">
          <Plus className="h-3.5 w-3.5" /> {t('stock.transferAddLine')}
        </Button>
      </div>

      {lines.map((line, index) => {
        const item = items.find((row) => row.id === line.item_id);
        const unit = item?.unit || '';
        const available = availableFor(line.item_id, line.key);
        return (
          <div key={line.key} className="space-y-2 rounded-xl border border-border bg-card/60 p-2.5">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Field label={`${t('stock.transferItem')} ${index + 1}`}>
                  <SelectField
                    value={line.item_id}
                    onChange={(value) => onChange(line.key, { item_id: value })}
                    placeholder={t('common.select')}
                    options={items.map((row) => ({ value: row.id, label: row.name }))}
                  />
                </Field>
              </div>
              <div className="w-24 shrink-0">
                <Field label={unit || t('stock.transferQuantity')}>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={line.quantity}
                    onChange={(event) => onChange(line.key, { quantity: event.target.value })}
                  />
                </Field>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemove(line.key)}
                disabled={lines.length === 1}
                className="mb-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={t('stock.transferRemove')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {line.item_id && available !== null && (
              <p className="text-[11px] text-muted-foreground">
                {t('stock.transferAvailable', { quantity: fmtNum(available, 1), unit })}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}