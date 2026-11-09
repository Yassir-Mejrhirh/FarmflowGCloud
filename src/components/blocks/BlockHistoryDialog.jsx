import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import DivisionCard from '@/components/blocks/DivisionCard';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchList } from '@/lib/data';
import { restoreMother } from '@/lib/blockRestore';
import { useI18n } from '@/lib/I18nContext';

export default function BlockHistoryDialog({ open, onOpenChange, block, onRestored }) {
  const { t } = useI18n();
  const [divisions, setDivisions] = useState(null);
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !block?.id) return;
    setDivisions(null);
    setFailed(false);
    fetchList(base44.entities.BlockDivision, { $or: [{ mother_id: block.id }, { child_ids: block.id }] }, { sort: '-date' })
      .then(setDivisions)
      .catch(() => setDivisions([]));
  }, [open, block?.id]);

  const handleRestore = async () => {
    if (!pending) return;
    setBusy(true);
    setFailed(false);
    try {
      await restoreMother(pending);
      setBusy(false);
      setPending(null);
      onOpenChange(false);
      onRestored();
    } catch (error) {
      setBusy(false);
      setFailed(true);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('blockHistory.title')}</DialogTitle>
            <DialogDescription>
              {t('blockHistory.desc', { name: block?.name || '' })}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] space-y-2 overflow-y-auto pe-1">
            {divisions === null ? (
              <p className="text-xs text-muted-foreground">{t('common.loading')}</p>
            ) : divisions.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                {t('blockHistory.empty')}
              </p>
            ) : (
              divisions.map((division) => (
                <DivisionCard
                  key={division.id}
                  division={division}
                  canRestore={!division.restored_date && (division.child_ids || []).includes(block.id)}
                  onRestore={() => setPending(division)}
                />
              ))
            )}
            {failed && <p className="text-[11px] font-medium text-destructive">{t('blockHistory.failed')}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pending} onOpenChange={(next) => !next && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('blockHistory.restoreTitle', { name: pending?.mother_name || '' })}</AlertDialogTitle>
            <AlertDialogDescription>{t('blockHistory.restoreDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(event) => {
                event.preventDefault();
                handleRestore();
              }}
            >
              {t('blockHistory.restoreConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}