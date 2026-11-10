import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { fmtMoney, todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { useI18n } from '@/lib/I18nContext';

export default function TeamRateDialog({ open, onOpenChange, workers, rates, onSaved }) {
  const { t } = useI18n();
  const [team, setTeam] = useState('');
  const [date, setDate] = useState(todayISO());
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const teams = [...new Set(workers.map((worker) => worker.team).filter(Boolean))].sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!open) return;
    setTeam(teams[0] || '');
    setDate(todayISO());
    setAmount('');
  }, [open]);

  const rateIndex = buildRateIndex(rates);
  const members = workers.filter((worker) => worker.team === team);
  const pending = members.filter(
    (worker) => !rates.some((rate) => rate.worker_id === worker.id && rate.effective_date === date),
  );
  const skipped = members.length - pending.length;

  const submit = async (event) => {
    event.preventDefault();
    if (!team || !date || !amount || pending.length === 0) return;
    setSaving(true);
    await base44.entities.WageRate.bulkCreate(
      pending.map((worker) => ({
        worker_id: worker.id,
        effective_date: date,
        daily_rate: Number(amount) || 0,
        team: worker.team || '',
      })),
    );
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('wage.teamTitle')}
      description={t('wage.teamDesc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('wage.apply')}
      submitDisabled={!team || !amount || pending.length === 0}
      wide
    >
      {teams.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('wage.noTeam')}</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('wage.team')}>
              <SelectField
                value={team}
                onChange={setTeam}
                options={teams.map((name) => ({ value: name, label: name }))}
              />
            </Field>
            <Field label={t('wage.effectiveDate')}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label={t('wage.amount')}>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            </Field>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t('wage.members')} ({members.length})
            </p>
            <ul className="max-h-64 divide-y divide-border/70 overflow-y-auto rounded-xl border border-border/70">
              {members.map((worker) => (
                <li key={worker.id} className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="truncate text-sm">{worker.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtMoney(rateFor(worker, rateIndex, date))}
                    {amount ? <span className="text-primary"> → {fmtMoney(amount)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
            {skipped > 0 && <p className="text-[11px] text-muted-foreground">{t('wage.skipped', { n: skipped })}</p>}
          </div>
        </>
      )}
    </FormDialog>
  );
}