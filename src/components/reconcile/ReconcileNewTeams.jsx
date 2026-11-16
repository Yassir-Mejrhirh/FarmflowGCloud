import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { useI18n } from '@/lib/I18nContext';

// Les saisies sont gardées ici et remontées après une courte pause : la frappe ne
// relance pas tout le rapprochement à chaque caractère.
const COMMIT_DELAY = 400;

// Équipes détectées dans le classeur mais absentes de la liste MO : pour chacune, le
// transporteur, le mode de facturation et le tarif journalier sont saisis ici et
// repris par les ouvriers créés ensuite.
export default function ReconcileNewTeams({ teams = [], settings = {}, onChange }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(settings);
  const pending = useRef({});
  const timer = useRef(null);

  const flush = () => {
    clearTimeout(timer.current);
    timer.current = null;
    const entries = Object.entries(pending.current);
    pending.current = {};
    entries.forEach(([key, patch]) => onChange(key, patch));
  };

  const keep = () => {
    clearTimeout(timer.current);
    timer.current = null;
    if (Object.keys(pending.current).length) timer.current = setTimeout(flush, COMMIT_DELAY);
  };

  const queue = (key, patch) => {
    setDraft((current) => ({ ...current, [key]: { ...(current[key] || {}), ...patch } }));
    pending.current[key] = { ...(pending.current[key] || {}), ...patch };
    keep();
  };

  // Une sélection se valide tout de suite, une frappe attend la pause.
  const choose = (key, patch) => {
    queue(key, patch);
    flush();
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!teams.length) return null;

  const modes = [
    { value: 'fixed', label: t('rec.modeFixed') },
    { value: 'per_person', label: t('rec.modePerPerson') },
  ];

  return (
    <section className="rounded-2xl border border-clay/30 bg-clay/5 p-4">
      <h2 className="font-display text-lg leading-tight tracking-tight">{t('rec.newTeamsTitle')}</h2>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{t('rec.newTeamsHint')}</p>

      <div className="mt-3 space-y-2">
        {teams.map((team) => {
          const value = draft[team.key] || {};
          return (
            <article key={team.key} className="rounded-xl border border-border/60 bg-card p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-medium leading-snug">{team.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                  {t('rec.teamWorkers', { n: team.count })}
                </span>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Field label={t('rec.transporter')}>
                  <Input
                    value={value.transporter || ''}
                    onChange={(event) => queue(team.key, { transporter: event.target.value })}
                    onBlur={flush}
                    placeholder={t('rec.transporterPlaceholder')}
                  />
                </Field>
                <Field label={t('rec.transportMode')}>
                  <SelectField
                    value={value.mode || 'fixed'}
                    onChange={(mode) => choose(team.key, { mode })}
                    options={modes}
                  />
                </Field>
                <Field label={t('rec.transportRate')}>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={value.rate ?? ''}
                    onChange={(event) => queue(team.key, { rate: event.target.value })}
                    onBlur={flush}
                    placeholder="0"
                  />
                </Field>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}