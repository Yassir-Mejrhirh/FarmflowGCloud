import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Validation of the report is blocked while pointed workers still have days to give.
export default function UnsoldDialog({ open, onClose, workers = [], date, farmName }) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[88vh] w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="px-5 pb-2 pt-5">
          <DialogTitle className="font-display text-lg font-normal tracking-tight">
            {t('report.unsoldTitle')}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t('report.unsoldBody', { n: workers.length, farm: farmName || '', date: fmtDate(date) })}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[52vh] overflow-y-auto px-5 pb-1">
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-destructive/25 bg-destructive/5">
            {workers.map((worker) => (
              <li key={worker.worker_id} className="flex items-center gap-2 px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" strokeWidth={1.8} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{worker.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {t('report.unsoldLine', {
                    pointed: fmtNum(worker.pointed, 2),
                    assigned: fmtNum(worker.assigned, 2),
                    left: fmtNum(worker.left, 2),
                  })}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="px-5 py-4">
          <Button type="button" onClick={onClose} className="rounded-xl">
            {t('report.unsoldClose')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}