import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Receipt } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import InvoiceList from '@/components/invoices/InvoiceList';
import InvoiceEditDialog from '@/components/invoices/InvoiceEditDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { fetchList, byId, sumBy } from '@/lib/data';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function InputInvoicesList() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [editing, setEditing] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [supplierRows, itemRows, invoiceRows, storageRows] = await Promise.all([
      fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}, { sort: '-date' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
    ]);
    setSuppliers(supplierRows);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setStorages(storageRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const supplierMap = byId(suppliers);
  const itemMap = byId(items);
  const storageMap = byId(storages);

  const handleSaved = async () => {
    setEditing(null);
    await load();
    toast({ title: t('invInvoices.updated') });
  };

  const handleDelete = async (invoice) => {
    await base44.entities.InputInvoice.delete(invoice.id);
    await load();
    toast({ title: t('invInvoices.deleted') });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('invInvoices.eyebrow')}
        title={t('invInvoices.allTitle')}
        description={t('invInvoices.allDesc')}
        action={
          <Button asChild className="rounded-xl">
            <Link to="/input-invoices">
              <Plus className="mr-1.5 h-4 w-4" /> {t('invInvoices.newInvoice')}
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t('invInvoices.emptyTitle')}
          description={t('invInvoices.emptyDesc')}
          action={
            <Button asChild>
              <Link to="/input-invoices">{t('invInvoices.newInvoice')}</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('invInvoices.countLabel')}</p>
              <p className="font-display text-lg leading-tight tabular-nums">{invoices.length}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('invInvoices.total')}</p>
              <p className="font-display text-lg leading-tight tabular-nums">{fmtMoney(sumBy(invoices, 'amount'))}</p>
            </div>
          </div>
          <InvoiceList
            invoices={invoices}
            supplierMap={supplierMap}
            itemMap={itemMap}
            storageMap={storageMap}
            onEdit={setEditing}
            onDelete={handleDelete}
          />

          <InvoiceEditDialog
            invoice={editing}
            suppliers={suppliers}
            items={items}
            storages={storages}
            onClose={() => setEditing(null)}
            onSaved={handleSaved}
          />
        </>
      )}
    </div>
  );
}