import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck, Plus, X } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO, fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const UNIT_OPTIONS = ['L', 'KG', 'Flacon', 'Sac', 'Bidon', 'Tonne', 'Carton', 'Palette'];

const emptyLine = () => ({ item_id: '', category: '', unit: '', unit_price: '', quantity: '' });

const emptyForm = () => ({
  date: todayISO(),
  storage_id: '',
  lines: [emptyLine()],
  notes: '',
});

export default function CountForm({ items, storages, unitCostFor, onHandFor, onSaved, responsible = '' }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setLine = (index, key, value) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [key]: value } : line)),
    }));

  const pickItem = (index, itemId) => {
    const item = items.find((row) => row.id === itemId);
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => {
        if (i !== index) return line;
        return {
          ...line,
          item_id: itemId,
          category: item?.category || line.category,
          unit: item?.unit || line.unit,
          unit_price: unitCostFor(itemId) ? String(unitCostFor(itemId)) : line.unit_price,
        };
      }),
    }));
  };

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, emptyLine()] }));

  const removeLine = (index) =>
    setForm((prev) => ({ ...prev, lines: prev.lines.filter((_, i) => i !== index) }));

  const itemOptions = items.map((item) => ({ value: item.id, label: item.name }));

  const filledLines = form.lines.filter((line) => line.item_id);
  const total = filledLines.reduce(
    (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
    0,
  );

  const submit = async (event) => {
    event.preventDefault();
    if (!form.date || !filledLines.length) {
      setError(t('stockCount.required'));
      return;
    }
    if (!responsible.trim()) {
      setError(t('stockCount.needResponsible'));
      return;
    }
    setError('');
    setSaving(true);
    const lines = filledLines.map((line) => ({
      item_id: line.item_id,
      category: line.category.trim(),
      unit: line.unit.trim(),
      unit_price: Number(line.unit_price) || 0,
      quantity: Number(line.quantity) || 0,
    }));
    const count = await base44.entities.InventoryCount.create({
      date: form.date,
      storage_id: form.storage_id,
      responsible: responsible.trim(),
      lines,
      notes: form.notes.trim(),
    });

    // Le constat ajuste le stock : un mouvement d'entrée ou de sortie par écart.
    const adjustments = lines
      .map((line) => {
        const delta = line.quantity - (onHandFor(line.item_id) || 0);
        if (Math.abs(delta) < 0.0001) return null;
        return {
          item_id: line.item_id,
          kind: delta > 0 ? 'in' : 'out',
          quantity: Math.abs(delta),
          date: form.date,
          cost: Math.abs(delta) * line.unit_price,
          storage_id: form.storage_id,
          count_id: count.id,
          notes: t('stockCount.movementNote', { date: form.date }),
        };
      })
      .filter(Boolean);
    if (adjustments.length) await base44.entities.StockMovement.bulkCreate(adjustments);
    setSaving(false);
    setForm(emptyForm());
    onSaved();
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="font-display text-base leading-tight tracking-tight">{t('stockCount.formTitle')}</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t('stockCount.formHint')}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('stockCount.date')}>
          <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} required />
        </Field>
        <Field label={t('stockCount.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => set('storage_id', value)}
            noneLabel={t('stockCount.noStorage')}
            options={storages.map((storage) => ({
              value: storage.id,
              label: storage.farm ? `${storage.name} · ${storage.farm}` : storage.name,
            }))}
          />
        </Field>
      </div>

      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('stockCount.lines')}
        </p>

        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <tr>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.item')}</th>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.category')}</th>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.unit')}</th>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.unitPrice')}</th>
                <th className="px-2.5 py-2 text-start font-medium">{t('stockCount.quantity')}</th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, index) => (
                <tr key={index} className="border-t border-border/50">
                  <td className="px-2.5 py-2 align-middle">
                    <SelectField
                      value={line.item_id}
                      onChange={(value) => pickItem(index, value)}
                      noneLabel={t('stockCount.noItem')}
                      options={itemOptions}
                      className="h-9 min-w-[150px]"
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <Input
                      value={line.category}
                      onChange={(e) => setLine(index, 'category', e.target.value)}
                      className="h-9 min-w-[110px]"
                      placeholder={t('stockCount.categoryPlaceholder')}
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <Input
                      value={line.unit}
                      onChange={(e) => setLine(index, 'unit', e.target.value)}
                      list="count-units"
                      className="h-9 w-[90px]"
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => setLine(index, 'unit_price', e.target.value)}
                      className="h-9 w-[100px] text-end tabular-nums"
                    />
                  </td>
                  <td className="px-2.5 py-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => setLine(index, 'quantity', e.target.value)}
                      className="h-9 w-[100px] text-end tabular-nums"
                    />
                  </td>
                  <td className="px-1 py-2 text-center">
                    {form.lines.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        onClick={() => removeLine(index)}
                        aria-label={t('stockCount.removeLine')}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border/60 bg-secondary/20">
              <tr>
                <td colSpan={3} className="px-2.5 py-3">
                  <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={addLine}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> {t('stockCount.addLine')}
                  </Button>
                </td>
                <td className="px-2.5 py-3 text-end text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {t('stockCount.total')}
                </td>
                <td className="px-2.5 py-3 text-end text-sm font-medium tabular-nums">{fmtMoney(total)}</td>
                <td />
              </tr>
              <tr className="border-t border-border/60">
                <td colSpan={3} className="px-2.5 py-3">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {t('stockCount.responsible')}
                  </p>
                  <p className="mt-0.5 text-sm font-medium">{responsible || t('stockCount.responsibleUnknown')}</p>
                </td>
                <td colSpan={3} className="px-2.5 py-3 text-end">
                  <Button type="submit" className="rounded-xl" disabled={saving}>
                    {t('stockCount.validate')}
                  </Button>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <datalist id="count-units">
          {UNIT_OPTIONS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>
      </div>

      <div className="mt-3">
        <Field label={t('common.notes')}>
          <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </form>
  );
}