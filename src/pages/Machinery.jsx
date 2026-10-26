import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Tractor, Wrench, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const TYPES = ['tractor', 'harvester', 'sprayer', 'truck', 'implement', 'other'];
const KINDS = ['service', 'repair', 'inspection'];
const STATUS_TONE = { operational: 'moss', maintenance: 'amber', retired: 'stone' };

export default function Machinery() {
  const { t } = useI18n();
  const [machines, setMachines] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [machineDialog, setMachineDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [logDialog, setLogDialog] = useState(false);
  const [logMachine, setLogMachine] = useState(null);

  const load = async () => {
    const [machineRows, logRows] = await Promise.all([
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.MaintenanceLog, {}, { sort: '-date' }),
    ]);
    setMachines(machineRows);
    setLogs(logRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const machineMap = useMemo(() => byId(machines), [machines]);
  const serviceCost = logs.reduce((sum, log) => sum + (Number(log.cost) || 0), 0);

  const openLog = (machine) => {
    setLogMachine(machine);
    setLogDialog(true);
  };

  const removeLog = async (log) => {
    setLogs((prev) => prev.filter((row) => row.id !== log.id));
    await base44.entities.MaintenanceLog.delete(log.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('mach.eyebrow')}
        title={t('mach.title')}
        description={t('mach.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setMachineDialog(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('mach.newMachine')}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label={t('mach.machines')} value={machines.length} />
        <MiniStat label={t('mach.hoursLogged')} value={fmtNum(machines.reduce((sum, m) => sum + (Number(m.hours) || 0), 0), 0)} />
        <MiniStat label={t('mach.serviceSpend')} value={fmtMoney(serviceCost)} />
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : machines.length === 0 ? (
        <EmptyState
          icon={Tractor}
          title={t('mach.emptyTitle')}
          description={t('mach.emptyDesc')}
          action={<Button onClick={() => setMachineDialog(true)}>{t('mach.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {machines.map((machine) => (
            <div key={machine.id} className="rounded-2xl border border-border/70 bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg leading-tight">{machine.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {t(`mt.${machine.type}`)}
                    {machine.plate ? ` · ${machine.plate}` : ''}
                  </p>
                </div>
                <StatusPill tone={STATUS_TONE[machine.status] || 'stone'}>
                  {t(`mst.${machine.status}`)}
                </StatusPill>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">{t('mach.hours')}</dt>
                  <dd className="mt-0.5 tabular-nums text-sm">{fmtNum(machine.hours, 0)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t('mach.rateHour')}</dt>
                  <dd className="mt-0.5 tabular-nums text-sm">
                    {machine.hourly_rate ? fmtMoney(machine.hourly_rate) : '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <button
                  type="button"
                  onClick={() => openLog(machine)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  <Wrench className="h-3.5 w-3.5" /> {t('mach.logMaintenance')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(machine);
                    setMachineDialog(true);
                  }}
                  className="text-[11px] font-medium text-muted-foreground hover:underline"
                >
                  {t('common.edit')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {logs.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl tracking-tight">{t('mach.serviceHistory')}</h2>
          <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {machineMap[log.machine_id]?.name || t('mach.unknown')}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {fmtDate(log.date)} · {t(`mk.${log.kind}`)}
                    {log.description ? ` · ${log.description}` : ''}
                  </p>
                </div>
                <span className="text-sm tabular-nums">{fmtMoney(log.cost)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeLog(log)}
                  aria-label={t('common.deleteEntry')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <MachineDialog open={machineDialog} onOpenChange={setMachineDialog} machine={editing} onSaved={load} />
      <MaintenanceDialog
        open={logDialog}
        onOpenChange={setLogDialog}
        machine={logMachine}
        machines={machines}
        onSaved={load}
      />
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="font-display text-lg leading-tight tabular-nums">{value}</p>
    </div>
  );
}

function MachineDialog({ open, onOpenChange, machine, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: machine?.name || '',
      type: machine?.type || 'tractor',
      model: machine?.model || '',
      plate: machine?.plate || '',
      hourly_rate: machine?.hourly_rate ?? '',
      hours: machine?.hours ?? '',
      status: machine?.status || 'operational',
      notes: machine?.notes || '',
    });
  }, [open, machine]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      model: form.model || '',
      plate: form.plate || '',
      hourly_rate: Number(form.hourly_rate) || 0,
      hours: Number(form.hours) || 0,
      status: form.status,
      notes: form.notes || '',
    };
    if (machine?.id) await base44.entities.Machine.update(machine.id, payload);
    else await base44.entities.Machine.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!machine?.id) return;
    setSaving(true);
    await base44.entities.Machine.delete(machine.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={machine ? t('machDialog.editTitle') : t('machDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={machine ? t('machDialog.save') : t('machDialog.add')}
    >
      <Field label={t('common.name')}>
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Deere 5075" required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.type')}>
          <SelectField
            value={form.type}
            onChange={(value) => setForm({ ...form, type: value })}
            options={TYPES.map((value) => ({ value, label: t(`mt.${value}`) }))}
          />
        </Field>
        <Field label={t('machDialog.model')}>
          <Input value={form.model || ''} onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </Field>
        <Field label={t('machDialog.plate')}>
          <Input value={form.plate || ''} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
        </Field>
        <Field label={t('common.status')}>
          <SelectField
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value })}
            options={['operational', 'maintenance', 'retired'].map((value) => ({ value, label: t(`mst.${value}`) }))}
          />
        </Field>
        <Field label={t('machDialog.hours')}>
          <Input type="number" value={form.hours ?? ''} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
        </Field>
        <Field label={t('machDialog.costHour')}>
          <Input
            type="number"
            value={form.hourly_rate ?? ''}
            onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {machine?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('machDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}

function MaintenanceDialog({ open, onOpenChange, machine, machines, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      machine_id: machine?.id || '',
      date: todayISO(),
      kind: 'service',
      description: '',
      cost: '',
      hours_reading: machine?.hours ?? '',
    });
  }, [open, machine]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.machine_id) return;
    setSaving(true);
    await base44.entities.MaintenanceLog.create({
      machine_id: form.machine_id,
      date: form.date || todayISO(),
      kind: form.kind,
      description: form.description || '',
      cost: Number(form.cost) || 0,
      hours_reading: Number(form.hours_reading) || 0,
    });

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
      title={t('maintDialog.title')}
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
            options={KINDS.map((value) => ({ value, label: t(`mk.${value}`) }))}
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