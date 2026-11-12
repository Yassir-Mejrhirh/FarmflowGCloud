import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtDate, fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Dated transport rates of the worker: changing the amount on the card adds a new
// dated rate, so the history below keeps every amount that applied before.
export default function TransportHistory({ worker, rates = [], onChanged }) {
  const { t } = useI18n();
  if (!worker?.id) return null;

  const history = rates
    .filter((rate) => rate.worker_id === worker.id)
    .sort((a, b) => String(b.effective_date).localeCompare(String(a.effective_date)));

  const remove = async (rate) => {
    await base44.entities.TransportRate.delete(rate.id);
    onChanged();
  };

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {t('workerDialog.transportHistory')}
      </p>
      {history.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{t('workerDialog.transportHistoryEmpty')}</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-xl border border-border/70">
          {history.map((rate) => (
            <li key={rate.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm tabular-nums">{fmtMoney(rate.rate)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('wage.since', { date: fmtDate(rate.effective_date) })} ·{' '}
                  {rate.mode === 'per_person' ? t('workerDialog.transportPerPerson') : t('workerDialog.transportFixed')}
                  {rate.transporter_name ? ` · ${rate.transporter_name}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => remove(rate)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}