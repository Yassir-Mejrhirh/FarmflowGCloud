import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import { useI18n } from '@/lib/I18nContext';

// The purchase invoice of the report is written on the same form as the invoice page,
// opened on the input that is missing from the depot.
export default function InputPurchaseDialog({ open, onOpenChange, seedItem, suppliers, items, storages, onSaved }) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="px-5 pb-2 pt-5">
          <DialogTitle className="font-display text-lg font-normal tracking-tight">
            {t('supply.invoiceTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">{t('supply.invoiceHint')}</DialogDescription>
        </DialogHeader>
        <div className="p-4">
          <InvoiceForm
            suppliers={suppliers}
            items={items}
            storages={storages}
            seedItem={seedItem}
            hideHeader
            onSaved={onSaved}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}