import { Check } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Une couleur du classeur à rattacher à une ferme.
export default function ColorFarmRow({ item, farms = [], value, onChange }) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2',
        value ? 'border-primary/25 bg-primary/5' : 'border-clay/30 bg-clay/5',
      )}
    >
      <span
        className="h-5 w-5 shrink-0 rounded-md border border-border"
        style={{ background: item.color }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-medium leading-tight tabular-nums">{item.color}</span>
        <span className="block text-[10.5px] text-muted-foreground">
          {t('rec.colorIssueDays', { days: fmtNum(item.days, 1), cells: fmtNum(item.cells, 0) })}
        </span>
      </span>
      {value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.2} />}
      <SelectField
        value={value}
        onChange={onChange}
        placeholder={t('rec.chooseFarm')}
        options={farms}
        className="h-8 w-full rounded-lg text-[11.5px] sm:w-52"
      />
    </div>
  );
}