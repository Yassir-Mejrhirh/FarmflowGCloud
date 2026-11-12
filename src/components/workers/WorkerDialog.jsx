import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, Plus } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';
import { useUndo } from '@/lib/undoContext';
import { todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { buildTransportIndex, transportFor, transporterTeamConflicts } from '@/lib/transportRates';
import { fetchGlobalOptions, mergeOptions, rememberGlobalOption, rememberGlobalOptions } from '@/lib/globalOptions';
import TransportHistory from '@/components/workers/TransportHistory';

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
  transport_enabled: false,
  transporter_name: '',
  transport_rate_type: 'fixed',
  transport_rate: '',
  phone: '',
  daily_rate: '',
  start_date: '',
  active: true,
  notes: '',
};

export default function WorkerDialog({
  open, onOpenChange, worker, farms, functions, teams, rates = [], transportRates = [], workers = [],
  onFunctionsChanged, onSaved,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showNewFunction, setShowNewFunction] = useState(false);
  const [newFunction, setNewFunction] = useState('');
  const [creatingFunction, setCreatingFunction] = useState(false);
  const [globalTeams, setGlobalTeams] = useState([]);
  const [globalTransporters, setGlobalTransporters] = useState([]);
  const [showNewTeam, setShowNewTeam] = useState(false);
  const [newTeam, setNewTeam] = useState('');
  const [showNewTransporter, setShowNewTransporter] = useState(false);
  const [newTransporter, setNewTransporter] = useState('');
  const [creating, setCreating] = useState(false);
  const [rateDate, setRateDate] = useState(todayISO());
  const [transportDate, setTransportDate] = useState(todayISO());
  const lock = useParamLock('Worker', worker);
  const { offerUndo } = useUndo();

  // The salary shown is the rate in force today: a change made here is written as a
  // dated rate, so the previous one stays in the history.
  const rateIndex = useMemo(() => buildRateIndex(rates), [rates]);
  const currentRate = useMemo(
    () => (worker ? rateFor(worker, rateIndex, todayISO()) : 0),
    [worker, rateIndex],
  );
  const rateChanged = Boolean(worker?.id) && (Number(form.daily_rate) || 0) !== currentRate;

  // Transport follows the salary rule: a change is written as a dated rate, so the
  // reports already costed keep the amount they were written with.
  const transportIndex = useMemo(() => buildTransportIndex(transportRates), [transportRates]);
  const currentTransport = useMemo(
    () => (worker ? transportFor(worker, transportIndex, todayISO()) : { mode: 'none', rate: 0, transporter: '' }),
    [worker, transportIndex],
  );
  const currentTransportMode = currentTransport.mode === 'none' ? 'fixed' : currentTransport.mode;
  const transportChanged =
    Boolean(worker?.id) &&
    Boolean(form.transport_enabled) &&
    ((Number(form.transport_rate) || 0) !== currentTransport.rate ||
      (form.transport_rate_type || 'fixed') !== currentTransportMode ||
      (form.transporter_name || '') !== (currentTransport.transporter || ''));

  // Transport switched on means the transporter, the pricing mode and the amount are all
  // needed: a report cannot cost the transport without them.
  const transportIncomplete =
    Boolean(form.transport_enabled) &&
    (!form.transporter_name?.trim() || !form.transport_rate_type || !(Number(form.transport_rate) > 0));

  // A transporter already carrying another team cannot be given to this one.
  const conflict = useMemo(() => {
    if (!form.transport_enabled) return null;
    const found = transporterTeamConflicts({
      transporter: form.transporter_name,
      team: form.team,
      workers,
      rates: transportRates,
      excludeWorkerId: worker?.id,
    });
    return found.length ? found[0] : null;
  }, [form.transport_enabled, form.transporter_name, form.team, workers, transportRates, worker?.id]);

  useEffect(() => {
    if (!open) return;
    const transport = worker ? transportFor(worker, transportIndex, todayISO()) : null;
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
            transport_enabled: Boolean(
              worker.transport_enabled || worker.transporter_name || worker.transport_rate,
            ),
            transporter_name: transport.transporter || '',
            transport_rate_type: transport.mode === 'none' ? worker.transport_rate_type || 'fixed' : transport.mode,
            transport_rate: transport.rate || worker.transport_rate || '',
            phone: worker.phone || '',
            daily_rate: currentRate || '',
            start_date: worker.start_date || '',
            active: worker.active !== false,
            notes: worker.notes || '',
          }
        : emptyForm,
    );
    setShowNewFunction(false);
    setNewFunction('');
    setRateDate(todayISO());
    setTransportDate(todayISO());
    setShowNewTeam(false);
    setNewTeam('');
    setShowNewTransporter(false);
    setNewTransporter('');
    (async () => {
      const [teamNames, transporterNames] = await Promise.all([
        fetchGlobalOptions('team'),
        fetchGlobalOptions('transporter'),
      ]);
      setGlobalTeams(teamNames);
      setGlobalTransporters(transporterNames);
    })();
  }, [open, worker, currentRate, transportIndex]);

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

  // Équipe et transporteur : la valeur saisie est mémorisée globalement pour les fiches suivantes.
  const createTeam = async () => {
    const name = newTeam.trim();
    if (!name) return;
    setCreating(true);
    await rememberGlobalOption('team', name);
    setGlobalTeams((prev) =>
      prev.some((value) => value.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b)),
    );
    setForm((prev) => ({ ...prev, team: name }));
    setNewTeam('');
    setShowNewTeam(false);
    setCreating(false);
  };

  const createTransporter = async () => {
    const name = newTransporter.trim();
    if (!name) return;
    setCreating(true);
    await rememberGlobalOption('transporter', name);
    setGlobalTransporters((prev) =>
      prev.some((value) => value.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b)),
    );
    setForm((prev) => ({ ...prev, transporter_name: name }));
    setNewTransporter('');
    setShowNewTransporter(false);
    setCreating(false);
  };

  // A salary change becomes a dated rate: the previous rate keeps its period and the
  // reports already costed keep the rate they were written with.
  const saveRate = async (amount, date) => {
    const existing = rates.find((rate) => rate.worker_id === worker.id && rate.effective_date === date);
    const values = { daily_rate: amount, team: worker.team || '' };
    if (existing) await base44.entities.WageRate.update(existing.id, values);
    else await base44.entities.WageRate.create({ ...values, worker_id: worker.id, effective_date: date });
  };

  // Same for the transport: the amount of the day is written as a dated transport rate.
  const saveTransport = async (amount, mode, transporter, date) => {
    const existing = transportRates.find((row) => row.worker_id === worker.id && row.effective_date === date);
    const values = { mode, rate: amount, transporter_name: transporter, team: form.team || '' };
    if (existing) await base44.entities.TransportRate.update(existing.id, values);
    else await base44.entities.TransportRate.create({ ...values, worker_id: worker.id, effective_date: date });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    if (conflict) return;
    if (transportIncomplete) return;
    const typedRate = Number(form.daily_rate) || 0;
    const salaryChanged = Boolean(worker?.id) && typedRate !== currentRate;
    if (lock.locked && !salaryChanged && !transportChanged) return;
    if (worker?.id && salaryChanged) await saveRate(typedRate, rateDate || todayISO());
    if (worker?.id && transportChanged) {
      await saveTransport(
        Number(form.transport_rate) || 0,
        form.transport_rate_type || 'fixed',
        form.transporter_name || '',
        transportDate || todayISO(),
      );
    }
    if (worker?.id && lock.locked) {
      onOpenChange(false);
      onSaved();
      return;
    }
    setSaving(true);
    await rememberGlobalOptions('team', [form.team]);
    await rememberGlobalOptions('transporter', [form.transport_enabled ? form.transporter_name : '']);
    const payload = {
      name: form.name.trim(),
      priority: form.priority || '1',
      definition: form.definition || '',
      worker_function: form.worker_function || '',
      farm: form.farm || '',
      team: form.team.trim(),
      registration_number: form.registration_number || '',
      declared: Boolean(form.declared),
      transport_enabled: Boolean(form.transport_enabled),
      transporter_name: form.transport_enabled ? form.transporter_name || '' : '',
      transport_rate_type: form.transport_enabled ? form.transport_rate_type || 'fixed' : 'fixed',
      transport_rate: form.transport_enabled ? Number(form.transport_rate) || 0 : 0,
      phone: form.phone || '',
      daily_rate: Number(form.daily_rate) || 0,
      notes: form.notes || '',
    };
    if (form.start_date) payload.start_date = form.start_date;
    if (worker?.id) {
      // The rate lives in the dated history now, so the base rate stays untouched.
      const changes = { ...payload };
      delete changes.daily_rate;
      await base44.entities.Worker.update(worker.id, changes);
    } else {
      await base44.entities.Worker.create(payload);
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!worker?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.WageRate.deleteMany({ worker_id: worker.id });
    await base44.entities.TransportRate.deleteMany({ worker_id: worker.id });
    await base44.entities.Worker.delete(worker.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const functionOptions = [
    ...functions.map((item) => ({ value: item.name, label: item.name })),
    { value: NEW_FUNCTION, label: t('workerDialog.newFunction') },
  ];

  const teamOptions = mergeOptions(teams, globalTeams, form.team);
  const transporterOptions = mergeOptions(
    globalTransporters,
    workers.map((row) => row.transporter_name),
    transportRates.map((row) => row.transporter_name),
    form.transporter_name,
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={worker ? t('workerDialog.editTitle') : t('workerDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitDisabled={
        (lock.locked && !rateChanged && !transportChanged) || Boolean(conflict) || transportIncomplete
      }
      submitLabel={worker ? t('workerDialog.save') : t('workerDialog.add')}
    >
      <ParamLockNotice usage={lock.usage} note={lock.locked ? t('wage.salaryOnly') : ''} />

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
          <SelectField
            value={form.team}
            onChange={(value) => setForm({ ...form, team: value })}
            noneLabel={t('workerDialog.noTeam')}
            placeholder={t('workerDialog.teamPlaceholder')}
            options={teamOptions}
          />
          {showNewTeam ? (
            <div className="flex gap-1.5 pt-1.5">
              <Input
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                placeholder={t('workerDialog.newTeamPlaceholder')}
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
                onClick={createTeam}
                disabled={creating || !newTeam.trim()}
              >
                <Plus className="mr-1 h-3 w-3" /> {t('itemDialog.create')}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 h-7 gap-1 rounded-lg px-2 text-xs text-primary hover:text-primary"
              onClick={() => setShowNewTeam(true)}
            >
              <Plus className="h-3.5 w-3.5" /> {t('workerDialog.addTeam')}
            </Button>
          )}
        </Field>
        <Field
          label={t('workerDialog.dailyRate')}
          hint={worker?.id ? t('workerDialog.rateHint') : t('wage.baseRateHint')}
        >
          <Input
            type="number"
            value={form.daily_rate}
            onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
          />
        </Field>
        {worker?.id && (
          <Field label={t('wage.effectiveDate')}>
            <Input type="date" value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
          </Field>
        )}
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
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('workerDialog.transport')}
          </p>
          <Switch
            checked={Boolean(form.transport_enabled)}
            onCheckedChange={(checked) =>
              setForm({
                ...form,
                transport_enabled: checked,
                ...(checked
                  ? {}
                  : { transporter_name: '', transport_rate_type: 'fixed', transport_rate: '' }),
              })
            }
          />
        </div>
        {form.transport_enabled && transportIncomplete && (
          <p className="flex items-start gap-1.5 text-[11px] leading-snug text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('workerDialog.transportRequired')}
          </p>
        )}
        {form.transport_enabled && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={`${t('workerDialog.transporterName')} *`}>
              <SelectField
                value={form.transporter_name}
                onChange={(value) => setForm({ ...form, transporter_name: value })}
                noneLabel={t('workerDialog.noTransporter')}
                placeholder={t('workerDialog.transporterPlaceholder')}
                options={transporterOptions}
              />
              {showNewTransporter ? (
                <div className="flex gap-1.5 pt-1.5">
                  <Input
                    value={newTransporter}
                    onChange={(e) => setNewTransporter(e.target.value)}
                    placeholder={t('workerDialog.newTransporterPlaceholder')}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
                    onClick={createTransporter}
                    disabled={creating || !newTransporter.trim()}
                  >
                    <Plus className="mr-1 h-3 w-3" /> {t('itemDialog.create')}
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-1 h-7 gap-1 rounded-lg px-2 text-xs text-primary hover:text-primary"
                  onClick={() => setShowNewTransporter(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> {t('workerDialog.addTransporter')}
                </Button>
              )}
            </Field>
            <Field label={`${t('workerDialog.transportRateType')} *`}>
              <SelectField
                value={form.transport_rate_type}
                onChange={(value) => setForm({ ...form, transport_rate_type: value })}
                options={[
                  { value: 'fixed', label: t('workerDialog.transportFixed') },
                  { value: 'per_person', label: t('workerDialog.transportPerPerson') },
                ]}
              />
            </Field>
            <Field
              label={`${t('workerDialog.transportAmount')} *`}
              hint={worker?.id ? t('workerDialog.transportHint') : ''}
            >
              <Input
                type="number"
                value={form.transport_rate}
                onChange={(e) => setForm({ ...form, transport_rate: e.target.value })}
              />
            </Field>
            {worker?.id && (
              <Field label={t('workerDialog.transportEffective')}>
                <Input
                  type="date"
                  value={transportDate}
                  onChange={(e) => setTransportDate(e.target.value)}
                />
              </Field>
            )}
            <TransportHistory worker={worker} rates={transportRates} onChanged={onSaved} />
            {conflict && (
              <p className="flex items-start gap-1.5 text-xs font-medium text-destructive sm:col-span-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {conflict.team
                  ? t('workerDialog.transporterTaken', { team: conflict.team, worker: conflict.workerName })
                  : t('workerDialog.transporterTakenNoTeam', { worker: conflict.workerName })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5">
        <span className="text-sm">{t('workerDialog.declared')}</span>
        <Switch checked={Boolean(form.declared)} onCheckedChange={(checked) => setForm({ ...form, declared: checked })} />
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {worker?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('workerDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}