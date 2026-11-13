import { TableCell, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import ImportPicker from '@/components/workers/import/ImportPicker';
import FillCell from '@/components/workers/import/FillCell';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export const CELL =
  'h-7 w-full rounded-md border border-border/70 bg-background px-1.5 text-xs outline-none focus:border-primary/50';

export default function PreviewRow({ draft, found = [], onChange, onToggle, onStartFill, options }) {
  const { t } = useI18n();
  const { farms = [], teams = [], transporters = [], onCreateTeam, onCreateTransporter } = options;

  const value = (key) => draft.values[key] ?? '';
  const update = (key) => (event) => onChange(draft.id, key, event.target.value);

  const cell = (key, node, className = 'py-1.5 align-top') => (
    <TableCell className={className}>
      <FillCell fillKey={key} draftId={draft.id} value={value(key)} onStartFill={onStartFill}>
        {node}
      </FillCell>
    </TableCell>
  );

  const select = (key, choices) => {
    const current = value(key);
    const known = choices.some((choice) => choice.value === current);
    return (
      <select className={CELL} value={current} onChange={update(key)}>
        <option value="">{t('wimport.none')}</option>
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
        {current && !known && <option value={current}>{current}</option>}
      </select>
    );
  };

  return (
    <TableRow className={cn('group/fill hover:bg-transparent', !draft.include && 'opacity-40')}>
      <TableCell className="py-1.5 align-top">
        <Checkbox checked={draft.include} onCheckedChange={(checked) => onToggle(draft.id, Boolean(checked))} />
      </TableCell>

      <TableCell className="min-w-[160px] py-1.5 align-top">
        {cell(
          'name',
          <>
            <input
              className={cn(CELL, found.length > 0 && 'border-destructive/60')}
              value={value('name')}
              onChange={update('name')}
            />
            {found.length > 0 && draft.include && (
              <p className="mt-1 text-[10px] leading-snug text-destructive">
                {found.map((key) => t(key)).join(' ')}
              </p>
            )}
          </>,
          'py-1.5 align-top',
        )}
      </TableCell>

      {cell(
        'definition',
        select('definition', [
          { value: 'nominative', label: t('wr.def_nominative') },
          { value: 'salary_band', label: t('wr.def_salary_band') },
        ]),
      )}

      {cell(
        'priority',
        select('priority', ['1', '2', '3'].map((item) => ({ value: item, label: item }))),
        'w-[104px] py-1.5 align-top',
      )}

      {cell(
        'worker_function',
        <input
          className={CELL}
          list="wimport-functions"
          value={value('worker_function')}
          onChange={update('worker_function')}
        />,
      )}

      {cell(
        'team',
        <ImportPicker
          compact
          value={value('team')}
          options={teams}
          onChange={(next) => onChange(draft.id, 'team', next)}
          onCreate={onCreateTeam}
          noneLabel={t('wimport.none')}
          placeholder={t('wimport.addTeam')}
        />,
        'min-w-[132px] py-1.5 align-top',
      )}

      {cell('farm', select('farm', farms.map((farm) => ({ value: farm.name, label: farm.name }))))}

      {cell(
        'daily_rate',
        <input
          className={cn(CELL, 'tabular-nums')}
          inputMode="decimal"
          value={value('daily_rate')}
          onChange={update('daily_rate')}
        />,
        'w-[104px] py-1.5 align-top',
      )}

      {cell(
        'transporter_name',
        <ImportPicker
          compact
          value={value('transporter_name')}
          options={transporters}
          onChange={(next) => onChange(draft.id, 'transporter_name', next)}
          onCreate={onCreateTransporter}
          noneLabel={t('wimport.none')}
          placeholder={t('wimport.addTransporter')}
        />,
        'min-w-[144px] py-1.5 align-top',
      )}

      {cell(
        'transport_rate_type',
        select('transport_rate_type', [
          { value: 'fixed', label: t('workerDialog.transportFixed') },
          { value: 'per_person', label: t('workerDialog.transportPerPerson') },
        ]),
      )}

      {cell(
        'transport_rate',
        <input
          className={cn(CELL, 'tabular-nums')}
          inputMode="decimal"
          value={value('transport_rate')}
          onChange={update('transport_rate')}
        />,
        'w-[104px] py-1.5 align-top',
      )}
    </TableRow>
  );
}