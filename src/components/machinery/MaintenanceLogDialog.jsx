import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import MaintenancePartsEditor from '@/components/machinery/MaintenancePartsEditor';
import StockShortageAlert from '@/components/stock/StockShortageAlert';
import { aggregateQuantities, findShortages } from '@/lib/stockGuard';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { syncMaintenanceMovements } from '@/lib/maintenanceStock';
import { storageFarms, storagesForFarm } from '@/lib/storageScope';
import { fmtMoney, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export const MAINTENANCE_KINDS = ['service', 'vidange', 'repair', 'inspection'];

export default function MaintenanceLogDialog({
  open, onOpenChange, log, machines, items = [], storages = [], storageOnHand = {}, unitCostFor, onSaved,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [parts, setParts] = useState([]);
  const [saving, setSaving] = useState(false);

  // Farms served by a depot, then the depots associated with the chosen farm only.
  const farms = useMemo(
    () => [...new Set(storages.flatMap((storage) => storageFarms(storage)))].sort((a, b) => a.localeCompare(b)),
    [storages],
  );
  const farmStorages = useMemo(() => storagesForFarm(storages, form.farm), [storages, form.farm]);

  useEffect(() => {
    if (!open) return;
    const machine = log ? machines.find((row) => row.id === log.machine_id) : null;
    const storage = log ? storages.find((row) => row.id === log.storage_id) : null;
    setForm({
      machine_id: log?.machine_id || '',
      date: log?.date || todayISO(),
      kind: log?.kind || 'service',
      description: log?.description || '',
      cost: log?.cost ?? '',
      farm: storage?.farm || '',
      storage_id: log?.storage_id || '',
      hours_reading: log?.hours_reading ?? machine?.hours ?? '',
    });
    setParts(
      (log?.parts || []).map((line) => ({
        item_id: line.item_id || '',
        quantity: line.quantity ?? '',
        unit_price: line.unit_price ?? '',
      })),
    );
  }, [open, log, machines]);

  const filledParts = parts.filter((line) => line.item_id && Number(line.quantity) > 0);
  const partsValue = filledParts.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );
  const totalCost = (Number(form.cost) || 0) + partsValue;

  // Stock of the chosen depot only, plus what this operation had already withdrawn.
  const storageTotals = storageOnHand[form.storage_id] || {};
  const availableFor = (itemId) =>
    (Number(storageTotals[itemId]?.quantity) || 0) +
    (log?.parts || [])
      .filter((line) => line.item_id === itemId)
      .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const availableItems = useMemo(
    () => items.filter((item) => (Number(storageTotals[item.id]?.quantity) || 0) > 0),
    [items, storageTotals],
  );

  const shortages = findShortages(aggregateQuantities(filledParts), availableFor);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.machine_id || shortages.length) return;
    if (filledParts.length > 0 && !form.storage_id) return;
    setSaving(true);

    const payload = {
      machine_id: form.machine_id,
      date: form.date || todayISO(),
      kind: form.kind,
      description: form.description || '',
      cost: Number(form.cost) || 0,
      storage_id: form.storage_id || '',
      hours_reading: Number(form.hours_reading) || 0,
      parts: filledParts.map((line) => ({
        item_id: line.item_id,
        quantity: Number(line.quantity) || 0,
        unit_price: Number(line.unit_price) || 0,
        unit: items.find((row) => row.id === line.item_id)?.unit || '',
      })),
    };

    let savedId = log?.id;
    if (log) await base44.entities.MaintenanceLog.update(log.id, payload);
    else savedId = (await base44.entities.MaintenanceLog.create(payload)).id;

    await syncMaintenanceMovements({ ...payload, id: savedId }, t('maint.movementNote'));

    const target = machines.find((row) => row.id === form.machine_id);
    const reading = Number(form.hours_reading) || 0;
    if (target && reading > (Number(target.hours) || 0)) {
      await base44.entities.Machine.update(target.id, { hours: reading });
    }

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={log ? t('maint.editTitle') : t('maintDialog.title')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('maintDialog.save')}
      submitDisabled={shortages.length > 0 || (filledParts.length > 0 && !form.storage_id)}
      wide
    >
      <Field label={t('common.machine')}>
        <SelectField
          value={form.machine_id}
          onChange={(value) => {
            const target = machines.find((row) => row.id === value);
            setForm((prev) => ({ ...prev, machine_id: value, hours_reading: target?.hours ?? prev.hours_reading }));
          }}
          options={machines.map((row) => ({ value: row.id, label: row.name }))}
          placeholder={t('maintDialog.pickMachine')}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.date')}>
          <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label={t('common.type')}>
          <SelectField
            value={form.kind}
            onChange={(value) => setForm({ ...form, kind: value })}
            options={MAINTENANCE_KINDS.map((value) => ({ value, label: t(`mk.${value}`) }))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('maint.farm')}>
          <SelectField
            value={form.farm}
            onChange={(value) => {
              const scoped = storagesForFarm(storages, value);
              setForm((prev) => ({
                ...prev,
                farm: value,
                storage_id: scoped.length === 1 ? scoped[0].id : '',
              }));
            }}
            noneLabel={t('maint.noFarm')}
            options={farms.map((farm) => ({ value: farm, label: farm }))}
          />
        </Field>
        <Field label={t('maint.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => setForm({ ...form, storage_id: value })}
            noneLabel={t('maint.noStorage')}
            options={farmStorages.map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>

      <MaintenancePartsEditor
        parts={parts}
        onChange={setParts}
        items={items}
        availableItems={availableItems}
        unitCostFor={unitCostFor}
        availableFor={availableFor}
        storageChosen={!!form.storage_id}
      />

      <StockShortageAlert shortages={shortages} items={items} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('maintDialog.hoursReading')}>
          <Input
            type="number"
            value={form.hours_reading ?? ''}
            onChange={(e) => setForm({ ...form, hours_reading: e.target.value })}
          />
        </Field>
        <Field label={t('maint.otherCost')}>
          <Input type="number" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Field>
        <Field label={t('maint.total')}>
          <p className="flex h-9 items-center text-sm font-medium tabular-nums">{fmtMoney(totalCost)}</p>
        </Field>
      </div>

      <Field label={t('maintDialog.doneLabel')}>
        <Textarea
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          placeholder={t('maintDialog.donePlaceholder')}
        />
      </Field>
    </FormDialog>
  );
}