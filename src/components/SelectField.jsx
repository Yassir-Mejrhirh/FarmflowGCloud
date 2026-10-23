import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SelectField({ value, onChange, placeholder = 'Select…', options = [], noneLabel, className }) {
  const optionList = (options || []).filter((option) => option && option.value);
  const current = value ? String(value) : noneLabel ? 'none' : undefined;

  return (
    <Select value={current} onValueChange={(next) => onChange(next === 'none' ? '' : next)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
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