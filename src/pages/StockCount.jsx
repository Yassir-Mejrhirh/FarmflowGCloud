import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import CountForm from '@/components/inventorycount/CountForm';
import CountHistory from '@/components/inventorycount/CountHistory';
import CountDetailDialog from '@/components/inventorycount/CountDetailDialog';
import { useToast } from '@/components/ui/use-toast';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildInputTotals, buildOnHand } from '@/lib/inventory';
import { deleteInventoryCount } from '@/lib/countStock';
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
  const onHand = useMemo(() => buildOnHand(invoices, movements), [invoices, movements]);
  // En modification, le stock de référence exclut les ajustements du constat en cours.
  const onHandWithoutEditing = useMemo(
    () => (editing ? buildOnHand(invoices, movements.filter((row) => row.count_id !== editing.id)) : null),
    [invoices, movements, editing],
  );
  const onHandFor = (itemId, excludeCountId) => {
    const map = excludeCountId && onHandWithoutEditing ? onHandWithoutEditing : onHand;
    return map[itemId]?.quantity || 0;
  };

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
        deleting={deleting}
        onEdit={(count) => {
          setDetail(null);
          setEditing(count);
        }}
        onDelete={remove}
      />
    </div>
  );
}