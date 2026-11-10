import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2 } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtDate, fmtMoney, todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { useI18n } from '@/lib/I18nContext';

const emptyForm = { effective_date: todayISO(), daily_rate: '', notes: '' };

export default function WageHistoryDialog({ open, onOpenChange, worker, rates, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError('');
  }, [open, worker?.id]);

  const history = rates
    .filter((rate) => rate.worker_id === worker?.id)
    .sort((a, b) => String(b.effective_date).localeCompare(String(a.effective_date)));
  const today = rateFor(worker, buildRateIndex(rates), todayISO());

  const submit = async (event) => {
    event.preventDefault();
    if (!worker?.id) return;
    setError('');
    if (!form.effective_date || !form.daily_rate) {
      setError(t('wage.invalid'));
      return;
    }
    if (history.some((rate) => rate.effective_date === form.effective_date)) {
      setError(t('wage.duplicate'));
      return;
    }
    setSaving(true);
    await base44.entities.WageRate.create({
      worker_id: worker.id,
      effective_date: form.effective_date,
      daily_rate: Number(form.daily_rate) || 0,
      team: worker.team || '',
      notes: form.notes.trim(),
    });
    setSaving(false);
    setForm({ ...emptyForm, daily_rate: form.daily_rate });
    onSaved();
  };

  const remove = async (rate) => {
    await base44.entities.WageRate.delete(rate.id);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${t('wage.historyTitle')} · ${worker?.name || ''}`}
      description={t('wage.historyDesc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('wage.add')}
    >
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('wage.current')}</p>
          <p className="font-display text-xl tabular-nums">{fmtMoney(today)}</p>
        </div>
        <div className="text-end">
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{t('wage.baseRate')}</p>
          <p className="text-sm tabular-nums text-muted-foreground">{fmtMoney(worker?.daily_rate)}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('wage.effectiveDate')}>
          <Input
            type="date"
            value={form.effective_date}
            onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
            required
          />
        </Field>
        <Field label={t('wage.amount')}>
          <Input
            type="number"
            value={form.daily_rate}
            onChange={(e) => setForm({ ...form, daily_rate: e.target.value })}
            required
          />
        </Field>
        <Field label={t('wage.note')} className="sm:col-span-2">
          <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
      </div>

      <p className="text-[11px] text-muted-foreground">{t('wage.baseRateHint')}</p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {history.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('wage.empty')}</p>
      ) : (
        <ul className="divide-y divide-border/70 rounded-xl border border-border/70">
          {history.map((rate) => (
            <li key={rate.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm tabular-nums">{fmtMoney(rate.daily_rate)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t('wage.since', { date: fmtDate(rate.effective_date) })}
                  {rate.notes ? ` · ${rate.notes}` : ''}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
                onClick={() => remove(rate)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </FormDialog>
  );
}