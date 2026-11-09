import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function DivisionCard({ division, canRestore, onRestore }) {
  const { t } = useI18n();

  return (
    <div className="space-y-2.5 rounded-xl border border-border/70 bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('blockHistory.mother')}
        </span>
        <span className="text-[11px] tabular-nums text-muted-foreground">{fmtDate(division.date)}</span>
      </div>
      <p className="text-sm font-medium">
        {division.mother_name || '—'}
        <span className="ms-2 text-xs font-normal tabular-nums text-muted-foreground">
          {fmtNum(Number(division.mother_area_ha) || 0, 2)} ha
        </span>
      </p>

      <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('blockHistory.children')}
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(division.children || []).map((child) => (
            <span key={child.block_id} className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-[11px]">
              {child.name}
              <span className="ms-1 tabular-nums text-muted-foreground">{fmtNum(Number(child.area_ha) || 0, 2)} ha</span>
            </span>
          ))}
        </div>
      </div>

      {division.restored_date ? (
        <p className="text-[11px] font-medium text-sage">
          {t('blockHistory.restored', { date: fmtDate(division.restored_date) })}
        </p>
      ) : canRestore ? (
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={onRestore}>
          <RotateCcw className="h-3.5 w-3.5" /> {t('blockHistory.restore')}
        </Button>
      ) : null}
    </div>
  );
}