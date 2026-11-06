import { useEffect, useState } from 'react';
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
import { fmtMoney, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export const MAINTENANCE_KINDS = ['service', 'repair', 'inspection'];

export default function MaintenanceLogDialog({
  open, onOpenChange, log, machines, items = [], storages = [], unitCostFor, onHandFor, onSaved,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [parts, setParts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const machine = log ? machines.find((row) => row.id === log.machine_id) : null;
    setForm({
      machine_id: log?.machine_id || '',
      date: log?.date || todayISO(),
      kind: log?.kind || 'service',
      description: log?.description || '',
      cost: log?.cost ?? '',
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

  // Availability: current stock, plus what this operation had already withdrawn.
  const availableFor = (itemId) =>
    (onHandFor(itemId) || 0) +
    (log?.parts || [])
      .filter((line) => line.item_id === itemId)
      .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

  const shortages = findShortages(aggregateQuantities(filledParts), availableFor);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.machine_id || shortages.length) return;
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
      submitDisabled={shortages.length > 0}
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

      <MaintenancePartsEditor
        parts={parts}
        onChange={setParts}
        items={items}
        unitCostFor={unitCostFor}
        availableFor={availableFor}
      />

      <StockShortageAlert shortages={shortages} items={items} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('maint.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => setForm({ ...form, storage_id: value })}
            noneLabel={t('maint.noStorage')}
            options={storages.map((storage) => ({
              value: storage.id,
              label: storage.farm ? `${storage.name} · ${storage.farm}` : storage.name,
            }))}
          />
        </Field>
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