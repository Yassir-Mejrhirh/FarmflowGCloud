import { CopyX } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Revue des noms déjà présents : chaque ligne de doublon reçoit son propre choix.
export default function DuplicateReview({ rows = [], onDecide }) {
  const { t } = useI18n();
  if (!rows.length) return null;

  return (
    <section className="rounded-2xl border border-clay/40 bg-clay/5 px-4 py-3">
      <div className="flex items-start gap-2">
        <CopyX className="mt-px h-4 w-4 shrink-0 text-clay" />
        <div>
          <p className="text-[12px] font-medium text-clay">
            {t('wimport.dupTitle', { count: rows.length })}
          </p>
          <p className="text-[11px] leading-snug text-muted-foreground">{t('wimport.dupHint')}</p>
        </div>
      </div>

      <ul className="mt-2.5 space-y-1">
        {rows.map(({ draft, existing }) => (
          <li
            key={draft.id}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border/60 bg-background/80 px-2.5 py-1.5"
          >
            <span className="truncate text-xs font-medium">{draft.values.name}</span>
            <span className="truncate text-[10px] text-muted-foreground">
              {t('wimport.dupExisting', { name: existing.name })}
            </span>
            <div className="ms-auto flex items-center gap-1">
              {[false, true].map((keep) => (
                <button
                  key={String(keep)}
                  type="button"
                  onClick={() => onDecide(draft.id, keep)}
                  className={cn(
                    'rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors',
                    draft.include === keep
                      ? keep
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-clay bg-clay text-clay-foreground'
                      : 'border-border bg-transparent text-muted-foreground hover:bg-secondary',
                  )}
                >
                  {keep ? t('wimport.dupKeep') : t('wimport.dupSkip')}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}