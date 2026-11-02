import { Droplets } from 'lucide-react';
import StatusPill from '@/components/StatusPill';
import { fmtNum } from '@/lib/format';
import { downloadBlockKml, blockKmlFilename } from '@/lib/kml';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const STATUS_TONE = { active: 'moss', preparing: 'amber', harvest: 'clay', fallow: 'stone' };

export default function BlockCard({ block, crop, variety, active, onSelect, onEdit }) {
  const { t } = useI18n();
  const zones = block.irrigation_zones?.length || 0;

  return (
    <div
      className={cn(
        'rounded-2xl border bg-card p-4 transition-all duration-200',
        active ? 'border-primary/40 shadow-[0_18px_40px_-38px_rgba(20,45,35,0.9)]' : 'border-border/70',
      )}
    >
      <button type="button" onClick={onSelect} className="w-full text-start">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base leading-tight">{block.name}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              {block.code || t('blocks.noCode')}
            </p>
          </div>
          <StatusPill tone={STATUS_TONE[block.status] || 'stone'}>{t(`st.${block.status}`)}</StatusPill>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="tabular-nums">{fmtNum(block.area_ha, 2)} ha</span>
          <span className="truncate">
            {crop ? `${crop.name}${variety ? ` · ${variety.name}` : ''}` : t('common.noCropAssigned')}
          </span>
        </div>
        {(block.farm || block.locality) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
            {block.farm && <span>{block.farm}</span>}
            {block.farm && block.locality && <span>·</span>}
            {block.locality && <span>{block.locality}</span>}
          </p>
        )}
        {zones > 0 && (
          <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-sage">
            <Droplets className="h-3 w-3" /> {t('blocks.zones', { n: zones })}
          </p>
        )}
      </button>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {t('blocks.boundaryPoints', { n: block.boundary?.length || 0 })}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => downloadBlockKml([block], blockKmlFilename(block))}
            className="text-[11px] font-medium text-sage hover:underline"
          >
            Google Earth
          </button>
          <button type="button" onClick={onEdit} className="text-[11px] font-medium text-primary hover:underline">
            {t('blocks.editBlock')}
          </button>
        </div>
      </div>
    </div>
  );
}