import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Segmented from '@/components/Segmented';
import BlockCard from '@/components/blocks/BlockCard';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function BlockList({ blocks, cropMap, varietyMap, selectedId, onSelect, onEdit }) {
  const { t } = useI18n();
  const [groupBy, setGroupBy] = useState('none');
  const [collapsed, setCollapsed] = useState({});
  const toggleGroup = (key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  const groups = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: null, rows: blocks }];

    const keyOf = (block) => {
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
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-start transition-colors hover:bg-muted/50"
                >
                  <span className="flex min-w-0 items-center gap-1">
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform',
                        collapsed[group.key] && '-rotate-90',
                      )}
                    />
                    <span className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {group.label}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {group.rows.length} · {fmtNum(groupArea, 2)} ha
                  </span>
                </button>
              )}
              {!collapsed[group.key] &&
                group.rows.map((block) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    crop={cropMap[block.crop_id]}
                    variety={varietyMap[block.variety_id]}
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