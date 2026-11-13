import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/I18nContext';

export default function SelectField({ value, onChange, placeholder, options = [], noneLabel, className, disabled }) {
  const { t } = useI18n();
  const optionList = (options || []).filter((option) => option && option.value);
  const current = value ? String(value) : noneLabel ? 'none' : undefined;

  return (
    <Select value={current} onValueChange={(next) => onChange(next === 'none' ? '' : next)}>
      <SelectTrigger className={className} disabled={disabled}>
        <SelectValue placeholder={placeholder || t('common.select')} />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value="none">{noneLabel}</SelectItem>}
        {optionList.map((option) => (
          <SelectItem key={option.value} value={String(option.value)}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}