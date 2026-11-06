import { History } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import OperationGroups from '@/components/stock/OperationGroups';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function ItemOperationsDialog({ item, operations, groupBy, onClose }) {
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
              <OperationGroups operations={operations} groupBy={groupBy} unit={unit} />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}