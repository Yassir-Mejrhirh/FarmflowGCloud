import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SelectField from '@/components/SelectField';
import { useI18n } from '@/lib/I18nContext';

// Dropdown filters of the labour list: every value selected narrows the list further.
export default function WorkerFilters({ filters, onChange, onReset, options, shown, total }) {
  const { t } = useI18n();
  const set = (key) => (value) =>
    onChange({
      ...filters,
      [key]: value,
      // The farm only refines the fixed workers, so it drops when fixed is left.
      ...(key === 'mobility' && value !== 'fixed' ? { farm: '' } : {}),
    });

  const toOptions = (values) => values.map((value) => ({ value, label: value }));

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {t('wfilters.title')}
        </p>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t('wfilters.count', { shown, total })}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField
          value={filters.team}
          onChange={set('team')}
          noneLabel={t('wfilters.allTeams')}
          placeholder={t('wfilters.team')}
          options={toOptions(options.teams)}
        />
        <SelectField
          value={filters.transporter}
          onChange={set('transporter')}
          noneLabel={t('wfilters.allTransporters')}
          placeholder={t('wfilters.transporter')}
          options={toOptions(options.transporters)}
        />
        <SelectField
          value={filters.mobility}
          onChange={set('mobility')}
          noneLabel={t('wfilters.allMobility')}
          placeholder={t('wfilters.mobility')}
          options={[
            { value: 'mobile', label: t('wfilters.mobile') },
            { value: 'fixed', label: t('wfilters.fixed') },
          ]}
        />
        {filters.mobility === 'fixed' && (
          <SelectField
            value={filters.farm}
            onChange={set('farm')}
            noneLabel={t('wfilters.allFarms')}
            placeholder={t('wfilters.farm')}
            options={toOptions(options.farms)}
          />
        )}
        <SelectField
          value={filters.fn}
          onChange={set('fn')}
          noneLabel={t('wfilters.allFunctions')}
          placeholder={t('wfilters.fn')}
          options={toOptions(options.functions)}
        />
        <SelectField
          value={filters.priority}
          onChange={set('priority')}
          noneLabel={t('wfilters.allPriorities')}
          placeholder={t('wfilters.priority')}
          options={['1', '2', '3'].map((value) => ({
            value,
            label: t('wfilters.priorityValue', { value }),
          }))}
        />
        <SelectField
          value={filters.declared}
          onChange={set('declared')}
          noneLabel={t('wfilters.allDeclared')}
          placeholder={t('wfilters.declared')}
          options={[
            { value: 'declared', label: t('wfilters.declaredOn') },
            { value: 'undeclared', label: t('wfilters.declaredOff') },
          ]}
        />
        <Button type="button" variant="ghost" className="rounded-xl" onClick={onReset}>
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> {t('wfilters.reset')}
        </Button>
      </div>
    </div>
  );
}