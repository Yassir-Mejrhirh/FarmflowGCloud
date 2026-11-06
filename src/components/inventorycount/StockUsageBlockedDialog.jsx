import { ClipboardList, Wrench } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { fmtDate } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const KIND_ICONS = {
  report: ClipboardList,
  maintenance: Wrench,
};

export default function StockUsageBlockedDialog({ usages = [], open, onOpenChange, mode = 'delete' }) {
  const { t } = useI18n();
  if (!usages.length) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl leading-tight tracking-tight">
            {t('stockUsage.title')}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? t('stockUsage.blockedEdit') : t('stockUsage.blockedDelete')}
          </DialogDescription>
        </DialogHeader>

        <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
          {usages.map((usage) => {
            const Icon = KIND_ICONS[usage.kind] || ClipboardList;
            const kindLabel = usage.kind === 'maintenance' ? t('stockUsage.maintenance') : t('stockUsage.report');
            const fallback =
              usage.kind === 'maintenance' ? t('stockUsage.unknownMachine') : t('stockUsage.unknownBlock');
            return (
              <li key={`${usage.kind}-${usage.id}`} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.7} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{usage.label || fallback}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {[kindLabel, fmtDate(usage.date)].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground">{t('stockUsage.hint')}</p>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t('stockCount.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}