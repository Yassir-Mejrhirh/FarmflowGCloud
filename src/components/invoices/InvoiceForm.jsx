import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Receipt } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const UNIT_OPTIONS = ['L', 'KG', 'Flacon', 'Sac', 'Bidon', 'Tonne', 'Carton', 'Palette'];

const emptyForm = () => ({
  date: todayISO(),
  invoice_number: '',
  supplier_id: '',
  item_id: '',
  quantity: '',
  unit: '',
  unit_price: '',
  amount: '',
  notes: '',
});

export default function InvoiceForm({ suppliers, items, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (!form.date || !Number(form.amount)) {
      setError(t('invInvoices.required'));
      return;
    }
    setError('');
    setSaving(true);
    await base44.entities.InputInvoice.create({
      date: form.date,
      invoice_number: form.invoice_number.trim(),
      supplier_id: form.supplier_id,
      item_id: form.item_id,
      quantity: Number(form.quantity) || 0,
      unit: form.unit.trim(),
      unit_price: Number(form.unit_price) || 0,
      amount: Number(form.amount) || 0,
      notes: form.notes.trim(),
    });
    setSaving(false);
    setForm(emptyForm());
    onSaved();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Receipt className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="font-display text-base leading-tight tracking-tight">{t('invInvoices.formTitle')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('invInvoices.formHint')}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Field label={t('common.date')}>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label={t('invInvoices.number')}>
          <Input
            value={form.invoice_number}
            onChange={(e) => set('invoice_number', e.target.value)}
            placeholder={t('invInvoices.numberPlaceholder')}
          />
        </Field>
        <Field label={t('invInvoices.supplier')}>
          <SelectField
            value={form.supplier_id}
            onChange={(value) => set('supplier_id', value)}
            noneLabel={t('invInvoices.noSupplier')}
            options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
          />
        </Field>
        <Field label={t('invInvoices.item')}>
          <SelectField
            value={form.item_id}
            onChange={(value) => set('item_id', value)}
            noneLabel={t('invInvoices.noItem')}
            options={items.map((item) => ({ value: item.id, label: item.name }))}
          />
        </Field>
        <Field label={t('invInvoices.quantity')}>
          <Input
            type="number"
            step="0.01"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
          />
        </Field>
        <Field label={t('invInvoices.unit')}>
          <Input
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            list="invoice-units"
            placeholder={t('invInvoices.unitPlaceholder')}
          />
          <datalist id="invoice-units">
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </Field>
        <Field label={t('invInvoices.unitPrice')}>
          <Input type="number" step="0.01" value={form.unit_price} onChange={(e) => set('unit_price', e.target.value)} />
        </Field>
        <Field label={t('invInvoices.amount')}>
          <Input type="number" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} required />
        </Field>
      </div>

      <div className="mt-3">
        <Field label={t('invInvoices.note')}>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="mt-4 flex justify-end">
        <Button type="submit" className="rounded-xl" disabled={saving}>
          {t('invInvoices.save')}
        </Button>
      </div>
    </form>
  );
}