import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export const MAINTENANCE_KINDS = ['service', 'repair', 'inspection'];

export default function MaintenanceLogDialog({ open, onOpenChange, log, machines, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
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
      hours_reading: log?.hours_reading ?? machine?.hours ?? '',
    });
  }, [open, log, machines]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.machine_id) return;
    setSaving(true);

    const payload = {
      machine_id: form.machine_id,
      date: form.date || todayISO(),
      kind: form.kind,
      description: form.description || '',
      cost: Number(form.cost) || 0,
      hours_reading: Number(form.hours_reading) || 0,
    };

    if (log) await base44.entities.MaintenanceLog.update(log.id, payload);
    else await base44.entities.MaintenanceLog.create(payload);

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
        <Field label={t('common.cost')}>
          <Input type="number" value={form.cost ?? ''} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
        </Field>
        <Field label={t('maintDialog.hoursReading')}>
          <Input
            type="number"
            value={form.hours_reading ?? ''}
            onChange={(e) => setForm({ ...form, hours_reading: e.target.value })}
          />
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