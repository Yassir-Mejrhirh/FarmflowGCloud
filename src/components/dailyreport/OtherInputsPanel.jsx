import { useState } from 'react';
import { Boxes, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import UsageEditor from '@/components/dailyreport/UsageEditor';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

// Inputs that are not machine consumables live apart from the machinery lines,
// in a panel that stays closed until it is needed.
export default function OtherInputsPanel({ lines, onChange, options, renderMeta }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-start transition-colors hover:bg-accent/40"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <Boxes className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.8} />
            <span className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t('report.otherInputs')}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
            {lines.length ? t('report.usageSelected', { n: lines.length }) : t('report.otherInputsHint')}
            <ChevronDown className={cn('h-4 w-4 opacity-60 transition-transform', open && 'rotate-180')} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <div className="rounded-xl border border-border/70 p-3">
          <UsageEditor
            lines={lines}
            onChange={onChange}
            options={options}
            idKey="item_id"
            qtyKey="quantity"
            qtyLabel={t('report.qty')}
            addLabel={t('report.addInput')}
            emptyLabel={t('report.noInput')}
            renderMeta={renderMeta}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}