import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Boxes, ArrowDownLeft, ArrowUpRight, Trash2, Warehouse } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import Segmented from '@/components/Segmented';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'seed', label: 'Seed' },
  { value: 'fertilizer', label: 'Fertiliser' },
  { value: 'pesticide', label: 'Pesticide' },
  { value: 'herbicide', label: 'Herbicide' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'packaging', label: 'Packaging' },
  { value: 'other', label: 'Other' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));
const UNITS = [
  { value: 'kg', label: 'kg' },
  { value: 'l', label: 'litres' },
  { value: 'bag', label: 'bags' },
  { value: 'pack', label: 'packs' },
  { value: 'unit', label: 'units' },
];
const STORAGE_KINDS = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'cold_room', label: 'Cold room' },
  { value: 'silo', label: 'Silo' },
  { value: 'shed', label: 'Shed' },
];
const STORAGE_LABEL = Object.fromEntries(STORAGE_KINDS.map((s) => [s.value, s.label]));

export default function Inventory() {
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
        eyebrow="Stores & inputs"
        title="Inventory"
        description="What is in the store, what is running out, and every movement in and out."
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
            <Plus className="mr-1.5 h-4 w-4" /> {tab === 'storages' ? 'New storage' : 'New input'}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Inputs tracked" value={items.length} />
        <MiniStat label="Low stock" value={lowStock.length} tone={lowStock.length ? 'clay' : 'sand'} />
        <MiniStat label="Stock value" value={fmtMoney(stockValue)} />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'inputs', label: `Inputs (${items.length})` },
          { value: 'storages', label: `Storages (${storages.length})` },
          { value: 'movements', label: `Movements (${movements.length})` },
        ]}
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : tab === 'inputs' ? (
        items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No inputs yet"
            description="Track seed, fertiliser, fuel and packaging with stock levels and minimum thresholds."
            action={<Button onClick={() => setItemDialog(true)}>Add an input</Button>}
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
                      {low && <StatusPill tone="clay">Low</StatusPill>}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {CATEGORY_LABEL[item.category] || 'Input'}
                      {storageMap[item.storage_id] ? ` · ${storageMap[item.storage_id].name}` : ''}
                      {item.unit_cost ? ` · ${fmtMoney(item.unit_cost)} / ${item.unit}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm tabular-nums', low && 'text-clay')}>
                      {fmtNum(item.stock, 1)} {item.unit}
                    </p>
                    <p className="text-[11px] text-muted-foreground">min {fmtNum(item.min_stock, 0)}</p>
                  </div>
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    <Button variant="outline" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => openMove(item, 'in')}>
                      Stock in
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-[11px]" onClick={() => openMove(item, 'out')}>
                      Stock out
                    </Button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(item);
                        setItemDialog(true);
                      }}
                      className="px-1.5 text-[11px] font-medium text-muted-foreground hover:underline"
                    >
                      Edit
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
            title="No storages yet"
            description="Add your warehouse, cold room or silo so inputs know where they live."
            action={<Button onClick={() => setStorageDialog(true)}>Add a storage</Button>}
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
                  className="rounded-2xl border border-border/70 bg-card p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg leading-tight">{storage.name}</p>
                    <StatusPill tone="sand">{STORAGE_LABEL[storage.kind] || 'Store'}</StatusPill>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{storage.location || 'No location set'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{count} inputs stored here</p>
                </button>
              );
            })}
          </div>
        )
      ) : movements.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No movements yet"
          description="Record stock coming in from suppliers or going out to the fields."
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
                    {itemMap[movement.item_id]?.name || 'Unknown input'}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fmtDate(movement.date)} · {inward ? 'In' : 'Out'}
                    {blockMap[movement.block_id] ? ` · ${blockMap[movement.block_id].name}` : ''}
                    {movement.notes ? ` · ${movement.notes}` : ''}
                  </p>
                </div>
                <div className="text-right">
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
                  aria-label="Delete movement"
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
      title={item ? 'Edit input' : 'New input'}
      onSubmit={submit}
      saving={saving}
      submitLabel={item ? 'Save input' : 'Add input'}
    >
      <Field label="Name">
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="NPK 15-15-15" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <SelectField value={form.category} onChange={(value) => setForm({ ...form, category: value })} options={CATEGORIES} />
        </Field>
        <Field label="Unit">
          <SelectField value={form.unit} onChange={(value) => setForm({ ...form, unit: value })} options={UNITS} />
        </Field>
        <Field label="Stock on hand">
          <Input type="number" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        </Field>
        <Field label="Minimum stock">
          <Input type="number" value={form.min_stock ?? ''} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
        </Field>
        <Field label="Cost per unit">
          <Input type="number" value={form.unit_cost ?? ''} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
        </Field>
        <Field label="Storage">
          <SelectField
            value={form.storage_id}
            onChange={(value) => setForm({ ...form, storage_id: value })}
            noneLabel="No storage"
            options={storages.map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {item?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          Delete this input
        </button>
      )}
    </FormDialog>
  );
}

function StorageDialog({ open, onOpenChange, storage, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: storage?.name || '',
      kind: storage?.kind || 'warehouse',
      location: storage?.location || '',
      capacity_note: storage?.capacity_note || '',
      notes: storage?.notes || '',
    });
  }, [open, storage]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      location: form.location || '',
      capacity_note: form.capacity_note || '',
      notes: form.notes || '',
    };
    if (storage?.id) await base44.entities.Storage.update(storage.id, payload);
    else await base44.entities.Storage.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!storage?.id) return;
    setSaving(true);
    await base44.entities.Storage.delete(storage.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={storage ? 'Edit storage' : 'New storage'}
      onSubmit={submit}
      saving={saving}
      submitLabel={storage ? 'Save storage' : 'Add storage'}
    >
      <Field label="Name">
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Main warehouse" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type">
          <SelectField value={form.kind} onChange={(value) => setForm({ ...form, kind: value })} options={STORAGE_KINDS} />
        </Field>
        <Field label="Location">
          <Input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Near the workshop" />
        </Field>
      </div>
      <Field label="Capacity">
        <Input
          value={form.capacity_note || ''}
          onChange={(e) => setForm({ ...form, capacity_note: e.target.value })}
          placeholder="40 tonnes"
        />
      </Field>
      <Field label="Notes">
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {storage?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          Delete this storage
        </button>
      )}
    </FormDialog>
  );
}

function MovementDialog({ open, onOpenChange, preset, items, blocks, onSave }) {
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
      title="Stock movement"
      description="Stock in records a purchase; stock out records use in the field."
      onSubmit={submit}
      saving={saving}
      submitLabel="Save movement"
    >
      <Field label="Input">
        <SelectField
          value={form.item_id}
          onChange={(value) => setForm({ ...form, item_id: value })}
          options={items.map((item) => ({ value: item.id, label: `${item.name} (${fmtNum(item.stock, 1)} ${item.unit})` }))}
          placeholder="Pick an input"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Direction">
          <SelectField
            value={form.kind}
            onChange={(value) => setForm({ ...form, kind: value })}
            options={[
              { value: 'in', label: 'Stock in' },
              { value: 'out', label: 'Stock out' },
            ]}
          />
        </Field>
        <Field label="Quantity">
          <Input
            type="number"
            step="0.1"
            value={form.quantity ?? ''}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            required
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Cost">
          <Input type="number" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Field>
      </div>
      {form.kind === 'out' && (
        <Field label="Used on block">
          <SelectField
            value={form.block_id}
            onChange={(value) => setForm({ ...form, block_id: value })}
            noneLabel="No block"
            options={blocks.map((block) => ({ value: block.id, label: block.name }))}
          />
        </Field>
      )}
      <Field label="Notes">
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}