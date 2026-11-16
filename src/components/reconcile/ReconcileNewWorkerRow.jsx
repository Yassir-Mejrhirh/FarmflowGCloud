import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Field from '@/components/Field';
import WorkerName from '@/components/WorkerName';
import SelectField from '@/components/SelectField';
import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Une personne non rapprochée : son équipe lue dans le classeur, son salaire, sa
// priorité, sa déclaration et sa fonction, puis le transport qui s'appliquera —
// celui de l'équipe existante ou celui saisi pour une nouvelle équipe.
export default function ReconcileNewWorkerRow({
  entry, pick, teams = [], transport, known = false, functions = [], onPick,
}) {
  const { t } = useI18n();
  const teamOptions = (teams || []).map((team) => ({ value: team.name, label: team.name }));
  const functionOptions = [...new Set(['Ouvrier', ...(functions || []).filter(Boolean)])].map((name) => ({
    value: name,
    label: name,
  }));
  const priorities = ['1', '2', '3'].map((value) => ({ value, label: t(`wr.priority_${value}`) }));
  const rate = Number(pick?.salary) || 0;
  const transportRate = Number(transport?.rate) || 0;

  return (
    <article
      className={cn(
        'rounded-xl border p-3 transition-colors',
        pick?.include ? 'border-clay/40 bg-clay/5' : 'border-border/60 bg-background',
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          className="mt-0.5"
          checked={Boolean(pick?.include)}
          onCheckedChange={(checked) => onPick(entry.name, { include: checked === true })}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-snug">
            <WorkerName name={entry.name} />
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
            <span className="tabular-nums">{t('rec.daysCount', { days: fmtNum(entry.total, 1) })}</span>
            {pick?.team && !known && (
              <span className="rounded-full bg-clay/15 px-1.5 py-0.5 text-[10px] font-medium text-clay">
                {t('rec.newTeamTag')}
              </span>
            )}
          </p>

          {pick?.include && (
            <>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <Field label={t('rec.newTeam')}>
                  <SelectField
                    value={pick.team}
                    onChange={(team) => onPick(entry.name, { team })}
                    options={teamOptions}
                    noneLabel={t('rec.newNoTeam')}
                  />
                </Field>
                <Field label={t('rec.newSalary')}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={pick.salary}
                    onChange={(event) => onPick(entry.name, { salary: event.target.value })}
                    placeholder="0"
                  />
                </Field>
                <Field label={t('rec.newPriority')}>
                  <SelectField
                    value={pick.priority}
                    onChange={(priority) => onPick(entry.name, { priority })}
                    options={priorities}
                  />
                </Field>
                <Field label={t('rec.newFunction')}>
                  <SelectField
                    value={pick.worker_function}
                    onChange={(worker_function) => onPick(entry.name, { worker_function })}
                    options={functionOptions}
                  />
                </Field>
              </div>

              <label className="mt-2 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                <Switch
                  checked={Boolean(pick.declared)}
                  onCheckedChange={(declared) => onPick(entry.name, { declared })}
                />
                {t('rec.newDeclared')}
              </label>

              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {rate <= 0
                  ? t('rec.newSalaryRequired')
                  : transportRate > 0
                    ? t('rec.newTransport', {
                        name: transport?.transporter || '—',
                        rate: fmtMoney(transportRate),
                      })
                    : known
                      ? t('rec.newNoTransport')
                      : t('rec.newTeamTransportPending')}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}