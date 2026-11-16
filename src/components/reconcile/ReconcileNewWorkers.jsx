import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReconcileNewWorkerRow from '@/components/reconcile/ReconcileNewWorkerRow';
import { useI18n } from '@/lib/I18nContext';

// Personnes du classeur absentes de la liste MO : chacune est choisie séparément
// puis créée comme ouvrier mobile, avec son équipe et son salaire.
export default function ReconcileNewWorkers({
  entries = [], picks, teams = [], transports, onPick, onAdd, adding = false,
}) {
  const { t } = useI18n();
  const selected = entries.filter((entry) => picks.get(entry.name)?.include);
  const missing = selected.filter((entry) => !(Number(picks.get(entry.name)?.salary) > 0));

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg leading-tight tracking-tight">{t('rec.newTitle')}</h2>
        <span className="rounded-full bg-clay/15 px-2 py-0.5 text-[10.5px] tabular-nums text-clay">
          {t('rec.newCount', { n: selected.length, total: entries.length })}
        </span>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{t('rec.newHint')}</p>

      <div className="mt-3 space-y-2">
        {entries.map((entry) => (
          <ReconcileNewWorkerRow
            key={entry.name}
            entry={entry}
            pick={picks.get(entry.name)}
            teams={teams}
            transports={transports}
            onPick={onPick}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {missing.length > 0 && (
          <p className="text-[11px] text-clay">{t('rec.newMissingSalary', { n: missing.length })}</p>
        )}
        <Button
          type="button"
          size="sm"
          className="ms-auto rounded-xl"
          onClick={onAdd}
          disabled={adding || !selected.length || missing.length > 0}
        >
          <UserPlus className="h-3.5 w-3.5" />
          {adding ? t('rec.newAdding') : t('rec.newAdd', { n: selected.length })}
        </Button>
      </div>
    </section>
  );
}