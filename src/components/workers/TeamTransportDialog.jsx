import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Truck } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { fmtMoney, todayISO } from '@/lib/format';
import { applyTransportAssignments, teamTransportGaps } from '@/lib/reconcileTransport';
import { useI18n } from '@/lib/I18nContext';

// Anomalies de transport par équipe : ouvriers sans transport et ouvriers portés par un
// autre transporteur que la majorité de leur équipe. Chaque équipe cochée reçoit le
// transport retenu, daté au jour de la confirmation, puis un message de validation.
export default function TeamTransportDialog({ open, onOpenChange, workers, transportRates, onSaved }) {
  const { t } = useI18n();
  const [ignored, setIgnored] = useState(() => new Set());
  const [saving, setSaving] = useState(false);
  const date = todayISO();

  const gaps = useMemo(
    () => (open ? teamTransportGaps({ workers, rates: transportRates, date }) : []),
    [open, workers, transportRates, date],
  );

  useEffect(() => {
    if (open) setIgnored(new Set());
  }, [open]);

  const selected = gaps.filter((gap) => gap.proposed && !ignored.has(gap.key));
  const total = selected.reduce((sum, gap) => sum + gap.affected.length, 0);

  const toggle = (key) =>
    setIgnored((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const submit = async (event) => {
    event.preventDefault();
    if (!selected.length) return;
    setSaving(true);
    try {
      const assignments = selected.flatMap((gap) =>
        gap.affected.map((worker) => ({ worker, team: gap.team, proposed: gap.proposed })),
      );
      await applyTransportAssignments({ assignments, effectiveDate: date });
      onOpenChange(false);
      onSaved({ count: assignments.length, teams: selected.map((gap) => gap.team) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('wtr.teamTitle')}
      description={t('wtr.teamDesc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('wtr.apply', { n: total })}
      submitDisabled={!selected.length}
      wide
    >
      {gaps.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('wtr.empty')}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('wtr.teams', { n: gaps.length })}
          </p>
          {gaps.map((gap) => {
            const usable = Boolean(gap.proposed);
            return (
              <article
                key={gap.key}
                className={
                  usable
                    ? 'flex items-start gap-3 rounded-xl border border-clay/30 bg-clay/5 px-3 py-2'
                    : 'flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-2'
                }
              >
                <Checkbox
                  className="mt-0.5"
                  checked={usable && !ignored.has(gap.key)}
                  disabled={!usable}
                  onCheckedChange={() => usable && toggle(gap.key)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium leading-snug">{gap.team}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-muted-foreground">
                    {gap.missing.length > 0 && (
                      <span className="tabular-nums">{t('wtr.reasonMissing', { n: gap.missing.length })}</span>
                    )}
                    {gap.missing.length > 0 && gap.divergent.length > 0 && <span>·</span>}
                    {gap.divergent.length > 0 && (
                      <span className="tabular-nums">
                        {t('wtr.reasonDivergent', { n: gap.divergent.length })}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {t('wtr.affected', {
                      names: gap.affected.map((worker) => worker.name).join(', '),
                    })}
                  </p>
                  {usable ? (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-foreground">
                      <Truck className="h-3 w-3 text-clay" strokeWidth={1.9} />
                      <span className="tabular-nums">
                        {gap.proposed.transporter || t('lab.unknownTransporter')} ·{' '}
                        {gap.proposed.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed')} ·{' '}
                        {fmtMoney(gap.proposed.rate)} / {t('lab.perDay')}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-clay">
                      <AlertTriangle className="h-3 w-3" strokeWidth={1.9} />
                      {t('wtr.noConfig')}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </FormDialog>
  );
}