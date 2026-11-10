import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Boxes, PackageSearch, Wallet } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/PageHeader';
import StatCard from '@/components/StatCard';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import ItemOperationsDialog from '@/components/stock/ItemOperationsDialog';
import StockFilters from '@/components/stock/StockFilters';
import TransferDialog from '@/components/stock/TransferDialog';
import { fetchList } from '@/lib/data';
import { avgCostOf, buildCountTotals, buildInputTotals, buildOnHand, buildStorageOnHand, mergeTotals } from '@/lib/inventory';
import { isMachineConsumableItem } from '@/lib/machineryCosts';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function StockStatus() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState({});
  const [onHand, setOnHand] = useState({});
  const [storageOnHand, setStorageOnHand] = useState({});
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [storages, setStorages] = useState([]);
  const [machines, setMachines] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [reports, setReports] = useState([]);
  const [storageFilter, setStorageFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      const [itemRows, invoiceRows, movementRows, countRows, storageRows, machineRows, blockRows, reportRows] =
        await Promise.all([
          fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
          fetchList(base44.entities.InputInvoice, {}),
          fetchList(base44.entities.StockMovement, {}),
          fetchList(base44.entities.InventoryCount, {}),
          fetchList(base44.entities.Storage, {}, { sort: 'name' }),
          fetchList(base44.entities.Machine, {}, { sort: 'name' }),
          fetchList(base44.entities.FarmBlock, {}),
          fetchList(base44.entities.DailyReport, {}),
        ]);
      setItems(itemRows);
      setInvoices(invoiceRows);
      setMovements(movementRows);
      setCounts(countRows);
      setStorages(storageRows);
      setMachines(machineRows);
      setBlocks(blockRows);
      setReports(reportRows);
      setPurchases(mergeTotals(buildInputTotals(invoiceRows), buildCountTotals(countRows)));
      setOnHand(buildOnHand(invoiceRows, movementRows, countRows));
      setStorageOnHand(buildStorageOnHand(invoiceRows, movementRows, countRows));
      setLoading(false);
    };
    load();
  }, [refreshKey]);

  const categories = useMemo(
    () => [...new Set(items.map((item) => (item.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const rows = useMemo(
    () =>
      items
        .filter((item) => !categoryFilter || (item.category || '').trim() === categoryFilter)
        .map((item) => {
          const quantity = storageFilter
            ? storageOnHand[storageFilter]?.[item.id] || 0
            : onHand[item.id]?.quantity || 0;
          const price = avgCostOf(purchases, item.id);
          const minimum = Number(item.min_stock) || 0;
          return {
            id: item.id,
            name: item.name,
            category: item.category || '',
            unit: item.unit || '',
            quantity,
            price,
            value: quantity * price,
            low: item.min_stock_enabled && quantity <= minimum,
            negative: quantity < -0.0001,
            minimum,
          };
        })
        .filter((row) => !storageFilter || row.quantity !== 0),
    [items, onHand, storageOnHand, purchases, storageFilter, categoryFilter],
  );

  const totalValue = rows.reduce((sum, row) => sum + row.value, 0);
  const lowRows = rows.filter((row) => row.low);
  const inStock = rows.filter((row) => row.quantity > 0).length;

  const machineConsumables = useMemo(
    () => new Set(items.filter(isMachineConsumableItem).map((item) => item.id)),
    [items],
  );

  const operations = useMemo(() => {
    if (!selected) return [];
    const storageMap = new Map(storages.map((storage) => [storage.id, storage]));
    const machineMap = new Map(machines.map((machine) => [machine.id, machine.name]));
    const blockMap = new Map(blocks.map((block) => [block.id, block]));
    const reportMap = new Map(reports.map((report) => [report.id, report]));

    const purchaseLines = invoices.flatMap((invoice) =>
      (invoice.lines || [])
        .filter((line) => line.item_id === selected.id)
        .map((line, index) => {
          const quantity = Number(line.quantity) || 0;
          const unitPrice = Number(line.unit_price) || 0;
          const storage = storageMap.get(invoice.storage_id);
          return {
            key: `${invoice.id}-${index}`,
            kind: 'in',
            source: `${t('stock.invoice')} ${invoice.invoice_number || t('invInvoices.noNumber')}`,
            date: invoice.date,
            quantity,
            amount: quantity * unitPrice,
            place: storage?.name || '',
            notes: invoice.notes || '',
            machine: '',
            farm: storage?.farm || '',
          };
        }),
    );

    const movementLines = movements
      .filter((movement) => movement.item_id === selected.id && !movement.count_id)
      .map((movement) => {
        const storage = storageMap.get(movement.storage_id);
        const report = reportMap.get(movement.report_id);
        const block = report ? blockMap.get(report.block_id) : null;
        const machineId =
          movement.machine_id ||
          (report?.machinery || []).find(
            (line) => line.machine_id && line.fuel_item_id === selected.id,
          )?.machine_id;
        return {
          key: movement.id,
          kind: movement.kind === 'out' ? 'out' : 'in',
          source: movement.transfer_id ? t('stock.transfer') : t('stock.movement'),
          date: movement.date,
          quantity: Number(movement.quantity) || 0,
          amount: 0,
          place: storage?.name || '',
          notes: movement.notes || '',
          machine: machineMap.get(machineId) || '',
          farm: block?.farm || storage?.farm || '',
        };
      });

    const countLines = counts.flatMap((count) =>
      (count.lines || [])
        .filter((line) => line.item_id === selected.id)
        .map((line, index) => {
          const storage = storageMap.get(count.storage_id);
          return {
            key: `${count.id}-${index}`,
            kind: 'count',
            source: t('stock.inventory'),
            date: count.date,
            quantity: Number(line.quantity) || 0,
            amount: (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
            place: storage?.name || '',
            notes: count.responsible || '',
            machine: '',
            farm: storage?.farm || '',
          };
        }),
    );

    return [...purchaseLines, ...movementLines, ...countLines].sort((a, b) =>
      (b.date || '').localeCompare(a.date || ''),
    );
  }, [selected, invoices, movements, counts, storages, machines, blocks, reports, t]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('stock.eyebrow')}
        title={t('stock.title')}
        description={t('stock.description')}
        action={
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setTransferOpen(true)}
            disabled={!items.length || storages.length < 2}
          >
            <ArrowLeftRight className="h-4 w-4" />
            {t('stock.transferAction')}
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={Boxes} label={t('stock.inStock')} value={inStock} tone="moss" />
        <StatCard icon={PackageSearch} label={t('inv.lowStock')} value={lowRows.length} tone="clay" />
        <StatCard icon={Wallet} label={t('inv.stockValue')} value={fmtMoney(totalValue)} tone="sand" />
      </section>

      {loading ? (
        <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Boxes} title={t('stock.emptyTitle')} description={t('stock.emptyDesc')} />
      ) : (
        <div>
          <div className="mb-4 space-y-2">
            <StockFilters
              storages={storages}
              categories={categories}
              storage={storageFilter}
              category={categoryFilter}
              onStorage={setStorageFilter}
              onCategory={setCategoryFilter}
            />
            <p className="text-[11px] text-muted-foreground">
              {rows.some((row) => row.negative) ? t('stock.negativeHint') : t('stock.hint')}
            </p>
          </div>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            <li className="hidden bg-secondary/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.14em] text-muted-foreground sm:flex sm:gap-3">
              <span className="flex-1">{t('param.inputs')}</span>
              <span className="w-28 text-end">{t('stock.onHand')}</span>
              <span className="w-28 text-end">{t('stock.unitPrice')}</span>
              <span className="w-32 text-end">{t('inv.stockValue')}</span>
            </li>
            {rows.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">{t('stock.emptyFiltered')}</li>
            )}
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
                <span
                  className={cn(
                    'w-28 text-end text-sm tabular-nums',
                    row.negative && 'font-medium text-destructive',
                  )}
                >
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

      <ItemOperationsDialog
        item={selected}
        operations={operations}
        groupBy={selected && machineConsumables.has(selected.id) ? 'machine' : 'farm'}
        onClose={() => setSelected(null)}
      />

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        items={items}
        storages={storages}
        storageOnHand={storageOnHand}
        onSaved={() => setRefreshKey((key) => key + 1)}
      />
    </div>
  );
}