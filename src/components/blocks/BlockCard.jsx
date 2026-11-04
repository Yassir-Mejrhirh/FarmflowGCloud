import { Download, Pencil } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import { fmtNum } from '@/lib/format';
import { downloadBlockKml, blockKmlFilename } from '@/lib/kml';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const STATUS_TONE = { active: 'moss', preparing: 'amber', harvest: 'clay', fallow: 'stone' };

export default function BlockCard({ block, crop, variety, active, onSelect, onEdit }) {
  const { t } = useI18n();
  const culture = crop ? `${crop.name}${variety ? ` · ${variety.name}` : ''}` : t('common.noCropAssigned');
  const place = [block.farm, block.locality].filter(Boolean).join(' · ');

  return (
    <div
      className={cn(
        'rounded-xl border px-3 py-2 transition-all duration-200',
        active ? 'border-primary/40 bg-secondary/40' : 'border-border/70 bg-card hover:border-border',
      )}
    >
      <div className="flex items-center gap-2">
        <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-start">
          <p className="truncate text-sm font-medium leading-tight">{block.name}</p>
        </button>
        <StatusPill tone={STATUS_TONE[block.status] || 'stone'}>{t(`st.${block.status}`)}</StatusPill>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => downloadBlockKml([block], blockKmlFilename(block))}
            title="Google Earth"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            title={t('blocks.editBlock')}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="mt-0.5 flex w-full items-center gap-1.5 overflow-hidden text-start text-[11px] text-muted-foreground"
      >
        <span className="shrink-0 tabular-nums">{fmtNum(block.area_ha, 2)} ha</span>
        <span className="shrink-0 opacity-50">·</span>
        <span className="truncate">{culture}</span>
        {place && <span className="shrink-0 opacity-50">·</span>}
        {place && <span className="truncate">{place}</span>}
      </button>
    </div>
  );
}