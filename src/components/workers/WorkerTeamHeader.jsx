import { ChevronDown, ChevronRight } from 'lucide-react';
import { TableCell, TableRow } from '@/components/ui/table';

export default function WorkerTeamHeader({ team, open, onToggle }) {
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <TableRow
      onClick={onToggle}
      aria-expanded={open}
      className="cursor-pointer bg-secondary/50 hover:bg-secondary"
    >
      <TableCell colSpan={7} className="py-2">
        <span className="inline-flex items-center gap-2">
          <Chevron className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wide">{team.key}</span>
          {team.farm && (
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{team.farm}</span>
          )}
          <span className="rounded-full bg-background px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {team.rows.length}
          </span>
        </span>
      </TableCell>
    </TableRow>
  );
}