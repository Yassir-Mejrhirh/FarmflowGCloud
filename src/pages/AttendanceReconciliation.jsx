import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import ReconcileColorStep from '@/components/reconcile/ReconcileColorStep';
import ReconcileFileStep from '@/components/reconcile/ReconcileFileStep';
import ReconcileNameStep from '@/components/reconcile/ReconcileNameStep';
import ReconcileReviewStep from '@/components/reconcile/ReconcileReviewStep';
import ReconcileNewWorkers from '@/components/reconcile/ReconcileNewWorkers';
import ReconcileQueue from '@/components/reconcile/ReconcileQueue';
import ReconcileTransportGaps from '@/components/reconcile/ReconcileTransportGaps';
import { readXlsxSheet } from '@/lib/xlsxReader';
import {
  analyseSheet,
  applySalaryChanges,
  buildLines,
  buildQueuePayload,
  cellKey,
  compareSalaries,
  compareSalaryDays,
  compareWithPointages,
  daysWithoutFarm,
  excelSalaries,
  fetchPeriodSheets,
  integrateQueueItem,
  removeQueueItemPointages,
  resolveCells,
} from '@/lib/attendanceReconcile';
import { nameKey, proposeMatches, usageCount } from '@/lib/nameMatch';
import { fetchAll, fetchList } from '@/lib/data';
import { fetchGlobalOptions, rememberGlobalOption } from '@/lib/globalOptions';
import { addReconcileWorkers, detectTeams, teamKey, teamTransports } from '@/lib/reconcileWorkers';
import { applyTransportAssignments, transportGaps } from '@/lib/reconcileTransport';
import { mappingTerms } from '@/lib/workerImport';
import { quinzaineOf, quinzaineRange } from '@/lib/quinzaine';
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
  const [transportRates, setTransportRates] = useState([]);
  const [globalTeams, setGlobalTeams] = useState([]);
  const [transporterNames, setTransporterNames] = useState([]);
  const [queue, setQueue] = useState([]);
  const [queueLoading, setQueueLoading] = useState(true);

  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState(null);
  const [quinzaine, setQuinzaine] = useState(() => quinzaineOf(todayISO()));
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState('');
  const [error, setError] = useState('');

  const [resolution, setResolution] = useState({});
  const [colorAssign, setColorAssign] = useState({});
  const [cellAssign, setCellAssign] = useState({});
  const [rates, setRates] = useState({});
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [existing, setExisting] = useState([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [fileSeq, setFileSeq] = useState(0);
  const [picks, setPicks] = useState({});
  const [teamPicks, setTeamPicks] = useState({});
  const [workerFunctions, setWorkerFunctions] = useState([]);
  const [adding, setAdding] = useState(false);
  const [transportApplying, setTransportApplying] = useState(false);
  const [transportNotice, setTransportNotice] = useState('');
  const [workersNotice, setWorkersNotice] = useState('');
  const preparedFor = useRef('');

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
      const [farmRows, workerRows, rateRows, transportRows, teamRows, functionRows, transporterRows] =
        await Promise.all([
          fetchList(base44.entities.Farm, {}, { sort: 'name' }),
          fetchAll(base44.entities.Worker, {}, { sort: 'name' }),
          fetchList(base44.entities.WageRate, {}),
          fetchList(base44.entities.TransportRate, {}),
          fetchGlobalOptions('team'),
          fetchList(base44.entities.WorkerFunction, {}, { sort: 'name' }),
          fetchGlobalOptions('transporter'),
        ]);
      if (!active) return;
      setFarms(farmRows);
      setWorkers(workerRows.filter((worker) => worker.active !== false));
      setWageRates(rateRows);
      setTransportRates(transportRows);
      setGlobalTeams(teamRows);
      setTransporterNames(transporterRows);
      setWorkerFunctions(functionRows.map((row) => row.name).filter(Boolean));
    };
    load();
    loadQueue();
    return () => {
      active = false;
    };
  }, []);

  // La quinzaine choisie fixe la période du pointage : elle sert de référence à la
  // lecture des en-têtes et borne les journées retenues dans le classeur.
  const period = useMemo(() => quinzaineRange(quinzaine), [quinzaine]);
  const reference = useMemo(() => new Date(`${period.start}T00:00:00`), [period]);
  const terms = useMemo(() => mappingTerms(t), [t]);

  const analysis = useMemo(
    () => (sheet ? analyseSheet({ sheet, reference, farms, workers, period, terms }) : null),
    [sheet, reference, farms, workers, period, terms],
  );
  const names = analysis?.names || [];
  // Une lecture de dates douteuse (jours confondus) ou une période sans aucun jour
  // bloque la suite : mieux vaut relire le classeur que rapprocher de mauvaises dates.
  const datesBlocked = Boolean(analysis?.dates?.invalid);
  const datesError = !datesBlocked
    ? ''
    : analysis.dates.duplicates.length
      ? t('rec.datesDuplicate')
      : t('rec.datesNoneRetained');

  const fileError =
    readError ||
    (sheet && !analysis ? t('rec.noGrid') : '') ||
    datesError ||
    (analysis && !analysis.names.length ? t('rec.noNames') : '');

  const proposals = useMemo(() => proposeMatches(names.map((entry) => entry.name), workers), [names, workers]);

  // Fichier lu : les propositions sûres sont pré-cochées, les autres restent à confirmer.
  // Le garde évite de réinitialiser les choix quand la liste d'ouvriers se recharge.
  useEffect(() => {
    if (!analysis) return;
    const key = `${fileName}|${fileSeq}|${period.start}|${period.end}`;
    if (preparedFor.current === key) return;
    preparedFor.current = key;
    const next = {};
    analysis.names.forEach((entry) => {
      const best = proposals.get(entry.name)?.best;
      next[entry.name] = best && (best.level === 'exact' || best.level === 'likely') ? best.worker_id : '';
    });
    setResolution(next);
    setColorAssign({});
    setCellAssign({});
    setRates({});
    setPicks({});
    setFrom(analysis.grid.dayColumns[0]?.date || '');
    setTo(analysis.grid.dayColumns[analysis.grid.dayColumns.length - 1]?.date || '');
  }, [analysis, proposals, fileName, fileSeq, period]);

  // Un nom écrit à l'identique est coché dès que sa fiche apparaît : ouvriers chargés
  // après le classeur, ou fiches créées depuis ce rapprochement.
  useEffect(() => {
    if (!analysis) return;
    setResolution((current) => {
      const next = { ...current };
      let changed = false;
      analysis.names.forEach((entry) => {
        if (next[entry.name]) return;
        const best = proposals.get(entry.name)?.best;
        if (best && best.level === 'exact') {
          next[entry.name] = best.worker_id;
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [analysis, proposals]);

  // Couleurs du classeur sans ferme et présences écrites sans couleur : elles doivent
  // être rattachées à une ferme avant la suite du rapprochement.
  const colorIssues = useMemo(() => {
    const farmColors = new Set(
      (farms || []).map((farm) => String(farm.color || '').toUpperCase()).filter(Boolean),
    );
    const byColor = new Map();
    const byCell = new Map();

    names.forEach((entry) => {
      entry.cells.forEach((cell) => {
        if (!cell.color) {
          const key = cellKey(entry.name, cell);
          const row = byCell.get(key) || { key, name: entry.name, date: cell.date, days: 0 };
          row.days = Math.round((row.days + cell.days) * 100) / 100;
          byCell.set(key, row);
          return;
        }
        if (farmColors.has(cell.color)) return;
        const row = byColor.get(cell.color) || { color: cell.color, days: 0, cells: 0 };
        row.days = Math.round((row.days + cell.days) * 100) / 100;
        row.cells += 1;
        byColor.set(cell.color, row);
      });
    });

    return {
      colors: [...byColor.values()].sort((a, b) => b.days - a.days),
      cells: [...byCell.values()].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name),
      ),
    };
  }, [names, farms]);

  // Les présences reprennent la ferme de leur couleur, ou celle choisie à l'écran.
  const resolvedNames = useMemo(
    () => resolveCells({ names, farms, colorAssignments: colorAssign, cellAssignments: cellAssign }),
    [names, farms, colorAssign, cellAssign],
  );

  const colorsPending =
    colorIssues.colors.filter((item) => !colorAssign[item.color]).length +
    colorIssues.cells.filter((item) => !cellAssign[item.key]).length;

  const lines = useMemo(
    () => (analysis ? buildLines({ names: resolvedNames, resolution, workers, wageRates, periodStart: from }) : []),
    [analysis, resolvedNames, resolution, workers, wageRates, from],
  );

  // Salaires lus dans le classeur, comparés à ceux de la fiche à la date d'effet.
  const salaries = useMemo(() => excelSalaries({ names, resolution }), [names, resolution]);
  const effectiveDate = from || period.start;
  const salaryChanges = useMemo(
    () => compareSalaries({ salaries, workers, wageRates, periodStart: effectiveDate }),
    [salaries, workers, wageRates, effectiveDate],
  );

  // Le salaire du classeur devient le taux appliqué sur la période, sauf saisie contraire.
  const ratedLines = useMemo(
    () =>
      lines.map((line) => ({
        ...line,
        daily_rate:
          rates[line.worker_id] !== undefined
            ? Number(rates[line.worker_id]) || 0
            : salaries.get(line.worker_id) ?? line.daily_rate,
      })),
    [lines, rates, salaries],
  );

  const usage = useMemo(() => usageCount(resolution), [resolution]);
  const noFarm = useMemo(
    () => daysWithoutFarm({ names: resolvedNames, resolution }),
    [resolvedNames, resolution],
  );

  const unmatchedEntries = useMemo(
    () => names.filter((entry) => !resolution[entry.name]),
    [names, resolution],
  );

  const moTeams = useMemo(
    () => [...new Set([...globalTeams, ...workers.map((worker) => worker.team).filter(Boolean)])],
    [globalTeams, workers],
  );

  // Équipes du classeur, complétées par celles de la liste MO qui n'y figurent pas.
  const teamChoices = useMemo(() => {
    const list = detectTeams(names, moTeams);
    moTeams.forEach((name) => {
      if (!list.some((team) => teamKey(team.name) === teamKey(name))) list.push({ name, known: true, count: 0 });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [names, moTeams]);

  const transports = useMemo(
    () => teamTransports(workers, transportRates, from || period.start),
    [workers, transportRates, from, period],
  );

  // Ouvriers du pointage dont l'équipe a un transport, mais qui n'en bénéficient pas
  // encore : il leur sera proposé le transporteur et le tarif de leur équipe.
  const matchedIds = useMemo(() => new Set(Object.values(resolution).filter(Boolean)), [resolution]);
  const transportMissing = useMemo(
    () => transportGaps({ workers, matchedIds, rates: transportRates, date: from || period.start }),
    [workers, matchedIds, transportRates, from, period],
  );

  // Transporteurs proposés : ceux déjà enregistrés, complétés par ceux de la liste MO.
  const transporterChoices = useMemo(() => {
    const names = [];
    [
      ...transporterNames,
      ...workers.map((worker) => worker.transporter_name),
      ...transportRates.map((rate) => rate.transporter_name),
    ].forEach((value) => {
      const name = String(value || '').trim();
      if (name && !names.some((existing) => existing.toLowerCase() === name.toLowerCase())) names.push(name);
    });
    return names.sort((a, b) => a.localeCompare(b));
  }, [transporterNames, workers, transportRates]);

  // Un transporteur créé depuis le rapprochement est mémorisé pour les fiches suivantes.
  const rememberTransporter = (name) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    setTransporterNames((current) =>
      current.some((existing) => existing.toLowerCase() === clean.toLowerCase()) ? current : [...current, clean],
    );
    rememberGlobalOption('transporter', clean);
  };

  // Choix par personne : équipe et salaire lus dans le classeur, tous deux modifiables.
  const picksFor = useMemo(() => {
    const map = new Map();
    unmatchedEntries.forEach((entry) => {
      const saved = picks[entry.name] || {};
      const team = saved.team ?? entry.team ?? '';
      const suggestion =
        entry.salary || teamChoices.find((choice) => teamKey(choice.name) === teamKey(team))?.salary || 0;
      map.set(entry.name, {
        include: saved.include ?? true,
        team,
        salary: saved.salary ?? (suggestion ? String(suggestion) : ''),
        priority: saved.priority ?? '3',
        declared: saved.declared ?? false,
        worker_function: saved.worker_function ?? 'Ouvrier',
      });
    });
    return map;
  }, [unmatchedEntries, picks, teamChoices]);

  const setPick = (name, patch) =>
    setPicks((current) => ({ ...current, [name]: { ...(picksFor.get(name) || {}), ...patch } }));

  // Transport saisi pour une équipe absente de la liste MO.
  const setTeamPick = (key, patch) =>
    setTeamPicks((current) => ({ ...current, [key]: { ...(current[key] || {}), ...patch } }));

  // Pointages déjà enregistrés sur la période, pour montrer les écarts avant validation.
  // La clé ne dépend que des jours et des fermes : changer un taux ne relance pas la lecture.
  const fetchKey = useMemo(() => {
    if (step !== 4 || !ratedLines.length) return '';
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

  // Journées du classeur rapprochées du pointage déjà saisi, par date, ferme et salaire.
  const salaryDays = useMemo(
    () => compareSalaryDays({ lines: ratedLines, sheets: existing, workers, wageRates }),
    [ratedLines, existing, workers, wageRates],
  );

  const readFile = async (file) => {
    setReading(true);
    setError('');
    setReadError('');
    setTransportNotice('');
    setWorkersNotice('');
    try {
      const next = await readXlsxSheet(file);
      setFileName(file.name);
      setFileSeq((current) => current + 1);
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

  const setMatch = useCallback(
    (name, workerId) => setResolution((current) => ({ ...current, [name]: workerId })),
    [],
  );

  const autoConfirm = useCallback(() => {
    setResolution((current) => {
      const next = { ...current };
      names.forEach((entry) => {
        const best = proposals.get(entry.name)?.best;
        if (best && (best.level === 'exact' || best.level === 'likely')) next[entry.name] = best.worker_id;
      });
      return next;
    });
  }, [names, proposals]);

  const setRate = (workerId, value) => setRates((current) => ({ ...current, [workerId]: value }));

  // Ajout des personnes choisies à la liste MO, puis reprise du rapprochement avec
  // leurs nouvelles fiches : le pointage peut les reprendre immédiatement.
  const addToWorkers = async () => {
    const selections = unmatchedEntries
      .map((entry) => ({ name: entry.name, ...picksFor.get(entry.name) }))
      .filter((selection) => selection.include && Number(selection.salary) > 0);
    if (!selections.length) return;

    setAdding(true);
    setError('');
    setWorkersNotice('');
    try {
      const created = await addReconcileWorkers({
        selections,
        transports,
        teamSettings: teamPicks,
        effectiveDate: from || period.start,
      });

      // Les fiches ne comptent qu'une fois relues dans la liste MO : une création
      // refusée reste visible, au lieu de disparaître sans laisser de trace.
      const ids = (Array.isArray(created) ? created : []).filter((worker) => worker?.id).map((worker) => worker.id);
      const verified = ids.length
        ? await fetchList(base44.entities.Worker, { id: { $in: ids } }, { limit: 300 })
        : [];
      const byName = new Map(verified.map((worker) => [nameKey(worker.name), worker]));
      if (!byName.size) {
        setError(t('rec.newFailed'));
        return;
      }

      setWorkers((current) => {
        const next = [...current];
        byName.forEach((worker) => {
          if (worker?.id && !next.some((existing) => existing.id === worker.id)) next.push(worker);
        });
        return next.sort((a, b) => String(a.name).localeCompare(String(b.name)));
      });
      setGlobalTeams((current) => [
        ...new Set([...current, ...selections.map((selection) => selection.team).filter(Boolean)]),
      ]);
      setResolution((current) => {
        const next = { ...current };
        selections.forEach((selection) => {
          const worker = byName.get(nameKey(selection.name));
          if (worker) next[selection.name] = worker.id;
        });
        return next;
      });
      setPicks({});
      setTeamPicks({});
      setWorkersNotice(t('rec.newDone', { n: byName.size }));
    } catch {
      setError(t('rec.newFailed'));
    } finally {
      setAdding(false);
    }
  };

  // Affectation confirmée : le transport de l'équipe est enregistré sur la fiche de
  // l'ouvrier et dans son historique daté depuis le début de la période.
  const assignTransport = async (assignments) => {
    if (!assignments.length) return;
    setTransportApplying(true);
    setError('');
    try {
      const result = await applyTransportAssignments({
        assignments,
        effectiveDate: from || period.start,
      });
      const changes = new Map(result.updates.map((row) => [row.id, row]));
      setWorkers((current) =>
        current.map((worker) => (changes.has(worker.id) ? { ...worker, ...changes.get(worker.id) } : worker)),
      );
      setTransportRates((current) => [...current, ...result.rates]);
      setTransportNotice(
        t('rec.transportDone', { n: assignments.length, date: from || period.start }),
      );
    } catch {
      setError(t('rec.transportFailed'));
    } finally {
      setTransportApplying(false);
    }
  };

  const save = async () => {
    if (!ratedLines.length) {
      setError(t('rec.noLines'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Validation : les salaires différents du classeur sont enregistrés en taux datés.
      if (salaryChanges.length) {
        await applySalaryChanges({ changes: salaryChanges, effectiveDate });
        setWageRates(await fetchList(base44.entities.WageRate, {}));
      }
      const payload = buildQueuePayload({
        fileName,
        names,
        resolution,
        lines: ratedLines,
        period: { from, to },
      });
      const item = await base44.entities.AttendanceReconciliation.create(payload);
      setSaved(item);
      setStep(5);
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
    setColorAssign({});
    setCellAssign({});
    setRates({});
    setPicks({});
    setTeamPicks({});
    setTransportNotice('');
    setWorkersNotice('');
    preparedFor.current = '';
  };

  const integrate = async (item) => {
    const result = await integrateQueueItem(item);
    await loadQueue();
    return result;
  };

  // Suppression : « queue » sort seulement la ligne de la liste d'attente ; « full »
  // retire d'abord du Pointage les journées de ce rapprochement (les autres pointages
  // des mêmes feuilles restent), puis la ligne de la liste d'attente.
  const remove = async (item, mode = 'queue') => {
    const result = mode === 'full' ? await removeQueueItemPointages(item) : { updated: 0, deleted: 0 };
    await base44.entities.AttendanceReconciliation.delete(item.id);
    await loadQueue();
    return result;
  };

  const labels = [t('rec.stepFile'), t('rec.stepColors'), t('rec.stepNames'), t('rec.stepReview')];
  const unmatched = names
    .filter((entry) => !resolution[entry.name])
    .map((entry) => ({ name: entry.name, days: entry.total }));

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('rec.eyebrow')} title={t('rec.title')} description={t('rec.description')} />

      {step < 5 && (
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
            dates={analysis?.dates}
            namesCount={names.length}
            team={analysis?.titleTeam || ''}
            teams={analysis?.teams || []}
            hasSalary={(analysis?.salaryColumn ?? -1) >= 0}
            noTeam={analysis?.noTeamCount || 0}
            quinzaine={quinzaine}
            onChangeQuinzaine={setQuinzaine}
            colors={colorIssues.colors
              .filter((item) => !colorAssign[item.color])
              .map((item) => ({ color: item.color, count: item.cells }))}
            farms={farms}
          />
          <div className="flex justify-end">
            <Button
              type="button"
              className="rounded-xl"
              disabled={!names.length || datesBlocked}
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
          <ReconcileColorStep
            colors={colorIssues.colors}
            noColor={colorIssues.cells}
            farms={farms}
            colorAssignments={colorAssign}
            cellAssignments={cellAssign}
            onColorAssign={(color, farmId) =>
              setColorAssign((current) => ({ ...current, [color]: farmId }))
            }
            onCellAssign={(key, farmId) =>
              setCellAssign((current) => ({ ...current, [key]: farmId }))
            }
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(1)}>
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t('rec.back')}
            </Button>
            <Button
              type="button"
              className="ms-auto rounded-xl"
              onClick={() => setStep(3)}
              disabled={colorsPending > 0}
            >
              {t('rec.continue')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
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

          {unmatchedEntries.length > 0 && (
            <ReconcileNewWorkers
              entries={unmatchedEntries}
              picks={picksFor}
              teams={teamChoices}
              transports={transports}
              teamPicks={teamPicks}
              onTeamPick={setTeamPick}
              transporters={transporterChoices}
              onRememberTransporter={rememberTransporter}
              functions={workerFunctions}
              onPick={setPick}
              onAdd={addToWorkers}
              adding={adding}
            />
          )}

          {workersNotice && (
            <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-primary">
              {workersNotice}
            </p>
          )}

          {transportMissing.length > 0 && (
            <ReconcileTransportGaps
              gaps={transportMissing}
              onApply={assignTransport}
              applying={transportApplying}
            />
          )}

          {transportNotice && (
            <p className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[12px] text-primary">
              {transportNotice}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(2)}>
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t('rec.back')}
            </Button>
            <Button type="button" className="ms-auto rounded-xl" onClick={() => setStep(4)} disabled={!lines.length}>
              {t('rec.continue')}
              <ArrowRight className="ms-1.5 h-4 w-4 rtl:rotate-180" />
            </Button>
          </div>
        </>
      )}

      {step === 4 && (
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
            salaryChanges={salaryChanges}
            salaryDate={effectiveDate}
            salaryDays={salaryDays}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setStep(3)}>
              <ArrowLeft className="me-1.5 h-4 w-4 rtl:rotate-180" /> {t('rec.back')}
            </Button>
            <Button
              type="button"
              className="ms-auto rounded-xl"
              onClick={save}
              disabled={saving || !ratedLines.length || datesBlocked}
            >
              {saving ? t('rec.saving') : t('rec.save')}
            </Button>
          </div>
        </>
      )}

      {step === 5 && saved && (
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

      {step !== 5 && (
        <ReconcileQueue items={queue} loading={queueLoading} onIntegrate={integrate} onDelete={remove} />
      )}
    </div>
  );
}