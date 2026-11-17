import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/I18nContext';

// Tâche absente du catalogue : créée ici, pendant la saisie du rapport, avec son nom,
// si elle nécessite une machine et une courte description.
export default function NewTaskDialog({ open, onOpenChange, natures = [], onCreated }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [machineRequired, setMachineRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const close = (next) => {
    if (!next) {
      setName('');
      setDescription('');
      setMachineRequired(false);
      setError('');
    }
    onOpenChange(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) return;
    setSaving(true);
    setError('');
    try {
      // La nature porte le nom de la tâche : le catalogue et le rapport l'affichent ainsi.
      const known = natures.some((nature) => String(nature.name).toLowerCase() === clean.toLowerCase());
      if (!known) await base44.entities.TaskNature.create({ name: clean });
      const task = await base44.entities.Task.create({
        title: clean,
        type: clean,
        description: description.trim(),
        machine_required: machineRequired,
      });
      await onCreated(task);
      close(false);
    } catch {
      setError(t('report.newTaskFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title={t('report.newTaskTitle')}
      description={t('report.newTaskDesc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('report.newTaskCreate')}
      submitDisabled={!name.trim()}
      disabledReason={!name.trim() ? t('report.newTaskRequired') : ''}
    >
      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      <Field label={t('report.newTaskName')}>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('report.newTaskNamePlaceholder')}
          autoFocus
        />
      </Field>

      <Field label={t('report.newTaskMachine')}>
        <div className="flex items-center gap-3">
          <Switch checked={machineRequired} onCheckedChange={setMachineRequired} />
          <span className="text-sm">{machineRequired ? t('common.yes') : t('common.no')}</span>
        </div>
      </Field>

      <Field label={t('report.newTaskDescription')}>
        <Textarea
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder={t('report.newTaskDescriptionPlaceholder')}
        />
      </Field>
    </FormDialog>
  );
}