import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const toISO = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const parseISO = (iso) => (iso ? new Date(`${iso}T00:00:00`) : undefined);

// One day chosen in a calendar, kept as YYYY-MM-DD.
export default function DayField({ value, onChange, className }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';
  const selected = parseISO(value);

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
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {selected
              ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
              : t('lab.pickDate')}
          </span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) return;
            onChange(toISO(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}