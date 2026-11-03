import { Plus, Scissors, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SelectField from '@/components/SelectField';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const buildSplit = (count, blockName, totalArea, t) => {
  const area = Number(totalArea) || 0;
  const base = area > 0 ? Math.floor((area / count) * 100) / 100 : 0;
  return Array.from({ length: count }, (_, index) => {
    const isLast = index === count - 1;
    const value = isLast && area > 0 ? Number((area - base * (count - 1)).toFixed(2)) : base;
    return {
      name: blockName ? `${blockName} ${index + 1}` : t('blockDialog.subBlockDefaultName', { n: index + 1 }),
      area_ha: value || '',
      variety_id: '',
    };
  });
};

export default function SubBlocksEditor({ subBlocks = [], onChange, totalArea = 0, blockName = '', cropId = '', varieties = [] }) {
  const { t } = useI18n();
  const area = Number(totalArea) || 0;
  const total = subBlocks.reduce((sum, row) => sum + (Number(row.area_ha) || 0), 0);
  const overflow = area > 0 && total > area + 0.001;

  const updateRow = (index, key, value) => {
    onChange(subBlocks.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const varietyOptions = varieties
    .filter((variety) => !cropId || variety.crop_id === cropId)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {[2, 3].map((count) => (
          <Button
            key={count}
            type="button"
            variant="outline"
            size="sm"
            className="rounded-lg"
            onClick={() => onChange(buildSplit(count, blockName.trim(), area, t))}
          >
            <Scissors className="h-3.5 w-3.5" /> {t(`blockDialog.split${count}`)}
          </Button>
        ))}
      </div>

      {subBlocks.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('blockDialog.noSubBlocks')}</p>
      ) : (
        <div className="space-y-2">
          {subBlocks.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 rounded-xl border border-border/60 p-2 sm:grid-cols-[1fr_6.5rem_11rem_2rem] sm:items-center sm:border-0 sm:p-0"
            >
              <Input
                value={row.name || ''}
                onChange={(e) => updateRow(index, 'name', e.target.value)}
                placeholder={t('blockDialog.subBlockName')}
              />
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.area_ha ?? ''}
                  onChange={(e) => updateRow(index, 'area_ha', e.target.value)}
                  className="pe-8"
                  aria-label={t('blockDialog.subBlockArea')}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[11px] text-muted-foreground">ha</span>
              </div>
              <SelectField
                value={row.variety_id}
                onChange={(value) => updateRow(index, 'variety_id', value)}
                noneLabel={t('blockDialog.noVariety')}
                options={varietyOptions}
                placeholder={t('blockDialog.selectVariety')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => onChange(subBlocks.filter((_, i) => i !== index))}
                aria-label={t('blockDialog.removeSubBlock')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg"
          onClick={() => onChange([...subBlocks, { name: '', area_ha: '', variety_id: '' }])}
        >
          <Plus className="h-3.5 w-3.5" /> {t('blockDialog.addSubBlock')}
        </Button>
        {subBlocks.length > 0 && (
          <p className={cn('text-[11px] tabular-nums', overflow ? 'font-medium text-destructive' : 'text-muted-foreground')}>
            {t('blockDialog.subBlocksTotal', { total: fmtNum(total, 2), area: fmtNum(area, 2) })}
          </p>
        )}
      </div>
    </div>
  );
}