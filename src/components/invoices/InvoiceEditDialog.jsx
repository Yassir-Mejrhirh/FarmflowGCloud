import { Dialog, DialogContent } from '@/components/ui/dialog';
import InvoiceForm from '@/components/invoices/InvoiceForm';

export default function InvoiceEditDialog({ invoice, suppliers, items, storages, onClose, onSaved }) {
  return (
    <Dialog open={!!invoice} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl gap-0 border-none bg-transparent p-0 shadow-none sm:rounded-2xl">
        <div className="max-h-[85vh] overflow-y-auto rounded-2xl">
          <InvoiceForm
            key={invoice?.id || 'new'}
            invoice={invoice}
            suppliers={suppliers}
            items={items}
            storages={storages}
            onSaved={onSaved}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}