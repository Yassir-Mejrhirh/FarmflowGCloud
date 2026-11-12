import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';
import { UNIT_OPTIONS, suggestedFactor } from '@/lib/units';
import { fetchGlobalOptions, rememberGlobalOption, rememberGlobalOptions } from '@/lib/globalOptions';
import { cn } from '@/lib/utils';

const FORMULATIONS = ['Liquide', 'Poudre', 'Granulé', 'Suspension', 'Émulsion', 'Gel', 'Appât'];

const emptyForm = () => ({
  name: '',
  category: '',
  formulation: '',
  unit: '',
  secondary_unit: '',
  secondary_factor: '',
  supplier_ids: [],
  min_stock_enabled: false,
  min_stock: '',
  notes: '',
});

export default function ItemDialog({ open, onOpenChange, item, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [units, setUnits] = useState([]);
  const [newUnit, setNewUnit] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('InputItem', item);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: item?.name || '',
      category: item?.category || '',
      formulation: item?.formulation || '',
      unit: item?.unit || '',
      secondary_unit: item?.secondary_unit || '',
      secondary_factor: item?.secondary_factor ?? '',
      supplier_ids: item?.supplier_ids || [],
      min_stock_enabled: Boolean(item?.min_stock_enabled),
      min_stock: item?.min_stock ?? '',
      notes: item?.notes || '',
    });
    setNewCategory('');
    setNewUnit('');
    (async () => {
      const [categoryRows, supplierRows, unitNames] = await Promise.all([
        fetchList(base44.entities.InputCategory, {}, { sort: 'name' }),
        fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
        fetchGlobalOptions('unit'),
      ]);
      setCategories(categoryRows);
      setSuppliers(supplierRows);
      setUnits(unitNames);
    })();
  }, [open, item]);

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // Le choix d'une unité prédéfinie met à jour l'équivalence automatiquement.
  const setUnit = (key, value) =>
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'unit' && prev.secondary_unit === value) next.secondary_unit = '';
      if (key === 'secondary_unit' && prev.unit === value) next.unit = '';
      const suggestion = suggestedFactor(next.unit, next.secondary_unit);
      if (suggestion) next.secondary_factor = String(suggestion);
      else if (!next.secondary_unit) next.secondary_factor = '';
      return next;
    });

  // Unités proposées : les prédéfinies, les unités mémorisées, plus les valeurs déjà saisies.
  const unitOptions = (exclude) => {
    const options = UNIT_OPTIONS.filter((option) => option.value !== exclude);
    [...units, form.unit, form.secondary_unit].forEach((value) => {
      if (value && !options.some((option) => option.value === value)) {
        options.push({ value, label: value });
      }
    });
    return options;
  };

  const toggleSupplier = (id) =>
    setForm((prev) => ({
      ...prev,
      supplier_ids: prev.supplier_ids.includes(id)
        ? prev.supplier_ids.filter((value) => value !== id)
        : [...prev.supplier_ids, id],
    }));

  // Nouvelle unité : mémorisée globalement et proposée dans les fiches suivantes.
  const createUnit = async () => {
    const name = newUnit.trim();
    if (!name) return;
    setCreating(true);
    await rememberGlobalOption('unit', name);
    setUnits((prev) =>
      prev.some((value) => value.toLowerCase() === name.toLowerCase()) ? prev : [...prev, name].sort((a, b) => a.localeCompare(b)),
    );
    setUnit('unit', name);
    setNewUnit('');
    setCreating(false);
  };

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
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    await rememberGlobalOptions('unit', [form.unit, form.secondary_unit]);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      formulation: form.formulation.trim(),
      unit: form.unit.trim(),
      secondary_unit: form.secondary_unit.trim(),
      secondary_factor: Number(form.secondary_factor) || 0,
      supplier_ids: form.supplier_ids,
      min_stock_enabled: form.min_stock_enabled,
      min_stock: Number(form.min_stock) || 0,
      notes: form.notes.trim(),
    };
    if (item?.id) await base44.entities.InputItem.update(item.id, payload);
    else await base44.entities.InputItem.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!item?.id || lock.locked) return;
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
      submitDisabled={lock.locked}
      submitLabel={item ? t('itemDialog.save') : t('itemDialog.add')}
    >
      <ParamLockNotice usage={lock.usage} />

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
          <SelectField
            value={form.unit}
            onChange={(value) => setUnit('unit', value)}
            noneLabel={t('itemDialog.noUnit')}
            options={unitOptions()}
          />
          <div className="flex gap-1.5 pt-1.5">
            <Input
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              placeholder={t('itemDialog.unitPlaceholder')}
              className="h-8 text-xs"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 rounded-lg px-2 text-[11px]"
              onClick={createUnit}
              disabled={creating || !newUnit.trim()}
            >
              <Plus className="mr-1 h-3 w-3" /> {t('itemDialog.create')}
            </Button>
          </div>
        </Field>

        <Field label={t('itemDialog.secondaryUnit')} hint={t('itemDialog.secondaryUnitHint')}>
          <SelectField
            value={form.secondary_unit}
            onChange={(value) => setUnit('secondary_unit', value)}
            noneLabel={t('itemDialog.noSecondaryUnit')}
            options={unitOptions(form.unit)}
          />
        </Field>

        {form.secondary_unit && (
          <div className="sm:col-span-2">
            <Field label={t('itemDialog.equivalence')} hint={t('itemDialog.equivalenceHint')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  1 {form.secondary_unit} =
                </span>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.secondary_factor ?? ''}
                  onChange={(e) => set('secondary_factor', e.target.value)}
                  className="w-24"
                />
                <span className="text-xs text-muted-foreground">{form.unit || t('itemDialog.unit')}</span>
              </div>
            </Field>
          </div>
        )}

        <Field label={t('itemDialog.formulation')}>
          <Input
            value={form.formulation}
            onChange={(e) => set('formulation', e.target.value)}
            list="input-formulations"
            placeholder={t('itemDialog.formulationPlaceholder')}
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

      <datalist id="input-formulations">
        {FORMULATIONS.map((formulation) => (
          <option key={formulation} value={formulation} />
        ))}
      </datalist>

      {item?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('itemDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}