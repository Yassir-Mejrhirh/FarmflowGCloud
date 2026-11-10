import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import Field from '@/components/Field';
import FormDialog from '@/components/FormDialog';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const emptyForm = () => ({
  item_id: '',
  from_storage_id: '',
  to_storage_id: '',
  date: todayISO(),
  quantity: '',
  notes: '',
});

const transferRef = () => `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Un transfert s'écrit en deux mouvements liés par la même référence : la sortie du
// magasin de départ et l'entrée, de quantité égale, dans le magasin d'arrivée.
export default function TransferDialog({ open, onOpenChange, items = [], storages = [], storageOnHand = {}, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const item = items.find((row) => row.id === form.item_id);
  const unit = item?.unit || '';
  const quantity = Number(form.quantity) || 0;
  const available = form.from_storage_id ? storageOnHand[form.from_storage_id]?.[form.item_id] || 0 : 0;

  const close = (next) => {
    if (!next) {
      setForm(emptyForm());
      setError('');
    }
    onOpenChange(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.item_id || !form.from_storage_id || !form.to_storage_id || !(quantity > 0)) {
      setError(t('stock.transferRequired'));
      return;
    }
    if (form.from_storage_id === form.to_storage_id) {
      setError(t('stock.transferSameStorage'));
      return;
    }
    if (quantity > available + 0.000001) {
      setError(t('stock.transferNoStock'));
      return;
    }
    setError('');
    setSaving(true);
    const transferId = transferRef();
    const notes = [t('stock.transferNotePrefix'), form.notes.trim()].filter(Boolean).join(' · ');
    await base44.entities.StockMovement.bulkCreate([
      {
        item_id: form.item_id,
        kind: 'out',
        quantity,
        date: form.date,
        storage_id: form.from_storage_id,
        transfer_id: transferId,
        notes,
      },
      {
        item_id: form.item_id,
        kind: 'in',
        quantity,
        date: form.date,
        storage_id: form.to_storage_id,
        transfer_id: transferId,
        notes,
      },
    ]);
    setSaving(false);
    onSaved();
    close(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={close}
      title={t('stock.transferTitle')}
      description={t('stock.transferDesc')}
      onSubmit={submit}
      submitLabel={t('stock.transferAction')}
      saving={saving}
    >
      <Field label={t('stock.transferItem')}>
        <SelectField
          value={form.item_id}
          onChange={(value) => set('item_id', value)}
          placeholder={t('common.select')}
          options={items.map((row) => ({ value: row.id, label: row.name }))}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('stock.transferFrom')}>
          <SelectField
            value={form.from_storage_id}
            onChange={(value) => set('from_storage_id', value)}
            placeholder={t('common.select')}
            options={storages
              .filter((storage) => storage.id !== form.to_storage_id)
              .map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
        <Field label={t('stock.transferTo')}>
          <SelectField
            value={form.to_storage_id}
            onChange={(value) => set('to_storage_id', value)}
            placeholder={t('common.select')}
            options={storages
              .filter((storage) => storage.id !== form.from_storage_id)
              .map((storage) => ({ value: storage.id, label: storage.name }))}
          />
        </Field>
      </div>

      {form.item_id && form.from_storage_id && (
        <p className="text-[11px] text-muted-foreground">
          {t('stock.transferAvailable', { quantity: fmtNum(available, 1), unit })}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('stock.transferQuantity')}${unit ? ` (${unit})` : ''}`}>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={form.quantity}
            onChange={(event) => set('quantity', event.target.value)}
          />
        </Field>
        <Field label={t('common.date')}>
          <Input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} required />
        </Field>
      </div>

      <Field label={t('stock.transferNote')}>
        <Textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} rows={2} />
      </Field>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </FormDialog>
  );
}