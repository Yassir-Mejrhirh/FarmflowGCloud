import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { List } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceList from '@/components/invoices/InvoiceList';
import { Button } from '@/components/ui/button';
import { fetchList, byId } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';

export default function InputInvoices() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [supplierRows, itemRows, invoiceRows] = await Promise.all([
      fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}, { sort: '-date' }),
    ]);
    setSuppliers(supplierRows);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const supplierMap = byId(suppliers);
  const itemMap = byId(items);
  const recent = invoices.slice(0, 5);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('invInvoices.eyebrow')}
        title={t('invInvoices.title')}
        description={t('invInvoices.description')}
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/input-invoices/all">
              <List className="mr-1.5 h-4 w-4" /> {t('invInvoices.seeAll')}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <>
          <InvoiceForm suppliers={suppliers} items={items} onSaved={load} />

          <section className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-base leading-tight tracking-tight">{t('invInvoices.recent')}</h2>
              <Link to="/input-invoices/all" className="text-[11px] font-medium text-primary hover:underline">
                {t('invInvoices.seeAll')}
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                {t('invInvoices.emptyDesc')}
              </p>
            ) : (
              <InvoiceList invoices={recent} supplierMap={supplierMap} itemMap={itemMap} />
            )}
          </section>
        </>
      )}
    </div>
  );
}