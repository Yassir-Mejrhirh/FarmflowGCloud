import { Check, Palette } from 'lucide-react';
import ColorFarmRow from '@/components/reconcile/ColorFarmRow';
import NoColorFarmRow from '@/components/reconcile/NoColorFarmRow';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Étape de vérification : chaque couleur du classeur doit désigner une ferme, et
// chaque présence écrite sans couleur doit être rattachée à une ferme choisie.
export default function ReconcileColorStep({
  colors = [],
  noColor = [],
  farms = [],
  colorAssignments = {},
  cellAssignments = {},
  onColorAssign,
  onCellAssign,
}) {
  const { t } = useI18n();
  const farmOptions = (farms || []).map((farm) => ({ value: farm.id, label: farm.name }));
  const open = colors.filter((item) => !colorAssignments[item.color]).length +
    noColor.filter((item) => !cellAssignments[item.key]).length;
  const empty = !colors.length && !noColor.length;

  return (
    <section className="rounded-2xl border border-border/70 bg-card">
      <header className="flex items-start gap-2.5 border-b border-border/60 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <Palette className="h-4 w-4" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] leading-tight">{t('rec.colorsTitle')}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t('rec.colorsHint')}</p>
        </div>
      </header>

      {empty ? (
        <p className="flex items-center gap-1.5 px-4 py-5 text-[12px] text-primary">
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.2} />
          {t('rec.colorsAllOk')}
        </p>
      ) : (
        <div className="space-y-4 px-3 py-3">
          <div>
            <p className="px-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t('rec.colorsSectionTitle')}
            </p>
            {colors.length ? (
              <div className="mt-1.5 space-y-1.5">
                {colors.map((item) => (
                  <ColorFarmRow
                    key={item.color}
                    item={item}
                    farms={farmOptions}
                    value={colorAssignments[item.color] || ''}
                    onChange={(farmId) => onColorAssign(item.color, farmId)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 py-1.5 text-[11.5px] text-muted-foreground">{t('rec.colorsSectionNone')}</p>
            )}
          </div>

          <div>
            <p className="px-1 text-[10.5px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {t('rec.noColorSectionTitle')}
            </p>
            {noColor.length ? (
              <div className="mt-1.5 space-y-1.5">
                {noColor.map((item) => (
                  <NoColorFarmRow
                    key={item.key}
                    item={item}
                    farms={farmOptions}
                    value={cellAssignments[item.key] || ''}
                    onChange={(farmId) => onCellAssign(item.key, farmId)}
                  />
                ))}
              </div>
            ) : (
              <p className="px-1 py-1.5 text-[11.5px] text-muted-foreground">{t('rec.noColorSectionNone')}</p>
            )}
          </div>
        </div>
      )}

      {!empty && (
        <p
          className={cn(
            'border-t border-border/60 px-4 py-2.5 text-[11.5px] leading-relaxed',
            open ? 'text-clay' : 'text-primary',
          )}
        >
          {open ? t('rec.colorsBlocked', { n: open }) : t('rec.colorsReady')}
        </p>
      )}
    </section>
  );
}