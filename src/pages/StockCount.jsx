import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import CountForm from '@/components/inventorycount/CountForm';
import { useToast } from '@/components/ui/use-toast';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildInputTotals } from '@/lib/inventory';
import { useI18n } from '@/lib/I18nContext';

export default function StockCount() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [storages, setStorages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [itemRows, storageRows, invoiceRows] = await Promise.all([
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
    ]);
    setItems(itemRows);
    setStorages(storageRows);
    setInvoices(invoiceRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = buildInputTotals(invoices);

  const onSaved = () => {
    load();
    toast({ title: t('stockCount.saved'), description: t('stockCount.savedDesc') });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('stockCount.eyebrow')}
        title={t('stockCount.title')}
        description={t('stockCount.description')}
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <CountForm
          items={items}
          storages={storages}
          unitCostFor={(itemId) => Math.round(avgCostOf(totals, itemId) * 100) / 100}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}