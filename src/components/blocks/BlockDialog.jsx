import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import BoundaryDrawer from '@/components/blocks/BoundaryDrawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { polygonAreaHa } from '@/lib/geo';

const EMPTY = {
  name: '', code: '', crop_id: '', variety_id: '', planting_date: '', status: 'active', soil_type: '', notes: '', boundary: [],
};

export default function BlockDialog({ open, onOpenChange, block, crops, varieties, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      block
        ? {
            name: block.name || '',
            code: block.code || '',
            crop_id: block.crop_id || '',
            variety_id: block.variety_id || '',
            planting_date: block.planting_date || '',
            status: block.status || 'active',
            soil_type: block.soil_type || '',
            notes: block.notes || '',
            boundary: block.boundary || [],
          }
        : EMPTY,
    );
  }, [open, block]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const area = polygonAreaHa(form.boundary);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      crop_id: form.crop_id,
      variety_id: form.variety_id,
      status: form.status,
      soil_type: form.soil_type,
      notes: form.notes,
      boundary: form.boundary,
      area_ha: Number(area.toFixed(2)),
    };
    if (form.planting_date) payload.planting_date = form.planting_date;

    if (block?.id) await base44.entities.FarmBlock.update(block.id, payload);
    else await base44.entities.FarmBlock.create(payload);

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!block?.id) return;
    setSaving(true);
    await base44.entities.FarmBlock.delete(block.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const varietyOptions = varieties
    .filter((variety) => !form.crop_id || variety.crop_id === form.crop_id)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={block ? 'Edit block' : 'New block'}
      description="Trace the field boundary on satellite imagery — the area is measured automatically."
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={block ? 'Save block' : 'Create block'}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Block name">
          <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="North Olive Terrace" required />
        </Field>
        <Field label="Code">
          <Input value={form.code} onChange={(e) => update('code', e.target.value)} placeholder="OL-01" />
        </Field>
        <Field label="Crop">
          <SelectField
            value={form.crop_id}
            onChange={(value) => setForm((prev) => ({ ...prev, crop_id: value, variety_id: '' }))}
            noneLabel="No crop yet"
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label="Variety">
          <SelectField
            value={form.variety_id}
            onChange={(value) => update('variety_id', value)}
            noneLabel="No variety"
            options={varietyOptions}
            placeholder={form.crop_id ? 'Select variety' : 'Pick a crop first'}
          />
        </Field>
        <Field label="Planting date">
          <Input type="date" value={form.planting_date} onChange={(e) => update('planting_date', e.target.value)} />
        </Field>
        <Field label="Status">
          <SelectField
            value={form.status}
            onChange={(value) => update('status', value)}
            options={[
              { value: 'active', label: 'Growing' },
              { value: 'preparing', label: 'Preparing' },
              { value: 'harvest', label: 'Harvesting' },
              { value: 'fallow', label: 'Fallow' },
            ]}
          />
        </Field>
        <Field label="Soil type">
          <Input value={form.soil_type} onChange={(e) => update('soil_type', e.target.value)} placeholder="Sandy loam" />
        </Field>
        <Field label="Measured area">
          <div className="flex h-10 items-center rounded-md border border-input bg-secondary/60 px-3 text-sm font-medium tabular-nums">
            {area.toFixed(2)} ha
          </div>
        </Field>
      </div>

      <Field label="Boundary" hint="Place at least three corners to close the field outline.">
        <BoundaryDrawer points={form.boundary} onChange={(points) => update('boundary', points)} />
      </Field>

      <Field label="Notes">
        <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder="Irrigation, access, anything worth remembering" />
      </Field>

      {block?.id && (
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs font-medium text-destructive hover:underline"
        >
          Delete this block
        </button>
      )}
    </FormDialog>
  );
}