import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Cellule d'aperçu saisissable : le petit carré au coin inférieur recopie sa
// valeur sur les lignes traversées pendant le glissement.
export default function FillCell({ fillKey, draftId, value, onStartFill, className, children }) {
  const { t } = useI18n();

  return (
    <div className={cn('relative', className)} data-fill-key={fillKey} data-draft-id={draftId}>
      {children}
      <span
        role="presentation"
        title={t('wimport.fillGrip')}
        onMouseDown={(event) => onStartFill(event, fillKey, value)}
        className="absolute -bottom-1 right-0 h-2.5 w-2.5 cursor-ns-resize rounded-[2px] border border-background bg-primary/45 opacity-0 transition-opacity hover:bg-primary/80 hover:opacity-100 group-hover/fill:opacity-100"
      />
    </div>
  );
}