import { Plus, Trash2 } from 'lucide-react';
import SelectField from '@/components/SelectField';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';

export default function UsageEditor({
  icon: Icon, title, lines, onChange, options, idKey, qtyKey, qtyLabel, addLabel, emptyLabel,
}) {
  const { t } = useI18n();
  const update = (index, patch) => onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index) => onChange(lines.filter((_, i) => i !== index));
  const add = () => onChange([...lines, { [idKey]: '', [qtyKey]: '' }]);

  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />} {title}
        </span>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>

      {lines.length === 0 ? (
        <p className="py-1 text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {lines.map((line, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SelectField
                  value={line[idKey]}
                  onChange={(value) => update(index, { [idKey]: value })}
                  options={options}
                />
              </div>
              <Input
                type="number"
                className="w-20 shrink-0"
                value={line[qtyKey]}
                onChange={(e) => update(index, { [qtyKey]: e.target.value })}
                placeholder={qtyLabel}
                aria-label={qtyLabel}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={t('report.removeLine')}
                className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}