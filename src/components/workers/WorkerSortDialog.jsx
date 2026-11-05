import { ArrowDown, ArrowUp, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function WorkerSortDialog({ open, onOpenChange, options, sort, onChange }) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t('workers.sortTitle')}</DialogTitle>
          <DialogDescription>{t('workers.sortDesc')}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          {[
            { dir: 'asc', label: t('workers.sortAsc'), Icon: ArrowUp },
            { dir: 'desc', label: t('workers.sortDescending'), Icon: ArrowDown },
          ].map(({ dir, label, Icon }) => (
            <Button
              key={dir}
              type="button"
              variant={sort.dir === dir ? 'default' : 'outline'}
              size="sm"
              className="flex-1 rounded-xl"
              onClick={() => onChange({ ...sort, dir })}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" /> {label}
            </Button>
          ))}
        </div>

        <div className="space-y-1.5">
          {options.map((option) => {
            const active = sort.key === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onChange({ key: option.key, dir: sort.dir })}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition-colors',
                  active
                    ? 'border-primary/40 bg-primary/5 font-medium'
                    : 'border-border/70 hover:bg-muted/60',
                )}
              >
                {option.label}
                {active && <Check className="h-4 w-4 text-primary" />}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="ghost"
          className="w-full rounded-xl text-muted-foreground"
          onClick={() => {
            onChange({ key: null, dir: 'asc' });
            onOpenChange(false);
          }}
        >
          {t('workers.sortReset')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}