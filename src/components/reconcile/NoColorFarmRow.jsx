import { Check } from 'lucide-react';
import SelectField from '@/components/SelectField';
import WorkerName from '@/components/WorkerName';
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Une présence écrite dans le classeur sans couleur : sa ferme est choisie à la main.
export default function NoColorFarmRow({ item, farms = [], value, onChange }) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border px-2.5 py-2',
        value ? 'border-primary/25 bg-primary/5' : 'border-clay/30 bg-clay/5',
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-medium leading-tight">
          <WorkerName name={item.name} />
        </span>
        <span className="block text-[10.5px] text-muted-foreground">
          {fmtDate(item.date)} · {t('rec.daysCount', { days: fmtNum(item.days, 1) })}
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