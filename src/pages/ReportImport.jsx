import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import ImportStepper from '@/components/reportimport/ImportStepper';
import FileStep from '@/components/reportimport/FileStep';
import SheetPreview from '@/components/reportimport/SheetPreview';
import WageStep from '@/components/reportimport/WageStep';
import MatchStep from '@/components/reportimport/MatchStep';
import ReviewStep from '@/components/reportimport/ReviewStep';
import ResultStep from '@/components/reportimport/ResultStep';
import { Button } from '@/components/ui/button';
import { byId, fetchAll } from '@/lib/data';
import { useI18n } from '@/lib/I18nContext';
import { readXlsxSheets } from '@/lib/xlsxReader';
import { parseReportWorkbook } from '@/lib/reportImport';
import { buildDefaultChoices, buildImportLines } from '@/lib/reportImportMatch';
import { commitImportLines } from '@/lib/reportImportCommit';
import { buildRateIndex } from '@/lib/wageRates';
import { buildTransportIndex } from '@/lib/transportRates';
import { buildStorageOnHand } from '@/lib/inventory';

const STEPS = ['rimp.step.file', 'rimp.step.preview', 'rimp.step.wage', 'rimp.step.match', 'rimp.step.review'];

export default function ReportImport() {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [choices, setChoices] = useState(null);
  const [writing, setWriting] = useState(false);
  const [result, setResult] = useState(null);

  const [farms, setFarms] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);
  const [storages, setStorages] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [
        blockRows, farmRows, taskRows, machineRows, itemRows, workerRows, wageRows,
        transportRows, storageRows, invoiceRows, movementRows, countRows,
      ] = await Promise.all([
        fetchAll(base44.entities.FarmBlock, {}, { sort: 'name' }),
        fetchAll(base44.entities.Farm, {}, { sort: 'name' }),
        fetchAll(base44.entities.Task, {}, { sort: 'title' }),
        fetchAll(base44.entities.Machine, {}, { sort: 'name' }),
        fetchAll(base44.entities.InputItem, {}, { sort: 'name' }),
        fetchAll(base44.entities.Worker, {}, { sort: 'name' }),
        fetchAll(base44.entities.WageRate, {}),
        fetchAll(base44.entities.TransportRate, {}),
        fetchAll(base44.entities.Storage, {}, { sort: 'name' }),
        fetchAll(base44.entities.InputInvoice, {}),
        fetchAll(base44.entities.StockMovement, {}),
        fetchAll(base44.entities.InventoryCount, {}),
      ]);
      if (!active) return;
      setBlocks(blockRows);
      setFarms(farmRows);
      setTasks(taskRows);
      setMachines(machineRows);
      setItems(itemRows);
      setWorkers(workerRows);
      setWageRates(wageRows);
      setTransportRates(transportRows);
      setStorages(storageRows);
      setInvoices(invoiceRows);
      setMovements(movementRows);
      setCounts(countRows);
      setLoaded(true);
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  const periodQuery = (dates) =>
    dates.length ? { date: { $gte: dates[0], $lte: dates[dates.length - 1] } } : null;

  const handleFile = async (file) => {
    setReading(true);
    setError('');
    try {
      const sheets = await readXlsxSheets(file);
      const next = parseReportWorkbook(sheets);
      if (!next.totalRows) {
        setError(t('rimp.noRows'));
        return;
      }
      const query = periodQuery(next.dates);
      const reportRows = query ? await fetchAll(base44.entities.DailyReport, query) : [];
      setReports(reportRows);
      setAnalysis(next);
      setChoices({ ...buildDefaultChoices({ analysis: next, farms, blocks, tasks, machines, items, workers, wageRates }), ignored: {} });
      setFileName(file.name);
      setResult(null);
      setStep(2);
    } catch (err) {
      setError(err?.message === 'unsupported' ? t('rimp.unsupported') : t('rimp.readFailed'));
    } finally {
      setReading(false);
    }
  };

  const setChoice = (group, key, value) =>
    setChoices((prev) => ({ ...prev, [group]: { ...prev[group], [key]: value } }));

  const setIgnored = (key, ignored) =>
    setChoices((prev) => ({ ...prev, ignored: { ...prev.ignored, [key]: ignored } }));

  const built = useMemo(
    () => (analysis && choices ? buildImportLines({ analysis, choices, data: { reports } }) : null),
    [analysis, choices, reports],
  );

  const onHand = useMemo(
    () => buildStorageOnHand(invoices, movements, counts),
    [invoices, movements, counts],
  );

  const confirm = async () => {
    const ready = built.lines.filter((line) => line.status === 'ready');
    if (!ready.length) return;
    setWriting(true);
    const outcome = await commitImportLines({
      lines: ready,
      context: {
        blockMap: byId(blocks),
        taskMap: byId(tasks),
        workerMap: byId(workers),
        rateIndex: buildRateIndex(wageRates),
        transportIndex: buildTransportIndex(transportRates),
        storages,
        invoices,
        onHand,
        machines,
      },
    });
    const query = periodQuery(analysis.dates);
    setReports(query ? await fetchAll(base44.entities.DailyReport, query) : []);
    setResult({ created: outcome.written.length, failed: outcome.failed, total: ready.length });
    setWriting(false);
    setStep(6);
  };

  const restart = () => {
    setStep(1);
    setAnalysis(null);
    setChoices(null);
    setResult(null);
    setFileName('');
    setError('');
  };

  const nextStep = () => {
    if (step === 2 && !analysis.wages.length) {
      setStep(4);
      return;
    }
    setStep((value) => Math.min(value + 1, 5));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('rimp.eyebrow')}
        title={t('rimp.title')}
        description={t('rimp.description')}
      />

      {step <= 5 && <ImportStepper step={step} steps={STEPS} />}

      {!loaded && step === 1 ? (
        <p className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
          {t('common.loading')}
        </p>
      ) : null}

      {step === 1 && (
        <FileStep reading={reading} error={error} fileName={fileName} onFile={handleFile} />
      )}

      {step === 2 && analysis && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-primary" strokeWidth={1.7} />
            <span className="font-medium">{fileName}</span>
            <span className="text-xs text-muted-foreground">
              {t('rimp.fileSummary', {
                sheets: analysis.sheets.length,
                rows: analysis.totalRows,
                from: analysis.dates[0] || '—',
                to: analysis.dates[analysis.dates.length - 1] || '—',
              })}
            </span>
          </div>

          {analysis.issues.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl border border-clay/30 bg-clay/5 px-4 py-3 text-[12px] text-clay">
              {analysis.issues.map((issue) => (
                <li key={`${issue.sheet}-${issue.key}`}>
                  <span className="font-medium">{issue.sheet}</span> · {t(`rimp.issue.${issue.key}`)}
                </li>
              ))}
            </ul>
          )}

          <SheetPreview analysis={analysis} />
        </div>
      )}

      {step === 3 && analysis && choices && (
        <WageStep analysis={analysis} choices={choices} workers={workers} onChange={setChoice} />
      )}

      {step === 4 && analysis && choices && (
        <MatchStep
          analysis={analysis}
          choices={choices}
          farms={farms}
          blocks={blocks}
          tasks={tasks}
          machines={machines}
          items={items}
          onChange={setChoice}
        />
      )}

      {step === 5 && built && (
        <ReviewStep built={built} writing={writing} onIgnore={setIgnored} onConfirm={confirm} />
      )}

      {step === 6 && result && <ResultStep result={result} onRestart={restart} />}

      {step > 1 && step < 6 && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" onClick={() => setStep((value) => Math.max(value - 1, 1))}>
            {t('rimp.prev')}
          </Button>
          {step < 5 && (
            <Button type="button" onClick={nextStep} className="ms-auto rounded-xl">
              {t('rimp.next')}
            </Button>
          )}
        </div>
      )}

    </div>
  );
}