import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { MapPin } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FarmGroupHeader from '@/components/planting/FarmGroupHeader';
import PlantingBulkBar from '@/components/planting/PlantingBulkBar';
import PlantingBlockCard from '@/components/planting/PlantingBlockCard';
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkCropId, setBulkCropId] = useState('');
  const [bulkVarietyId, setBulkVarietyId] = useState('');
  const [applying, setApplying] = useState(false);
  const [collapsed, setCollapsed] = useState({});

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

  const groups = useMemo(() => {
    const map = new Map();
    blocks.forEach((block) => {
      const label = block.farm?.trim() || t('planting.noFarm');
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(block);
    });

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => ({
        key: label,
        label,
        rows,
        area: rows.reduce((sum, row) => sum + (Number(row.area_ha) || 0), 0),
      }));
  }, [blocks, t]);

  const patch = async (block, changes) => {
    setBlocks((prev) => prev.map((row) => (row.id === block.id ? { ...row, ...changes } : row)));
    await base44.entities.FarmBlock.update(block.id, changes);
  };

  const toggleBlock = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((row) => row !== id) : [...prev, id]));

  const toggleAll = () =>
    setSelectedIds((prev) => (prev.length === blocks.length ? [] : blocks.map((block) => block.id)));

  const applyBulk = async () => {
    if (!bulkCropId || selectedIds.length === 0) return;
    const ids = selectedIds;
    const changes = { crop_id: bulkCropId, variety_id: bulkVarietyId || '' };
    setApplying(true);
    setBlocks((prev) => prev.map((row) => (ids.includes(row.id) ? { ...row, ...changes } : row)));
    setSelectedIds([]);
    await Promise.all(ids.map((id) => base44.entities.FarmBlock.update(id, changes)));
    setApplying(false);
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
        <div className="space-y-6">
          <PlantingBulkBar
            crops={crops}
            varieties={varieties}
            cropId={bulkCropId}
            varietyId={bulkVarietyId}
            onCropChange={(value) => {
              setBulkCropId(value);
              setBulkVarietyId('');
            }}
            onVarietyChange={setBulkVarietyId}
            count={selectedIds.length}
            total={blocks.length}
            allSelected={selectedIds.length === blocks.length}
            onToggleAll={toggleAll}
            onApply={applyBulk}
            applying={applying}
          />

          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group.key} className="space-y-2">
                <FarmGroupHeader
                  label={group.label}
                  meta={`${group.rows.length} · ${fmtNum(group.area, 2)} ha`}
                  collapsed={Boolean(collapsed[group.key])}
                  onToggle={() =>
                    setCollapsed((prev) => ({ ...prev, [group.key]: !prev[group.key] }))
                  }
                />
                {!collapsed[group.key] && (
                  <ul className="space-y-3">
                    {group.rows.map((block) => (
                      <PlantingBlockCard
                        key={block.id}
                        block={block}
                        crops={crops}
                        varieties={varieties}
                        seasons={seasons}
                        selected={selectedIds.includes(block.id)}
                        onToggleSelect={() => toggleBlock(block.id)}
                        onPatch={patch}
                      />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}