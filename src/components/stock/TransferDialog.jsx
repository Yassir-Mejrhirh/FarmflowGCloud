import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import Field from '@/components/Field';
import FormDialog from '@/components/FormDialog';
import SelectField from '@/components/SelectField';
import TransferLines from '@/components/stock/TransferLines';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const newRow = () => ({ key: `l-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, item_id: '', quantity: '' });

const emptyForm = () => ({
  from_storage_id: '',
  to_storage_id: '',
  date: todayISO(),
  notes: '',
  lines: [newRow()],
});

const transferRef = () => `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Un transfert s'écrit en deux mouvements liés par la même référence : la sortie du
// magasin de départ et l'entrée, de quantité égale, dans le magasin d'arrivée.
// Plusieurs intrants peuvent être transférés d'un coup, chacun sur sa ligne.
export default function TransferDialog({ open, onOpenChange, items = [], storages = [], storageOnHand = {}, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const setLine = (key, patch) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));

  const addLine = () => setForm((prev) => ({ ...prev, lines: [...prev.lines, newRow()] }));

  const removeLine = (key) =>
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.length === 1 ? prev.lines : prev.lines.filter((line) => line.key !== key),
    }));

  // Ce qui reste dans le magasin de départ, une fois les autres lignes déduites :
  // le même intrant sur deux lignes partage le stock disponible.
  const availableFor = (itemId, exceptKey) => {
    if (!form.from_storage_id || !itemId) return null;
    const stock = Number(storageOnHand[form.from_storage_id]?.[itemId]?.quantity) || 0;
    const used = form.lines
      .filter((line) => line.key !== exceptKey && line.item_id === itemId)
      .reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    return stock - used;
  };

  const close = (next) => {
    if (!next) {
      setForm(emptyForm());
      setError('');
    }
    onOpenChange(next);
  };

  const submit = async (event) => {
    event.preventDefault();
    const filled = form.lines.filter((line) => line.item_id || Number(line.quantity) > 0);
    if (!form.from_storage_id || !form.to_storage_id || !filled.length) {
      setError(t('stock.transferRequired'));
      return;
    }
    if (form.from_storage_id === form.to_storage_id) {
      setError(t('stock.transferSameStorage'));
      return;
    }
    if (filled.some((line) => !line.item_id || !(Number(line.quantity) > 0))) {
      setError(t('stock.transferLineRequired'));
      return;
    }
    const overStock = filled.some((line) => {
      const stock = Number(storageOnHand[form.from_storage_id]?.[line.item_id]?.quantity) || 0;
      const asked = filled
        .filter((row) => row.item_id === line.item_id)
        .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      return asked > stock + 0.000001;
    });
    if (overStock) {
      setError(t('stock.transferNoStock'));
      return;
    }

    setError('');
    setSaving(true);
    const notes = [t('stock.transferNotePrefix'), form.notes.trim()].filter(Boolean).join(' · ');
    await base44.entities.StockMovement.bulkCreate(
      filled.flatMap((line) => {
        const quantity = Number(line.quantity) || 0;
        const transferId = transferRef();
        return [
          {
            item_id: line.item_id,
            kind: 'out',
            quantity,
            date: form.date,
            storage_id: form.from_storage_id,
            transfer_id: transferId,
            notes,
          },
          {
            item_id: line.item_id,
            kind: 'in',
            quantity,
            date: form.date,
            storage_id: form.to_storage_id,
            transfer_id: transferId,
            notes,
          },
        ];
      }),
    );
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

      <Field label={t('common.date')}>
        <Input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} required />
      </Field>

      <TransferLines
        lines={form.lines}
        items={items}
        availableFor={(itemId, key) => availableFor(itemId, key)}
        onChange={setLine}
        onAdd={addLine}
        onRemove={removeLine}
      />

      <Field label={t('stock.transferNote')}>
        <Textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} rows={2} />
      </Field>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </FormDialog>
  );
}