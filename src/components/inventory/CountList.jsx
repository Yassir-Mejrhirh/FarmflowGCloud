import { useState } from 'react';
import { ClipboardCheck, Trash2 } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { TRANSLATIONS } from '@/lib/translations';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function CountList({ counts, storages, onDeleted }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [pending, setPending] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const storageName = (id) => storages.find((storage) => storage.id === id)?.name || '—';

  // Le constat avait ajusté le stock : on retire les mouvements qu'il a créés.
  const removeMovements = async (count) => {
    const linked = await base44.entities.StockMovement.filter({ count_id: count.id });
    if (linked.length) {
      await base44.entities.StockMovement.deleteMany({ count_id: count.id });
      return;
    }
    const legacyNotes = ['fr', 'ar'].map((lang) =>
      TRANSLATIONS[lang]['stockCount.movementNote'].replace('{date}', count.date || ''),
    );
    await base44.entities.StockMovement.deleteMany({
      date: count.date,
      storage_id: count.storage_id,
      notes: { $in: legacyNotes },
    });
  };

  const remove = async () => {
    if (!pending) return;
    setDeleting(true);
    await removeMovements(pending);
    await base44.entities.InventoryCount.delete(pending.id);
    setDeleting(false);
    setPending(null);
    toast({ title: t('inv.countDeleted') });
    onDeleted?.();
  };

  if (!counts.length) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title={t('inv.emptyCountsTitle')}
        description={t('inv.emptyCountsDesc')}
      />
    );
  }

  return (
    <>
    <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
      {counts.map((count) => {
        const lines = count.lines || [];
        const total = lines.reduce(
          (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0),
          0,
        );
        return (
          <li key={count.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{fmtDate(count.date)}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {[storageName(count.storage_id), count.responsible].filter(Boolean).join(' · ')}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {t('inv.countLines', { n: lines.length })}
              </p>
            </div>
            <div className="text-end">
              <p className="text-sm tabular-nums">{fmtMoney(total)}</p>
              <p className="text-[11px] text-muted-foreground">
                {fmtNum(
                  lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
                  1,
                )}{' '}
                {t('inv.countUnits')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPending(count)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t('common.delete')}
            </button>
          </li>
        );
      })}
    </ul>

    <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('inv.deleteCount')}</AlertDialogTitle>
          <AlertDialogDescription>
            {pending ? `${fmtDate(pending.date)} — ${t('inv.deleteCountDesc')}` : t('inv.deleteCountDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={remove}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('inv.deleteCountConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}