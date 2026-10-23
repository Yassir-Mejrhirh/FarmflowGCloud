import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Users, Phone, Trash2 } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { fetchList, byId } from '@/lib/data';
import { fmtDate, fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { cn } from '@/lib/utils';

const ROLES = [
  { value: 'field_worker', label: 'Field worker' },
  { value: 'operator', label: 'Machine operator' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'seasonal', label: 'Seasonal' },
];
const ROLE_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]));

const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export default function Workers() {
  const [tab, setTab] = useState('crew');
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [workerDialog, setWorkerDialog] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [logDialog, setLogDialog] = useState(false);

  const load = async () => {
    const [workerRows, attendanceRows] = await Promise.all([
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Attendance, {}, { sort: '-date' }),
    ]);
    setWorkers(workerRows);
    setAttendance(attendanceRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const workerMap = useMemo(() => byId(workers), [workers]);
  const unpaid = attendance.filter((row) => !row.paid).reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  const activeCount = workers.filter((worker) => worker.active !== false).length;

  const togglePaid = async (row) => {
    setAttendance((prev) => prev.map((item) => (item.id === row.id ? { ...item, paid: !item.paid } : item)));
    await base44.entities.Attendance.update(row.id, { paid: !row.paid });
  };

  const removeAttendance = async (row) => {
    setAttendance((prev) => prev.filter((item) => item.id !== row.id));
    await base44.entities.Attendance.delete(row.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily crew"
        title="Workers"
        description="Your team, their daily rates, and the days they actually worked."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setLogDialog(true)}
              disabled={!workers.length}
            >
              Log a day
            </Button>
            <Button
              className="rounded-xl"
              onClick={() => {
                setEditingWorker(null);
                setWorkerDialog(true);
              }}
            >
              <Plus className="mr-1.5 h-4 w-4" /> New worker
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Active crew" value={activeCount} />
        <MiniStat label="Days logged" value={attendance.reduce((sum, row) => sum + (Number(row.days) || 0), 0)} />
        <MiniStat label="Unpaid wages" value={fmtMoney(unpaid)} tone="clay" />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'crew', label: `Crew (${workers.length})` },
          { value: 'log', label: `Daily log (${attendance.length})` },
        ]}
      />

      {loading ? (
        <div className="h-48 animate-pulse rounded-2xl bg-muted" />
      ) : tab === 'crew' ? (
        workers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No workers yet"
            description="Add your permanent staff and seasonal crew with their daily rate."
            action={<Button onClick={() => setWorkerDialog(true)}>Add a worker</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workers.map((worker) => (
              <button
                key={worker.id}
                type="button"
                onClick={() => {
                  setEditingWorker(worker);
                  setWorkerDialog(true);
                }}
                className="rounded-2xl border border-border/70 bg-card p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary font-display text-sm text-primary">
                    {initials(worker.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{worker.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABEL[worker.role] || 'Worker'}</p>
                  </div>
                  <StatusPill tone={worker.active === false ? 'stone' : 'moss'}>
                    {worker.active === false ? 'Inactive' : 'Active'}
                  </StatusPill>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="tabular-nums">{worker.daily_rate ? `${fmtMoney(worker.daily_rate)} / day` : 'No rate set'}</span>
                  {worker.phone && (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {worker.phone}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )
      ) : attendance.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No days logged"
          description="Record who worked and how many days — wages are calculated from their daily rate."
          action={<Button onClick={() => setLogDialog(true)}>Log a day</Button>}
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {attendance.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{workerMap[row.worker_id]?.name || 'Unknown worker'}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fmtDate(row.date)} · {fmtNum(row.days, 1)} day{(Number(row.days) || 0) === 1 ? '' : 's'}
                </p>
              </div>
              <span className="text-sm tabular-nums">{fmtMoney(row.amount)}</span>
              <button type="button" onClick={() => togglePaid(row)}>
                <StatusPill tone={row.paid ? 'moss' : 'amber'}>{row.paid ? 'Paid' : 'Unpaid'}</StatusPill>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeAttendance(row)}
                aria-label="Delete entry"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <WorkerDialog
        open={workerDialog}
        onOpenChange={setWorkerDialog}
        worker={editingWorker}
        onSaved={load}
      />
      <AttendanceDialog
        open={logDialog}
        onOpenChange={setLogDialog}
        workers={workers}
        onSaved={load}
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

function WorkerDialog({ open, onOpenChange, worker, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: worker?.name || '',
      role: worker?.role || 'field_worker',
      phone: worker?.phone || '',
      daily_rate: worker?.daily_rate ?? '',
      start_date: worker?.start_date || '',
      active: worker ? worker.active !== false : true,
      notes: worker?.notes || '',
    });
  }, [open, worker]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      role: form.role,
      phone: form.phone || '',
      daily_rate: Number(form.daily_rate) || 0,
      active: Boolean(form.active),
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

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={worker ? 'Edit worker' : 'New worker'}
      onSubmit={submit}
      saving={saving}
      submitLabel={worker ? 'Save worker' : 'Add worker'}
    >
      <Field label="Full name">
        <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role">
          <SelectField value={form.role} onChange={(value) => setForm({ ...form, role: value })} options={ROLES} />
        </Field>
        <Field label="Daily rate">
          <Input type="number" value={form.daily_rate ?? ''} onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="06 12 34 56 78" />
        </Field>
        <Field label="Started">
          <Input type="date" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/40 px-3 py-2.5">
        <span className="text-sm">Currently working</span>
        <Switch checked={Boolean(form.active)} onCheckedChange={(checked) => setForm({ ...form, active: checked })} />
      </div>
      <Field label="Notes">
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {worker?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          Remove this worker
        </button>
      )}
    </FormDialog>
  );
}

function AttendanceDialog({ open, onOpenChange, workers, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ worker_id: '', date: todayISO(), days: 1, amount: '', paid: false, notes: '' });
  }, [open]);

  const selectWorker = (workerId) => {
    const worker = workers.find((row) => row.id === workerId);
    const days = Number(form.days) || 1;
    setForm((prev) => ({
      ...prev,
      worker_id: workerId,
      amount: worker ? days * (Number(worker.daily_rate) || 0) : prev.amount,
    }));
  };

  const setDays = (value) => {
    const worker = workers.find((row) => row.id === form.worker_id);
    const days = Number(value) || 0;
    setForm((prev) => ({
      ...prev,
      days: value,
      amount: worker ? days * (Number(worker.daily_rate) || 0) : prev.amount,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.worker_id) return;
    setSaving(true);
    await base44.entities.Attendance.create({
      worker_id: form.worker_id,
      date: form.date || todayISO(),
      days: Number(form.days) || 1,
      amount: Number(form.amount) || 0,
      paid: Boolean(form.paid),
      notes: form.notes || '',
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log a working day"
      description="Wages are calculated from the worker's daily rate."
      onSubmit={submit}
      saving={saving}
      submitLabel="Save day"
    >
      <Field label="Worker">
        <SelectField
          value={form.worker_id}
          onChange={selectWorker}
          options={workers.map((worker) => ({ value: worker.id, label: worker.name }))}
          placeholder="Pick a worker"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date">
          <Input type="date" value={form.date || ''} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Days worked">
          <Input type="number" step="0.5" value={form.days ?? ''} onChange={(e) => setDays(e.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount">
          <Input type="number" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </Field>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={Boolean(form.paid)} onCheckedChange={(checked) => setForm({ ...form, paid: checked })} />
            Already paid
          </label>
        </div>
      </div>
      <Field label="Notes">
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
    </FormDialog>
  );
}