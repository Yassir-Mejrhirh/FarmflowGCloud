import { useEffect, useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { fmtMoney, todayISO } from '@/lib/format';
import { applyTransportAssignments, teamTransportGaps } from '@/lib/reconcileTransport';
import { useI18n } from '@/lib/I18nContext';

// Proposition puis confirmation : chaque équipe concernée affiche le transport qui lui
// est déjà paramétré et le nombre d'ouvriers à mettre à jour. Seules les équipes
// cochées reçoivent ce transport, daté au jour de la confirmation.
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
  const total = selected.reduce((sum, gap) => sum + gap.missing.length, 0);

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
      await applyTransportAssignments({
        assignments: selected.flatMap((gap) =>
          gap.missing.map((worker) => ({ worker, team: gap.team, proposed: gap.proposed })),
        ),
        effectiveDate: date,
      });
      onOpenChange(false);
      onSaved();
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
                    <span className="tabular-nums">
                      {t('wtr.members', { n: gap.missing.length, total: gap.members.length })}
                    </span>
                    {usable ? (
                      <span className="tabular-nums">
                        · {gap.proposed.transporter || t('lab.unknownTransporter')} ·{' '}
                        {gap.proposed.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed')} ·{' '}
                        {fmtMoney(gap.proposed.rate)} / {t('lab.perDay')}
                      </span>
                    ) : (
                      <span className="text-clay">· {t('wtr.noConfig')}</span>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </FormDialog>
  );
}