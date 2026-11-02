import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Sprout } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList, byId } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function Varieties() {
  const { t } = useI18n();
  const [varieties, setVarieties] = useState([]);
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const [varietyRows, cropRows] = await Promise.all([
      fetchList(base44.entities.Variety, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
    ]);
    setVarieties(varietyRows);
    setCrops(cropRows);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cropMap = useMemo(() => byId(crops), [crops]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('varieties.eyebrow')}
        title={t('varieties.title')}
        description={t('varieties.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('varieties.new')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : varieties.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title={t('varieties.emptyTitle')}
          description={t('varieties.emptyDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('varieties.add')}</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <ul className="divide-y divide-border/60">
            {varieties.map((variety) => (
              <li key={variety.id} className="flex items-center gap-4 px-4 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{variety.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {cropMap[variety.crop_id]?.name || t('varieties.noCrop')}
                    {variety.maturity_days ? ` · ${t('varieties.maturityDays', { n: fmtNum(variety.maturity_days, 0) })}` : ''}
                  </p>
                  {variety.notes && (
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{variety.notes}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(variety);
                    setOpen(true);
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

      <VarietyDialog open={open} onOpenChange={setOpen} variety={editing} crops={crops} onSaved={load} />
    </div>
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
      title={variety ? t('varieties.dialogEdit') : t('varieties.dialogNew')}
      onSubmit={submit}
      saving={saving}
    >
      <Field label={t('common.name')}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t('varieties.namePlaceholder')}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.crop')}>
          <SelectField
            value={form.crop_id}
            onChange={(value) => setForm({ ...form, crop_id: value })}
            noneLabel={t('varieties.noCrop')}
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label={t('varieties.maturity')}>
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
          {t('varieties.delete')}
        </button>
      )}
    </FormDialog>
  );
}