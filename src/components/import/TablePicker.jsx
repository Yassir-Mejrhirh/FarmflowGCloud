import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/I18nContext';

export default function TablePicker({ tables, value, onChange, disabled }) {
  const { t } = useI18n();
  const selected = tables.find((table) => table.entity === value);

  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t('imp.table')}</p>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={t('imp.tablePlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {tables.map((table) => (
            <SelectItem key={table.entity} value={table.entity}>
              {table.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {t('imp.fieldsCount', { n: selected.fields.length })} ·{' '}
          {selected.fields.filter((field) => field.required).map((field) => field.label).join(', ') ||
            t('imp.noRequired')}
        </p>
      )}
    </div>
  );
}