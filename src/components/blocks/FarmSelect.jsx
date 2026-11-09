import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/I18nContext';

// Farm picker of a parcel: the farm already stored on the parcel is always shown,
// even before the farm list has loaded or when that farm is no longer listed.
export default function FarmSelect({ value, farms = [], onChange }) {
  const { t } = useI18n();
  const names = farms.map((farm) => farm.name).filter(Boolean);
  if (value && !names.includes(value)) names.unshift(value);

  return (
    <Select value={value || 'none'} onValueChange={(next) => onChange(next === 'none' ? '' : next)}>
      <SelectTrigger>
        <SelectValue placeholder={t('blockDialog.farmPlaceholder')}>
          {value || t('blockDialog.farmNone')}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t('blockDialog.farmNone')}</SelectItem>
        {names.map((name) => (
          <SelectItem key={name} value={name}>
            {name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}