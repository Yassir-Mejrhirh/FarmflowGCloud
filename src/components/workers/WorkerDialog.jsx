import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/I18nContext';

const PRIORITIES = ['1', '2', '3'];
const DEFINITIONS = ['nominative', 'salary_band'];
const NEW_FUNCTION = '__new_function__';

const emptyForm = {
  name: '',
  priority: '1',
  definition: '',
  worker_function: '',
  farm: '',
  team: '',
  registration_number: '',
  declared: false,
  transporter_name: '',
  transport_rate_type: 'fixed',
  transport_rate: '',
  phone: '',
  daily_rate: '',
  start_date: '',
  active: true,
  notes: '',
};

export default function WorkerDialog({ open, onOpenChange, worker, farms, functions, teams, onFunctionsChanged, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showNewFunction, setShowNewFunction] = useState(false);
  const [newFunction, setNewFunction] = useState('');
  const [creatingFunction, setCreatingFunction] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      worker
        ? {
            name: worker.name || '',
            priority: worker.priority || '1',
            definition: worker.definition || '',
            worker_function: worker.worker_function || '',
            farm: worker.farm || '',
            team: worker.team || '',
            registration_number: worker.registration_number || '',
            declared: Boolean(worker.declared),
            transporter_name: worker.transporter_name || '',
            transport_rate_type: worker.transport_rate_type || 'fixed',
            transport_rate: worker.transport_rate ?? '',
            phone: worker.phone || '',
            daily_rate: worker.daily_rate ?? '',
            start_date: worker.start_date || '',
            active: worker.active !== false,
            notes: worker.notes || '',
          }
        : emptyForm,
    );
    setShowNewFunction(false);
    setNewFunction('');
  }, [open, worker]);

  const createFunction = async () => {
    const name = newFunction.trim();
    if (!name) return;
    setCreatingFunction(true);
    const created = await base44.entities.WorkerFunction.create({ name });
    await onFunctionsChanged();
    setCreatingFunction(false);
    setNewFunction('');
    setShowNewFunction(false);
    setForm((prev) => ({ ...prev, worker_function: created?.name || name }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      priority: form.priority || '1',
      definition: form.definition || '',
      worker_function: form.worker_function || '',
      farm: form.farm || '',
      team: form.team.trim(),
      registration_number: form.registration_number || '',
      declared: Boolean(form.declared),
      transporter_name: form.transporter_name || '',
      transport_rate_type: form.transport_rate_type || 'fixed',
      transport_rate: Number(form.transport_rate) || 0,
      phone: form.phone || '',
      daily_rate: Number(form.daily_rate) || 0,
      notes: form.notes || '',
    };
    if (form.start_date) payload.start_date = form.start_date;
    if (worker?.id) await base44.entities.Worker.update(worker.id, payload);
    else await base44.entities.Worker.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!worker?.id) return;
    setSaving(true);
    await base44.entities.Worker.delete(worker.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const functionOptions = [
    ...functions.map((item) => ({ value: item.name, label: item.name })),
    { value: NEW_FUNCTION, label: t('workerDialog.newFunction') },
  ];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={worker ? t('workerDialog.editTitle') : t('workerDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={worker ? t('workerDialog.save') : t('workerDialog.add')}
    >
      <Field label={t('workerDialog.fullName')}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </Field>

      <Field label={t('workerDialog.definition')} hint={t('workerDialog.definitionHint')}>
        <SelectField
          value={form.definition}
          onChange={(value) => setForm({ ...form, definition: value })}
          placeholder={t('workerDialog.definitionPlaceholder')}
          noneLabel={t('workerDialog.definitionNone')}
          options={DEFINITIONS.map((value) => ({ value, label: t(`wr.def_${value}`) }))}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('workerDialog.function')}>
          <SelectField
            value={form.worker_function}
            onChange={(value) => {
              if (value === NEW_FUNCTION) {
                setShowNewFunction(true);
                return;
              }
              setForm({ ...form, worker_function: value });
            }}
            placeholder={t('workerDialog.pickFunction')}
            options={functionOptions}
          />
          {showNewFunction && (
            <div className="flex gap-2 pt-1">
              <Input
                value={newFunction}
                onChange={(e) => setNewFunction(e.target.value)}
                placeholder={t('workerDialog.functionPlaceholder')}
              />
              <Button
                type="button"
                size="sm"
                className="shrink-0 rounded-lg"
                onClick={createFunction}
                disabled={creatingFunction || !newFunction.trim()}
              >
                {t('workerDialog.functionCreate')}
              </Button>
            </div>
          )}
          {!showNewFunction && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 gap-1 rounded-lg px-2 text-xs text-primary hover:text-primary"
              onClick={() => setShowNewFunction(true)}
            >
              <Plus className="h-3.5 w-3.5" /> {t('workerDialog.addFunction')}
            </Button>
          )}
        </Field>
        <Field label={t('workerDialog.priority')} hint={t('workerDialog.priorityHint')}>
          <SelectField
            value={form.priority}
            onChange={(value) => setForm({ ...form, priority: value })}
            options={PRIORITIES.map((value) => ({ value, label: t(`wr.priority_${value}`) }))}
          />
        </Field>
        <Field label={t('workerDialog.assignment')}>
          <SelectField
            value={form.farm}
            onChange={(value) => setForm({ ...form, farm: value })}
            noneLabel={t('workerDialog.mobile')}
            options={farms.map((farm) => ({ value: farm.name, label: farm.name }))}
          />
        </Field>
        <Field label={t('workerDialog.team')} hint={t('workerDialog.teamHint')}>
          <Input
            value={form.team}
            onChange={(e) => setForm({ ...form, team: e.target.value })}
            list="worker-teams"
            placeholder={t('workerDialog.teamPlaceholder')}
          />

          <datalist id="worker-teams">
            {teams.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </Field>
        <Field label={t('workerDialog.dailyRate')}>
          <Input
            type="number"
            value={form.daily_rate}
            onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
          />
        </Field>
        <Field label={t('workerDialog.registration')}>
          <Input
            value={form.registration_number}
            onChange={(e) => setForm({ ...form, registration_number: e.target.value })}
          />
        </Field>
        <Field label={t('workerDialog.phone')}>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="06 12 34 56 78"
          />
        </Field>
        <Field label={t('workerDialog.hireDate')} hint={t('workerDialog.hireDateHint')}>
          <Input
            type="date"
            value={form.start_date}
            onChange={(e) => setForm({ ...form, start_date: e.target.value })}
          />
        </Field>
      </div>

      <div className="space-y-3 rounded-xl border border-border/70 bg-secondary/30 p-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('workerDialog.transport')}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('workerDialog.transporterName')}>
            <Input
              value={form.transporter_name}
              onChange={(e) => setForm({ ...form, transporter_name: e.target.value })}
            />
          </Field>
          <Field label={t('workerDialog.transportRateType')}>
            <SelectField
              value={form.transport_rate_type}
              onChange={(value) => setForm({ ...form, transport_rate_type: value })}
              options={[
                { value: 'fixed', label: t('workerDialog.transportFixed') },
                { value: 'per_person', label: t('workerDialog.transportPerPerson') },
              ]}
            />
          </Field>
          <Field label={t('workerDialog.transportAmount')}>
            <Input
              type="number"
              value={form.transport_rate}
              onChange={(e) => setForm({ ...form, transport_rate: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5">
        <span className="text-sm">{t('workerDialog.declared')}</span>
        <Switch checked={Boolean(form.declared)} onCheckedChange={(checked) => setForm({ ...form, declared: checked })} />
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {worker?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('workerDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}