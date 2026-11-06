import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

export default function FarmFilter({ options, selected, onChange }) {
  const { t } = useI18n();

  const toggle = (name) => {
    onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name]);
  };

  const label = selected.length === 0
    ? t('lab.allFarms')
    : selected.length === 1
      ? selected[0]
      : t('lab.farmsSelected', { n: selected.length });

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className={cn('truncate text-left', !selected.length && 'text-muted-foreground')}>{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-56 p-2">
        {options.length === 0 ? (
          <p className="p-2 text-[11px] text-muted-foreground">{t('lab.noFarms')}</p>
        ) : (
          <>
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {options.map((name) => (
                <label
                  key={name}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-xs transition-colors hover:bg-accent/40"
                >
                  <Checkbox checked={selected.includes(name)} onCheckedChange={() => toggle(name)} />
                  <span className="truncate">{name}</span>
                </label>
              ))}
            </div>
            {selected.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="mt-1 w-full rounded-md px-1.5 py-1.5 text-start text-[11px] text-muted-foreground transition-colors hover:bg-accent/40"
              >
                {t('lab.clearFarms')}
              </button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}