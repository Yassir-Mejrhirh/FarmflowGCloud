import { TableCell, TableRow } from '@/components/ui/table';

export default function WorkerFarmHeader({ farm, count }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={7} className="bg-muted/40 py-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {farm || '—'}
        </span>
        <span className="ml-2 text-[10px] tabular-nums text-muted-foreground/70">{count}</span>
      </TableCell>
    </TableRow>
  );
}