import { useI18n } from '@/lib/I18nContext';

export default function RowPreview({ fields, rows, mapping, limit = 8 }) {
  const { t } = useI18n();
  const visible = fields.filter(
    (field) => mapping[field.name] !== '' && mapping[field.name] !== undefined,
  );

  if (!visible.length) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-xs">
          <thead className="bg-secondary/50 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <tr>
              {visible.map((field) => (
                <th key={field.name} className="whitespace-nowrap px-3 py-2 font-medium">
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.slice(0, limit).map((row, index) => (
              <tr key={index}>
                {visible.map((field) => (
                  <td key={field.name} className="max-w-[220px] truncate px-3 py-2">
                    {String(row.values[mapping[field.name]] ?? '') || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-border/60 bg-card px-3 py-2 text-[11px] text-muted-foreground">
        {t('imp.previewNote')}
      </p>
    </div>
  );
}