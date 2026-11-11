import { ChevronDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import UsageEditor from '@/components/dailyreport/UsageEditor';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

export default function UsageField({
  icon: Icon, title, placeholder, lines, onChange, options, idKey, qtyKey, qtyLabel, addLabel, emptyLabel, renderMeta, pickExtras,
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />} {title}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 text-sm shadow-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <span className={cn('truncate text-left', !lines.length && 'text-muted-foreground')}>
              {lines.length ? t('report.usageSelected', { n: lines.length }) : placeholder}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-72 p-3">
          <UsageEditor
            lines={lines}
            onChange={onChange}
            options={options}
            idKey={idKey}
            qtyKey={qtyKey}
            qtyLabel={qtyLabel}
            addLabel={addLabel}
            emptyLabel={emptyLabel}
            renderMeta={renderMeta}
            pickExtras={pickExtras}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}