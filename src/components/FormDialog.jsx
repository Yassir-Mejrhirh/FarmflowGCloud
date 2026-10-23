import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function FormDialog({
  open, onOpenChange, title, description, onSubmit, submitLabel = 'Save', saving, children, wide,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-h-[92vh] gap-5 overflow-y-auto sm:max-w-lg', wide && 'sm:max-w-3xl')}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{title}</DialogTitle>
          {description && <DialogDescription className="text-sm">{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {children}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? 'Saving…' : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}