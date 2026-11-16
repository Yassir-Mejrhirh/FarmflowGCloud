import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Pencil, Truck } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import TeamTransportManualFields from '@/components/workers/TeamTransportManualFields';
import { fmtMoney, todayISO } from '@/lib/format';
import { applyTransportAssignments, teamTransportGaps } from '@/lib/reconcileTransport';
import { useI18n } from '@/lib/I18nContext';

const EMPTY_DRAFT = { open: false, transporter: '', mode: 'fixed', rate: '' };

// Transport des équipes : les équipes dont le transport n'est pas uniforme reçoivent le
// transport majoritaire ; celles qui n'en ont aucun reçoivent le transporteur, le mode et
// le tarif saisis à la main. Chaque équipe cochée est datée au jour de la confirmation.
export default function TeamTransportDialog({ open, onOpenChange, workers, transportRates, onSaved }) {
  const { t } = useI18n();
  const [ignored, setIgnored] = useState(() => new Set());
  const [manual, setManual] = useState({});
  const [extraTransporters, setExtraTransporters] = useState([]);
  const [saving, setSaving] = useState(false);
  const date = todayISO();

  const gaps = useMemo(
    () => (open ? teamTransportGaps({ workers, rates: transportRates, date }) : []),
    [open, workers, transportRates, date],
  );

  useEffect(() => {
    if (open) {
      setIgnored(new Set());
      setManual({});
    }
  }, [open]);

  // Transporteurs proposés : ceux déjà portés par les ouvriers ou enregistrés dans les
  // taux, complétés par ceux saisis pendant cette fenêtre.
  const transporters = useMemo(() => {
    const names = [];
    [
      ...workers.map((worker) => worker.transporter_name),
      ...(transportRates || []).map((rate) => rate.transporter_name),
      ...extraTransporters,
    ].forEach((value) => {
      const name = String(value || '').trim();
      if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) names.push(name);
    });
    return names.sort((a, b) => a.localeCompare(b));
  }, [workers, transportRates, extraTransporters]);

  const rememberTransporter = (name) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    setExtraTransporters((current) =>
      current.some((existing) => existing.toLowerCase() === clean.toLowerCase()) ? current : [...current, clean],
    );
  };

  const setDraft = (key, patch) =>
    setManual((current) => ({ ...current, [key]: { ...EMPTY_DRAFT, ...(current[key] || {}), ...patch } }));

  // Transport à appliquer : celui de l'équipe, ou la saisie manuelle une fois complète.
  const draftFor = (gap) => {
    if (gap.proposed) return gap.proposed;
    const entry = manual[gap.key];
    if (!entry || !String(entry.transporter).trim() || Number(entry.rate) <= 0) return null;
    return { transporter: String(entry.transporter).trim(), mode: entry.mode, rate: Number(entry.rate) };
  };

  const selected = gaps
    .filter((gap) => (gap.proposed ? !ignored.has(gap.key) : Boolean(manual[gap.key]?.open)))
    .map((gap) => ({ gap, proposed: draftFor(gap) }))
    .filter((entry) => entry.proposed);

  const total = selected.reduce((sum, entry) => sum + entry.gap.affected.length, 0);

  const toggle = (gap) => {
    if (gap.proposed) {
      setIgnored((current) => {
        const next = new Set(current);
        if (next.has(gap.key)) next.delete(gap.key);
        else next.add(gap.key);
        return next;
      });
      return;
    }
    setDraft(gap.key, { open: !manual[gap.key]?.open });
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!selected.length) return;
    setSaving(true);
    try {
      const assignments = selected.flatMap(({ gap, proposed }) =>
        gap.affected.map((worker) => ({ worker, team: gap.team, proposed })),
      );
      await applyTransportAssignments({ assignments, effectiveDate: date });
      onOpenChange(false);
      onSaved({ count: assignments.length, teams: selected.map((entry) => entry.gap.team) });
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
            const entry = manual[gap.key];
            const usable = Boolean(gap.proposed);
            const draft = draftFor(gap);
            const checked = usable ? !ignored.has(gap.key) : Boolean(entry?.open);
            return (
              <article
                key={gap.key}
                className={
                  checked && draft
                    ? 'flex items-start gap-3 rounded-xl border border-clay/30 bg-clay/5 px-3 py-2'
                    : 'flex items-start gap-3 rounded-xl border border-border/70 bg-background px-3 py-2'
                }
              >
                <Checkbox className="mt-0.5" checked={checked} onCheckedChange={() => toggle(gap)} />
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

                  {usable && (
                    <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-foreground">
                      <Truck className="h-3 w-3 text-clay" strokeWidth={1.9} />
                      <span className="tabular-nums">
                        {gap.proposed.transporter || t('lab.unknownTransporter')} ·{' '}
                        {gap.proposed.mode === 'per_person' ? t('lab.modePerPerson') : t('lab.modeFixed')} ·{' '}
                        {fmtMoney(gap.proposed.rate)} / {t('lab.perDay')}
                      </span>
                    </p>
                  )}

                  {!usable && !entry?.open && (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="flex items-center gap-1.5 text-[11px] text-clay">
                        <AlertTriangle className="h-3 w-3" strokeWidth={1.9} />
                        {t('wtr.noConfig')}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-2 text-[11px] text-clay hover:text-clay"
                        onClick={() => setDraft(gap.key, { open: true })}
                      >
                        <Pencil className="me-1 h-3 w-3" /> {t('wtr.manualBtn')}
                      </Button>
                    </div>
                  )}

                  {!usable && entry?.open && (
                    <TeamTransportManualFields
                      value={entry}
                      count={gap.affected.length}
                      onChange={(patch) => setDraft(gap.key, patch)}
                      transporters={transporters}
                      onRemember={rememberTransporter}
                    />
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