import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function HarvestDialog({ open, onOpenChange, block, blocks, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ block_id: '', date: todayISO(), quantity_kg: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ block_id: block?.id || '', date: todayISO(), quantity_kg: '', notes: '' });
  }, [open, block]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.block_id || !form.date) return;
    setSaving(true);
    await base44.entities.Harvest.create({
      block_id: form.block_id,
      date: form.date,
      quantity_kg: Number(form.quantity_kg) || 0,
      notes: form.notes.trim(),
    });
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('harvest.title')}
      description={t('harvest.desc')}
      onSubmit={handleSubmit}
      saving={saving}
      submitLabel={t('harvest.save')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.block')}>
          <SelectField
            value={form.block_id}
            onChange={(value) => update('block_id', value)}
            options={blocks.map((b) => ({ value: b.id, label: b.name }))}
            placeholder={t('harvest.selectBlock')}
          />
        </Field>
        <Field label={t('harvest.date')}>
          <Input type="date" value={form.date} onChange={(e) => update('date', e.target.value)} required />
        </Field>
        <Field label={t('harvest.yield')} hint={t('harvest.yieldHint')}>
          <Input
            type="number"
            min="0"
            step="1"
            value={form.quantity_kg}
            onChange={(e) => update('quantity_kg', e.target.value)}
            placeholder="1500"
            required
          />
        </Field>
        <Field label={t('common.notes')}>
          <Input value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder={t('harvest.notesPlaceholder')} />
        </Field>
      </div>
    </FormDialog>
  );
}