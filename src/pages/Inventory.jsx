import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Boxes, ArrowDownLeft, ArrowUpRight, Trash2, Warehouse } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import Segmented from '@/components/Segmented';
import StorageDialog from '@/components/storages/StorageDialog';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const CATEGORIES = ['seed', 'fertilizer', 'pesticide', 'herbicide', 'fuel', 'packaging', 'other'];
const UNITS = ['kg', 'l', 'bag', 'pack', 'unit'];

export default function Inventory() {
  const { t } = useI18n();
  const [tab, setTab] = useState('inputs');
  const [items, setItems] = useState([]);
  const [storages, setStorages] = useState([]);
  const [movements, setMovements] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [storageDialog, setStorageDialog] = useState(false);
  const [editingStorage, setEditingStorage] = useState(null);
  const [moveDialog, setMoveDialog] = useState(false);
  const [moveItem, setMoveItem] = useState(null);

  const load = async () => {
    const [itemRows, storageRows, movementRows, blockRows] = await Promise.all([
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      fetchList(base44.entities.StockMovement, {}, { sort: '-date' }),
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
    ]);
    setItems(itemRows);
    setStorages(storageRows);
    setMovements(movementRows);
    setBlocks(blockRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const storageMap = useMemo(() => byId(storages), [storages]);
  const itemMap = useMemo(() => byId(items), [items]);
  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const lowStock = items.filter((item) => (Number(item.stock) || 0) <= (Number(item.min_stock) || 0));
  const stockValue = items.reduce((sum, item) => sum + (Number(item.stock) || 0) * (Number(item.unit_cost) || 0), 0);

  const applyStock = async (itemId, delta) => {
    const item = items.find((row) => row.id === itemId);
    if (!item) return;
    const next = Math.max(0, (Number(item.stock) || 0) + delta);
    setItems((prev) => prev.map((row) => (row.id === itemId ? { ...row, stock: next } : row)));
    await base44.entities.InputItem.update(itemId, { stock: next });
  };

  const saveMovement = async (payload) => {
    await base44.entities.StockMovement.create(payload);
    await applyStock(payload.item_id, payload.kind === 'in' ? payload.quantity : -payload.quantity);
    setMovements(await fetchList(base44.entities.StockMovement, {}, { sort: '-date' }));
  };

  const removeMovement = async (movement) => {
    setMovements((prev) => prev.filter((row) => row.id !== movement.id));
    await base44.entities.StockMovement.delete(movement.id);
    await applyStock(movement.item_id, movement.kind === 'in' ? -movement.quantity : movement.quantity);
  };

  const openMove = (item, kind = 'in') => {
    setMoveItem({ item, kind });
    setMoveDialog(true);
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
          { value: 'movements', label: `${t('inv.tabMovements')} (${movements.length})` },
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
              const low = (Number(item.stock) || 0) <= (Number(item.min_stock) || 0);
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      {low && <StatusPill tone="clay">{t('common.low')}</StatusPill>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {t(`icat.${item.category}`)}
                      {storageMap[item.storage_id] ? ` · ${storageMap[item.storage_id].name}` : ''}
                      {item.unit_cost ? ` · ${fmtMoney(item.unit_cost)} / ${item.unit}` : ''}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className={cn('text-sm tabular-nums', low && 'text-clay')}>
                      {fmtNum(item.stock, 1)} {item.unit}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{t('inv.minPrefix')} {fmtNum(item.min_stock, 0)}</p>
                  </div>
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => openMove(item, 'in')}>
                      {t('inv.stockIn')}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => openMove(item, 'out')}>
                      {t('inv.stockOut')}
                    </Button>
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
      ) : tab === 'storages' ? (
        storages.length === 0 ? (
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
        )
      ) : movements.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('inv.emptyMovementsTitle')}
          description={t('inv.emptyMovementsDesc')}
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {movements.map((movement) => {
            const inward = movement.kind === 'in';
            return (
              <li key={movement.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    inward ? 'bg-primary/10 text-primary' : 'bg-clay/10 text-clay',
                  )}
                >
                  {inward ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {itemMap[movement.item_id]?.name || t('inv.unknownInput')}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fmtDate(movement.date)} · {inward ? t('inv.in') : t('inv.out')}
                    {blockMap[movement.block_id] ? ` · ${blockMap[movement.block_id].name}` : ''}
                    {movement.notes ? ` · ${movement.notes}` : ''}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-sm tabular-nums">
                    {inward ? '+' : '−'}
                    {fmtNum(movement.quantity, 1)} {itemMap[movement.item_id]?.unit || ''}
                  </p>
                  {movement.cost ? <p className="text-[11px] text-muted-foreground">{fmtMoney(movement.cost)}</p> : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMovement(movement)}
                  aria-label={t('common.deleteMovement')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ItemDialog
        open={itemDialog}
        onOpenChange={setItemDialog}
        item={editingItem}
        storages={storages}
        onSaved={load}
      />
      <StorageDialog
        open={storageDialog}
        onOpenChange={setStorageDialog}
        storage={editingStorage}
        onSaved={load}
      />
      <MovementDialog
        open={moveDialog}
        onOpenChange={setMoveDialog}
        preset={moveItem}
        items={items}
        blocks={blocks}
        onSave={saveMovement}
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

function ItemDialog({ open, onOpenChange, item, storages, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: item?.name || '',
      category: item?.category || 'seed',
      unit: item?.unit || 'kg',
      stock: item?.stock ?? '',
      min_stock: item?.min_stock ?? '',
      unit_cost: item?.unit_cost ?? '',
      storage_id: item?.storage_id || '',
      notes: item?.notes || '',
    });
  }, [open, item]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      unit: form.unit,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      storage_id: form.storage_id,
      notes: form.notes || '',
    };
    if (item?.id) await base44.entities.InputItem.update(item.id, payload);
    else await base44.entities.InputItem.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!item?.id) return;
    setSaving(true);
    await base44.entities.InputItem.delete(item.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t('itemDialog.editTitle') : t('itemDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={item ? t('itemDialog.save') : t('itemDialog.add')}
    >
      <Field label={t('common.name')}>
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NPK 15-15-15" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.category')}>
          <SelectField
            value={form.category}
            onChange={(value) => setForm({ ...form, category: value })}
            options={CATEGORIES.map((value) => ({ value, label: t(`icat.${value}`) }))}
          />
        </Field>
        <Field label={t('itemDialog.unit')}>
          <SelectField
            value={form.unit}
            onChange={(value) => setForm({ ...form, unit: value })}
            options={UNITS.map((value) => ({ value, label: t(`u.${value}`) }))}
          />
        </Field>
        <Field label={t('itemDialog.stockOnHand')}>
          <Input type="number" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </Field>
        <Field label={t('itemDialog.minStock')}>
          <Input type="number" value={form.min_stock ?? ''} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
        </Field>
        <Field label={t('itemDialog.costUnit')}>
          <Input type="number" value={form.unit_cost ?? ''} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        </Field>
        <Field label={t('itemDialog.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => setForm({ ...form, storage_id: value })}
            noneLabel={t('itemDialog.noStorage')}
            options={storages.map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {item?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('itemDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}

function MovementDialog({ open, onOpenChange, preset, items, blocks, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      item_id: preset?.item?.id || '',
      kind: preset?.kind || 'in',
      quantity: '',
      date: todayISO(),
      cost: '',
      block_id: '',
      notes: '',
    });
  }, [open, preset]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.item_id || !Number(form.quantity)) return;
    setSaving(true);
    await onSave({
      item_id: form.item_id,
      kind: form.kind,
      quantity: Number(form.quantity),
      date: form.date || todayISO(),
      cost: Number(form.cost) || 0,
      block_id: form.block_id,
      notes: form.notes || '',
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('moveDialog.title')}
      description={t('moveDialog.desc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('moveDialog.save')}
    >
      <Field label={t('inv.input')}>
        <SelectField
          value={form.item_id}
          onChange={(value) => setForm({ ...form, item_id: value })}
          options={items.map((item) => ({ value: item.id, label: `${item.name} (${fmtNum(item.stock, 1)} ${item.unit})` }))}
          placeholder={t('moveDialog.pickInput')}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('moveDialog.direction')}>
          <SelectField
            value={form.kind}
            onChange={(value) => setForm({ ...form, kind: value })}
            options={[
              { value: 'in', label: t('inv.stockIn') },
              { value: 'out', label: t('inv.stockOut') },
            ]}
          />
        </Field>
        <Field label={t('common.quantity')}>
          <Input
            type="number"
            step="0.1"
            value={form.quantity ?? ''}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
        </Field>
        <Field label={t('common.date')}>
          <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label={t('common.cost')}>
          <Input type="number" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Field>
      </div>
      {form.kind === 'out' && (
        <Field label={t('moveDialog.usedOnBlock')}>
          <SelectField
            value={form.block_id}
            onChange={(value) => setForm({ ...form, block_id: value })}
            noneLabel={t('moveDialog.noBlock')}
            options={blocks.map((block) => ({ value: block.id, label: block.name }))}
          />
        </Field>
      )}
      <Field label={t('common.notes')}>
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}