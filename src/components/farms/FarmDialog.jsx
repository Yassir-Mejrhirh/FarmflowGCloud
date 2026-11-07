import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import KmzPointImport from '@/components/geo/KmzPointImport';
import LocationPicker from '@/components/geo/LocationPicker';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

export default function FarmDialog({ open, onOpenChange, farm, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('Farm', farm);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: farm?.name || '',
      latitude: farm?.latitude ?? null,
      longitude: farm?.longitude ?? null,
      notes: farm?.notes || '',
    });
  }, [open, farm]);

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
    const payload = { name: form.name.trim(), notes: form.notes || '' };
    if (form.latitude != null && form.longitude != null) {
      payload.latitude = form.latitude;
      payload.longitude = form.longitude;
    }
    if (farm?.id) await base44.entities.Farm.update(farm.id, payload);
    else await base44.entities.Farm.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!farm?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.Farm.delete(farm.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={farm ? t('farms.dialogEdit') : t('farms.dialogNew')}
      onSubmit={submit}
      saving={saving}
      wide
      submitDisabled={lock.locked}
      submitLabel={farm ? t('common.save') : t('farms.add')}
    >
      <ParamLockNotice usage={lock.usage} />

      <Field label={t('common.name')}>
        <Input
          value={form.name || ''}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t('farms.namePlaceholder')}
          required
        />
      </Field>
      <Field label={t('storageDialog.geolocation')}>
        <div className="space-y-2">
          <LocationPicker
            value={form.latitude != null ? { lat: form.latitude, lng: form.longitude } : null}
            onChange={setPoint}
          />
          <KmzPointImport onPick={setPoint} />
        </div>
      </Field>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {farm?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('farms.delete')}
        </button>
      )}
    </FormDialog>
  );
}