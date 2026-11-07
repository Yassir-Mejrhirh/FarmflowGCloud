import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import KmzPointImport from '@/components/geo/KmzPointImport';
import LocationPicker from '@/components/geo/LocationPicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

const KINDS = ['warehouse', 'cold_room', 'silo', 'shed'];

export default function StorageDialog({ open, onOpenChange, storage, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [farms, setFarms] = useState([]);
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('Storage', storage);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: storage?.name || '',
      kind: storage?.kind || 'warehouse',
      farm: storage?.farm || '',
      location: storage?.location || '',
      latitude: storage?.latitude ?? null,
      longitude: storage?.longitude ?? null,
      capacity_note: storage?.capacity_note || '',
      notes: storage?.notes || '',
    });
    fetchList(base44.entities.Farm, {}, { sort: 'name' }).then(setFarms);
  }, [open, storage]);

  const setPoint = (point) => {
    setForm((prev) => ({
      ...prev,
      latitude: point ? point.lat : null,
      longitude: point ? point.lng : null,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name?.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      farm: form.farm || '',
      location: form.location || '',
      capacity_note: form.capacity_note || '',
      notes: form.notes || '',
    };
    if (form.latitude != null && form.longitude != null) {
      payload.latitude = form.latitude;
      payload.longitude = form.longitude;
    }
    if (storage?.id) await base44.entities.Storage.update(storage.id, payload);
    else await base44.entities.Storage.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!storage?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.Storage.delete(storage.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={storage ? t('storageDialog.editTitle') : t('storageDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      wide
      submitDisabled={lock.locked}
      submitLabel={storage ? t('storageDialog.save') : t('storageDialog.add')}
    >
      <ParamLockNotice usage={lock.usage} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.name')}>
          <Input
            value={form.name || ''}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('storageDialog.namePlaceholder')}
            required
          />
        </Field>
        <Field label={t('common.type')}>
          <SelectField
            value={form.kind}
            onChange={(value) => setForm({ ...form, kind: value })}
            options={KINDS.map((value) => ({ value, label: t(`sk.${value}`) }))}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('storageDialog.farm')}>
          <SelectField
            value={form.farm}
            onChange={(value) => setForm({ ...form, farm: value })}
            options={farms.map((farm) => ({ value: farm.name, label: farm.name }))}
            noneLabel={t('storageDialog.farmNone')}
            placeholder={t('storageDialog.farmNone')}
          />
        </Field>
        <Field label={t('storageDialog.location')}>
          <Input
            value={form.location || ''}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder={t('storageDialog.locationPlaceholder')}
          />
        </Field>
      </div>
      <Field label={t('storageDialog.geolocation')}>
        <div className="space-y-2">
          <LocationPicker
            value={form.latitude != null ? { lat: form.latitude, lng: form.longitude } : null}
            onChange={setPoint}
          />
          <KmzPointImport onPick={setPoint} />
        </div>
      </Field>
      <Field label={t('storageDialog.capacity')}>
        <Input
          value={form.capacity_note || ''}
          onChange={(e) => setForm({ ...form, capacity_note: e.target.value })}
          placeholder={t('storageDialog.capacityPlaceholder')}
        />
      </Field>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {storage?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('storageDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}