import { Droplets, Fuel } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

// Fuel and lubricant a machine drew from stock, entered on the machine's own line.
export default function FuelLine({ line, patch, fuelOptions, lubricantOptions }) {
  const { t } = useI18n();

  if (!line.machine_id) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Fuel className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <SelectField
            value={line.fuel_item_id || ''}
            onChange={(value) => patch({ fuel_item_id: value })}
            options={fuelOptions}
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
      <div className="flex items-center gap-1.5">
        <Droplets className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <SelectField
            value={line.lubricant_item_id || ''}
            onChange={(value) => patch({ lubricant_item_id: value })}
            options={lubricantOptions}
            noneLabel={t('report.noLubricantItem')}
          />
        </div>
        <Input
          type="number"
          className="w-20 shrink-0"
          value={line.lubricant_quantity ?? ''}
          onChange={(event) => patch({ lubricant_quantity: event.target.value })}
          placeholder={t('report.lubricantQty')}
          aria-label={t('report.lubricantQty')}
        />
      </div>
    </div>
  );
}