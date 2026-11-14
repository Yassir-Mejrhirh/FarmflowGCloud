import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/I18nContext';

// Fermes d'un ouvrier mobile : il peut être proposé sur chacune des fermes cochées.
// Sans aucune ferme cochée, il reste disponible sur toutes les fermes.
export default function MobileFarmsField({ farms = [], value = [], onChange }) {
  const { t } = useI18n();

  const toggle = (name) => {
    const checked = value.includes(name);
    onChange(checked ? value.filter((item) => item !== name) : [...value, name]);
  };

  if (!farms.length) return null;

  return (
    <div className="space-y-2 rounded-xl border border-border/70 bg-secondary/20 p-3 sm:col-span-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {t('workerDialog.mobileFarms')}
      </p>
      <p className="text-[11px] leading-snug text-muted-foreground">{t('workerDialog.mobileFarmsHint')}</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {farms.map((farm) => (
          <label
            key={farm.name}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-sm transition-colors hover:bg-secondary/70"
          >
            <Checkbox checked={value.includes(farm.name)} onCheckedChange={() => toggle(farm.name)} />
            <span className="truncate">{farm.name}</span>
          </label>
        ))}
      </div>
      {!value.length && (
        <p className="text-[11px] font-medium text-clay">{t('workerDialog.mobileFarmsAll')}</p>
      )}
    </div>
  );
}