import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import CountForm from '@/components/inventorycount/CountForm';
import CountHistory from '@/components/inventorycount/CountHistory';
import CountDetailDialog from '@/components/inventorycount/CountDetailDialog';
import { useToast } from '@/components/ui/use-toast';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildInputTotals, buildOnHand } from '@/lib/inventory';
import { useI18n } from '@/lib/I18nContext';

export default function StockCount() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [storages, setStorages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    const [itemRows, storageRows, invoiceRows, movementRows, countRows, user] = await Promise.all([
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
      fetchList(base44.entities.StockMovement, {}),
      fetchList(base44.entities.InventoryCount, {}, { sort: '-date' }),
      base44.auth.me(),
    ]);
    setCurrentUser(user);
    setItems(itemRows);
    setStorages(storageRows);
    setInvoices(invoiceRows);
    setMovements(movementRows);
    setCounts(countRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const totals = buildInputTotals(invoices);
  const onHand = buildOnHand(invoices, movements);
  const onHandFor = (itemId) => onHand[itemId]?.quantity || 0;

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
        <>
          <CountForm
            items={items}
            storages={storages}
            unitCostFor={(itemId) => Math.round(avgCostOf(totals, itemId) * 100) / 100}
            onHandFor={onHandFor}
            responsible={currentUser?.full_name || ''}
            onSaved={onSaved}
          />

          <CountHistory counts={counts} storages={storages} onOpen={setDetail} />
        </>
      )}

      <CountDetailDialog
        open={Boolean(detail)}
        onOpenChange={(open) => !open && setDetail(null)}
        count={detail}
        items={items}
        storages={storages}
      />
    </div>
  );
}