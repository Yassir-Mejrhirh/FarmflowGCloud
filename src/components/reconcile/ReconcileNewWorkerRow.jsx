import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { fmtMoney, fmtNum } from '@/lib/format';
import { teamKey } from '@/lib/reconcileWorkers';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Une personne non rapprochée : son équipe lue dans le classeur, son salaire et le
// transport qui s'appliquera, avec la possibilité de l'écarter de l'ajout.
export default function ReconcileNewWorkerRow({ entry, pick, teams = [], transports, onPick }) {
  const { t } = useI18n();
  const options = (teams || []).map((team) => ({ value: team.name, label: team.name }));
  const known = teams.some((team) => teamKey(team.name) === teamKey(pick?.team) && team.known);
  const transport = transports?.get(teamKey(pick?.team));
  const rate = Number(pick?.salary) || 0;

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
          <p className="truncate text-[13px] font-medium leading-snug">{entry.name}</p>
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
                    options={options}
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
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {rate > 0
                  ? transport
                    ? t('rec.newTransport', { name: transport.transporter || '—', rate: fmtMoney(transport.rate) })
                    : t('rec.newNoTransport')
                  : t('rec.newSalaryRequired')}
              </p>
            </>
          )}
        </div>
      </div>
    </article>
  );
}