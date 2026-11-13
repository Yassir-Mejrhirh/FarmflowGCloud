import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import ImportPicker from '@/components/workers/import/ImportPicker';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const CELL =
  'h-7 w-full rounded-md border border-border/70 bg-background px-1.5 text-xs outline-none focus:border-primary/50';

const COLUMNS = [
  'wimport.field.name',
  'wimport.field.definition',
  'wimport.field.priority',
  'wimport.field.function',
  'wimport.field.team',
  'wimport.field.farm',
  'wimport.field.rate',
  'wimport.field.transporter',
  'wimport.field.mode',
  'wimport.field.transportAmount',
];

export default function ImportPreviewTable({
  drafts, problems, onChange, onToggle, onToggleAll, farms, functions, teams, transporters,
  onCreateTeam, onCreateTransporter,
}) {
  const { t } = useI18n();
  const allChecked = drafts.length > 0 && drafts.every((draft) => draft.include);
  const value = (draft, key) => draft.values[key] ?? '';
  const update = (draft, key) => (event) => onChange(draft.id, key, event.target.value);

  const choice = (draft, key, options) => {
    const current = value(draft, key);
    const known = options.some((option) => option.value === current);
    return (
      <select className={CELL} value={current} onChange={update(draft, key)}>
        <option value="">{t('wimport.none')}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
        {current && !known && <option value={current}>{current}</option>}
      </select>
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-border/70">
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-9 py-2">
                <Checkbox checked={allChecked} onCheckedChange={(checked) => onToggleAll(Boolean(checked))} />
              </TableHead>
              {COLUMNS.map((key) => (
                <TableHead
                  key={key}
                  className="whitespace-nowrap py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {t(key)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => {
              const found = problems.get(draft.id) || [];
              return (
                <TableRow key={draft.id} className={cn('hover:bg-transparent', !draft.include && 'opacity-40')}>
                  <TableCell className="py-1.5 align-top">
                    <Checkbox
                      checked={draft.include}
                      onCheckedChange={(checked) => onToggle(draft.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell className="min-w-[160px] py-1.5 align-top">
                    <input
                      className={cn(CELL, found.length > 0 && 'border-destructive/60')}
                      value={value(draft, 'name')}
                      onChange={update(draft, 'name')}
                    />
                    {found.length > 0 && draft.include && (
                      <p className="mt-1 text-[10px] leading-snug text-destructive">
                        {found.map((key) => t(key)).join(' ')}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 align-top">
                    {choice(draft, 'definition', [
                      { value: 'nominative', label: t('wr.def_nominative') },
                      { value: 'salary_band', label: t('wr.def_salary_band') },
                    ])}
                  </TableCell>
                  <TableCell className="w-[104px] py-1.5 align-top">
                    {choice(draft, 'priority', ['1', '2', '3'].map((item) => ({ value: item, label: item })))}
                  </TableCell>
                  <TableCell className="py-1.5 align-top">
                    <input
                      className={CELL}
                      list="wimport-functions"
                      value={value(draft, 'worker_function')}
                      onChange={update(draft, 'worker_function')}
                    />
                  </TableCell>
                  <TableCell className="min-w-[132px] py-1.5 align-top">
                    <ImportPicker
                      compact
                      value={value(draft, 'team')}
                      options={teams}
                      onChange={(next) => onChange(draft.id, 'team', next)}
                      onCreate={onCreateTeam}
                      noneLabel={t('wimport.none')}
                      placeholder={t('wimport.addTeam')}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 align-top">
                    {choice(draft, 'farm', farms.map((farm) => ({ value: farm.name, label: farm.name })))}
                  </TableCell>
                  <TableCell className="w-[104px] py-1.5 align-top">
                    <input
                      className={cn(CELL, 'tabular-nums')}
                      inputMode="decimal"
                      value={value(draft, 'daily_rate')}
                      onChange={update(draft, 'daily_rate')}
                    />
                  </TableCell>
                  <TableCell className="min-w-[144px] py-1.5 align-top">
                    <ImportPicker
                      compact
                      value={value(draft, 'transporter_name')}
                      options={transporters}
                      onChange={(next) => onChange(draft.id, 'transporter_name', next)}
                      onCreate={onCreateTransporter}
                      noneLabel={t('wimport.none')}
                      placeholder={t('wimport.addTransporter')}
                    />
                  </TableCell>
                  <TableCell className="py-1.5 align-top">
                    {choice(draft, 'transport_rate_type', [
                      { value: 'fixed', label: t('workerDialog.transportFixed') },
                      { value: 'per_person', label: t('workerDialog.transportPerPerson') },
                    ])}
                  </TableCell>
                  <TableCell className="w-[104px] py-1.5 align-top">
                    <input
                      className={cn(CELL, 'tabular-nums')}
                      inputMode="decimal"
                      value={value(draft, 'transport_rate')}
                      onChange={update(draft, 'transport_rate')}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <datalist id="wimport-functions">
        {functions.map((item) => (
          <option key={item.id || item.name} value={item.name} />
        ))}
      </datalist>
    </>
  );
}