import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ListChecks, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';

const TYPES = ['planting', 'irrigation', 'fertilising', 'spraying', 'harvest', 'maintenance', 'transport', 'other'];

export default function Tasks() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const rows = await fetchList(base44.entities.Task, {}, { sort: 'created_date' });
    setTasks(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (task) => {
    setTasks((prev) => prev.filter((row) => row.id !== task.id));
    await base44.entities.Task.delete(task.id);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('tasks.eyebrow')}
        title={t('tasks.title')}
        description={t('tasks.description')}
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

      {loading ? (
        <div className="h-52 animate-pulse rounded-2xl bg-muted" />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={t('tasks.emptyTitle')}
          description={t('tasks.emptyDesc')}
          action={
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              {t('tasks.newTask')}
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40">
              <button
                type="button"
                onClick={() => {
                  setEditing(task);
                  setDialogOpen(true);
                }}
                className="min-w-0 flex-1 text-start"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{task.subtask || task.title}</span>
                  <StatusPill tone="moss">{t(`tt.${task.type}`)}</StatusPill>
                </div>
                {task.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{task.description}</p>
                )}
              </button>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => remove(task)}
                aria-label={t('common.deleteTask')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} task={editing} onSaved={load} />
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
      await base44.entities.Task.create(payload);
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