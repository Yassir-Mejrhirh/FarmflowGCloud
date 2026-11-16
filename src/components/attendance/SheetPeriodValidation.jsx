import { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { BadgeCheck, CheckCheck, Loader2 } from 'lucide-react';
import QuinzainePicker from '@/components/reconcile/QuinzainePicker';
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
import { fetchList } from '@/lib/data';
import { fmtDate, fmtNum, todayISO } from '@/lib/format';
import { quinzaineOf, quinzaineRange } from '@/lib/quinzaine';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const round = (value) => Math.round(value * 100) / 100;

// Validation de la quinzaine : les feuilles déjà écrites pour une ferme sont marquées
// validées d'un coup, ou une par une. Aucune feuille n'est créée ni supprimée ici.
export default function SheetPeriodValidation({ farmId, farmName, onChanged }) {
  const { t } = useI18n();
  const [quinzaine, setQuinzaine] = useState(() => quinzaineOf(todayISO()));
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [message, setMessage] = useState(null);

  const period = useMemo(() => quinzaineRange(quinzaine), [quinzaine]);

  const load = useCallback(async () => {
    if (!farmId) {
      setSheets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchList(
        base44.entities.AttendanceSheet,
        { farm_id: farmId, date: { $gte: period.start, $lte: period.end } },
        { sort: 'date' },
      );
      setSheets(rows);
    } finally {
      setLoading(false);
    }
  }, [farmId, period]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = sheets.filter((sheet) => !sheet.validated);
  const validatedCount = sheets.length - pending.length;
  const totalDays = round(sheets.reduce((sum, sheet) => sum + (Number(sheet.total_days) || 0), 0));
  const pendingDays = round(pending.reduce((sum, sheet) => sum + (Number(sheet.total_days) || 0), 0));

  const validateAll = async () => {
    if (!pending.length) return;
    setBusy('all');
    setMessage(null);
    try {
      const stamp = todayISO();
      await base44.entities.AttendanceSheet.bulkUpdate(
        pending.map((sheet) => ({ id: sheet.id, validated: true, validated_at: stamp })),
      );
      setMessage({ tone: 'success', text: t('att.validateDone', { n: fmtNum(pending.length, 0) }) });
      setConfirmOpen(false);
      await load();
      onChanged?.();
    } catch {
      setMessage({ tone: 'error', text: t('att.validateError') });
    } finally {
      setBusy('');
    }
  };

  const toggleSheet = async (sheet) => {
    setBusy(sheet.id);
    setMessage(null);
    try {
      const next = !sheet.validated;
      await base44.entities.AttendanceSheet.update(sheet.id, {
        validated: next,
        validated_at: next ? todayISO() : '',
      });
      setSheets((current) =>
        current.map((row) => (row.id === sheet.id ? { ...row, validated: next } : row)),
      );
      onChanged?.();
    } catch {
      setMessage({ tone: 'error', text: t('att.validateError') });
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="space-y-3">
      <QuinzainePicker value={quinzaine} onChange={setQuinzaine} />

      <section className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
            <CheckCheck className="h-4 w-4" strokeWidth={1.8} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] leading-tight">{t('att.periodTitle')}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t('att.periodDesc')}</p>
          </div>
          <Button
            type="button"
            className="rounded-xl"
            disabled={!pending.length || loading || Boolean(busy)}
            onClick={() => setConfirmOpen(true)}
          >
            {busy === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BadgeCheck className="h-4 w-4" strokeWidth={1.9} />
            )}
            {t('att.validateAll')}
          </Button>
        </div>

        <p className="mt-2.5 text-[11px] tabular-nums text-muted-foreground">
          {t('att.periodSummary', {
            n: fmtNum(sheets.length, 0),
            validated: fmtNum(validatedCount, 0),
            days: fmtNum(totalDays, 1),
          })}
        </p>

        {message && (
          <p
            className={cn(
              'mt-2 rounded-xl border px-3 py-2 text-[11.5px]',
              message.tone === 'success'
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-destructive/30 bg-destructive/5 text-destructive',
            )}
          >
            {message.text}
          </p>
        )}

        {loading ? (
          <p className="mt-2 text-[11px] text-muted-foreground">{t('common.loading')}</p>
        ) : !sheets.length ? (
          <p className="mt-2 text-[11px] text-muted-foreground">{t('att.periodEmpty')}</p>
        ) : (
          <ul className="mt-1 divide-y divide-border/60">
            {sheets.map((sheet) => (
              <li key={sheet.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5">
                <span className="text-[12px] font-medium tabular-nums">{fmtDate(sheet.date)}</span>
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  {t('att.daysUnit', { n: fmtNum(sheet.total_days, 1) })}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-medium',
                    sheet.validated ? 'bg-primary/10 text-primary' : 'bg-clay/15 text-clay',
                  )}
                >
                  {t(sheet.validated ? 'att.validated' : 'att.pendingValidation')}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="ms-auto rounded-lg px-2 text-[11px] text-muted-foreground"
                  disabled={Boolean(busy)}
                  onClick={() => toggleSheet(sheet)}
                >
                  {busy === sheet.id && <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />}
                  {sheet.validated ? t('att.unvalidateSheet') : t('att.validateSheet')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={(open) => !busy && setConfirmOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('att.validateTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('att.validateDesc', {
                farm: farmName || '—',
                from: fmtDate(period.start),
                to: fmtDate(period.end),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="rounded-xl border border-border/70 bg-secondary/40 px-3 py-2 text-[11.5px] tabular-nums">
            {t('att.validateCount', { n: fmtNum(pending.length, 0), days: fmtNum(pendingDays, 1) })}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(busy)}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={Boolean(busy)} onClick={validateAll}>
              {busy === 'all' && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
              {t('att.validateConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}