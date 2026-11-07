import { useEffect, useMemo, useState } from 'react';
import { MapPin, Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import Segmented from '@/components/Segmented';
import PlanSheet from '@/components/plans/PlanSheet';
import BlockCheckList from '@/components/plans/BlockCheckList';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { fetchList } from '@/lib/data';
import { polygonAreaHa } from '@/lib/geo';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const hasBoundary = (block) => Array.isArray(block.boundary) && block.boundary.length > 2;

export default function BlockPlans() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('farm');
  const [farmId, setFarmId] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [zoom, setZoom] = useState(50);
  const [orientation, setOrientation] = useState('landscape');

  useEffect(() => {
    const load = async () => {
      const [blockRows, farmRows] = await Promise.all([
        fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
        fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      ]);
      setBlocks(blockRows);
      setFarms(farmRows);
      setLoading(false);
    };
    load();
  }, []);

  const farmName = farms.find((farm) => farm.id === farmId)?.name || '';

  const scoped = useMemo(
    () => blocks.filter((block) => !farmName || block.farm === farmName),
    [blocks, farmName],
  );

  const mapped = useMemo(
    () =>
      scoped
        .filter(hasBoundary)
        .map((block) => ({ ...block, area: Number(block.area_ha) || polygonAreaHa(block.boundary) })),
    [scoped],
  );

  const missing = useMemo(() => scoped.filter((block) => !hasBoundary(block)), [scoped]);

  useEffect(() => {
    setSelectedIds(mapped.map((block) => block.id));
  }, [farmId, blocks.length]);

  const parcels = mode === 'farm' ? mapped : mapped.filter((block) => selectedIds.includes(block.id));
  const sheetTitle = mode === 'farm' ? farmName || t('plans.allFarms') : t('plans.selection');

  const toggle = (id) =>
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('plans.eyebrow')}
        title={t('plans.title')}
        description={t('plans.description')}
        action={
          <Button className="rounded-xl" onClick={() => window.print()} disabled={!parcels.length}>
            <Printer className="h-4 w-4" strokeWidth={1.8} />
            {t('plans.print')}
          </Button>
        }
      />

      <section className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'farm', label: t('plans.modeFarm') },
            { value: 'parcels', label: t('plans.modeParcels') },
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('plans.farm')}>
            <SelectField
              value={farmId}
              onChange={setFarmId}
              options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
              noneLabel={t('plans.allFarms')}
            />
          </Field>
          <div className="flex items-end">
            <p className="pb-2 text-xs tabular-nums text-muted-foreground">
              {t('plans.mapped', { n: mapped.length })}
              {missing.length > 0 && ` · ${missing.length} `}
              {missing.length > 0 && t('plans.missingTitle').toLowerCase()}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('plans.zoom')}>
            <div className="flex items-center gap-3 pb-1">
              <Slider
                value={[zoom]}
                min={0}
                max={100}
                step={1}
                onValueChange={([value]) => setZoom(value)}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => setZoom(50)}
                className="shrink-0 rounded-lg border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t('plans.resetFraming')}
              </button>
            </div>
          </Field>
          <Field label={t('plans.orientation')}>
            <Segmented
              value={orientation}
              onChange={setOrientation}
              options={[
                { value: 'landscape', label: t('plans.landscape') },
                { value: 'portrait', label: t('plans.portrait') },
              ]}
            />
          </Field>
        </div>

        {mode === 'parcels' && (
          <BlockCheckList
            parcels={mapped}
            selectedIds={selectedIds}
            onToggle={toggle}
            onSelectAll={() => setSelectedIds(mapped.map((block) => block.id))}
            onClear={() => setSelectedIds([])}
            labels={{ selectAll: t('plans.selectAll'), clear: t('plans.clear') }}
          />
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">{t('plans.printHint')}</p>
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : parcels.length ? (
        <PlanSheet
          title={sheetTitle}
          parcels={parcels}
          missing={mode === 'farm' ? missing : []}
          orientation={orientation}
          zoom={zoom}
        />
      ) : (
        <EmptyState
          icon={MapPin}
          title={scoped.length ? t('plans.noSelection') : t('plans.emptyTitle')}
          description={t('plans.emptyDesc')}
        />
      )}

      {missing.length > 0 && (
        <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <h2 className="font-display text-base tracking-tight">{t('plans.missingTitle')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t('plans.missingDesc')}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {missing.map((block) => (
              <li
                key={block.id}
                className="rounded-lg border border-border/70 bg-background/60 px-2 py-1 text-[11px] text-muted-foreground"
              >
                {block.name}
                {block.area_ha ? ` · ${fmtNum(block.area_ha, 2)} ha` : ''}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}