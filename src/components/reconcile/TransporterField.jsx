import { useState } from 'react';
import { Input } from '@/components/ui/input';
import SelectField from '@/components/SelectField';
import { useI18n } from '@/lib/I18nContext';

const NEW = '__new__';

// Transporteur d'une équipe : choisi parmi ceux déjà enregistrés, ou créé à la volée.
// Un nom saisi est mémorisé pour être proposé dans les équipes suivantes.
export default function TransporterField({ value = '', options = [], onChange, onRemember }) {
  const { t } = useI18n();
  const known = options.some((name) => name.toLowerCase() === String(value).toLowerCase());
  const [creating, setCreating] = useState(Boolean(value) && !known);

  const list = options.map((name) => ({ value: name, label: name }));

  return (
    <div className="space-y-1.5">
      <SelectField
        value={creating ? NEW : value}
        onChange={(next) => {
          if (next === NEW) {
            setCreating(true);
            onChange('', true);
            return;
          }
          setCreating(false);
          onChange(next, true);
        }}
        placeholder={t('rec.transporterChoose')}
        options={[...list, { value: NEW, label: t('rec.transporterNew') }]}
      />
      {creating && (
        <Input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value, false)}
          onBlur={(event) => {
            const name = event.target.value.trim();
            if (name) onRemember(name);
          }}
          placeholder={t('rec.transporterPlaceholder')}
        />
      )}
    </div>
  );
}