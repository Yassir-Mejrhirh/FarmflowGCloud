import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Sprout } from 'lucide-react';
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
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const CATEGORIES = ['cereal', 'vegetable', 'fruit_tree', 'legume', 'fodder', 'other'];

export default function Crops() {
  const { t } = useI18n();
  const [tab, setTab] = useState('crops');
  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cropDialog, setCropDialog] = useState(false);
  const [editingCrop, setEditingCrop] = useState(null);
  const [varietyDialog, setVarietyDialog] = useState(false);
  const [editingVariety, setEditingVariety] = useState(null);

  const load = async () => {
    const [cropRows, varietyRows] = await Promise.all([
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchList(base44.entities.Variety, {}, { sort: 'name' }),
    ]);
    setCrops(cropRows);
    setVarieties(varietyRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cropMap = useMemo(() => byId(crops), [crops]);
  const varietyCount = useMemo(
    () =>
      varieties.reduce((counts, variety) => {
        counts[variety.crop_id] = (counts[variety.crop_id] || 0) + 1;
        return counts;
      }, {}),
    [varieties],
  );

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
              if (tab === 'crops') {
                setEditingCrop(null);
                setCropDialog(true);
              } else {
                setEditingVariety(null);
                setVarietyDialog(true);
              }
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {tab === 'crops' ? t('crops.newCrop') : t('crops.newVariety')}
          </Button>
        }
      />

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'crops', label: `${t('crops.tabCrops')} (${crops.length})` },
          { value: 'varieties', label: `${t('crops.tabVarieties')} (${varieties.length})` },
        ]}
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : tab === 'crops' ? (
        crops.length === 0 ? (
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
                  <span>{t('crops.varietiesCount', { n: varietyCount[crop.id] || 0 })}</span>
                </div>
                {crop.notes && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{crop.notes}</p>}
              </button>
            ))}
          </div>
        )
      ) : varieties.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t('crops.noVarietiesTitle')}
          description={t('crops.noVarietiesDesc')}
          action={<Button onClick={() => setVarietyDialog(true)}>{t('crops.addVariety')}</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <ul className="divide-y divide-border/60">
            {varieties.map((variety) => (
              <li key={variety.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{variety.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cropMap[variety.crop_id]?.name || t('crops.noCropLinked')}
                    {variety.maturity_days ? ` · ${t('crops.daysToMaturity', { n: fmtNum(variety.maturity_days, 0) })}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingVariety(variety);
                    setVarietyDialog(true);
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  {t('common.edit')}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <CropDialog open={cropDialog} onOpenChange={setCropDialog} crop={editingCrop} onSaved={load} />
      <VarietyDialog
        open={varietyDialog}
        onOpenChange={setVarietyDialog}
        variety={editingVariety}
        crops={crops}
        onSaved={load}
      />
    </div>
  );
}

function CropDialog({ open, onOpenChange, crop, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', category: 'other', cycle_days: '', notes: '' });
  const [saving, setSaving] = useState(false);

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
    if (!form.name.trim()) return;
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
    if (!crop?.id) return;
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
      submitLabel={crop ? t('cropDialog.save') : t('cropDialog.add')}
    >
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
      {crop?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('cropDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}

function VarietyDialog({ open, onOpenChange, variety, crops, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', crop_id: '', maturity_days: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: variety?.name || '',
      crop_id: variety?.crop_id || '',
      maturity_days: variety?.maturity_days ?? '',
      notes: variety?.notes || '',
    });
  }, [open, variety]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      crop_id: form.crop_id,
      maturity_days: Number(form.maturity_days) || 0,
      notes: form.notes,
    };
    if (variety?.id) await base44.entities.Variety.update(variety.id, payload);
    else await base44.entities.Variety.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!variety?.id) return;
    setSaving(true);
    await base44.entities.Variety.delete(variety.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={variety ? t('varietyDialog.editTitle') : t('varietyDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={variety ? t('varietyDialog.save') : t('varietyDialog.add')}
    >
      <Field label={t('varietyDialog.nameLabel')}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t('varietyDialog.namePlaceholder')} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.crop')}>
          <SelectField
            value={form.crop_id}
            onChange={(value) => setForm({ ...form, crop_id: value })}
            noneLabel={t('varietyDialog.noCrop')}
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label={t('varietyDialog.maturity')}>
          <Input
            type="number"
            value={form.maturity_days}
            onChange={(e) => setForm({ ...form, maturity_days: e.target.value })}
          />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {variety?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('varietyDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}