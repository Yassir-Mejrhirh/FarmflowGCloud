import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Truck } from 'lucide-react';
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
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

const CATEGORIES = ['inputs', 'equipment', 'services', 'transport', 'other'];

export default function Suppliers() {
  const { t } = useI18n();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setSuppliers(await fetchList(base44.entities.Supplier, {}, { sort: 'name' }));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('suppliers.eyebrow')}
        title={t('suppliers.title')}
        description={t('suppliers.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('suppliers.new')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title={t('suppliers.emptyTitle')}
          description={t('suppliers.emptyDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('suppliers.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((supplier) => (
            <button
              key={supplier.id}
              type="button"
              onClick={() => {
                setEditing(supplier);
                setOpen(true);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg leading-tight">{supplier.name}</p>
                <StatusPill tone="sand">{t(`supCat.${supplier.category}`)}</StatusPill>
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                {supplier.contact_name && <p className="truncate">{supplier.contact_name}</p>}
                {supplier.phone && <p className="truncate tabular-nums" dir="ltr">{supplier.phone}</p>}
                {supplier.email && <p className="truncate" dir="ltr">{supplier.email}</p>}
                {!supplier.contact_name && !supplier.phone && !supplier.email && (
                  <p>{t('suppliers.noContact')}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <SupplierDialog open={open} onOpenChange={setOpen} supplier={editing} onSaved={load} />
    </div>
  );
}

function SupplierDialog({ open, onOpenChange, supplier, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({
    name: '', contact_name: '', phone: '', email: '', category: 'inputs', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('Supplier', supplier);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: supplier?.name || '',
      contact_name: supplier?.contact_name || '',
      phone: supplier?.phone || '',
      email: supplier?.email || '',
      category: supplier?.category || 'inputs',
      notes: supplier?.notes || '',
    });
  }, [open, supplier]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      contact_name: form.contact_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      category: form.category,
      notes: form.notes,
    };
    if (supplier?.id) await base44.entities.Supplier.update(supplier.id, payload);
    else await base44.entities.Supplier.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!supplier?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.Supplier.delete(supplier.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={supplier ? t('suppliers.dialogEdit') : t('suppliers.dialogNew')}
      onSubmit={submit}
      saving={saving}
      submitDisabled={lock.locked}
    >
      <ParamLockNotice usage={lock.usage} />

      <Field label={t('common.name')}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t('suppliers.namePlaceholder')}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('suppliers.contact')}>
          <Input
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            placeholder={t('suppliers.contactPlaceholder')}
          />
        </Field>
        <Field label={t('common.category')}>
          <SelectField
            value={form.category}
            onChange={(value) => setForm({ ...form, category: value })}
            options={CATEGORIES.map((value) => ({ value, label: t(`supCat.${value}`) }))}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('suppliers.phone')}>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} dir="ltr" />
        </Field>
        <Field label={t('suppliers.email')}>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} dir="ltr" />
        </Field>
      </div>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {supplier?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('suppliers.delete')}
        </button>
      )}
    </FormDialog>
  );
}