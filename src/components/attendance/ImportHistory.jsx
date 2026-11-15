import { useState } from 'react';
import { ChevronDown, History, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { fmtDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const VISIBLE = 4;

// Imports already saved, most recent first: each entry reopens the pointage
// sheets it wrote for its first day and farm.
export default function ImportHistory({ imports = [], loading = false, onOpen, onDelete }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const [all, setAll] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const rows = all ? imports : imports.slice(0, VISIBLE);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await onDelete?.(toDelete.id);
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-start"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <History className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] leading-tight">{t('ahist.title')}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {imports.length ? t('ahist.count', { n: imports.length }) : t('ahist.empty')}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
        />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border/60 px-3 py-3">
          {loading ? (
            <p className="px-1 py-2 text-[12px] text-muted-foreground">{t('ahist.loading')}</p>
          ) : !imports.length ? (
            <p className="px-1 py-2 text-[12px] text-muted-foreground">{t('ahist.empty')}</p>
          ) : (
            <>
              {rows.map((item) => (
                <article key={item.id} className="rounded-xl border border-border/60 bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium leading-snug">
                        {item.file_name || t('ahist.file')}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {fmtDate(item.period_start)} → {fmtDate(item.period_end)} ·{' '}
                        {t('ahist.importedOn', { date: fmtDate(item.imported_at || item.created_date) })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() => onOpen?.(item)}
                      >
                        {t('ahist.open')}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                        aria-label={t('ahist.delete')}
                        onClick={() => setToDelete(item)}
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-muted-foreground">
                    {(item.farm_names || []).map((name) => (
                      <span key={name} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                        {name}
                      </span>
                    ))}
                    <span>{t('ahist.sheets', { n: (item.sheets || []).length })}</span>
                    <span>·</span>
                    <span>{t('ahist.days', { days: fmtNum(item.total_days, 1) })}</span>
                  </div>
                </article>
              ))}
              {imports.length > VISIBLE && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full rounded-lg text-[11px] text-muted-foreground"
                  onClick={() => setAll((value) => !value)}
                >
                  {all ? t('ahist.showLess') : t('ahist.showAll', { n: imports.length - VISIBLE })}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <AlertDialog open={Boolean(toDelete)} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('ahist.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('ahist.deleteDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('ahist.deleting') : t('ahist.deleteConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}