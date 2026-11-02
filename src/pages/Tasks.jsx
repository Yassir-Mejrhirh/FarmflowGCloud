import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ListChecks, Trash2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { BUILT_IN_TYPES, NEW_NATURE, natureLabel } from '@/lib/taskNature';

export default function Tasks() {
  const { t } = useI18n();
  const [tasks, setTasks] = useState([]);
  const [natures, setNatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const rows = await fetchList(base44.entities.Task, {}, { sort: 'created_date' });
    setTasks(rows);
    setLoading(false);
  };

  const loadNatures = async () => {
    const rows = await fetchList(base44.entities.TaskNature, {}, { sort: 'name' });
    setNatures(rows);
  };

  useEffect(() => {
    load();
    loadNatures();
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
                <span className="text-sm font-medium">{natureLabel(task.type, natures, t)}</span>
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

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
        natures={natures}
        onNaturesChanged={loadNatures}
        onSaved={load}
      />
    </div>
  );
}

function TaskDialog({ open, onOpenChange, task, natures, onNaturesChanged, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showNewNature, setShowNewNature] = useState(false);
  const [newNature, setNewNature] = useState('');
  const [creatingNature, setCreatingNature] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      type: task?.type || 'other',
      description: task?.description || '',
    });
    setShowNewNature(false);
    setNewNature('');
  }, [open, task]);

  const natureOptions = [
    ...BUILT_IN_TYPES.map((value) => ({ value, label: t(`tt.${value}`) })),
    ...natures.map((nature) => ({ value: nature.name, label: nature.name })),
    { value: NEW_NATURE, label: t('taskDialog.newNature') },
  ];

  const createNature = async () => {
    const name = newNature.trim();
    if (!name) return;
    setCreatingNature(true);
    const created = await base44.entities.TaskNature.create({ name });
    await onNaturesChanged();
    setCreatingNature(false);
    setNewNature('');
    setShowNewNature(false);
    setForm((prev) => ({ ...prev, type: created.name || name }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    const payload = {
      title: natureLabel(form.type, natures, t),
      type: form.type,
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
          onChange={(value) => {
            if (value === NEW_NATURE) {
              setShowNewNature(true);
              return;
            }
            setForm({ ...form, type: value });
          }}
          options={natureOptions}
        />
        {showNewNature ? (
          <div className="flex gap-2 pt-1">
            <Input
              value={newNature}
              onChange={(e) => setNewNature(e.target.value)}
              placeholder={t('taskDialog.naturePlaceholder')}
            />
            <Button
              type="button"
              size="sm"
              className="shrink-0 rounded-lg"
              onClick={createNature}
              disabled={creatingNature || !newNature.trim()}
            >
              {t('taskDialog.natureCreate')}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 h-7 gap-1 rounded-lg px-2 text-xs text-primary hover:text-primary"
            onClick={() => setShowNewNature(true)}
          >
            <Plus className="h-3.5 w-3.5" /> {t('taskDialog.addNature')}
          </Button>
        )}
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