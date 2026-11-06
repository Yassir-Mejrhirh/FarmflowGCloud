import { fmtMoney, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function ItineraryCompareTable({ entries, onSelect }) {
  const { t } = useI18n();

  const headers = [
    t('itt.block'),
    t('itt.operations'),
    t('itt.days'),
    t('itt.hours'),
    t('itt.labour'),
    t('itt.machinery'),
    t('itt.inputs'),
    t('itt.totalCost'),
    t('itt.costPerHa'),
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="font-display text-lg tracking-tight">{t('itt.compareTitle')}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t('itt.compareHint')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-secondary/40 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              {headers.map((header, index) => (
                <th
                  key={header}
                  className={index === 0 ? 'px-4 py-2.5 text-start font-medium' : 'px-3 py-2.5 text-end font-medium'}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {entries.map((entry) => {
              const area = Number(entry.block.area_ha) || 0;
              const perHa = area > 0 ? entry.totals.cost / area : null;
              return (
                <tr
                  key={entry.block.id}
                  onClick={() => onSelect(entry.block.id)}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{entry.block.name}</p>
                    {entry.block.farm && <p className="text-[11px] text-muted-foreground">{entry.block.farm}</p>}
                  </td>
                  <td className="px-3 py-3 text-end tabular-nums">{entry.totals.operations}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{fmtNum(entry.totals.days, 1)}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{fmtNum(entry.totals.hours, 1)}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{fmtMoney(entry.totals.labour)}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{fmtMoney(entry.totals.machinery)}</td>
                  <td className="px-3 py-3 text-end tabular-nums">{fmtMoney(entry.totals.inputs)}</td>
                  <td className="px-3 py-3 text-end font-medium tabular-nums">{fmtMoney(entry.totals.cost)}</td>
                  <td className="px-3 py-3 text-end tabular-nums">
                    {perHa === null ? '—' : fmtMoney(perHa)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}