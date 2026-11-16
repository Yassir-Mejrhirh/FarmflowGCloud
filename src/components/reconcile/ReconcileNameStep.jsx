import { memo } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReconcileNameRow from '@/components/reconcile/ReconcileNameRow';
import { useI18n } from '@/lib/I18nContext';

// Deuxième temps : chaque nom du classeur reçoit une proposition à confirmer.
function ReconcileNameStep({
  names = [], proposals, resolution = {}, onChange, onAutoConfirm, workers = [], usage,
}) {
  const { t } = useI18n();
  const done = names.filter((entry) => resolution[entry.name]).length;
  const rest = names.length - done;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-border/70 bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg leading-tight tracking-tight">{t('rec.namesTitle')}</h2>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[10.5px] tabular-nums text-secondary-foreground">
            {t('rec.summary', { done, rest })}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="ms-auto rounded-full"
            onClick={onAutoConfirm}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('rec.autoConfirm')}
          </Button>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{t('rec.namesHint')}</p>
      </div>

      <div className="space-y-2">
        {names.map((entry) => (
          <ReconcileNameRow
            key={entry.name}
            entry={entry}
            proposal={proposals?.get(entry.name)}
            value={resolution[entry.name] || ''}
            onChange={onChange}
            workers={workers}
            duplicate={(usage?.get(resolution[entry.name]) || 0) > 1}
          />
        ))}
      </div>
    </div>
  );
}

// Les lignes de noms ne se redessinent pas quand seule la saisie d'une équipe change.
export default memo(ReconcileNameStep);