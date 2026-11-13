import { CalendarDays, CheckCircle2, Loader2 } from 'lucide-react';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/I18nContext';

// The day and the farm the report is written for, and the final validation that
// sends the whole draft of that farm.
export default function DraftHeader({
  date, onDateChange, farms, farmId, onFarmChange, saving, total, ready, committing, onCommit,
}) {
  const { t } = useI18n();

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <Field label={t('report.date')}>
            <Input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} />
          </Field>
          <Field label={t('report.farm')}>
            <SelectField
              value={farmId}
              onChange={onFarmChange}
              options={farms.map((farm) => ({ value: farm.id, label: farm.name }))}
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarDays className="h-3.5 w-3.5" />
            )}
            {saving ? t('report.draftSaving') : t('report.draftSaved')}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('report.readyCount', { n: ready })}
          </span>
          <Button
            type="button"
            onClick={onCommit}
            disabled={committing || total === 0}
            className="rounded-xl"
          >
            <CheckCircle2 className="h-4 w-4" />
            {committing ? t('common.saving') : t('report.commit')}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{t('report.commitHint')}</p>
    </section>
  );
}