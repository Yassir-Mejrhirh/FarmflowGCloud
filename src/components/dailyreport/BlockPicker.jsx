import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/I18nContext';

export default function BlockPicker({ groups, selected, onChange }) {
  const { t } = useI18n();

  const toggleBlock = (id) => {
    onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  };

  const toggleGroup = (ids) => {
    const allSelected = ids.every((id) => selected.includes(id));
    onChange(
      allSelected
        ? selected.filter((id) => !ids.includes(id))
        : [...new Set([...selected, ...ids])],
    );
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 p-3">
        <p className="text-[11px] text-muted-foreground">{t('report.noBlocks')}</p>
      </div>
    );
  }

  return (
    <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-border/60 p-2">
      {groups.map((group) => {
        const ids = group.blocks.map((block) => block.id);
        const count = ids.filter((id) => selected.includes(id)).length;
        return (
          <div key={group.key} className="rounded-lg bg-muted/50 p-2">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={count === 0 ? false : count === ids.length ? true : 'indeterminate'}
                onCheckedChange={() => toggleGroup(ids)}
              />
              <span className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {group.label}
              </span>
              <span className="ms-auto text-[10px] text-muted-foreground">
                {count}/{ids.length}
              </span>
            </label>
            <div className="mt-1.5 grid gap-1 sm:grid-cols-2">
              {group.blocks.map((block) => (
                <label
                  key={block.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-background"
                >
                  <Checkbox
                    checked={selected.includes(block.id)}
                    onCheckedChange={() => toggleBlock(block.id)}
                  />
                  <span className="truncate">{block.name}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}