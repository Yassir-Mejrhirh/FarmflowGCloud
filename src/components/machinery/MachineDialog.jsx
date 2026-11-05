import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import PhotoField from '@/components/machinery/PhotoField';
import SparePartsEditor from '@/components/machinery/SparePartsEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/I18nContext';

export const BASE_TYPES = ['tractor', 'harvester', 'sprayer', 'truck', 'implement', 'other'];
const NEW_TYPE = '__new_type';

export function machineTypeLabel(type, types = [], t) {
  if (!type) return '—';
  if (BASE_TYPES.includes(type)) return t(`mt.${type}`);
  return types.find((row) => row.name === type)?.name || type;
}

export default function MachineDialog({ open, onOpenChange, machine, types = [], onTypesChanged, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showNewType, setShowNewType] = useState(false);
  const [newType, setNewType] = useState('');
  const [creatingType, setCreatingType] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShowNewType(false);
    setNewType('');
    setForm({
      name: machine?.name || '',
      type: machine?.type || 'tractor',
      year: machine?.year ?? '',
      plate: machine?.plate || '',
      photo_uri: machine?.photo_uri || '',
      status: machine?.status || 'operational',
      notes: machine?.notes || '',
      spare_parts: (machine?.spare_parts || []).map((row) => ({ ...row })),
    });
  }, [open, machine]);

  const typeOptions = [
    ...BASE_TYPES.map((value) => ({ value, label: t(`mt.${value}`) })),
    ...types
      .filter((row) => !BASE_TYPES.includes(row.name))
      .map((row) => ({ value: row.name, label: row.name })),
    { value: NEW_TYPE, label: t('machDialog.newType') },
  ];

  const createType = async () => {
    const name = newType.trim();
    if (!name) return;
    setCreatingType(true);
    const created = await base44.entities.MachineType.create({ name });
    await onTypesChanged();
    setCreatingType(false);
    setNewType('');
    setShowNewType(false);
    setForm((prev) => ({ ...prev, type: created?.name || name }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      type: form.type,
      year: form.year === '' || form.year == null ? null : Number(form.year),
      plate: form.plate || '',
      photo_uri: form.photo_uri || '',
      status: form.status,
      notes: form.notes || '',
      spare_parts: (form.spare_parts || []).filter((row) => row.kind || row.brand || row.reference),
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
        <Input
          value={form.name || ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="John Deere 5075"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.type')}>
          <SelectField
            value={form.type}
            onChange={(value) => {
              if (value === NEW_TYPE) {
                setShowNewType(true);
                return;
              }
              setForm({ ...form, type: value });
            }}
            options={typeOptions}
          />
        </Field>
        <Field label={t('machDialog.year')}>
          <Input
            type="number"
            value={form.year ?? ''}
            onChange={(e) => setForm({ ...form, year: e.target.value })}
            placeholder="2018"
          />
        </Field>
        <Field label={t('machDialog.plate')}>
          <Input value={form.plate || ''} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
        </Field>
        <Field label={t('common.status')}>
          <SelectField
            value={form.status}
            onChange={(value) => setForm({ ...form, status: value })}
            options={['operational', 'maintenance', 'retired'].map((value) => ({
              value,
              label: t(`mst.${value}`),
            }))}
          />
        </Field>
      </div>

      {showNewType && (
        <div className="flex items-end gap-2">
          <Field label={t('machDialog.newTypeTitle')} className="flex-1">
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder={t('machDialog.typePlaceholder')}
              autoFocus
            />
          </Field>
          <Button
            type="button"
            size="sm"
            className="mb-0.5 rounded-lg"
            onClick={createType}
            disabled={creatingType || !newType.trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> {t('machDialog.typeCreate')}
          </Button>
        </div>
      )}

      <PhotoField
        value={form.photo_uri || ''}
        onChange={(photo_uri) => setForm({ ...form, photo_uri })}
      />

      <SparePartsEditor
        value={form.spare_parts || []}
        onChange={(spare_parts) => setForm({ ...form, spare_parts })}
      />

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