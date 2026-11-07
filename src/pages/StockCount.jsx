import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import CountForm from '@/components/inventorycount/CountForm';
import CountHistory from '@/components/inventorycount/CountHistory';
import CountDetailDialog from '@/components/inventorycount/CountDetailDialog';
import { useToast } from '@/components/ui/use-toast';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildInputTotals, buildOnHand, buildStorageOnHand } from '@/lib/inventory';
import { deleteInventoryCount } from '@/lib/countStock';
import { findStockUsages } from '@/lib/stockUsage';
import StockUsageBlockedDialog from '@/components/inventorycount/StockUsageBlockedDialog';
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
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [usageBlock, setUsageBlock] = useState(null);

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
  // Le constat en cours d'édition est exclu : le stock affiché est celui d'avant sa validation.
  const activeCounts = useMemo(
    () => (editing ? counts.filter((row) => row.id !== editing.id) : counts),
    [counts, editing],
  );
  const onHand = useMemo(
    () => buildOnHand(invoices, movements, activeCounts),
    [invoices, movements, activeCounts],
  );
  const storageOnHand = useMemo(
    () => buildStorageOnHand(invoices, movements, activeCounts),
    [invoices, movements, activeCounts],
  );
  const stockFor = (itemId, storageId) =>
    storageId ? storageOnHand[storageId]?.[itemId]?.quantity || 0 : onHand[itemId]?.quantity || 0;

  const onSaved = (mode) => {
    setEditing(null);
    load();
    toast({
      title: mode === 'edit' ? t('stockCount.updated') : t('stockCount.saved'),
      description: mode === 'edit' ? t('stockCount.updatedDesc') : t('stockCount.savedDesc'),
    });
  };

  const remove = async (count) => {
    if (!count) return;
    // Un intrant déjà consommé doit d'abord être retiré des interventions liées.
    const used = await findStockUsages((count.lines || []).map((line) => line.item_id));
    if (used.length) {
      setUsageBlock(used);
      return;
    }
    setDeleting(true);
    await deleteInventoryCount(count);
    setDeleting(false);
    setDetail(null);
    if (editing?.id === count.id) setEditing(null);
    load();
    toast({ title: t('inv.countDeleted') });
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
            key={editing?.id || 'new'}
            items={items}
            storages={storages}
            count={editing}
            onCancel={() => setEditing(null)}
            unitCostFor={(itemId) => Math.round(avgCostOf(totals, itemId) * 100) / 100}
            stockFor={stockFor}
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
        deleting={deleting}
        onEdit={(count) => {
          setDetail(null);
          setEditing(count);
        }}
        onDelete={remove}
      />

      <StockUsageBlockedDialog
        open={Boolean(usageBlock)}
        onOpenChange={(open) => !open && setUsageBlock(null)}
        usages={usageBlock || []}
        mode="delete"
      />
    </div>
  );
}