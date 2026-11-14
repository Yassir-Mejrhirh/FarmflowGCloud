import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import ImportPicker from '@/components/workers/import/ImportPicker';
import MobileFarmsField from '@/components/workers/MobileFarmsField';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export default function ImportBulkPanel({
  values, onChange, farms, functions, teams, transporters, onCreateTeam, onCreateTransporter,
}) {
  const { t } = useI18n();
  const set = (key) => (value) => onChange({ ...values, [key]: value });

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-secondary/30 p-4">
      <div className="space-y-0.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t('wimport.bulkTitle')}
        </p>
        <p className="text-[11px] leading-snug text-muted-foreground">{t('wimport.bulkHint')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t('wimport.field.definition')}>
          <SelectField
            value={values.definition}
            onChange={set('definition')}
            noneLabel={t('wimport.none')}
            options={[
              { value: 'nominative', label: t('wr.def_nominative') },
              { value: 'salary_band', label: t('wr.def_salary_band') },
            ]}
          />
        </Field>
        <Field label={t('wimport.field.priority')}>
          <SelectField
            value={values.priority}
            onChange={set('priority')}
            noneLabel={t('wimport.none')}
            options={['1', '2', '3'].map((value) => ({ value, label: t(`wr.priority_${value}`) }))}
          />
        </Field>
        <Field label={t('wimport.field.function')}>
          <SelectField
            value={values.worker_function}
            onChange={set('worker_function')}
            noneLabel={t('wimport.none')}
            options={functions.map((item) => ({ value: item.name, label: item.name }))}
          />
        </Field>
        <Field label={t('wimport.field.team')}>
          <ImportPicker
            value={values.team}
            onChange={set('team')}
            onCreate={onCreateTeam}
            options={teams}
            noneLabel={t('wimport.none')}
            placeholder={t('wimport.addTeam')}
          />
        </Field>
        <Field label={t('wimport.field.farm')}>
          <SelectField
            value={values.farm}
            onChange={set('farm')}
            noneLabel={t('wimport.mobile')}
            options={farms.map((farm) => ({ value: farm.name, label: farm.name }))}
          />
        </Field>
        {!values.farm && (
          <MobileFarmsField
            farms={farms}
            value={values.farms || []}
            onChange={set('farms')}
          />
        )}
        <Field label={t('wimport.field.transporter')}>
          <ImportPicker
            value={values.transporter_name}
            onChange={set('transporter_name')}
            onCreate={onCreateTransporter}
            options={transporters}
            noneLabel={t('wimport.none')}
            placeholder={t('wimport.addTransporter')}
          />
        </Field>
        <Field label={t('wimport.field.mode')}>
          <SelectField
            value={values.transport_rate_type}
            onChange={set('transport_rate_type')}
            noneLabel={t('wimport.none')}
            options={[
              { value: 'fixed', label: t('workerDialog.transportFixed') },
              { value: 'per_person', label: t('workerDialog.transportPerPerson') },
            ]}
          />
        </Field>
        <Field label={t('wimport.field.transportAmount')}>
          <Input
            inputMode="decimal"
            value={values.transport_rate}
            onChange={(event) => set('transport_rate')(event.target.value)}
          />
        </Field>
      </div>
    </div>
  );
}