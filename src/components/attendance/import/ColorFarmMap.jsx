import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Chaque couleur trouvée dans le classeur est rattachée à une ferme ; le choix est
// enregistré sur la ferme pour les imports suivants.
export default function ColorFarmMap({ colors, colorMap, farms, onChange }) {
  const { t } = useI18n();

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('aimport.colorsTitle')}
        </p>
        <p className="text-[11px] text-muted-foreground">{t('aimport.colorsHint')}</p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {colors.map(({ color, count }) => {
          const farmId = colorMap[color] || '';
          return (
            <div
              key={color}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-1.5',
                farmId ? 'border-border/70 bg-card' : 'border-clay/40 bg-clay/5',
              )}
            >
              <span
                className="h-4 w-4 shrink-0 rounded-[4px] border border-black/10"
                style={{ backgroundColor: color }}
              />
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {count} {t('aimport.cells')}
              </span>
              <Select
                value={farmId || 'none'}
                onValueChange={(value) => onChange(color, value === 'none' ? '' : value)}
              >
                <SelectTrigger className="ms-auto h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('aimport.ignore')}</SelectItem>
                  {farms.map((farm) => (
                    <SelectItem key={farm.id} value={farm.id}>
                      {farm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}