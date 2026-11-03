import { useMemo, useState } from 'react';
import Segmented from '@/components/Segmented';
import BlockCard from '@/components/blocks/BlockCard';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function BlockList({ blocks, cropMap, varietyMap, selectedId, onSelect, onEdit }) {
  const { t } = useI18n();
  const [groupBy, setGroupBy] = useState('none');

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null, rows: blocks }];

    const keyOf = (block) => {
      if (groupBy === 'locality') return block.locality?.trim() || t('blocks.groupUnassigned');
      if (groupBy === 'farm') return block.farm?.trim() || t('blocks.groupUnassigned');
      return cropMap[block.crop_id]?.name || t('blockDialog.noCropYet');
    };

    const map = new Map();
    blocks.forEach((block) => {
      const key = keyOf(block);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(block);
    });

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => ({ key: label, label, rows }));
  }, [blocks, groupBy, cropMap, t]);

  return (
    <div className="space-y-3">
      <Segmented
        value={groupBy}
        onChange={setGroupBy}
        options={[
          { value: 'none', label: t('blocks.groupNone') },
          { value: 'locality', label: t('blocks.groupLocality') },
          { value: 'farm', label: t('blocks.groupFarm') },
          { value: 'crop', label: t('blocks.groupCrop') },
        ]}
      />

      <div className="space-y-3">
        {groups.map((group) => {
          const groupArea = group.rows.reduce((sum, block) => sum + (Number(block.area_ha) || 0), 0);
          return (
            <div key={group.key} className="space-y-2">
              {group.label && (
                <div className="flex items-baseline justify-between gap-2 px-1">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {group.label}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {group.rows.length} · {fmtNum(groupArea, 2)} ha
                  </span>
                </div>
              )}
              {group.rows.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  crop={cropMap[block.crop_id]}
                  variety={varietyMap[block.variety_id]}
                  varietyMap={varietyMap}
                  active={block.id === selectedId}
                  onSelect={() => onSelect(block.id)}
                  onEdit={() => onEdit(block)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}