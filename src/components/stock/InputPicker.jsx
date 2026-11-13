import { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { groupByCategory } from '@/lib/inputAvailability';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Choix d'un intrant parmi ceux en stock : catégories repliables, ordre alphabétique.
export default function InputPicker({
  value, onChange, items = [], allItems = [], placeholder, noneLabel, className,
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState({});

  const selected = useMemo(
    () => items.find((item) => item.id === value) || allItems.find((item) => item.id === value),
    [items, allItems, value],
  );

  // L'intrant déjà choisi reste visible même si son stock est épuisé depuis.
  const listed = useMemo(() => {
    if (!selected || items.some((item) => item.id === selected.id)) return items;
    return [...items, selected];
  }, [items, selected]);

  const groups = useMemo(() => groupByCategory(listed, t('stock.noCategory')), [listed, t]);

  const toggleGroup = (key) =>
    setClosedGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  const label = selected ? `${selected.name}${selected.unit ? ` (${selected.unit})` : ''}` : '';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-start text-sm shadow-sm transition-colors hover:bg-accent/40',
            className,
          )}
        >
          <span className={cn('truncate', !label && 'text-muted-foreground')}>
            {label || placeholder || t('common.select')}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-1">
        <div className="max-h-72 overflow-y-auto">
          {noneLabel && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-xs text-muted-foreground transition-colors hover:bg-accent/50"
            >
              <span className="flex-1 truncate">{noneLabel}</span>
              {!value && <Check className="h-3.5 w-3.5" />}
            </button>
          )}

          {groups.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">{t('stock.noPositive')}</p>
          ) : (
            groups.map((group) => {
              const isOpen = !closedGroups[group.key] || group.items.some((item) => item.id === value);
              return (
                <Collapsible key={group.key || 'none'} open={isOpen} onOpenChange={() => toggleGroup(group.key)}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-accent/50"
                    >
                      <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {group.label}
                      </span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{group.items.length}</span>
                      <ChevronDown
                        className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="pb-1">
                      {group.items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onChange(item.id);
                              setOpen(false);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 rounded-md py-1.5 pe-2 ps-4 text-start text-xs transition-colors hover:bg-accent/60',
                              item.id === value && 'font-medium text-primary',
                            )}
                          >
                            <span className="flex-1 truncate">
                              {item.name}
                              {item.unit ? ` (${item.unit})` : ''}
                            </span>
                            {item.id === value && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}