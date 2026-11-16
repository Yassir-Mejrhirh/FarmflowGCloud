import { Input } from '@/components/ui/input';
import SelectField from '@/components/SelectField';
import TransporterField from '@/components/reconcile/TransporterField';
import { useI18n } from '@/lib/I18nContext';

// Transport saisi à la main pour une équipe qui n'en a encore aucun : transporteur,
// mode (forfait ou par personne) et tarif journalier, appliqués à ses ouvriers.
export default function TeamTransportManualFields({ value, count, onChange, transporters, onRemember }) {
  const { t } = useI18n();

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border/70 bg-card px-2.5 py-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('wtr.transporter')}</p>
          <TransporterField
            value={value.transporter}
            options={transporters}
            onChange={(next) => onChange({ transporter: next })}
            onRemember={onRemember}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('wtr.mode')}</p>
          <SelectField
            value={value.mode}
            onChange={(next) => onChange({ mode: next || 'fixed' })}
            options={[
              { value: 'fixed', label: t('lab.modeFixed') },
              { value: 'per_person', label: t('lab.modePerPerson') },
            ]}
          />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{t('wtr.rate')}</p>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={value.rate}
            onChange={(event) => onChange({ rate: event.target.value })}
            placeholder="0"
            className="tabular-nums"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">{t('wtr.manualHint', { n: count })}</p>
    </div>
  );
}