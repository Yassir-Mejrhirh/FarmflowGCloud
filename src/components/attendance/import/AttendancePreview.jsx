import { useMemo } from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

const Tile = ({ label, value }) => (
  <div className="rounded-xl border border-border/70 bg-card px-3 py-2">
    <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    <p className="mt-0.5 font-display text-xl leading-none tabular-nums">{value}</p>
  </div>
);

const Warning = ({ title, hint, items }) => (
  <div className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2">
    <p className="flex items-center gap-1.5 text-[11px] font-medium text-clay">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {title}
    </p>
    {items && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{items}</p>}
    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
  </div>
);

// Aperçu du pointage lu : une grille par ferme, avec les jours en colonnes.
export default function AttendancePreview({ analysis }) {
  const { t, lang } = useI18n();
  const { entries, unknown, unmapped, missingColor } = analysis;

  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';
  const short = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });

  const dates = useMemo(() => [...new Set(entries.map((entry) => entry.date))].sort(), [entries]);

  const sections = useMemo(() => {
    const map = new Map();
    entries.forEach((entry) => {
      if (!map.has(entry.farm_id)) {
        map.set(entry.farm_id, { id: entry.farm_id, name: entry.farm_name, color: entry.color, workers: new Map() });
      }
      const farm = map.get(entry.farm_id);
      if (!farm.workers.has(entry.worker_id)) {
        farm.workers.set(entry.worker_id, { id: entry.worker_id, name: entry.worker_name, days: new Map(), total: 0 });
      }
      const line = farm.workers.get(entry.worker_id);
      line.days.set(entry.date, (line.days.get(entry.date) || 0) + entry.days);
      line.total += entry.days;
    });
    return [...map.values()]
      .map((farm) => ({
        ...farm,
        rows: [...farm.workers.values()].sort((a, b) => a.name.localeCompare(b.name)),
        total: [...farm.workers.values()].reduce((sum, line) => sum + line.total, 0),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const totalDays = entries.reduce((sum, entry) => sum + entry.days, 0);
  const workerCount = new Set(entries.map((entry) => entry.worker_id)).size;
  const sheetCount = new Set(entries.map((entry) => `${entry.date}|${entry.farm_id}`)).size;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Tile label={t('aimport.summaryWorkers')} value={workerCount} />
        <Tile label={t('aimport.summaryCells')} value={entries.length} />
        <Tile label={t('aimport.summaryDays')} value={fmtNum(totalDays, 1)} />
        <Tile label={t('aimport.summarySheets')} value={sheetCount} />
      </div>

      {(unknown.length > 0 || unmapped.length > 0 || missingColor.count > 0) && (
        <div className="space-y-1.5">
          {unknown.length > 0 && (
            <Warning
              title={t('aimport.unknown')}
              items={unknown.map((item) => `${item.name} (${item.count})`).join(' · ')}
              hint={t('aimport.unknownHint')}
            />
          )}
          {unmapped.length > 0 && (
            <Warning
              title={t('aimport.unmapped')}
              items={unmapped.map((color) => color).join(' · ')}
              hint={t('aimport.unmappedHint')}
            />
          )}
          {missingColor.count > 0 && (
            <Warning
              title={`${t('aimport.noColor')} · ${missingColor.count}`}
              items={missingColor.samples.join(' · ')}
              hint={t('aimport.noColorHint')}
            />
          )}
        </div>
      )}

      {entries.length === 0 && (
        <p className="rounded-xl border border-border/70 bg-card px-3 py-4 text-center text-sm text-muted-foreground">
          {t('aimport.noEntries')}
        </p>
      )}

      {sections.map((farm) => (
        <section key={farm.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
          <header className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
            <span className="h-3 w-3 rounded-[3px] border border-black/10" style={{ backgroundColor: farm.color }} />
            <p className="font-display text-sm">{farm.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('aimport.farmSummary', { n: farm.rows.length, days: fmtNum(farm.total, 1) })}
            </p>
            <Users className="ms-auto h-3.5 w-3.5 text-muted-foreground/60" />
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-[11px]">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="sticky start-0 z-10 bg-card px-3 py-1.5 text-start font-medium">
                    {t('aimport.colWorker')}
                  </th>
                  {dates.map((date) => (
                    <th key={date} className="px-1.5 py-1.5 text-center font-medium tabular-nums">
                      {short(date)}
                    </th>
                  ))}
                  <th className="px-2 py-1.5 text-center font-medium">{t('aimport.colTotal')}</th>
                </tr>
              </thead>
              <tbody>
                {farm.rows.map((line) => (
                  <tr key={line.id} className="border-b border-border/40 last:border-0">
                    <td className="sticky start-0 z-10 whitespace-nowrap bg-card px-3 py-1">{line.name}</td>
                    {dates.map((date) => (
                      <td key={date} className="px-1.5 py-1 text-center tabular-nums">
                        {line.days.has(date) ? fmtNum(line.days.get(date), 1) : <span className="text-muted-foreground/40">·</span>}
                      </td>
                    ))}
                    <td className="px-2 py-1 text-center font-medium tabular-nums">{fmtNum(line.total, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}