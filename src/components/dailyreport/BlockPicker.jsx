import { ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

export default function BlockPicker({ groups, selected, onChange }) {
  const { t } = useI18n();

  const toggleBlock = (id) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const toggleGroup = (ids) => {
    const allSelected = ids.every((id) => selected.includes(id));
    onChange(
      allSelected
        ? selected.filter((id) => !ids.includes(id))
        : [...new Set([...selected, ...ids])],
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <span className={cn('truncate text-left', !selected.length && 'text-muted-foreground')}>
            {selected.length
              ? t('report.blocksSelected', { n: selected.length })
              : t('report.chooseBlocks')}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2">
        {groups.length === 0 ? (
          <p className="p-2 text-[11px] text-muted-foreground">{t('report.noBlocks')}</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {groups.map((group) => {
              const ids = group.blocks.map((block) => block.id);
              const count = ids.filter((id) => selected.includes(id)).length;
              return (
                <div key={group.key} className="rounded-lg bg-muted/50 p-2">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox
                      checked={count === 0 ? false : count === ids.length ? true : 'indeterminate'}
                      onCheckedChange={() => toggleGroup(ids)}
                    />
                    <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                      {group.label}
                    </span>
                    <span className="ms-auto text-[10px] text-muted-foreground">
                      {count}/{ids.length}
                    </span>
                  </label>
                  <div className="mt-1.5 grid gap-1">
                    {group.blocks.map((block) => (
                      <label
                        key={block.id}
                        className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-background"
                      >
                        <Checkbox
                          checked={selected.includes(block.id)}
                          onCheckedChange={() => toggleBlock(block.id)}
                        />
                        <span className="truncate">{block.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}