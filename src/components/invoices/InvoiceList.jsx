import { useI18n } from '@/lib/I18nContext';
import { fmtDate, fmtMoney } from '@/lib/format';

const lineTotal = (line) => (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

export default function InvoiceList({ invoices, supplierMap, itemMap, storageMap = {} }) {
  const { t } = useI18n();

  return (
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
      {invoices.map((invoice) => {
        const supplier = supplierMap[invoice.supplier_id];
        const lines = invoice.lines || [];
        return (
          <li key={invoice.id} className="px-4 py-3.5">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{invoice.invoice_number || t('invInvoices.noNumber')}</p>
                  <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{fmtDate(invoice.date)}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[supplier?.name || t('invInvoices.unknownSupplier'), storageMap[invoice.storage_id]?.name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <p className="font-display text-base leading-tight tabular-nums">{fmtMoney(invoice.amount)}</p>
            </div>

            {lines.length > 0 && (
              <ul className="mt-2 space-y-1 border-s-2 border-border/60 ps-3">
                {lines.map((line, index) => {
                  const item = itemMap[line.item_id];
                  return (
                    <li key={index} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="min-w-0 truncate text-foreground/85">
                        {item?.name || t('invInvoices.unknownItem')}
                      </span>
                      <span className="text-muted-foreground">
                        {line.quantity ? `${line.quantity}${line.unit ? ` ${line.unit}` : ''}` : ''}
                        {line.unit_price ? ` × ${fmtMoney(line.unit_price)}` : ''}
                      </span>
                      <span className="ms-auto tabular-nums text-muted-foreground">{fmtMoney(lineTotal(line))}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {invoice.notes && <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">{invoice.notes}</p>}
          </li>
        );
      })}
    </ul>
  );
}