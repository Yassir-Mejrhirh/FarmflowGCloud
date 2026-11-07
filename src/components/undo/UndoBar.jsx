import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, Check, RotateCcw, X } from 'lucide-react';
import { useUndo } from '@/lib/undoContext';
import { useI18n } from '@/lib/I18nContext';

export default function UndoBar() {
  const { pending, undo, dismiss, windowMs } = useUndo();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    if (pending) {
      setBusy(false);
      setOutcome(null);
    }
  }, [pending]);

  useEffect(() => {
    if (!outcome) return undefined;
    const timer = setTimeout(() => setOutcome(null), 4500);
    return () => clearTimeout(timer);
  }, [outcome]);

  const run = async () => {
    if (busy) return;
    setBusy(true);
    const result = await undo();
    setBusy(false);
    if (result === 'done') setOutcome('done');
    if (result === 'blocked') setOutcome('blocked');
  };

  const visible = Boolean(pending) || Boolean(outcome);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <AnimatePresence>
        {visible && (
          <motion.div
            key={outcome || 'pending'}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="pointer-events-auto w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_26px_60px_-32px_rgba(20,45,35,0.55)] backdrop-blur-md"
          >
            {outcome ? (
              <div className="flex items-center gap-3 px-4 py-3.5">
                <span
                  className={
                    outcome === 'done'
                      ? 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary'
                      : 'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive'
                  }
                >
                  {outcome === 'done' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                </span>
                <p className="text-sm leading-snug">
                  {outcome === 'done' ? t('undo.done') : t('undo.blocked')}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <RotateCcw className="h-4 w-4 rtl:-scale-x-100" strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight">{t('undo.title')}</p>
                    {pending?.label && (
                      <p className="truncate text-xs text-muted-foreground">{pending.label}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={run}
                    disabled={busy}
                    className="shrink-0 rounded-xl bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {t('undo.action')}
                  </button>
                  <button
                    type="button"
                    onClick={dismiss}
                    aria-label={t('undo.dismiss')}
                    className="shrink-0 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <motion.div
                  key={pending?.label}
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: windowMs / 1000, ease: 'linear' }}
                  className="h-0.5 origin-left bg-primary/40 rtl:origin-right"
                />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}