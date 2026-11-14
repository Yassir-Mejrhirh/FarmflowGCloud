import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ImportSourceStep from '@/components/workers/import/ImportSourceStep';
import ImportPreviewTable from '@/components/workers/import/ImportPreviewTable';
import ImportBulkPanel from '@/components/workers/import/ImportBulkPanel';
import DuplicateReview from '@/components/workers/import/DuplicateReview';
import { readXlsxRows } from '@/lib/xlsxReader';
import {
  EMPTY_COMMON,
  IMPORT_FIELDS,
  buildPayload,
  findDuplicates,
  guessMapping,
  mappingTerms,
  normalizeWorkerName,
  validateDrafts,
} from '@/lib/workerImport';
import { fetchGlobalOptions, mergeOptions, rememberGlobalOption, rememberGlobalOptions } from '@/lib/globalOptions';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function WorkerImportDialog({
  open, onOpenChange, farms = [], functions = [], workers = [], onImported,
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [common, setCommon] = useState(EMPTY_COMMON);
  const [globalTeams, setGlobalTeams] = useState([]);
  const [globalTransporters, setGlobalTransporters] = useState([]);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError('');
    setDrafts([]);
    setCommon(EMPTY_COMMON);
    setCreated(0);
    (async () => {
      const [teamNames, transporterNames] = await Promise.all([
        fetchGlobalOptions('team'),
        fetchGlobalOptions('transporter'),
      ]);
      setGlobalTeams(teamNames);
      setGlobalTransporters(transporterNames);
    })();
  }, [open]);

  const teams = useMemo(
    () => mergeOptions(globalTeams, workers.map((worker) => worker.team)).map((option) => option.value),
    [globalTeams, workers],
  );
  const transporters = useMemo(
    () => mergeOptions(globalTransporters, workers.map((worker) => worker.transporter_name)).map((option) => option.value),
    [globalTransporters, workers],
  );

  // Une équipe ou un transporteur saisi via « Ajouter » est mémorisé globalement :
  // il est proposé dans cet import et dans les suivants.
  const addOption = (kind, setter) => async (name) => {
    const clean = (name || '').trim();
    if (!clean) return;
    await rememberGlobalOption(kind, clean);
    setter((current) =>
      current.some((value) => value.toLowerCase() === clean.toLowerCase())
        ? current
        : [...current, clean].sort((a, b) => a.localeCompare(b)),
    );
  };

  const addTeam = useMemo(() => addOption('team', setGlobalTeams), []);
  const addTransporter = useMemo(() => addOption('transporter', setGlobalTransporters), []);

  // Les colonnes du fichier sont comparées aux libellés et descriptions de l'onglet Ouvriers.
  const terms = useMemo(() => mappingTerms(t), [t]);

  const existingNames = useMemo(
    () => new Set(workers.map((worker) => normalizeWorkerName(worker.name)).filter(Boolean)),
    [workers],
  );

  const problems = useMemo(() => validateDrafts(drafts, common), [drafts, common]);
  const duplicates = useMemo(() => findDuplicates(drafts, workers), [drafts, workers]);
  const duplicateRows = drafts
    .filter((draft) => duplicates.has(draft.id))
    .map((draft) => ({ draft, existing: duplicates.get(draft.id) }));
  const included = drafts.filter((draft) => draft.include);
  const blocked = included.some((draft) => problems.has(draft.id));

  const readFile = async (file) => {
    setReading(true);
    setError('');
    try {
      const sheet = await readXlsxRows(file);
      const headerRow = sheet[0] || [];
      const dataRows = sheet.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
      const width = dataRows.reduce((widest, row) => Math.max(widest, row.length), headerRow.length);
      const cleanHeaders = Array.from(
        { length: width },
        (_, index) => String(headerRow[index] ?? '').trim() || t('wimport.col', { value: index + 1 }),
      );
      setFileName(file.name);
      setHeaders(cleanHeaders);
      setRows(dataRows);
      setMapping(guessMapping(cleanHeaders, terms));
      if (!dataRows.length) setError(t('wimport.noRows'));
    } catch (caught) {
      setFileName(file.name);
      setHeaders([]);
      setRows([]);
      setMapping({});
      setError(t('wimport.badFile'));
    }
    setReading(false);
  };

  const startPreview = () => {
    setDrafts(
      rows.map((row, index) => {
        const values = {};
        IMPORT_FIELDS.forEach((field) => {
          const column = mapping[field.key];
          values[field.key] = column === undefined ? '' : String(row[column] ?? '').trim();
        });
        // Un nom déjà présent dans la liste n'est pas retenu par défaut.
        const duplicate = existingNames.has(normalizeWorkerName(values.name));
        return { id: `row-${index}`, include: !duplicate, values };
      }),
    );
    setStep(2);
  };

  const changeValue = (id, key, value) =>
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, values: { ...draft.values, [key]: value } } : draft)),
    );

  const toggle = (id, include) =>
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, include } : draft)));

  const toggleAll = (include) => setDrafts((current) => current.map((draft) => ({ ...draft, include })));

  const submit = async () => {
    const payloads = included
      .map((draft) => buildPayload(draft.values, common))
      .filter((payload) => payload.name);
    if (!payloads.length) return;
    setSaving(true);
    await base44.entities.Worker.bulkCreate(payloads);
    await rememberGlobalOptions('team', payloads.map((payload) => payload.team));
    await rememberGlobalOptions('transporter', payloads.map((payload) => payload.transporter_name));
    setSaving(false);
    setCreated(payloads.length);
    setStep(3);
    onImported();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0 sm:max-w-[1400px]">
        <DialogHeader className="px-6 pb-3 pt-6">
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{t('wimport.title')}</DialogTitle>
          <DialogDescription className="text-sm">
            {step === 3 ? t('wimport.resultTitle') : t('wimport.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-6 pb-4 text-[11px] uppercase tracking-[0.12em]">
          {[t('wimport.step1'), t('wimport.step2')].map((label, index) => (
            <span key={label} className="flex items-center gap-2">
              {index > 0 && <span className="h-px w-4 bg-border" />}
              <span className={cn(step === index + 1 ? 'text-primary' : 'text-muted-foreground/70')}>
                {index + 1}. {label}
              </span>
            </span>
          ))}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 pb-5">
          {step === 1 && (
            <ImportSourceStep
              fileName={fileName}
              headers={headers}
              mapping={mapping}
              onChangeMapping={(key, column) => setMapping((current) => ({ ...current, [key]: column }))}
              onFile={readFile}
              reading={reading}
              error={error}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <DuplicateReview rows={duplicateRows} onDecide={toggle} />

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{t('wimport.included', { count: included.length })}</span>
                <button
                  type="button"
                  onClick={() => toggleAll(!drafts.every((draft) => draft.include))}
                  className="font-medium text-primary hover:underline"
                >
                  {t('wimport.selectAll')}
                </button>
              </div>

              <ImportPreviewTable
                drafts={drafts}
                problems={problems}
                onChange={changeValue}
                onToggle={toggle}
                onToggleAll={toggleAll}
                farms={farms}
                functions={functions}
                teams={teams}
                transporters={transporters}
                onCreateTeam={addTeam}
                onCreateTransporter={addTransporter}
              />

              <ImportBulkPanel
                values={common}
                onChange={setCommon}
                farms={farms}
                functions={functions}
                teams={teams}
                transporters={transporters}
                onCreateTeam={addTeam}
                onCreateTransporter={addTransporter}
              />
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-secondary/30 px-6 py-10 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Check className="h-5 w-5" />
              </span>
              <p className="font-display text-lg">{t('wimport.resultBody', { count: created })}</p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border bg-background px-6 py-4">
          {step === 2 && blocked && (
            <p className="mr-auto flex w-full items-start gap-1.5 text-[11px] font-medium leading-snug text-clay sm:w-auto">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
              {t('wimport.incomplete')}
            </p>
          )}

          {step === 1 && (
            <>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                disabled={!rows.length || mapping.name === undefined}
                onClick={startPreview}
              >
                {t('wimport.continue')} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> {t('wimport.back')}
              </Button>
              <Button
                type="button"
                className="rounded-xl"
                onClick={submit}
                disabled={saving || blocked || included.length === 0}
              >
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {saving ? t('wimport.creating') : t('wimport.create')}
              </Button>
            </>
          )}

          {step === 3 && (
            <Button type="button" className="rounded-xl" onClick={() => onOpenChange(false)}>
              {t('wimport.close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}