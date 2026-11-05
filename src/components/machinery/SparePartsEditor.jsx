import { Plus, Trash2 } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export const PART_KINDS = [
  'oil_filter',
  'fuel_filter',
  'air_filter',
  'hydraulic_filter',
  'belt',
  'battery',
  'spark_plug',
  'other',
];

export default function SparePartsEditor({ value = [], onChange }) {
  const { t } = useI18n();
  const rows = value || [];

  const updateRow = (index, patch) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  const addRow = () => onChange([...rows, { kind: 'oil_filter', brand: '', reference: '' }]);
  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('machDialog.spareParts')}
        </p>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={addRow}>
          <Plus className="mr-1 h-3 w-3" /> {t('machDialog.addSparePart')}
        </Button>
      </div>

      {rows.length === 0 && <p className="text-[11px] text-muted-foreground">{t('machDialog.noParts')}</p>}

      {rows.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-background/40 p-2 sm:grid-cols-[1.1fr_1fr_1fr_auto] sm:items-center"
        >
          <SelectField
            value={row.kind || 'oil_filter'}
            onChange={(kind) => updateRow(index, { kind })}
            options={PART_KINDS.map((kind) => ({ value: kind, label: t(`part.${kind}`) }))}
          />
          <Input
            value={row.brand || ''}
            onChange={(event) => updateRow(index, { brand: event.target.value })}
            placeholder={t('machDialog.partBrand')}
            aria-label={t('machDialog.partBrand')}
          />
          <Input
            value={row.reference || ''}
            onChange={(event) => updateRow(index, { reference: event.target.value })}
            placeholder={t('machDialog.partReference')}
            aria-label={t('machDialog.partReference')}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 justify-self-end text-muted-foreground hover:text-destructive"
            onClick={() => removeRow(index)}
            aria-label={t('common.delete')}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}