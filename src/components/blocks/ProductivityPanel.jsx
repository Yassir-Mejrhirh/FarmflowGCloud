import { useMemo } from 'react';
import { Scale, Sprout } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function ProductivityPanel({ blocks, harvests, cropMap, onLogHarvest }) {
  const { t } = useI18n();
  const stats = useMemo(() => {
    const byBlock = {};
    harvests.forEach((harvest) => {
      const entry = byBlock[harvest.block_id] || (byBlock[harvest.block_id] = { total: 0, count: 0, last: null });
      entry.total += Number(harvest.quantity_kg) || 0;
      entry.count += 1;
      if (!entry.last || harvest.date > entry.last) entry.last = harvest.date;
    });
    const rows = blocks
      .map((block) => {
        const entry = byBlock[block.id] || { total: 0, count: 0, last: null };
        const area = Number(block.area_ha) || 0;
        return {
          id: block.id,
          name: block.name,
          crop: cropMap[block.crop_id]?.name || '—',
          area,
          total: entry.total,
          count: entry.count,
          last: entry.last,
          perHa: area > 0 ? entry.total / area : 0,
        };
      })
      .filter((row) => row.total > 0)
      .sort((a, b) => b.perHa - a.perHa);
    return rows;
  }, [blocks, harvests, cropMap]);

  const perCrop = useMemo(() => {
    const totals = {};
    stats.forEach((row) => {
      totals[row.crop] = (totals[row.crop] || 0) + row.total;
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const totalHarvested = stats.reduce((sum, row) => sum + row.total, 0);
  const maxPerHa = stats[0]?.perHa || 1;

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('prod.label')}</p>
          <p className="font-display text-base leading-tight">{t('prod.title')}</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg" onClick={onLogHarvest}>
          {t('blocks.logHarvest')}
        </Button>
      </div>

      {stats.length === 0 ? (
        <div className="pt-4">
          <EmptyState
            icon={Sprout}
            title={t('prod.empty')}
            description={t('prod.emptyDesc')}
          />
        </div>
      ) : (
        <>
          <p className="mt-4 flex items-center gap-2 text-2xl font-light tabular-nums">
            <Scale className="h-5 w-5 text-sage" strokeWidth={1.75} />
            {fmtNum(totalHarvested, 0)} kg
            <span className="text-xs text-muted-foreground">{t('prod.totalSuffix')}</span>
          </p>

          <div className="mt-5 space-y-3">
            {stats.map((row) => (
              <div key={row.id}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="truncate font-medium">{row.name}</span>
                  <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {fmtNum(row.perHa, 0)} kg/ha
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full rounded-full bg-sage/70')}
                    style={{ width: `${Math.max(4, (row.perHa / maxPerHa) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t('prod.rowSummary', { total: fmtNum(row.total, 0), count: row.count, crop: row.crop })}
                </p>
              </div>
            ))}
          </div>

          {perCrop.length > 0 && (
            <div className="mt-5 border-t border-border/70 pt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('prod.byCrop')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {perCrop.map(([crop, total]) => (
                  <span
                    key={crop}
                    className="rounded-full bg-secondary px-3 py-1 text-[11px] font-medium text-secondary-foreground"
                  >
                    {crop} · {fmtNum(total, 0)} kg
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}