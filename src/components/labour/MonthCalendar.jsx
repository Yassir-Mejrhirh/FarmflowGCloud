import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { monthLabel } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Month chosen in a small calendar: pick the year, then the month.
export default function MonthCalendar({ value, onChange, className }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(String(value || '').slice(0, 4)) || new Date().getFullYear());
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';

  useEffect(() => {
    if (open) setYear(Number(String(value || '').slice(0, 4)) || new Date().getFullYear());
  }, [open, value]);

  const months = Array.from({ length: 12 }, (_, index) => ({
    key: `${year}-${String(index + 1).padStart(2, '0')}`,
    label: new Date(year, index, 1).toLocaleDateString(locale, { month: 'short' }),
  }));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-accent/40',
            className,
          )}
        >
          <span className={cn('truncate capitalize', !value && 'capitalize-none text-muted-foreground')}>
            {value ? monthLabel(value) : t('lab.pickMonth')}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="flex items-center justify-between pb-2">
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(year - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setYear(year + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {months.map((month) => (
            <button
              key={month.key}
              type="button"
              onClick={() => {
                onChange(month.key);
                setOpen(false);
              }}
              className={cn(
                'rounded-md py-1.5 text-xs capitalize transition-colors',
                month.key === value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
              )}
            >
              {month.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}