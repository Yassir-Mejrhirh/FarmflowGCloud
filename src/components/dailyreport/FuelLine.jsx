import { Fuel } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export default function FuelLine({ line, patch, options }) {
  const { t } = useI18n();

  if (!line.machine_id) return null;

  return (
    <div className="flex items-center gap-1.5">
      <Fuel className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
      <div className="min-w-0 flex-1">
        <SelectField
          value={line.fuel_item_id || ''}
          onChange={(value) => patch({ fuel_item_id: value })}
          options={options}
          noneLabel={t('report.noFuelItem')}
        />
      </div>
      <Input
        type="number"
        className="w-20 shrink-0"
        value={line.fuel_quantity ?? ''}
        onChange={(event) => patch({ fuel_quantity: event.target.value })}
        placeholder={t('report.fuelQty')}
        aria-label={t('report.fuelQty')}
      />
    </div>
  );
}