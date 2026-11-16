import { useMemo } from 'react';
import { CalendarRange } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Segmented from '@/components/Segmented';
import Field from '@/components/Field';
import { useI18n } from '@/lib/I18nContext';
import { todayISO } from '@/lib/format';
import { quinzaineRange, recentMonths } from '@/lib/quinzaine';

// Choix de la quinzaine du pointage, posé avant la lecture du classeur : le mois et
// la moitié du mois fixent la période de référence de l'analyse.
export default function QuinzainePicker({ value, onChange }) {
  const { t, lang } = useI18n();
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';

  const months = useMemo(() => {
    const list = recentMonths(todayISO());
    return list.includes(value.month) ? list : [value.month, ...list];
  }, [value.month]);

  const monthLabel = (key) =>
    new Date(`${key}-01T00:00:00`).toLocaleDateString(locale, { month: 'long', year: 'numeric' });

  const range = quinzaineRange(value);
  const short = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

  return (
    <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.9} />
        {t('rec.quinzaine')}
      </p>
      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field label={t('rec.month')}>
          <Select value={value.month} onValueChange={(month) => onChange({ ...value, month })}>
            <SelectTrigger className="capitalize">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month} className="capitalize">
                  {monthLabel(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Segmented
          value={value.half}
          onChange={(half) => onChange({ ...value, half })}
          options={[
            { value: '1', label: t('rec.half1') },
            { value: '2', label: t('rec.half2') },
          ]}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t('rec.quinzaineHint')}{' '}
        <span className="font-medium tabular-nums text-foreground">
          {short(range.start)} → {short(range.end)}
        </span>
      </p>
    </div>
  );
}