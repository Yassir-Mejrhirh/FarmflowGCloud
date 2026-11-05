import { useI18n } from '@/lib/I18nContext';
import { fmtDate, fmtMoney } from '@/lib/format';

export default function InvoiceList({ invoices, supplierMap, itemMap }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
      {invoices.map((invoice) => {
        const supplier = supplierMap[invoice.supplier_id];
        const item = itemMap[invoice.item_id];
        return (
          <li key={invoice.id} className="flex flex-wrap items-start gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-medium">{invoice.invoice_number || t('invInvoices.noNumber')}</p>
                <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{fmtDate(invoice.date)}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {supplier?.name || t('invInvoices.unknownSupplier')}
                {item ? ` · ${item.name}` : ` · ${t('invInvoices.unknownItem')}`}
                {invoice.quantity ? ` · ${invoice.quantity}${invoice.unit ? ` ${invoice.unit}` : ''}` : ''}
                {invoice.unit_price
                  ? ` · ${fmtMoney(invoice.unit_price)}${invoice.unit ? `/${invoice.unit}` : ''}`
                  : ''}
              </p>
              {invoice.notes && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{invoice.notes}</p>}
            </div>
            <p className="font-display text-base leading-tight tabular-nums">{fmtMoney(invoice.amount)}</p>
          </li>
        );
      })}
    </ul>
  );
}