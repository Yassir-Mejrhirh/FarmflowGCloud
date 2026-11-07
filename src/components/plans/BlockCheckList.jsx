import { Checkbox } from '@/components/ui/checkbox';
import { fmtNum } from '@/lib/format';

export default function BlockCheckList({ parcels, selectedIds, onToggle, onSelectAll, onClear, labels }) {
  if (!parcels.length) return null;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-lg border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {labels.selectAll}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-border/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          {labels.clear}
        </button>
        <span className="ms-auto text-[11px] tabular-nums text-muted-foreground">
          {selectedIds.length} / {parcels.length}
        </span>
      </div>

      <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-background/50 p-2">
        {parcels.map((parcel) => (
          <label
            key={parcel.id}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-accent"
          >
            <Checkbox checked={selectedIds.includes(parcel.id)} onCheckedChange={() => onToggle(parcel.id)} />
            <span className="truncate">{parcel.name}</span>
            {parcel.farm && <span className="truncate text-[11px] text-muted-foreground">{parcel.farm}</span>}
            <span className="ms-auto shrink-0 text-xs tabular-nums text-muted-foreground">
              {fmtNum(parcel.area, 2)} ha
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}