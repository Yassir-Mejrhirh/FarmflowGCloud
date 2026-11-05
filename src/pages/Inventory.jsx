import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Boxes, Warehouse } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import Segmented from '@/components/Segmented';
import StorageDialog from '@/components/storages/StorageDialog';
import ItemDialog from '@/components/inventory/ItemDialog';
import { Button } from '@/components/ui/button';
import { fetchList, byId } from '@/lib/data';
import { buildInputTotals } from '@/lib/inventory';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const { t } = useI18n();
  const [tab, setTab] = useState('inputs');
  const [items, setItems] = useState([]);
  const [storages, setStorages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [storageDialog, setStorageDialog] = useState(false);
  const [editingStorage, setEditingStorage] = useState(null);

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

  const totals = useMemo(() => buildInputTotals(invoices), [invoices]);

  const quantityOf = (item) => totals[item.id]?.quantity || 0;
  const avgCostOf = (item) => {
    const row = totals[item.id];
    return row && row.quantity ? row.cost / row.quantity : 0;
  };
  const isLow = (item) => item.min_stock_enabled && quantityOf(item) <= (Number(item.min_stock) || 0);

  const lowStock = items.filter(isLow);
  const stockValue = items.reduce((sum, item) => sum + (totals[item.id]?.cost || 0), 0);
  const categoryLabel = (value) => {
    if (!value) return '';
    const key = `icat.${value}`;
    const label = t(key);
    return label === key ? value : label;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('inv.eyebrow')}
        title={t('inv.title')}
        description={t('inv.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              if (tab === 'storages') {
                setEditingStorage(null);
                setStorageDialog(true);
              } else {
                setEditingItem(null);
                setItemDialog(true);
              }
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {tab === 'storages' ? t('inv.newStorage') : t('inv.newInput')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t('inv.inputsTracked')} value={items.length} />
        <MiniStat label={t('inv.lowStock')} value={lowStock.length} tone={lowStock.length ? 'clay' : 'sand'} />
        <MiniStat label={t('inv.stockValue')} value={fmtMoney(stockValue)} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'inputs', label: `${t('inv.tabInputs')} (${items.length})` },
          { value: 'storages', label: `${t('inv.tabStorages')} (${storages.length})` },
        ]}
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : tab === 'inputs' ? (
        items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title={t('inv.emptyInputsTitle')}
            description={t('inv.emptyInputsDesc')}
            action={<Button onClick={() => setItemDialog(true)}>{t('inv.addInput')}</Button>}
          />
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {items.map((item) => {
              const low = isLow(item);
              const quantity = quantityOf(item);
              const avgCost = avgCostOf(item);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {low && <StatusPill tone="clay">{t('common.low')}</StatusPill>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[categoryLabel(item.category), item.formulation].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {avgCost
                        ? `${t('inv.pmp')} ${fmtMoney(avgCost)}${item.unit ? ` / ${item.unit}` : ''}`
                        : t('inv.noPurchase')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={cn('text-sm tabular-nums', low && 'text-clay')}>
                      {fmtNum(quantity, 1)} {item.unit}
                    </p>
                    {item.min_stock_enabled && (
                      <p className="text-[11px] text-muted-foreground">
                        {t('inv.minPrefix')} {fmtNum(item.min_stock, 0)}
                      </p>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setItemDialog(true);
                      }}
                      className="px-1.5 text-[11px] font-medium text-muted-foreground hover:underline"
                    >
                      {t('common.edit')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : storages.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title={t('inv.emptyStoragesTitle')}
          description={t('inv.emptyStoragesDesc')}
          action={<Button onClick={() => setStorageDialog(true)}>{t('inv.addStorage')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {storages.map((storage) => {
            const count = items.filter((item) => item.storage_id === storage.id).length;
            return (
              <button
                key={storage.id}
                type="button"
                onClick={() => {
                  setEditingStorage(storage);
                  setStorageDialog(true);
                }}
                className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-display text-lg leading-tight">{storage.name}</p>
                  <StatusPill tone="sand">{t(`sk.${storage.kind}`)}</StatusPill>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{storage.location || t('inv.noLocation')}</p>
                <p className="mt-2 text-xs text-muted-foreground">{t('inv.inputsStored', { n: count })}</p>
              </button>
            );
          })}
        </div>
      )}

      <ItemDialog
        open={itemDialog}
        onOpenChange={setItemDialog}
        item={editingItem}
        onSaved={load}
      />
      <StorageDialog
        open={storageDialog}
        onOpenChange={setStorageDialog}
        storage={editingStorage}
        onSaved={load}
      />
    </div>
  );
}

function MiniStat({ label, value, tone = 'sand' }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={cn('font-display text-lg leading-tight tabular-nums', tone === 'clay' && 'text-clay')}>{value}</p>
    </div>
  );
}