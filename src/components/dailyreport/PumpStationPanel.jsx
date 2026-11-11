import { Waves } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export default function PumpStationPanel({ stations = [], value = {}, onChange, missing }) {
  const { t } = useI18n();
  const patch = (next) => onChange({ ...value, ...next });

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Waves className="h-4 w-4" /> {t('report.irrigation')}
        </p>
        {missing && (
          <span className="text-[11px] font-medium text-destructive">{t('report.pumpRequired')}</span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr]">
        <Field label={t('report.pumpStation')}>
          <SelectField
            value={value.machine_id || ''}
            onChange={(machine_id) => patch({ machine_id })}
            options={stations.map((station) => ({ value: station.id, label: station.name }))}
          />
        </Field>
        <Field label={t('report.pumpHours')}>
          <Input
            type="number"
            min="0"
            step="0.5"
            placeholder="H"
            value={value.hours ?? ''}
            onChange={(e) => patch({ hours: e.target.value })}
          />
        </Field>
        <Field label={t('report.waterM3')}>
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="m³"
            value={value.m3 ?? ''}
            onChange={(e) => patch({ m3: e.target.value })}
          />
        </Field>
      </div>

      {stations.length === 0 && (
        <p className="text-[11px] text-muted-foreground">{t('report.noPumpStation')}</p>
      )}
    </div>
  );
}