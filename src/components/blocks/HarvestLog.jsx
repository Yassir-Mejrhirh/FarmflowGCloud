import { Trash2, Wheat } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function HarvestLog({ harvests, blockMap, onDeleted }) {
  const { t } = useI18n();
  const sorted = [...harvests].sort((a, b) => (a.date < b.date ? 1 : -1));

  const handleDelete = async (harvest) => {
    await base44.entities.Harvest.delete(harvest.id);
    onDeleted();
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{t('harvestLog.label')}</p>
      <p className="font-display text-base leading-tight">{t('harvestLog.title')}</p>

      {sorted.length === 0 ? (
        <div className="pt-4">
          <EmptyState icon={Wheat} title={t('harvestLog.empty')} description={t('harvestLog.emptyDesc')} />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {sorted.map((harvest) => (
            <li key={harvest.id} className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{blockMap[harvest.block_id]?.name || t('harvestLog.unknownBlock')}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {fmtDate(harvest.date)}
                  {harvest.notes ? ` · ${harvest.notes}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-medium tabular-nums">{fmtNum(harvest.quantity_kg, 0)} kg</span>
                <button
                  type="button"
                  onClick={() => handleDelete(harvest)}
                  className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  aria-label={t('common.deleteHarvest')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}