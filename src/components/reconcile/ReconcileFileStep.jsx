import { useRef } from 'react';
import { AlertTriangle, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QuinzainePicker from '@/components/reconcile/QuinzainePicker';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

// Premier temps du rapprochement : la quinzaine, puis le classeur de pointage et sa grille de jours.
export default function ReconcileFileStep({
  fileName, onFile, reading, error, grid, dates, namesCount, quinzaine, onChangeQuinzaine, colors = [], farms = [],
  team = '', teams = [], hasSalary = false, noTeam = 0,
}) {
  const { t, lang } = useI18n();
  const inputRef = useRef(null);
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';
  const teamLabel = teams.length ? teams.join(', ') : team;

  const short = (value) =>
    value ? new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) : '—';
  const first = grid?.dayColumns?.[0]?.date;
  const last = grid?.dayColumns?.[grid.dayColumns.length - 1]?.date;

  const farmColors = new Set(farms.map((farm) => String(farm.color || '').toUpperCase()).filter(Boolean));
  const unmapped = colors.filter((item) => !farmColors.has(String(item.color || '').toUpperCase()));
  const outside = dates?.outside || [];
  const outsideLabel = `${outside.slice(0, 5).map(short).join(', ')}${
    outside.length > 5 ? ` +${outside.length - 5}` : ''
  }`;

  return (
    <div className="space-y-4">
      <QuinzainePicker value={quinzaine} onChange={onChangeQuinzaine} />

      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 px-5 py-7 text-center">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <p className="text-sm font-medium">{t('rec.dropTitle')}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{t('rec.dropHint')}</p>
        {fileName && <p className="mt-1 max-w-full truncate text-xs font-medium text-primary">{fileName}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 rounded-xl"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          {reading ? <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="me-1.5 h-3.5 w-3.5" />}
          {reading ? t('rec.reading') : t('rec.choose')}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {grid && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-border/70 bg-card px-3 py-2.5 text-[11px] text-muted-foreground">
          <span>
            {t('rec.periodRead')} :{' '}
            <span className="font-medium text-foreground">
              {short(first)} → {short(last)}
            </span>
          </span>
          <span>
            {t('rec.dayColumns')} :{' '}
            <span className="font-medium tabular-nums text-foreground">{grid.dayColumns.length}</span>
          </span>
          <span>
            {t('rec.namesRead')} :{' '}
            <span className="font-medium tabular-nums text-foreground">{fmtNum(namesCount, 0)}</span>
          </span>
          {teamLabel && (
            <span>
              {t('rec.teamRead')} : <span className="font-medium text-foreground">{teamLabel}</span>
            </span>
          )}
          {hasSalary && (
            <span>
              {t('rec.salaryRead')} : <span className="font-medium text-foreground">{t('rec.salaryFound')}</span>
            </span>
          )}
          {noTeam > 0 && (
            <span className="inline-flex items-center rounded-full bg-clay/10 px-2 py-0.5 text-clay">
              {t('rec.noTeamRead')} :{' '}
              <span className="ms-1 font-medium tabular-nums">{fmtNum(noTeam, 0)}</span>
            </span>
          )}
        </div>
      )}

      {dates && dates.dates.length > 0 && (
        <div className="rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t('rec.datesTitle')}
          </p>
          <p className="mt-1.5 flex flex-wrap gap-1">
            {dates.retained.map((date) => (
              <span
                key={date}
                className="rounded-md bg-secondary px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums text-secondary-foreground"
              >
                {short(date)}
              </span>
            ))}
            {!dates.retained.length && (
              <span className="text-[11px] text-muted-foreground">{t('rec.datesNoneRetained')}</span>
            )}
          </p>
          {grid?.dateMode === 'numbers' && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">{t('rec.datesRebuilt')}</p>
          )}
          {dates.duplicates.length > 0 && (
            <p className="mt-1.5 text-[11px] font-medium text-destructive">{t('rec.datesDuplicate')}</p>
          )}
          {outside.length > 0 && (
            <p className="mt-1.5 text-[11px] text-clay">{t('rec.datesOutside', { dates: outsideLabel })}</p>
          )}
          {dates.missing.length > 0 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {t('rec.datesMissing', { n: dates.missing.length })}
            </p>
          )}
        </div>
      )}

      {unmapped.length > 0 && (
        <div className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-clay">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.9} />
            {t('rec.unmappedTitle')}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5">
            {unmapped.map((item) => (
              <span key={item.color} className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10.5px]">
                <span className="h-2.5 w-2.5 rounded-sm border border-border" style={{ background: item.color }} />
                {item.count}
              </span>
            ))}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{t('rec.unmappedHint')}</p>
        </div>
      )}
    </div>
  );
}