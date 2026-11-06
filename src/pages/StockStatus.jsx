import { useEffect, useMemo, useState } from 'react';
import { Boxes, PackageSearch, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import ItemOperationsDialog from '@/components/stock/ItemOperationsDialog';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildCountTotals, buildInputTotals, buildOnHand, mergeTotals } from '@/lib/inventory';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function StockStatus() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState({});
  const [onHand, setOnHand] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [storages, setStorages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [itemRows, invoiceRows, movementRows, countRows, storageRows] = await Promise.all([
        fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
        fetchList(base44.entities.InputInvoice, {}),
        fetchList(base44.entities.StockMovement, {}),
        fetchList(base44.entities.InventoryCount, {}),
        fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      ]);
      setItems(itemRows);
      setInvoices(invoiceRows);
      setMovements(movementRows);
      setStorages(storageRows);
      setPurchases(mergeTotals(buildInputTotals(invoiceRows), buildCountTotals(countRows)));
      setOnHand(buildOnHand(invoiceRows, movementRows));
      setLoading(false);
    };
    load();
  }, []);

  const rows = items.map((item) => {
    const quantity = onHand[item.id]?.quantity || 0;
    const price = avgCostOf(purchases, item.id);
    const minimum = Number(item.min_stock) || 0;
    return {
      id: item.id,
      name: item.name,
      unit: item.unit || '',
      quantity,
      price,
      value: quantity * price,
      low: item.min_stock_enabled && quantity <= minimum,
      minimum,
    };
  });

  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const lowRows = rows.filter((row) => row.low);
  const inStock = rows.filter((row) => row.quantity > 0).length;

  const operations = useMemo(() => {
    if (!selected) return [];
    const storageMap = new Map(storages.map((storage) => [storage.id, storage.name]));

    const purchaseLines = invoices.flatMap((invoice) =>
      (invoice.lines || [])
        .filter((line) => line.item_id === selected.id)
        .map((line, index) => {
          const quantity = Number(line.quantity) || 0;
          const unitPrice = Number(line.unit_price) || 0;
          return {
            key: `${invoice.id}-${index}`,
            kind: 'in',
            source: `${t('stock.invoice')} ${invoice.invoice_number || t('invInvoices.noNumber')}`,
            date: invoice.date,
            quantity,
            amount: quantity * unitPrice,
            place: storageMap.get(invoice.storage_id) || '',
            notes: invoice.notes || '',
          };
        }),
    );

    const movementLines = movements
      .filter((movement) => movement.item_id === selected.id)
      .map((movement) => ({
        key: movement.id,
        kind: movement.kind === 'out' ? 'out' : 'in',
        source: t('stock.movement'),
        date: movement.date,
        quantity: Number(movement.quantity) || 0,
        amount: 0,
        place: storageMap.get(movement.storage_id) || '',
        notes: movement.notes || '',
      }));

    return [...purchaseLines, ...movementLines].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selected, invoices, movements, storages, t]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('stock.eyebrow')}
        title={t('stock.title')}
        description={t('stock.description')}
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Boxes} label={t('stock.inStock')} value={inStock} tone="moss" />
        <StatCard icon={PackageSearch} label={t('inv.lowStock')} value={lowRows.length} tone="clay" />
        <StatCard icon={Wallet} label={t('inv.stockValue')} value={fmtMoney(totalValue)} tone="sand" />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Boxes} title={t('stock.emptyTitle')} description={t('stock.emptyDesc')} />
      ) : (
        <div>
          <p className="mb-2 text-[11px] text-muted-foreground">{t('stock.hint')}</p>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            <li className="hidden bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex sm:gap-3">
              <span className="flex-1">{t('param.inputs')}</span>
              <span className="w-28 text-end">{t('stock.onHand')}</span>
              <span className="w-28 text-end">{t('stock.unitPrice')}</span>
              <span className="w-32 text-end">{t('inv.stockValue')}</span>
            </li>
            {rows.map((row) => (
              <li
                key={row.id}
                onDoubleClick={() => setSelected(row)}
                className="flex cursor-pointer flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-accent/30"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{row.name}</p>
                  {row.low && (
                    <p className="mt-0.5 text-[11px] text-clay">
                      {t('dash.minimum')} {fmtNum(row.minimum, 0)} {row.unit}
                    </p>
                  )}
                </div>
                <span className="w-28 text-end text-sm tabular-nums">
                  {fmtNum(row.quantity, 1)}{' '}
                  <span className="text-xs text-muted-foreground">{row.unit}</span>
                </span>
                <span className="hidden w-28 text-end text-xs tabular-nums text-muted-foreground sm:block">
                  {row.price ? fmtMoney(row.price) : '—'}
                </span>
                <span className="w-32 text-end text-sm tabular-nums">{fmtMoney(row.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ItemOperationsDialog item={selected} operations={operations} onClose={() => setSelected(null)} />
    </div>
  );
}