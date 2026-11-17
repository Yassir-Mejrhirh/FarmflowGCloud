import { Check, UserRound } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { fmtMoney } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Détail d'une fiche : les informations utiles pour choisir laquelle garder.
function WorkerFacts({ worker }) {
  const { t } = useI18n();
  const facts = [
    worker.team && `${t('workers.colTeam')} : ${worker.team}`,
    worker.worker_function,
    Number(worker.daily_rate) > 0 && `${fmtMoney(worker.daily_rate)} ${t('workers.perDay')}`,
    worker.phone,
    worker.registration_number,
    worker.declared && t('workers.colDeclared'),
    worker.transport_enabled && t('workers.transportOn'),
  ].filter(Boolean);

  return (
    <p className="mt-0.5 truncate text-[11px] leading-relaxed text-muted-foreground">
      {facts.length ? facts.join(' · ') : t('dup.noDetails')}
    </p>
  );
}

// Un groupe de noms proches : la fiche à conserver se choisit en cliquant son nom,
// et le groupe peut être ignoré sans rien modifier.
export default function DuplicateGroupCard({ group, keepId, ignored, onKeep, onToggleIgnore }) {
  const { t } = useI18n();

  return (
    <article
      className={cn(
        'rounded-xl border px-3 py-2.5',
        ignored ? 'border-border/70 bg-background opacity-70' : 'border-clay/30 bg-clay/5',
      )}
    >
      <div className="flex items-center gap-2">
        <Checkbox checked={!ignored} onCheckedChange={() => onToggleIgnore(group.key)} />
        <p className="text-[12.5px] font-medium leading-snug">
          {t('dup.count', { n: group.workers.length })}
        </p>
        <span className="ms-auto text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">
          {ignored ? t('dup.ignored') : t('dup.keep')}
        </span>
      </div>

      <div className="mt-2 space-y-1">
        {group.workers.map((worker) => {
          const active = worker.id === keepId;
          return (
            <button
              key={worker.id}
              type="button"
              disabled={ignored}
              onClick={() => onKeep(group.key, worker.id)}
              className={cn(
                'flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-transparent bg-background hover:border-border',
                ignored && 'cursor-default',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-input text-transparent',
                )}
              >
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <UserRound className="h-3 w-3 shrink-0 text-muted-foreground" strokeWidth={1.9} />
                  <span className="truncate text-[12.5px] font-medium leading-snug">{worker.name}</span>
                </span>
                <WorkerFacts worker={worker} />
              </span>
            </button>
          );
        })}
      </div>
    </article>
  );
}