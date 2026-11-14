import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AttendanceFileStep from '@/components/attendance/import/AttendanceFileStep';
import AttendancePreview from '@/components/attendance/import/AttendancePreview';
import { readXlsxSheet } from '@/lib/xlsxReader';
import { buildAnalysis, detectColors, detectGrid, findNameColumn, groupSheets } from '@/lib/attendanceImport';
import { fetchList } from '@/lib/data';
import { fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const round = (value) => Math.round(value * 100) / 100;

export default function AttendanceImportDialog({ open, onOpenChange, farms = [], workers = [], onImported }) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState(null);
  const [refDate, setRefDate] = useState(todayISO());
  const [colorMap, setColorMap] = useState({});
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFileName('');
    setSheet(null);
    setRefDate(todayISO());
    setColorMap({});
    setError('');
    setResult(null);
  }, [open]);

  const reference = useMemo(() => new Date(`${refDate}T00:00:00`), [refDate]);
  const grid = useMemo(() => (sheet ? detectGrid(sheet.rows, reference) : null), [sheet, reference]);
  const nameColumn = useMemo(
    () => (sheet && grid ? findNameColumn(sheet.rows, grid.headerIndex, grid.dayColumns, workers) : -1),
    [sheet, grid, workers],
  );
  const colors = useMemo(() => (sheet && grid ? detectColors(sheet.rows, sheet.fills, grid) : []), [sheet, grid]);

  // Une couleur déjà enregistrée sur une ferme est rattachée d'office.
  useEffect(() => {
    if (!colors.length) return;
    setColorMap((current) => {
      let changed = false;
      const next = { ...current };
      colors.forEach(({ color }) => {
        if (next[color] !== undefined) return;
        const farm = farms.find((item) => String(item.color || '').toUpperCase() === color);
        next[color] = farm?.id || '';
        changed = true;
      });
      return changed ? next : current;
    });
  }, [colors, farms]);

  const analysis = useMemo(
    () =>
      sheet && grid && nameColumn >= 0
        ? buildAnalysis({ rows: sheet.rows, fills: sheet.fills, grid, nameColumn, workers, farms, colorMap })
        : null,
    [sheet, grid, nameColumn, workers, farms, colorMap],
  );

  const readFile = async (file) => {
    setReading(true);
    setError('');
    try {
      const next = await readXlsxSheet(file);
      setFileName(file.name);
      setSheet(next);
      setColorMap({});
      if (!next.rows.length) setError(t('aimport.empty'));
    } catch {
      setFileName(file.name);
      setSheet(null);
      setError(t('aimport.badFile'));
    }
    setReading(false);
  };

  const resolveColor = (color, farmId) => setColorMap((current) => ({ ...current, [color]: farmId }));

  const save = async () => {
    if (!analysis?.entries.length) return;
    setSaving(true);
    setError('');
    try {
      // Le rattachement couleur → ferme reste enregistré pour les imports suivants.
      const colorUpdates = Object.entries(colorMap).filter(([color, farmId]) => {
        if (!farmId) return false;
        const farm = farms.find((item) => item.id === farmId);
        return String(farm?.color || '').toUpperCase() !== color;
      });
      await Promise.all(colorUpdates.map(([color, farmId]) => base44.entities.Farm.update(farmId, { color })));

      const groups = groupSheets(analysis.entries);
      const dates = [...new Set(analysis.entries.map((entry) => entry.date))];
      const farmIds = [...new Set(analysis.entries.map((entry) => entry.farm_id))];
      const existing = await fetchList(
        base44.entities.AttendanceSheet,
        { farm_id: { $in: farmIds }, date: { $in: dates } },
        { limit: 500 },
      );
      const byKey = new Map(existing.map((row) => [`${row.date}|${row.farm_id}`, row]));

      const creations = [];
      const updates = [];
      groups.forEach((group) => {
        const found = byKey.get(`${group.date}|${group.farm_id}`);
        const lines = new Map((found?.lines || []).map((line) => [line.worker_id, Number(line.days) || 0]));
        group.lines.forEach((days, workerId) => lines.set(workerId, days));
        const payload = [...lines.entries()]
          .filter(([, days]) => days > 0)
          .map(([worker_id, days]) => ({ worker_id, days: round(days) }));
        const body = {
          date: group.date,
          farm_id: group.farm_id,
          farm_name: group.farm_name,
          lines: payload,
          total_days: round(payload.reduce((sum, line) => sum + line.days, 0)),
        };
        if (found) updates.push({ id: found.id, ...body });
        else creations.push(body);
      });

      if (creations.length) await base44.entities.AttendanceSheet.bulkCreate(creations);
      if (updates.length) await base44.entities.AttendanceSheet.bulkUpdate(updates);

      setResult({
        created: creations.length,
        updated: updates.length,
        days: analysis.entries.reduce((sum, entry) => sum + entry.days, 0),
      });
      setStep(3);
      onImported?.();
    } catch {
      setError(t('aimport.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="px-6 pb-3 pt-6">
          <DialogTitle className="font-display text-xl font-normal tracking-tight">
            {step === 3 ? t('aimport.resultTitle') : t('aimport.title')}
          </DialogTitle>
          <DialogDescription className="text-sm">{t('aimport.description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-6 pb-4 text-[11px] uppercase tracking-[0.12em]">
          {[t('aimport.step1'), t('aimport.step2')].map((label, index) => (
            <span key={label} className="flex items-center gap-2">
              {index > 0 && <span className="h-px w-4 bg-border" />}
              <span className={cn(step === index + 1 ? 'text-primary' : 'text-muted-foreground/70')}>
                {index + 1}. {label}
              </span>
            </span>
          ))}
        </div>

        <div className="max-h-[62vh] overflow-y-auto px-6 pb-5">
          {step === 1 && (
            <>
              <AttendanceFileStep
                fileName={fileName}
                onFile={readFile}
                reading={reading}
                error={error || (sheet && !grid ? t('aimport.noGrid') : '') || (grid && analysis && !analysis.entries.length ? t('aimport.noEntries') : '')}
                grid={grid}
                nameColumn={nameColumn}
                colors={colors}
                colorMap={colorMap}
                onChangeColor={resolveColor}
                refDate={refDate}
                onChangeRefDate={setRefDate}
                farms={farms}
                workersCount={workers.length}
                entriesCount={analysis?.entries.length || 0}
                unknown={analysis?.unknown || []}
              />
            </>
          )}

          {step === 2 && analysis && <AttendancePreview analysis={analysis} />}

          {step === 3 && result && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-secondary/30 px-6 py-9 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-5 w-5" />
              </span>
              <p className="font-display text-lg">
                {t('aimport.resultCreated', { n: result.created })} · {t('aimport.resultUpdated', { n: result.updated })}
              </p>
              <p className="text-sm text-muted-foreground">{t('aimport.resultBody', { days: fmtNum(result.days, 1) })}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
          {step === 1 && (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={!analysis?.entries.length}
                onClick={() => setStep(2)}
              >
                {t('aimport.continue')}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              {error && (
                <p className="me-auto text-[11px] font-medium text-destructive">{error}</p>
              )}
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={saving}>
                <ArrowLeft className="me-1.5 h-4 w-4" /> {t('aimport.back')}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={save}
                disabled={saving || !analysis?.entries.length}
              >
                {saving && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
                {saving ? t('aimport.importing') : t('aimport.confirm')}
              </Button>
            </>
          )}

          {step === 3 && (
            <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {t('aimport.close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}