import { Sprout } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function PlantingBlockCard({ block, crops, varieties, seasons, selected, onToggleSelect, onPatch }) {
  const { t } = useI18n();
  const varietyOptions = varieties
    .filter((variety) => !block.crop_id || variety.crop_id === block.crop_id)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  return (
    <li
      className={cn(
        'rounded-2xl border bg-card p-4 transition-colors sm:p-5',
        selected ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <Checkbox
            checked={selected}
            onCheckedChange={onToggleSelect}
            aria-label={block.name}
            className="mt-1"
          />
          <div className="min-w-0">
            <p className="truncate font-display text-base leading-tight">{block.name}</p>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {block.code || '—'} · {fmtNum(block.area_ha, 2)} ha
            </p>
          </div>
        </div>
        <Sprout className="h-4 w-4 shrink-0 text-sage" strokeWidth={1.7} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label={t('planting.crop')}>
          <SelectField
            value={block.crop_id}
            onChange={(value) => onPatch(block, { crop_id: value, variety_id: '' })}
            noneLabel={t('planting.noCrop')}
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label={t('planting.variety')}>
          <SelectField
            value={block.variety_id}
            onChange={(value) => onPatch(block, { variety_id: value })}
            noneLabel={t('planting.noVariety')}
            options={varietyOptions}
          />
        </Field>
        <Field label={t('planting.season')}>
          <SelectField
            value={block.season_id}
            onChange={(value) => onPatch(block, { season_id: value })}
            noneLabel={t('planting.noSeason')}
            options={seasons.map((season) => ({ value: season.id, label: season.name }))}
          />
        </Field>
        <Field label={t('planting.cropStartDate')}>
          <Input
            type="date"
            value={block.planting_date || ''}
            onChange={(e) => onPatch(block, { planting_date: e.target.value })}
          />
        </Field>
        <Field label={t('planting.cropEndDate')}>
          <Input
            type="date"
            value={block.crop_end_date || ''}
            onChange={(e) => onPatch(block, { crop_end_date: e.target.value })}
          />
        </Field>
      </div>
    </li>
  );
}