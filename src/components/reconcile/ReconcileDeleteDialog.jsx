import { Loader2, ListX, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Suppression d'un rapprochement : sortie de la liste d'attente seule, ou suppression
// totale qui retire aussi du Pointage les journées issues de ce rapprochement.
export default function ReconcileDeleteDialog({ item, open, busyMode, onClose, onDelete }) {
  const { t } = useI18n();
  const applied = item?.status === 'applied';
  const busy = Boolean(busyMode);

  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('rec.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {item?.file_name ? `${item.file_name} · ` : ''}
            {applied ? t('rec.deleteAppliedDesc') : t('rec.deleteQueueOnlyDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <p className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-[11.5px] tabular-nums">
          {fmtDate(item?.period_start)} → {fmtDate(item?.period_end)} ·{' '}
          {t('rec.queueItem', {
            workers: fmtNum(item?.workers_count, 0),
            days: fmtNum(item?.total_days, 1),
            cost: fmtMoney(item?.total_cost),
          })}
        </p>

        {applied && (
          <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11.5px] leading-relaxed text-destructive">
            {t('rec.deleteFullNote')}
          </p>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <AlertDialogCancel disabled={busy} className="mt-0 sm:me-auto">
            {t('common.cancel')}
          </AlertDialogCancel>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            disabled={busy}
            onClick={() => onDelete('queue')}
          >
            {busyMode === 'queue' ? (
              <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
            ) : (
              <ListX className="me-1.5 h-4 w-4" />
            )}
            {t('rec.deleteQueue')}
          </Button>
          {applied && (
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={busy}
              onClick={() => onDelete('full')}
            >
              {busyMode === 'full' ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="me-1.5 h-4 w-4" />
              )}
              {t('rec.deleteFull')}
            </Button>
          )}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}