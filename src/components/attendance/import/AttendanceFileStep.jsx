import { useRef } from 'react';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DayField from '@/components/labour/DayField';
import Field from '@/components/Field';
import ColorFarmMap from '@/components/attendance/import/ColorFarmMap';
import { useI18n } from '@/lib/I18nContext';

export default function AttendanceFileStep({
  fileName, onFile, reading, error, grid, nameColumn, colors, colorMap, onChangeColor,
  refDate, onChangeRefDate, farms, workersCount, entriesCount, unknown = [],
}) {
  const { t, lang } = useI18n();
  const inputRef = useRef(null);
  const locale = lang === 'ar' ? 'ar-MA' : 'fr-FR';

  const short = (value) =>
    new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' });
  const first = grid?.dayColumns?.[0]?.date;
  const last = grid?.dayColumns?.[grid.dayColumns.length - 1]?.date;

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-secondary/30 px-6 py-6 text-center">
        <FileSpreadsheet className="h-6 w-6 text-primary" />
        <p className="text-sm font-medium">{t('aimport.dropTitle')}</p>
        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">{t('aimport.dropHint')}</p>
        {fileName && <p className="mt-1 max-w-full truncate text-xs font-medium text-primary">{fileName}</p>}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 rounded-lg"
          onClick={() => inputRef.current?.click()}
          disabled={reading}
        >
          {reading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1.5 h-3.5 w-3.5" />}
          {reading ? t('aimport.reading') : t('aimport.choose')}
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
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-border/70 bg-card px-3 py-2 text-[11px] text-muted-foreground">
            <span>
              {t('aimport.period')} : <span className="font-medium text-foreground">{short(first)} → {short(last)}</span>
            </span>
            <span>
              {t('aimport.nameColumn')} : <span className="font-medium text-foreground">#{nameColumn + 1}</span>
            </span>
            <span>{t('aimport.workersCount', { n: workersCount })}</span>
            <span className="tabular-nums">{entriesCount} {t('aimport.cells')}</span>
          </div>
          <div className="sm:w-48">
            <Field label={t('aimport.refDate')} hint={t('aimport.refHint')}>
              <DayField value={refDate} onChange={onChangeRefDate} />
            </Field>
          </div>
        </div>
      )}

      {colors.length > 0 && (
        <ColorFarmMap colors={colors} colorMap={colorMap} farms={farms} onChange={onChangeColor} />
      )}

      {unknown.length > 0 && (
        <div className="rounded-xl border border-clay/40 bg-clay/5 px-3 py-2">
          <p className="text-[11px] font-medium text-clay">{t('aimport.unknown')}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {unknown.map((item) => `${item.name} (${item.count})`).join(' · ')}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{t('aimport.unknownHint')}</p>
        </div>
      )}
    </div>
  );
}