import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import ReconcileFileStep from '@/components/reconcile/ReconcileFileStep';
import ReconcileNameStep from '@/components/reconcile/ReconcileNameStep';
import ReconcileReviewStep from '@/components/reconcile/ReconcileReviewStep';
import ReconcileQueue from '@/components/reconcile/ReconcileQueue';
import { readXlsxSheet } from '@/lib/xlsxReader';
import {
  analyseSheet,
  buildLines,
  buildQueuePayload,
  compareWithPointages,
  daysWithoutFarm,
  fetchPeriodSheets,
  integrateQueueItem,
} from '@/lib/attendanceReconcile';
import { proposeMatches, usageCount } from '@/lib/nameMatch';
import { fetchList } from '@/lib/data';
import { fmtMoney, fmtNum, todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// Rapprochement des pointages : un classeur Excel est lu, ses noms sont rapprochés
// de la liste de main-d'œuvre, puis le pointage validé part dans la liste d'attente
// du module Pointage — aucune feuille n'est écrite avant l'intégration.
export default function AttendanceReconciliation() {
  const { t } = useI18n();
  const [farms, setFarms] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState(null);
  const [refDate, setRefDate] = useState(todayISO());
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [error, setError] = useState('');

  const [resolution, setResolution] = useState({});
  const [rates, setRates] = useState({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [existing, setExisting] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);

  const loadQueue = async () => {
    setQueueLoading(true);
    try {
      const rows = await fetchList(base44.entities.AttendanceReconciliation, {}, { sort: '-created_date', limit: 40 });
      setQueue(rows);
    } finally {
      setQueueLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [farmRows, workerRows, rateRows] = await Promise.all([
        fetchList(base44.entities.Farm, {}, { sort: 'name' }),
        fetchList(base44.entities.Worker, {}, { sort: 'name' }),
        fetchList(base44.entities.WageRate, {}),
      ]);
      if (!active) return;
      setFarms(farmRows);
      setWorkers(workerRows.filter((worker) => worker.active !== false));
      setWageRates(rateRows);
    };
    load();
    loadQueue();
    return () => {
      active = false;
    };
  }, []);

  const reference = useMemo(() => new Date(`${refDate}T00:00:00`), [refDate]);

  // Le classeur lu est réanalysé quand la date de référence change : les en-têtes
  // écrits sans mois ni année en dépendent.
  const analysis = useMemo(
    () => (sheet ? analyseSheet({ sheet, reference, farms, workers }) : null),
    [sheet, reference, farms, workers],
  );
  const names = analysis?.names || [];
  const fileError =
    readError ||
    (sheet && !analysis ? t('rec.noGrid') : '') ||
    (analysis && !analysis.names.length ? t('rec.noNames') : '');

  const proposals = useMemo(() => proposeMatches(names.map((entry) => entry.name), workers), [names, workers]);

  // Fichier lu : les propositions sures sont pré-cochées, les autres restent à confirmer.
  useEffect(() => {
    if (!analysis) return;
    const next = {};
    analysis.names.forEach((entry) => {
      const best = proposals.get(entry.name)?.best;
      next[entry.name] = best && (best.level === 'exact' || best.level === 'likely') ? best.worker_id : '';
    });
    setResolution(next);
    setRates({});
    setFrom(analysis.grid.dayColumns[0]?.date || '');
    setTo(analysis.grid.dayColumns[analysis.grid.dayColumns.length - 1]?.date || '');
  }, [analysis, proposals]);

  const lines = useMemo(
    () => (analysis ? buildLines({ names: analysis.names, resolution, workers, wageRates, periodStart: from }) : []),
    [analysis, resolution, workers, wageRates, from],
  );

  const ratedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        daily_rate: rates[line.worker_id] !== undefined ? Number(rates[line.worker_id]) || 0 : line.daily_rate,
      })),
    [lines, rates],
  );

  const usage = useMemo(() => usageCount(resolution), [resolution]);
  const noFarm = useMemo(() => daysWithoutFarm({ names, resolution }), [names, resolution]);

  // Pointages déjà enregistrés sur la période, pour montrer les écarts avant validation.
  // La clé ne dépend que des jours et des fermes : changer un taux ne relance pas la lecture.
  const fetchKey = useMemo(() => {
    if (step !== 3 || !ratedLines.length) return '';
    const dates = [...new Set(ratedLines.flatMap((line) => Object.keys(line.days || {})))].sort();
    const farmIds = [...new Set(ratedLines.map((line) => line.farm_id))].sort();
    return `${dates.join(',')}|${farmIds.join(',')}`;
  }, [step, ratedLines]);

  useEffect(() => {
    if (!fetchKey) return undefined;
    const [datePart, farmPart] = fetchKey.split('|');
    const dates = datePart ? datePart.split(',') : [];
    const farmIds = farmPart ? farmPart.split(',') : [];
    let active = true;
    setLoadingExisting(true);
    fetchPeriodSheets({ dates, farmIds })
      .then((rows) => {
        if (active) setExisting(rows);
      })
      .catch(() => {
        if (active) setExisting([]);
      })
      .finally(() => {
        if (active) setLoadingExisting(false);
      });
    return () => {
      active = false;
    };
  }, [fetchKey]);

  const comparison = useMemo(
    () => compareWithPointages({ lines: ratedLines, sheets: existing }),
    [ratedLines, existing],
  );

  const readFile = async (file) => {
    setReading(true);
    setError('');
    setReadError('');
    try {
      const next = await readXlsxSheet(file);
      setFileName(file.name);
      if (!next.rows.length) {
        setSheet(null);
        setReadError(t('rec.empty'));
      } else {
        setSheet(next);
      }
    } catch {
      setFileName(file.name);
      setSheet(null);
      setReadError(t('rec.badFile'));
    }
    setReading(false);
  };

  const setMatch = (name, workerId) => setResolution((current) => ({ ...current, [name]: workerId }));

  const autoConfirm = () => {
    const next = { ...resolution };
    names.forEach((entry) => {
      const best = proposals.get(entry.name)?.best;
      if (best && (best.level === 'exact' || best.level === 'likely')) next[entry.name] = best.worker_id;
    });
    setResolution(next);
  };

  const setRate = (workerId, value) => setRates((current) => ({ ...current, [workerId]: value }));

  const save = async () => {
    if (!ratedLines.length) {
      setError(t('rec.noLines'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = buildQueuePayload({
        fileName,
        names,
        resolution,
        lines: ratedLines,
        period: { from, to },
      });
      const item = await base44.entities.AttendanceReconciliation.create(payload);
      setSaved(item);
      setStep(4);
      await loadQueue();
    } catch {
      setError(t('rec.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFileName('');
    setSheet(null);
    setReadError('');
    setSaved(null);
    setError('');
    setResolution({});
    setRates({});
  };

  const integrate = async (item) => {
    const result = await integrateQueueItem(item);
    await loadQueue();
    return result;
  };

  const remove = async (item) => {
    await base44.entities.AttendanceReconciliation.delete(item.id);
    await loadQueue();
  };

  const labels = [t('rec.stepFile'), t('rec.stepNames'), t('rec.stepReview')];
  const unmatched = names
    .filter((entry) => !resolution[entry.name])
    .map((entry) => ({ name: entry.name, days: entry.total }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('rec.eyebrow')} title={t('rec.title')} description={t('rec.description')} />

      {step < 4 && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] uppercase tracking-[0.12em]">
          {labels.map((label, index) => (
            <span key={label} className="flex items-center gap-2">
              {index > 0 && <span className="h-px w-4 bg-border" />}
              <span className={cn(step === index + 1 ? 'text-primary' : 'text-muted-foreground/70')}>
                {index + 1}. {label}
              </span>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      )}

      {step === 1 && (
        <>
          <ReconcileFileStep
            fileName={fileName}
            onFile={readFile}
            reading={reading}
            error={fileError}
            grid={analysis?.grid}
            namesCount={names.length}
            refDate={refDate}
            onChangeRefDate={setRefDate}
            colors={analysis?.colors || []}
            farms={farms}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-xl"
              disabled={!names.length}
              onClick={() => {
                setError('');
                setStep(2);
              }}
            >
              {t('rec.continue')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <ReconcileNameStep
            names={names}
            proposals={proposals}
            resolution={resolution}
            onChange={setMatch}
            onAutoConfirm={autoConfirm}
            workers={workers}
            usage={usage}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t('rec.back')}
            </Button>
            <Button type="button" className="ms-auto rounded-xl" onClick={() => setStep(3)} disabled={!lines.length}>
              {t('rec.continue')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <ReconcileReviewStep
            from={from}
            to={to}
            onChangeFrom={setFrom}
            onChangeTo={setTo}
            lines={ratedLines}
            rates={rates}
            onChangeRate={setRate}
            differences={comparison.differences}
            newCells={comparison.newCells}
            unmatched={unmatched}
            noFarm={noFarm}
            loading={loadingExisting}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(2)}>
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t('rec.back')}
            </Button>
            <Button type="button" className="ms-auto rounded-xl" onClick={save} disabled={saving || !ratedLines.length}>
              {saving ? t('rec.saving') : t('rec.save')}
            </Button>
          </div>
        </>
      )}

      {step === 4 && saved && (
        <>
          <section className="flex flex-col items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-5 py-8 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Check className="h-5 w-5" />
            </span>
            <p className="font-display text-lg tracking-tight">{t('rec.savedTitle')}</p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              {t('rec.savedDesc', {
                workers: fmtNum(saved.workers_count, 0),
                days: fmtNum(saved.total_days, 1),
                cost: fmtMoney(saved.total_cost),
              })}
            </p>
            <Button type="button" variant="outline" className="mt-2 rounded-xl" onClick={reset}>
              <FileSpreadsheet className="me-1.5 h-4 w-4" />
              {t('rec.newFile')}
            </Button>
          </section>

          <ReconcileQueue
            items={queue.filter((item) => item.id === saved.id)}
            loading={queueLoading}
            onIntegrate={integrate}
            onDelete={remove}
          />
        </>
      )}

      {step !== 4 && (
        <ReconcileQueue items={queue} loading={queueLoading} onIntegrate={integrate} onDelete={remove} />
      )}
    </div>
  );
}