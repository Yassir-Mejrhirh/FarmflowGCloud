import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Check, ListChecks, Trash2 } from 'lucide-react';
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
import { fmtDate, fmtMoney, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const TYPES = ['planting', 'irrigation', 'fertilising', 'spraying', 'harvest', 'maintenance', 'transport', 'other'];
const PRIORITY_TONE = { high: 'clay', medium: 'amber', low: 'stone' };

export default function Tasks() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('open');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [taskRows, blockRows, workerRows] = await Promise.all([
      fetchList(base44.entities.Task, {}, { sort: 'due_date' }),
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Worker, {}, { sort: 'name' }),
    ]);
    setTasks(taskRows);
    setBlocks(blockRows);
    setWorkers(workerRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const workerMap = useMemo(() => byId(workers), [workers]);
  const today = todayISO();

  const visible = useMemo(() => {
    const rows = tasks.filter((task) => {
      if (filter === 'open') return task.status !== 'done';
      if (filter === 'done') return task.status === 'done';
      return task.status === filter;
    });
    return rows.sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'));
  }, [tasks, filter]);

  const openCount = tasks.filter((task) => task.status !== 'done').length;
  const overdueCount = tasks.filter((task) => task.status !== 'done' && task.due_date && task.due_date < today).length;

  const toggleDone = async (task) => {
    const done = task.status === 'done';
    const patch = done
      ? { status: 'todo', completed_date: '' }
      : { status: 'done', completed_date: today };
    setTasks((prev) => prev.map((row) => (row.id === task.id ? { ...row, ...patch } : row)));
    await base44.entities.Task.update(task.id, patch);
  };

  const remove = async (task) => {
    setTasks((prev) => prev.filter((row) => row.id !== task.id));
    await base44.entities.Task.delete(task.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.title')}
        description={t('tasks.description', { open: openCount, overdue: overdueCount })}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('tasks.newTask')}
          </Button>
        }
      />

      <Segmented
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'open', label: `${t('tasks.tabOpen')} (${openCount})` },
          { value: 'todo', label: t('tasks.tabTodo') },
          { value: 'in_progress', label: t('tasks.tabInProgress') },
          { value: 'done', label: t('tasks.tabDone') },
          { value: 'all', label: t('tasks.tabAll') },
        ]}
      />

      {loading ? (
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t('tasks.emptyTitle')}
          description={t('tasks.emptyDesc')}
          action={<Button onClick={() => setDialogOpen(true)}>{t('tasks.newTask')}</Button>}
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {visible.map((task) => {
            const done = task.status === 'done';
            const overdue = !done && task.due_date && task.due_date < today;
            return (
              <li key={task.id} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
                <button
                  type="button"
                  onClick={() => toggleDone(task)}
                  aria-label={done ? t('tasks.markNotDone') : t('tasks.markDone')}
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                    done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  {done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditing(task);
                    setDialogOpen(true);
                  }}
                  className="min-w-0 flex-1 text-start"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('text-sm font-medium', done && 'text-muted-foreground line-through')}>
                      {task.title}
                    </span>
                    {task.priority && !done && (
                      <StatusPill tone={PRIORITY_TONE[task.priority]}>{t(`pri.${task.priority}`)}</StatusPill>
                    )}
                    {overdue && <StatusPill tone="clay">{t('tasks.overdue')}</StatusPill>}
                    {task.status === 'in_progress' && <StatusPill tone="moss">{t('tasks.inProgress')}</StatusPill>}
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span>{t(`tt.${task.type}`)}</span>
                    {blockMap[task.block_id] && <span>· {blockMap[task.block_id].name}</span>}
                    {workerMap[task.assignee_id] && <span>· {workerMap[task.assignee_id].name}</span>}
                    {done && task.completed_date && <span>· {fmtDate(task.completed_date)}</span>}
                    {!done && task.due_date && <span>· {fmtDate(task.due_date)}</span>}
                  </p>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  {(task.actual_cost || task.estimated_cost) && (
                    <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">
                      {task.actual_cost ? fmtMoney(task.actual_cost) : `~${fmtMoney(task.estimated_cost)}`}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(task)}
                    aria-label={t('common.deleteTask')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        onSaved={load}
      />
    </div>
  );
}

function TaskDialog({ open, onOpenChange, task, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      type: task?.type || 'other',
      subtask: task?.subtask || '',
      description: task?.description || '',
    });
  }, [open, task]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: form.subtask?.trim() || task?.title || t(`tt.${form.type}`),
      type: form.type,
      subtask: form.subtask?.trim() || '',
      description: form.description || '',
    };

    if (task?.id) {
      await base44.entities.Task.update(task.id, payload);
    } else {
      await base44.entities.Task.create({ ...payload, status: 'done', completed_date: todayISO() });
    }
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? t('taskDialog.editTitle') : t('taskDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={task ? t('taskDialog.save') : t('taskDialog.create')}
    >
      <Field label={t('taskDialog.nature')}>
        <SelectField
          value={form.type}
          onChange={(value) => setForm({ ...form, type: value })}
          options={TYPES.map((value) => ({ value, label: t(`tt.${value}`) }))}
        />
      </Field>
      <Field label={t('taskDialog.subtask')}>
        <Input
          value={form.subtask || ''}
          onChange={(e) => setForm({ ...form, subtask: e.target.value })}
          placeholder={t('taskDialog.subtaskPlaceholder')}
        />
      </Field>
      <Field label={t('taskDialog.descLabel')}>
        <Textarea
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          placeholder={t('taskDialog.descPlaceholder')}
        />
      </Field>
    </FormDialog>
  );
}