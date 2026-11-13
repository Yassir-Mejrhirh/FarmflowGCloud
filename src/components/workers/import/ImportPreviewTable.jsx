import { useCallback } from 'react';
import { MoveVertical } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import PreviewRow from '@/components/workers/import/PreviewRow';
import useDragFill from '@/hooks/useDragFill';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { label: 'wimport.field.name', field: 'name' },
  { label: 'wimport.field.definition', field: 'definition' },
  { label: 'wimport.field.priority', field: 'priority' },
  { label: 'wimport.field.function', field: 'worker_function' },
  { label: 'wimport.field.team', field: 'team' },
  { label: 'wimport.field.farm', field: 'farm' },
  { label: 'wimport.field.rate', field: 'daily_rate' },
  { label: 'wimport.field.transporter', field: 'transporter_name' },
  { label: 'wimport.field.mode', field: 'transport_rate_type' },
  { label: 'wimport.field.transportAmount', field: 'transport_rate' },
];

export default function ImportPreviewTable({
  drafts, problems, onChange, onToggle, onToggleAll, farms, functions, teams, transporters,
  onCreateTeam, onCreateTransporter,
}) {
  const { t } = useI18n();
  const allChecked = drafts.length > 0 && drafts.every((draft) => draft.include);
  const applyFill = useCallback((draftId, key, value) => onChange(draftId, key, value), [onChange]);
  const { filling, startFill } = useDragFill(applyFill);
  const options = { farms, teams, transporters, onCreateTeam, onCreateTransporter };

  return (
    <>
      <p className="flex items-center gap-1.5 text-[11px] leading-snug text-muted-foreground">
        <MoveVertical className="h-3.5 w-3.5 shrink-0 text-primary/70" />
        {t('wimport.fillHint')}
      </p>

      <div
        className={cn(
          'overflow-x-auto rounded-2xl border',
          filling ? 'border-primary/50' : 'border-border/70',
        )}
      >
        <Table className="min-w-[1120px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-9 py-2">
                <Checkbox checked={allChecked} onCheckedChange={(checked) => onToggleAll(Boolean(checked))} />
              </TableHead>
              {COLUMNS.map((column) => (
                <TableHead
                  key={column.field}
                  className={cn(
                    'whitespace-nowrap py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground',
                    filling?.key === column.field && 'text-primary',
                  )}
                >
                  {t(column.label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {drafts.map((draft) => (
              <PreviewRow
                key={draft.id}
                draft={draft}
                found={problems.get(draft.id) || []}
                onChange={onChange}
                onToggle={onToggle}
                onStartFill={startFill}
                options={options}
              />
            ))}
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