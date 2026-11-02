import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export default function IrrigationZones({ zones, onChange }) {
  const { t } = useI18n();

  const updateZone = (index, key, value) => {
    onChange(zones.map((zone, i) => (i === index ? { ...zone, [key]: value } : zone)));
  };

  return (
    <div className="space-y-2">
      {zones.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('blockDialog.noZones')}</p>
      ) : (
        zones.map((zone, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={zone.name || ''}
              onChange={(e) => updateZone(index, 'name', e.target.value)}
              placeholder={t('blockDialog.zoneName')}
            />
            <div className="relative w-32 shrink-0">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={zone.area_ha ?? ''}
                onChange={(e) => updateZone(index, 'area_ha', e.target.value)}
                className="pe-8"
                aria-label={t('blockDialog.zoneArea')}
              />
              <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[11px] text-muted-foreground">ha</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => onChange(zones.filter((_, i) => i !== index))}
              aria-label={t('blockDialog.removeZone')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-lg"
        onClick={() => onChange([...zones, { name: '', area_ha: '' }])}
      >
        <Plus className="h-3.5 w-3.5" /> {t('blockDialog.addZone')}
      </Button>
    </div>
  );
}