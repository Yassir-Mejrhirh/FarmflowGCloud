import { useMemo } from 'react';
import { Droplets, Fuel } from 'lucide-react';
import InputPicker from '@/components/stock/InputPicker';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';
import { machineConsumableItems } from '@/lib/machineInputs';

// Fuel and lubricant a machine drew from stock, entered on the machine's own line.
// Only what is still available in the chosen depot is offered, by category.
export default function FuelLine({ line, patch, machine, items = [], allItems }) {
  const { t } = useI18n();
  const consumables = useMemo(() => machineConsumableItems(machine, items), [machine, items]);

  if (!line.machine_id) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Fuel className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.8} />
        <div className="min-w-0 flex-1">
          <InputPicker
            value={line.fuel_item_id || ''}
            onChange={(value) => patch({ fuel_item_id: value })}
            items={consumables.fuel}
            allItems={allItems}
            placeholder={t('report.pickFuel')}
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
          <InputPicker
            value={line.lubricant_item_id || ''}
            onChange={(value) => patch({ lubricant_item_id: value })}
            items={consumables.lubricants}
            allItems={allItems}
            placeholder={t('report.pickLubricant')}
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