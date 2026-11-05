import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const FORMULATIONS = ['Liquide', 'Poudre', 'Granulé', 'Suspension', 'Émulsion', 'Gel', 'Appât'];
const UNITS = ['L', 'KG', 'Sac', 'Bidon', 'Flacon', 'Tonne', 'Carton', 'Unité'];

const emptyForm = () => ({
  name: '',
  category: '',
  formulation: '',
  unit: '',
  supplier_ids: [],
  min_stock_enabled: false,
  min_stock: '',
  storage_id: '',
  notes: '',
});

export default function ItemDialog({ open, onOpenChange, item, storages, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: item?.name || '',
      category: item?.category || '',
      formulation: item?.formulation || '',
      unit: item?.unit || '',
      supplier_ids: item?.supplier_ids || [],
      min_stock_enabled: Boolean(item?.min_stock_enabled),
      min_stock: item?.min_stock ?? '',
      storage_id: item?.storage_id || '',
      notes: item?.notes || '',
    });
    setNewCategory('');
    (async () => {
      const [categoryRows, supplierRows] = await Promise.all([
        fetchList(base44.entities.InputCategory, {}, { sort: 'name' }),
        fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
      ]);
      setCategories(categoryRows);
      setSuppliers(supplierRows);
    })();
  }, [open, item]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const toggleSupplier = (id) =>
    setForm((prev) => ({
      ...prev,
      supplier_ids: prev.supplier_ids.includes(id)
        ? prev.supplier_ids.filter((value) => value !== id)
        : [...prev.supplier_ids, id],
    }));

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setCreating(true);
    const created = await base44.entities.InputCategory.create({ name });
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((prev) => ({ ...prev, category: created.name }));
    setNewCategory('');
    setCreating(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      formulation: form.formulation.trim(),
      unit: form.unit.trim(),
      supplier_ids: form.supplier_ids,
      min_stock_enabled: form.min_stock_enabled,
      min_stock: Number(form.min_stock) || 0,
      storage_id: form.storage_id,
      notes: form.notes.trim(),
    };
    if (item?.id) await base44.entities.InputItem.update(item.id, payload);
    else await base44.entities.InputItem.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!item?.id) return;
    setSaving(true);
    await base44.entities.InputItem.delete(item.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? t('itemDialog.editTitle') : t('itemDialog.newTitle')}
      onSubmit={submit}
      saving={saving}
      submitLabel={item ? t('itemDialog.save') : t('itemDialog.add')}
    >
      <Field label={t('common.name')}>
        <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="NPK 15-15-15" required />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('common.category')}>
          <SelectField
            value={form.category}
            onChange={(value) => set('category', value)}
            noneLabel={t('itemDialog.noCategory')}
            options={categories.map((category) => ({ value: category.name, label: category.name }))}
          />
          <div className="flex gap-1.5 pt-1.5">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t('itemDialog.categoryPlaceholder')}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
              onClick={createCategory}
              disabled={creating || !newCategory.trim()}
            >
              <Plus className="mr-1 h-3 w-3" /> {t('itemDialog.create')}
            </Button>
          </div>
        </Field>

        <Field label={t('itemDialog.unit')}>
          <Input
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            list="input-units"
            placeholder="L, KG, Sac…"
          />
        </Field>

        <Field label={t('itemDialog.formulation')}>
          <Input
            value={form.formulation}
            onChange={(e) => set('formulation', e.target.value)}
            list="input-formulations"
            placeholder={t('itemDialog.formulationPlaceholder')}
          />
        </Field>

        <Field label={t('itemDialog.storage')}>
          <SelectField
            value={form.storage_id}
            onChange={(value) => set('storage_id', value)}
            noneLabel={t('itemDialog.noStorage')}
            options={storages.map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>

      <Field label={t('itemDialog.suppliers')} hint={t('itemDialog.suppliersHint')}>
        {suppliers.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('itemDialog.noSuppliers')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {suppliers.map((supplier) => {
              const active = form.supplier_ids.includes(supplier.id);
              return (
                <button
                  key={supplier.id}
                  type="button"
                  onClick={() => toggleSupplier(supplier.id)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {supplier.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm">{t('itemDialog.minAlert')}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t('itemDialog.minAlertHint')}</p>
          </div>
          <Switch
            checked={form.min_stock_enabled}
            onCheckedChange={(value) => set('min_stock_enabled', value)}
            aria-label={t('itemDialog.minAlert')}
          />
        </div>
        {form.min_stock_enabled && (
          <Field label={t('itemDialog.minStock')} className="mt-3">
            <Input
              type="number"
              step="0.1"
              value={form.min_stock ?? ''}
              onChange={(e) => set('min_stock', e.target.value)}
            />
          </Field>
        )}
      </div>

      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={2} />
      </Field>

      <datalist id="input-units">
        {UNITS.map((unit) => (
          <option key={unit} value={unit} />
        ))}
      </datalist>
      <datalist id="input-formulations">
        {FORMULATIONS.map((formulation) => (
          <option key={formulation} value={formulation} />
        ))}
      </datalist>

      {item?.id && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('itemDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}