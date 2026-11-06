import { Layers, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

// One entry can write several parcel reports: the choice is made here before the
// form opens, so the scope of the change is never guessed.
export default function ReportEditDialog({ open, count, onClose, onSingle, onGroup }) {
  const { t } = useI18n();

  const optionClass =
    'flex w-full items-start gap-3 rounded-xl border border-border/70 p-3 text-start transition-colors hover:border-primary/40 hover:bg-accent/40';

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-tight">{t('report.editTitle')}</DialogTitle>
          <DialogDescription>{t('report.editChoose', { n: count })}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <button type="button" onClick={onSingle} className={optionClass}>
            <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t('report.editParcel')}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t('report.editParcelHint')}
              </span>
            </span>
          </button>
          <button type="button" onClick={onGroup} className={optionClass}>
            <Layers className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{t('report.editGroup', { n: count })}</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                {t('report.editGroupHint')}
              </span>
            </span>
          </button>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl">
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}