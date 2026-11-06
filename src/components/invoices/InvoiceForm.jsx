import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Receipt, X } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { priceToPrimary, toPrimary, unitOptionsFor } from '@/lib/units';

const emptyLine = () => ({ item_id: '', quantity: '', unit: '', unit_price: '' });

const emptyForm = () => ({
  date: todayISO(),
  invoice_number: '',
  supplier_id: '',
  storage_id: '',
  lines: [emptyLine()],
  notes: '',
});

const lineTotal = (line) => (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);

export default function InvoiceForm({ suppliers, items, storages = [], onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setLine = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => {
        if (i !== index) return line;
        if (key !== 'item_id') return { ...line, [key]: value };
        // À la sélection de l'intrant, l'unité principale devient l'unité de saisie.
        const item = items.find((row) => row.id === value);
        return { ...line, item_id: value, unit: item?.unit || '' };
      }),
    }));

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));

  const removeLine = (index) =>
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

  const itemOptions = items.map((item) => ({ value: item.id, label: item.name }));
  const total = form.lines.reduce((sum, line) => sum + lineTotal(line), 0);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.date || total <= 0) {
      setError(t('invInvoices.required'));
      return;
    }
    setError('');
    setSaving(true);
    await base44.entities.InputInvoice.create({
      date: form.date,
      invoice_number: form.invoice_number.trim(),
      supplier_id: form.supplier_id,
      storage_id: form.storage_id,
      lines: form.lines
        .filter((line) => line.item_id || Number(line.quantity) || Number(line.unit_price))
        .map((line) => {
          const item = items.find((row) => row.id === line.item_id);
          // La quantité et le prix sont enregistrés dans l'unité principale de l'intrant.
          return {
            item_id: line.item_id,
            quantity: toPrimary(line.quantity, line.unit, item),
            unit: item?.unit || line.unit.trim(),
            unit_price: priceToPrimary(line.unit_price, line.unit, item),
          };
        }),
      amount: total,
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        <Field label={t('invInvoices.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => set('storage_id', value)}
            noneLabel={t('invInvoices.noStorage')}
            options={storages.map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('invInvoices.lines')}
        </p>
        {form.lines.map((line, index) => {
          const lineItem = items.find((row) => row.id === line.item_id);
          const converted = toPrimary(line.quantity, line.unit, lineItem);
          const showConversion = lineItem && line.unit && line.unit !== lineItem.unit && converted > 0;
          return (
          <div key={index} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Field label={t('invInvoices.item')}>
                <SelectField
                  value={line.item_id}
                  onChange={(value) => setLine(index, 'item_id', value)}
                  noneLabel={t('invInvoices.noItem')}
                  options={itemOptions}
                />
              </Field>
              <Field label={t('invInvoices.quantity')}>
                <Input
                  type="number"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => setLine(index, 'quantity', e.target.value)}
                />
              </Field>
              <Field label={t('invInvoices.unit')}>
                <SelectField
                  value={line.unit}
                  onChange={(value) => setLine(index, 'unit', value)}
                  noneLabel={t('itemDialog.noUnit')}
                  options={unitOptionsFor(lineItem)}
                />
              </Field>
              <div className="flex items-end gap-2">
                <Field label={t('invInvoices.unitPrice')} className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    value={line.unit_price}
                    onChange={(e) => setLine(index, 'unit_price', e.target.value)}
                  />
                </Field>
                {form.lines.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mb-0.5 h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() => removeLine(index)}
                    aria-label={t('invInvoices.removeLine')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-end gap-x-3 text-[11px] tabular-nums text-muted-foreground">
              {showConversion && (
                <span>
                  = {fmtNum(converted, 2)} {lineItem.unit}
                </span>
              )}
              {lineTotal(line) > 0 && (
                <span>
                  {t('invInvoices.lineTotal')} {fmtMoney(lineTotal(line))}
                </span>
              )}
            </div>
          </div>
          );
        })}
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addLine}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('invInvoices.addLine')}
        </Button>
      </div>

      <div className="mt-3">
        <Field label={t('invInvoices.note')}>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('invInvoices.amount')}</p>
          <p className="font-display text-xl leading-tight tabular-nums">{fmtMoney(total)}</p>
        </div>
        <Button type="submit" className="rounded-xl" disabled={saving}>
          {t('invInvoices.save')}
        </Button>
      </div>
    </form>
  );
}