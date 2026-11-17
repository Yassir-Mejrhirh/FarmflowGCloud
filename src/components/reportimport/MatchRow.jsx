import { useI18n } from '@/lib/I18nContext';
import SelectField from '@/components/SelectField';
import StatusBadge from '@/components/reportimport/StatusBadge';

export default function MatchRow({ label, hint, count, value, options, onChange }) {
  const { t } = useI18n();

  return (
    <li className="grid gap-2 px-4 py-2.5 sm:grid-cols-[1fr_1fr_120px] sm:items-center sm:gap-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium">{label}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
      <SelectField
        value={value}
        onChange={onChange}
        options={options}
        placeholder={t('rimp.match.none')}
        noneLabel={t('rimp.match.none')}
        className="h-9"
      />
      <div className="sm:flex sm:justify-end">
        <StatusBadge tone={value ? 'ok' : 'warn'}>
          {value ? count || '✓' : t('rimp.match.none')}
        </StatusBadge>
      </div>
    </li>
  );
}