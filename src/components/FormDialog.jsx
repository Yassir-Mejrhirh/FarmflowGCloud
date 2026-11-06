import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';

export default function FormDialog({
  open, onOpenChange, title, description, onSubmit, submitLabel, saving, children, wide, submitDisabled,
}) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-lg', wide && 'sm:max-w-3xl')}>
        <DialogHeader className="px-6 pb-4 pt-6">
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription className="text-sm">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col">
          <div className="space-y-4 px-6 pb-5">{children}</div>
          <DialogFooter className="sticky bottom-0 flex-row justify-end gap-2 rounded-b-lg border-t border-border bg-background px-6 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saving || submitDisabled} className="rounded-xl">
              {saving ? t('common.saving') : submitLabel || t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}