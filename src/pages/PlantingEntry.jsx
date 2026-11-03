import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapPin, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { fetchList } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function PlantingEntry() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [blockRows, cropRows, varietyRows, seasonRows] = await Promise.all([
        fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
        fetchList(base44.entities.Crop, {}, { sort: 'name' }),
        fetchList(base44.entities.Variety, {}, { sort: 'name' }),
        fetchList(base44.entities.Season, {}, { sort: '-start_date' }),
      ]);
      setBlocks(blockRows);
      setCrops(cropRows);
      setVarieties(varietyRows);
      setSeasons(seasonRows);
      setLoading(false);
    })();
  }, []);

  const patch = async (block, changes) => {
    setBlocks((prev) => prev.map((row) => (row.id === block.id ? { ...row, ...changes } : row)));
    await base44.entities.FarmBlock.update(block.id, changes);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('planting.eyebrow')}
        title={t('planting.title')}
        description={t('planting.description')}
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('planting.emptyTitle')}
          description={t('planting.emptyDesc')}
          action={
            <Link to="/blocks" className="text-xs font-medium text-primary hover:underline">
              {t('planting.openBlocks')}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {blocks.map((block) => {
            const varietyOptions = varieties
              .filter((variety) => !block.crop_id || variety.crop_id === block.crop_id)
              .map((variety) => ({ value: variety.id, label: variety.name }));

            return (
              <li key={block.id} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base leading-tight">{block.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      {block.code || '—'} · {fmtNum(block.area_ha, 2)} ha
                    </p>
                  </div>
                  <Sprout className="h-4 w-4 shrink-0 text-sage" strokeWidth={1.7} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <Field label={t('planting.crop')}>
                    <SelectField
                      value={block.crop_id}
                      onChange={(value) => patch(block, { crop_id: value, variety_id: '' })}
                      noneLabel={t('planting.noCrop')}
                      options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
                    />
                  </Field>
                  <Field label={t('planting.variety')}>
                    <SelectField
                      value={block.variety_id}
                      onChange={(value) => patch(block, { variety_id: value })}
                      noneLabel={t('planting.noVariety')}
                      options={varietyOptions}
                    />
                  </Field>
                  <Field label={t('planting.season')}>
                    <SelectField
                      value={block.season_id}
                      onChange={(value) => patch(block, { season_id: value })}
                      noneLabel={t('planting.noSeason')}
                      options={seasons.map((season) => ({ value: season.id, label: season.name }))}
                    />
                  </Field>
                  <Field label={t('planting.cropStartDate')}>
                    <Input
                      type="date"
                      value={block.planting_date || ''}
                      onChange={(e) => patch(block, { planting_date: e.target.value })}
                    />
                  </Field>
                  <Field label={t('planting.cropEndDate')}>
                    <Input
                      type="date"
                      value={block.crop_end_date || ''}
                      onChange={(e) => patch(block, { crop_end_date: e.target.value })}
                    />
                  </Field>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}