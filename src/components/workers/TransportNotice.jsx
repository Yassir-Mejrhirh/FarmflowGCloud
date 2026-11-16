import { Check, X } from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';

// Message de validation affiché après l'uniformisation du transport d'une ou plusieurs
// équipes : nombre d'ouvriers corrigés et équipes concernées.
export default function TransportNotice({ notice, onDismiss }) {
  const { t } = useI18n();
  if (!notice) return null;

  return (
    <section className="flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-snug">{t('wtr.doneTitle')}</p>
        <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">
          {t('wtr.done', { n: notice.count })}
          {notice.teams?.length ? ` · ${t('wtr.doneTeams', { teams: notice.teams.join(', ') })}` : ''}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        aria-label={t('common.cancel')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </section>
  );
}