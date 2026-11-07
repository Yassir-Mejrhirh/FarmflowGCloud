import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

const CATEGORIES = ['cereal', 'vegetable', 'fruit_tree', 'legume', 'fodder', 'other'];

export default function Crops() {
  const { t } = useI18n();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropDialog, setCropDialog] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);

  const load = async () => {
    const cropRows = await fetchList(base44.entities.Crop, {}, { sort: 'name' });
    setCrops(cropRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('crops.eyebrow')}
        title={t('crops.title')}
        description={t('crops.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditingCrop(null);
              setCropDialog(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('crops.newCrop')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : crops.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t('crops.emptyTitle')}
          description={t('crops.emptyDesc')}
          action={<Button onClick={() => setCropDialog(true)}>{t('crops.addCrop')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {crops.map((crop) => (
            <button
              key={crop.id}
              type="button"
              onClick={() => {
                setEditingCrop(crop);
                setCropDialog(true);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg leading-tight">{crop.name}</p>
                <StatusPill tone="sand">{t(`cat.${crop.category}`)}</StatusPill>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span>{crop.cycle_days ? t('crops.cycleDays', { n: fmtNum(crop.cycle_days, 0) }) : t('crops.cycleNotSet')}</span>
              </div>
              {crop.notes && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{crop.notes}</p>}
            </button>
          ))}
        </div>
      )}

      <CropDialog open={cropDialog} onOpenChange={setCropDialog} crop={editingCrop} onSaved={load} />
    </div>
  );
}

function CropDialog({ open, onOpenChange, crop, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', category: 'other', cycle_days: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('Crop', crop);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: crop?.name || '',
      category: crop?.category || 'other',
      cycle_days: crop?.cycle_days ?? '',
      notes: crop?.notes || '',
    });
  }, [open, crop]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      cycle_days: Number(form.cycle_days) || 0,
      notes: form.notes,
    };
    if (crop?.id) await base44.entities.Crop.update(crop.id, payload);
    else await base44.entities.Crop.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!crop?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.Crop.delete(crop.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={crop ? t('cropDialog.editTitle') : t('cropDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitDisabled={lock.locked}
      submitLabel={crop ? t('cropDialog.save') : t('cropDialog.add')}
    >
      <ParamLockNotice usage={lock.usage} />

      <Field label={t('cropDialog.nameLabel')}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('cropDialog.namePlaceholder')} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.category')}>
          <SelectField
            value={form.category}
            onChange={(value) => setForm({ ...form, category: value })}
            options={CATEGORIES.map((value) => ({ value, label: t(`cat.${value}`) }))}
          />
        </Field>
        <Field label={t('cropDialog.cycleLength')}>
          <Input
            type="number"
            value={form.cycle_days}
            onChange={(e) => setForm({ ...form, cycle_days: e.target.value })}
            placeholder="180"
          />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {crop?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('cropDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}