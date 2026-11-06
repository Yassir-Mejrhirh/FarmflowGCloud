import { History } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function ItemOperationsDialog({ item, operations, onClose }) {
  const { t } = useI18n();
  const unit = item?.unit || '';

  return (
    <Dialog open={!!item} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] gap-3 overflow-y-auto sm:max-w-xl">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl tracking-tight">{item.name}</DialogTitle>
              <DialogDescription>{t('stock.operationsDesc')}</DialogDescription>
            </DialogHeader>

            <p className="text-sm tabular-nums text-muted-foreground">
              {t('stock.onHand')} : {fmtNum(item.quantity, 1)} {unit}
            </p>

            {operations.length === 0 ? (
              <EmptyState
                icon={History}
                title={t('stock.noOperations')}
                description={t('stock.noOperationsDesc')}
              />
            ) : (
              <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70">
                {operations.map((operation) => (
                  <li key={operation.key} className="flex flex-wrap items-start gap-3 px-3.5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{operation.source}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {[fmtDate(operation.date), operation.place, operation.notes].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="text-end">
                      <p
                        className={cn(
                          'text-sm tabular-nums',
                          operation.kind === 'out' ? 'text-clay' : 'text-primary',
                        )}
                      >
                        {operation.kind === 'out' ? '−' : '+'}
                        {fmtNum(operation.quantity, 1)} {unit}
                      </p>
                      {!!operation.amount && (
                        <p className="text-[11px] tabular-nums text-muted-foreground">
                          {fmtMoney(operation.amount)}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}