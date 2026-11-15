import { useState } from 'react';
import { ChevronDown, FileCheck2, Loader2, Trash2 } from 'lucide-react';
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
import { fmtDate, fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Liste d'attente d'import : les pointages rapprochés, à intégrer au module Pointage.
export default function ReconcileQueue({ items = [], loading = false, onIntegrate, onDelete, defaultCollapsed = false }) {
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [openId, setOpenId] = useState('');
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const pending = items.filter((item) => item.status !== 'applied');

  const run = async () => {
    if (!action) return;
    setBusy(true);
    setMessage(null);
    try {
      if (action.type === 'integrate') {
        const result = await onIntegrate(action.item);
        setMessage({
          tone: 'success',
          text: t('rec.integrateDone', { created: result.created, updated: result.updated }),
        });
      } else {
        await onDelete(action.item);
      }
      setAction(null);
    } catch {
      setMessage({ tone: 'error', text: t(action.type === 'integrate' ? 'rec.integrateError' : 'rec.saveError') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-start"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <FileCheck2 className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[15px] leading-tight">{t('rec.queueTitle')}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {loading ? t('rec.queueLoading') : pending.length ? t('rec.queueItem', {
              workers: fmtNum(pending.reduce((sum, item) => sum + (Number(item.workers_count) || 0), 0), 0),
              days: fmtNum(pending.reduce((sum, item) => sum + (Number(item.total_days) || 0), 0), 1),
              cost: fmtMoney(pending.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0)),
            }) : t('rec.queueEmpty')}
          </span>
        </span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', !collapsed && 'rotate-180')}
        />
      </button>

      {!collapsed && (
        <div className="space-y-2 border-t border-border/60 px-3 py-3">
          {message && (
            <p
              className={cn(
                'rounded-xl border px-3 py-2 text-[11.5px]',
                message.tone === 'success'
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-destructive/30 bg-destructive/5 text-destructive',
              )}
            >
              {message.text}
            </p>
          )}

          {!loading && !items.length && (
            <p className="px-1 py-2 text-[12px] text-muted-foreground">{t('rec.queueEmpty')}</p>
          )}

          {items.map((item) => (
            <article key={item.id} className="rounded-xl border border-border/60 bg-background p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-medium leading-snug">{item.file_name || '—'}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {fmtDate(item.period_start)} → {fmtDate(item.period_end)} ·{' '}
                    {t('rec.matchedOn', { date: fmtDate(item.created_date) })}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium',
                    item.status === 'applied'
                      ? 'bg-primary/10 text-primary'
                      : 'bg-clay/15 text-clay',
                  )}
                >
                  {t(item.status === 'applied' ? 'rec.statusApplied' : 'rec.statusPending')}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10.5px] text-muted-foreground">
                {(item.farm_names || []).map((name) => (
                  <span key={name} className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">
                    {name}
                  </span>
                ))}
                <span className="tabular-nums">
                  {t('rec.queueItem', {
                    workers: fmtNum(item.workers_count, 0),
                    days: fmtNum(item.total_days, 1),
                    cost: fmtMoney(item.total_cost),
                  })}
                </span>
              </div>

              {openId === item.id && (
                <div className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {(item.lines || []).slice(0, 40).map((line) => (
                    <div key={`${line.worker_id}-${line.farm_id}`} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="min-w-0 truncate">
                        {line.worker_name}
                        <span className="text-muted-foreground"> · {line.farm_name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {fmtNum(line.total_days, 1)} j · {fmtMoney(Number(line.daily_rate) || 0)}
                      </span>
                    </div>
                  ))}
                  {(item.lines || []).length > 40 && (
                    <p className="text-[10.5px] text-muted-foreground">
                      {t('rec.diffMore', { n: item.lines.length - 40 })}
                    </p>
                  )}
                </div>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-lg px-2 text-[11px] text-muted-foreground"
                  onClick={() => setOpenId((current) => (current === item.id ? '' : item.id))}
                >
                  {openId === item.id ? t('rec.hideDetail') : t('rec.showDetail')}
                </Button>
                {item.status !== 'applied' && (
                  <Button
                    type="button"
                    size="sm"
                    className="ms-auto rounded-lg"
                    onClick={() => setAction({ type: 'integrate', item })}
                  >
                    {t('rec.integrate')}
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive"
                  aria-label={t('rec.delete')}
                  title={t('rec.delete')}
                  onClick={() => setAction({ type: 'delete', item })}
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && !busy && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(action?.type === 'integrate' ? 'rec.integrateTitle' : 'rec.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action?.type === 'integrate'
                ? `${action.item.file_name || ''} · ${t('rec.integrateDesc')}`
                : t('rec.deleteDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {action?.type === 'integrate' && (
            <p className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-[11.5px] tabular-nums">
              {t('rec.queueItem', {
                workers: fmtNum(action.item.workers_count, 0),
                days: fmtNum(action.item.total_days, 1),
                cost: fmtMoney(action.item.total_cost),
              })}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={run}
              className={
                action?.type === 'delete'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
              }
            >
              {busy && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {busy
                ? t(action?.type === 'delete' ? 'rec.deleting' : 'rec.integrating')
                : t(action?.type === 'delete' ? 'rec.deleteConfirm' : 'rec.integrateConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}