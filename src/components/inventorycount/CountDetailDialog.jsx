import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { countValue } from '@/components/inventorycount/CountHistory';

export default function CountDetailDialog({ open, onOpenChange, count, items = [], storages = [] }) {
  const { t } = useI18n();
  if (!count) return null;

  const lines = count.lines || [];
  const storage = storages.find((row) => row.id === count.storage_id);
  const itemOf = (line) => items.find((row) => row.id === line.item_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight tracking-tight">
            {t('stockCount.detailTitle')}
          </DialogTitle>
          <DialogDescription>
            {fmtDate(count.date)}
            {storage ? ` · ${storage.name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('stockCount.date')}</p>
            <p className="mt-0.5 text-sm">{fmtDate(count.date)}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('stockCount.storage')}</p>
            <p className="mt-0.5 text-sm">{storage?.name || t('stockCount.noStorage')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('stockCount.responsible')}</p>
            <p className="mt-0.5 text-sm">{count.responsible || t('stockCount.responsibleUnknown')}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.item')}</th>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.category')}</th>
                <th className="px-2.5 py-2 text-end font-medium">{t('stockCount.quantity')}</th>
                <th className="px-2.5 py-2 text-end font-medium">{t('stockCount.unitPrice')}</th>
                <th className="px-2.5 py-2 text-end font-medium">{t('stockCount.lineValue')}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const item = itemOf(line);
                return (
                  <tr key={index} className="border-t border-border/50">
                    <td className="px-2.5 py-2">{item?.name || t('stockCount.unknownItem')}</td>
                    <td className="px-2.5 py-2 text-muted-foreground">{line.category || '—'}</td>
                    <td className="px-2.5 py-2 text-end tabular-nums">
                      {fmtNum(line.quantity, 2)} {line.unit || ''}
                    </td>
                    <td className="px-2.5 py-2 text-end tabular-nums">{fmtMoney(line.unit_price)}</td>
                    <td className="px-2.5 py-2 text-end tabular-nums">
                      {fmtMoney((Number(line.quantity) || 0) * (Number(line.unit_price) || 0))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-border/60 bg-secondary/20">
              <tr>
                <td colSpan={4} className="px-2.5 py-2.5 text-end text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t('stockCount.total')}
                </td>
                <td className="px-2.5 py-2.5 text-end text-sm font-medium tabular-nums">{fmtMoney(countValue(count))}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {count.notes && <p className="text-xs leading-relaxed text-muted-foreground">{count.notes}</p>}
      </DialogContent>
    </Dialog>
  );
}