import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { useI18n } from '@/lib/I18nContext';

export default function PlantingBulkBar({
  crops,
  varieties,
  seasons,
  cropId,
  varietyId,
  seasonId,
  startDate,
  endDate,
  onCropChange,
  onVarietyChange,
  onSeasonChange,
  onStartDateChange,
  onEndDateChange,
  count,
  total,
  allSelected,
  onToggleAll,
  onApply,
  applying,
}) {
  const { t } = useI18n();
  const varietyOptions = varieties
    .filter((variety) => !cropId || variety.crop_id === cropId)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base leading-tight">{t('planting.bulkTitle')}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t('planting.bulkDesc')}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onToggleAll} disabled={total === 0}>
          {allSelected ? t('planting.uncheckAll') : t('planting.checkAll')}
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label={t('planting.season')}>
          <SelectField
            value={seasonId}
            onChange={onSeasonChange}
            noneLabel={t('planting.noSeason')}
            options={seasons.map((season) => ({ value: season.id, label: season.name }))}
          />
        </Field>
        <Field label={t('planting.crop')}>
          <SelectField
            value={cropId}
            onChange={onCropChange}
            noneLabel={t('planting.noCrop')}
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label={t('planting.variety')}>
          <SelectField
            value={varietyId}
            onChange={onVarietyChange}
            noneLabel={t('planting.noVariety')}
            options={varietyOptions}
          />
        </Field>
        <Field label={t('planting.cropStartDate')}>
          <Input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} />
        </Field>
        <Field label={t('planting.cropEndDate')}>
          <Input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t('planting.selectedCount', { count, total })}
        </p>
        <Button
          type="button"
          onClick={onApply}
          disabled={(!cropId && !seasonId && !startDate && !endDate) || count === 0 || applying}
        >
          {applying ? t('planting.applying') : t('planting.apply')}
        </Button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{t('planting.bulkHint')}</p>
    </div>
  );
}