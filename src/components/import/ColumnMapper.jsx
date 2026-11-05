import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/I18nContext';

export default function ColumnMapper({ fields, headers, mapping, onChange }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.name} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">
              {field.label}
              {field.required && <span className="ms-1 text-clay">*</span>}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">{field.name}</p>
          </div>
          <Select
            value={mapping[field.name] === '' || mapping[field.name] === undefined ? 'none' : String(mapping[field.name])}
            onValueChange={(next) => onChange(field.name, next === 'none' ? '' : Number(next))}
          >
            <SelectTrigger className="w-[46%] min-w-[120px]">
              <SelectValue placeholder={t('imp.columnNone')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('imp.columnNone')}</SelectItem>
              {headers.map((header, index) => (
                <SelectItem key={`${header}-${index}`} value={String(index)}>
                  {header || `#${index + 1}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}