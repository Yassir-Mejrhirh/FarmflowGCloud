import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, FileSpreadsheet, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import DraftHeader from '@/components/dailyreport/DraftHeader';
import TaskLineCard from '@/components/dailyreport/TaskLineCard';
import ReportHistory from '@/components/dailyreport/ReportHistory';
import ReportEditDialog from '@/components/dailyreport/ReportEditDialog';
import UnsoldDialog from '@/components/dailyreport/UnsoldDialog';
import { Button } from '@/components/ui/button';
import { fetchAll, fetchList, byId } from '@/lib/data';
import { todayISO } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { buildOnHand, buildStorageOnHand } from '@/lib/inventory';
import { positiveItems, stockInStorages } from '@/lib/inputAvailability';
import { storagesForFarm } from '@/lib/storageScope';
import { buildRateIndex } from '@/lib/wageRates';
import { buildTransportIndex } from '@/lib/transportRates';
import { assignedToFarm } from '@/lib/workerFarms';
import { buildEditDraft, entryReports } from '@/lib/reportDraft';
import { addLabourDays, assignedDays, remainingDays, unsoldWorkers } from '@/lib/pointageBalance';
import { draftLine, lineIssues, lineOutflow, newLine, shortagesOf } from '@/lib/reportLines';
import { commitLine } from '@/lib/reportCommit';
import { applyReportHours, reportHoursByMachine } from '@/lib/machineCounter';
import { demandByStorage, mergeDemand } from '@/lib/reportStock';
import { isPumpingMachine } from '@/lib/machineInputs';
import { detectFarm, stationsForFarm } from '@/lib/pumpStations';
import { readReportPrefs, saveReportPrefs } from '@/lib/reportPrefs';
import { cn } from '@/lib/utils';

export default function DailyReport() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [farms, setFarms] = useState([]);
  const [crops, setCrops] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [machines, setMachines] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [movements, setMovements] = useState([]);
  const [counts, setCounts] = useState([]);
  const [storages, setStorages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [natures, setNatures] = useState([]);
  const [reports, setReports] = useState([]);
  const [wageRates, setWageRates] = useState([]);
  const [transportRates, setTransportRates] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pointageLines, setPointageLines] = useState([]);
  const [version, setVersion] = useState(0);

  // The report being written: one draft per day and per farm. The day and the farm
  // of the last entry are brought back when the page is opened again.
  const [date, setDate] = useState(() => readReportPrefs().date || todayISO());
  const [farmId, setFarmId] = useState(() => readReportPrefs().farm_id || '');
  const [draftId, setDraftId] = useState(null);
  const [lines, setLines] = useState([]);
  const [openKey, setOpenKey] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savingDraft, setSavingDraft] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [issuesByLine, setIssuesByLine] = useState({});
  const [editing, setEditing] = useState(null);
  const [editChoice, setEditChoice] = useState(null);
  const [message, setMessage] = useState(null);
  const [unsold, setUnsold] = useState([]);

  const draftKey = `${date}|${farmId}`;
  const loadedKeyRef = useRef('');
  const savedRef = useRef('');
  const detectedRef = useRef(new Set());

  const load = async () => {
    const [blockRows, farmRows, cropRows, workerRows, machineRows, itemRows, invoiceRows, movementRows, countRows, storageRows, reportRows, taskRows, natureRows, wageRateRows, transportRateRows, supplierRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Farm, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchAll(base44.entities.Worker, {}, { sort: 'name' }),
      fetchList(base44.entities.Machine, {}, { sort: 'name' }),
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
      fetchList(base44.entities.StockMovement, {}),
      fetchList(base44.entities.InventoryCount, {}, { sort: '-date' }),
      fetchList(base44.entities.Storage, {}, { sort: 'name' }),
      fetchList(base44.entities.DailyReport, {}, { sort: '-date' }),
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
      fetchList(base44.entities.WageRate, {}),
      fetchList(base44.entities.TransportRate, {}),
      fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
    ]);
    setBlocks(blockRows);
    setFarms(farmRows);
    setCrops(cropRows);
    setWorkers(workerRows);
    setMachines(machineRows);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setMovements(movementRows);
    setCounts(countRows);
    setStorages(storageRows);
    setReports(reportRows);
    setTasks(taskRows);
    setNatures(natureRows);
    setWageRates(wageRateRows);
    setTransportRates(transportRateRows);
    setSuppliers(supplierRows);
    setVersion((value) => value + 1);
  };

  useEffect(() => {
    load();
  }, []);

  // Après une facture d'achat ou un intrant créé, le stock et les choix de la ligne sont relus.
  const reloadStock = async () => {
    const [itemRows, invoiceRows, movementRows, countRows, supplierRows] = await Promise.all([
      fetchList(base44.entities.InputItem, {}, { sort: 'name' }),
      fetchList(base44.entities.InputInvoice, {}),
      fetchList(base44.entities.StockMovement, {}),
      fetchList(base44.entities.InventoryCount, {}, { sort: '-date' }),
      fetchList(base44.entities.Supplier, {}, { sort: 'name' }),
    ]);
    setItems(itemRows);
    setInvoices(invoiceRows);
    setMovements(movementRows);
    setCounts(countRows);
    setSuppliers(supplierRows);
  };

  // Une tâche créée pendant la saisie entre aussitôt dans les choix du rapport.
  const reloadTasks = async () => {
    const [taskRows, natureRows] = await Promise.all([
      fetchList(base44.entities.Task, {}, { sort: 'created_date' }),
      fetchList(base44.entities.TaskNature, {}, { sort: 'name' }),
    ]);
    setTasks(taskRows);
    setNatures(natureRows);
  };

  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const workerMap = useMemo(() => byId(workers), [workers]);
  const machineMap = useMemo(() => byId(machines), [machines]);
  const taskMap = useMemo(() => byId(tasks), [tasks]);
  const itemMap = useMemo(() => byId(items), [items]);
  // Rates are looked up at the date of the report, so a revision only applies to later reports.
  const rateIndex = useMemo(() => buildRateIndex(wageRates), [wageRates]);
  const transportIndex = useMemo(() => buildTransportIndex(transportRates), [transportRates]);
  const stockTotals = useMemo(() => buildOnHand(invoices, movements, counts), [invoices, movements, counts]);
  // Stock of each storage on its own: a depot never draws on another one's stock.
  const storageOnHand = useMemo(
    () => buildStorageOnHand(invoices, movements, counts),
    [invoices, movements, counts],
  );

  const farmName = farms.find((farm) => farm.id === farmId)?.name || '';
  // Intrants proposés : seulement ceux en stock dans les dépôts associés à la ferme choisie.
  const availableInputs = useMemo(() => {
    const scope = storagesForFarm(storages, farmName).map((storage) => storage.id);
    return positiveItems(items, stockInStorages({ invoices, movements, counts }, scope));
  }, [items, storages, farmName, invoices, movements, counts]);
  const visibleBlocks = useMemo(
    () => (farmName ? blocks.filter((block) => block.farm === farmName) : blocks),
    [blocks, farmName],
  );
  const blockGroups = useMemo(() => {
    const cropMap = byId(crops);
    const groups = new Map();
    visibleBlocks.forEach((block) => {
      const crop = cropMap[block.crop_id];
      const key = crop ? crop.id : 'none';
      if (!groups.has(key)) {
        groups.set(key, { key, label: crop ? crop.name : t('report.noCrop'), blocks: [] });
      }
      groups.get(key).blocks.push(block);
    });
    return [...groups.values()].sort((a, b) =>
      a.key === 'none' ? 1 : b.key === 'none' ? -1 : a.label.localeCompare(b.label),
    );
  }, [visibleBlocks, crops, t]);

  // The farm of the last entry is taken again when it still exists, otherwise the first one.
  useEffect(() => {
    if (!farms.length) return;
    if (farmId && farms.some((farm) => farm.id === farmId)) return;
    const stored = readReportPrefs().farm_id;
    const known = farms.some((farm) => farm.id === stored);
    setFarmId(known ? stored : farms[0].id);
  }, [farms, farmId]);

  // Each change of day or farm is kept for the next visit.
  useEffect(() => {
    if (!farmId) return;
    saveReportPrefs({ date, farm_id: farmId });
  }, [date, farmId]);

  // The draft of the chosen day and farm is brought back, or started empty.
  useEffect(() => {
    if (!date || !farmId) {
      setLoadingDraft(false);
      return undefined;
    }
    let cancelled = false;
    setLoadingDraft(true);
    fetchList(base44.entities.ReportDraft, { date, farm_id: farmId }, { sort: '-updated_date', limit: 1 })
      .then((rows) => {
        if (cancelled) return;
        const draft = rows[0];
        const loaded = draft?.lines || [];
        loadedKeyRef.current = `${date}|${farmId}`;
        savedRef.current = JSON.stringify(loaded);
        setDraftId(draft?.id || null);
        setLines(loaded);
        setIssuesByLine({});
        setOpenKey(null);
        setUnsold([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingDraft(false);
      });
    return () => {
      cancelled = true;
    };
  }, [date, farmId]);

  // Pointage written for the same day and farm: its workers are proposed in every line.
  useEffect(() => {
    let active = true;
    if (!date || !farmId) {
      setPointageLines([]);
      return () => {
        active = false;
      };
    }
    fetchList(base44.entities.AttendanceSheet, { date, farm_id: farmId }, { limit: 1 }).then((rows) => {
      if (active) setPointageLines(rows[0]?.lines || []);
    });
    return () => {
      active = false;
    };
  }, [date, farmId]);

  const pointageDays = useMemo(() => {
    const map = new Map();
    pointageLines.forEach((line) => {
      const days = Number(line.days) || 0;
      if (line.worker_id && days > 0) map.set(line.worker_id, days);
    });
    return map;
  }, [pointageLines]);

  // Every change is kept in the draft: nothing is lost when the page is left.
  useEffect(() => {
    if (!date || !farmId) return undefined;
    if (loadedKeyRef.current !== draftKey) return undefined;
    // An untouched empty line is not worth keeping in the draft.
    const kept = lines
      .filter(
        (line) =>
          line.task_id ||
          line.block_ids.length ||
          line.description ||
          (line.labour || []).length ||
          (line.machinery || []).length ||
          (line.inputs || []).length,
      )
      .map(draftLine);
    const payload = JSON.stringify(kept);
    if (payload === savedRef.current) return undefined;
    if (!kept.length && !draftId) return undefined;

    const timer = setTimeout(async () => {
      setSavingDraft(true);
      const body = { date, farm_id: farmId, farm_name: farmName, lines: kept, status: 'draft' };
      const row = draftId
        ? await base44.entities.ReportDraft.update(draftId, body)
        : await base44.entities.ReportDraft.create(body);
      savedRef.current = payload;
      if (!draftId) setDraftId(row.id);
      setSavingDraft(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [lines, draftKey, draftId, date, farmId, farmName]);

  // Days already given to the reports of that farm and that day: what is left of each
  // pointed worker is what its labour lines have yet to carry.
  const assignedMap = useMemo(() => {
    if (!date || !farmName) return new Map();
    const excluded = new Set(editing ? editing.rows.map((row) => row.id) : []);
    const map = assignedDays(reports, { date, farmName, blockMap, excludeIds: excluded });
    if (editing) addLabourDays(map, editing.line.labour);
    return map;
  }, [reports, date, farmName, blockMap, editing]);

  const pointageRemaining = useMemo(
    () => remainingDays(pointageDays, assignedMap),
    [pointageDays, assignedMap],
  );

  // The labour list holds only the workers pointed for that farm and that day: the
  // farm's own workers first, then the teams, and the workers without a team last.
  const labourGroupsFor = (line) => {
    const own = new Set((line?.labour || []).map((row) => row.worker_id).filter(Boolean));
    // A worker already given to another task of the same day and farm is no longer
    // proposed: he leaves the list as soon as he is picked.
    const taken = new Set();
    [...lines, ...(editing ? [editing.line] : [])].forEach((row) => {
      if (!row || row.key === line?.key) return;
      (row.labour || []).forEach((entry) => {
        if (entry.worker_id) taken.add(entry.worker_id);
      });
    });
    const proposed = workers.filter(
      (worker) => (pointageDays.has(worker.id) || own.has(worker.id)) && !taken.has(worker.id),
    );
    const fixed = farmName ? proposed.filter((worker) => assignedToFarm(worker, farmName)) : [];
    const rest = proposed.filter((worker) => !fixed.includes(worker));
    const groups = [];
    if (fixed.length) {
      groups.push({ key: 'farm', label: t('report.labourFarmFixed', { farm: farmName }), workers: fixed });
    }
    const byTeam = new Map();
    rest.forEach((worker) => {
      const key = (worker.team || '').trim() || 'none';
      if (!byTeam.has(key)) byTeam.set(key, []);
      byTeam.get(key).push(worker);
    });
    [...byTeam.keys()]
      .sort((a, b) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)))
      .forEach((key) => {
        groups.push({
          key: `team:${key}`,
          label: key === 'none' ? t('report.noTeam') : key,
          workers: byTeam.get(key),
        });
      });
    return groups;
  };

  // Seules les stations de la ferme du rapport sont proposées, irrigation comme fertigation.
  const pumpStations = useMemo(
    () => stationsForFarm({ machines, farms, farmName }),
    [machines, farms, farmName],
  );
  const machineOptions = useMemo(
    () => machines.map((machine) => ({ value: machine.id, label: machine.name })),
    [machines],
  );
  // A report being modified replaces its own stock movements: those quantities come
  // back into the stock of their own depot before the new amounts are checked.
  const replacedMap = useMemo(() => {
    const totals = new Map();
    if (!editing) return totals;
    const ids = new Set(editing.rows.map((row) => row.id));
    movements
      .filter((movement) => ids.has(movement.report_id) && movement.kind !== 'in')
      .forEach((movement) => {
        const key = `${movement.storage_id || ''}|${movement.item_id}`;
        totals.set(key, (totals.get(key) || 0) + (Number(movement.quantity) || 0));
      });
    return totals;
  }, [editing, movements]);

  // Une station encore sans ferme retient celle que son nom désigne : l'association
  // est écrite une seule fois sur la fiche, les rapports suivants la retrouvent.
  useEffect(() => {
    if (!farms.length) return;
    const found = machines
      .filter((machine) => isPumpingMachine(machine) && !machine.farm && !detectedRef.current.has(machine.id))
      .map((machine) => ({ machine, farm: detectFarm(machine.name, farms) }))
      .filter((row) => row.farm);
    if (!found.length) return;
    const kept = new Map(found.map((row) => [row.machine.id, row.farm.name]));
    kept.forEach((_, id) => detectedRef.current.add(id));
    Promise.all([...kept.keys()].map((id) => base44.entities.Machine.update(id, { farm: kept.get(id) }))).then(() => {
      setMachines((current) => current.map((machine) => (kept.has(machine.id) ? { ...machine, farm: kept.get(machine.id) } : machine)));
    });
  }, [machines, farms]);

  // Station choisie pour une ferme : sa ferme est mémorisée sur la fiche.
  const rememberStationFarm = (machineId) => {
    const machine = machines.find((row) => row.id === machineId);
    if (!machine || machine.farm || !farmName) return;
    setMachines((current) => current.map((row) => (row.id === machineId ? { ...row, farm: farmName } : row)));
    base44.entities.Machine.update(machineId, { farm: farmName });
  };

  const ctx = {
    tasks, natures, blockGroups, blockMap, workerMap, labourGroupsFor, rateIndex, transportIndex,
    machineOptions, machineMap, pumpStations, availableInputs, items, itemMap, stockTotals, date,
    storages, invoices, onHand: storageOnHand, farmName, pointageDays, pointageRemaining, reloadTasks,
    suppliers, reloadStock,
  };

  const addLine = () => {
    const line = newLine();
    setLines((prev) => [...prev, line]);
    setOpenKey(line.key);
    setMessage(null);
  };

  const updateLine = (key, patch) => {
    setLines((prev) => prev.map((line) => (line.key === key ? { ...line, ...patch } : line)));
    setIssuesByLine((prev) => ({ ...prev, [key]: [] }));
    if (patch.pump_station_id) rememberStationFarm(patch.pump_station_id);
  };

  const removeLine = (key) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
    if (openKey === key) setOpenKey(null);
  };

  const updateEditing = (patch) => {
    setEditing((prev) => (prev ? { ...prev, line: { ...prev.line, ...patch } } : prev));
    if (patch.pump_station_id) rememberStationFarm(patch.pump_station_id);
  };

  const applyLine = async () => {
    const reportDate = editing.rows[0]?.date || date;
    setCommitting(true);
    try {
      const written = await commitLine({
        line: editing.line,
        date: reportDate,
        blockMap,
        task: taskMap[editing.line.task_id],
        workerMap,
        rateIndex,
        transportIndex,
        storages,
        invoices,
        onHand: storageOnHand,
        rows: editing.rows,
      });
      await applyReportHours({
        machines,
        added: reportHoursByMachine(written),
        removed: reportHoursByMachine(editing.rows),
      });
      setEditing(null);
      setMessage({ tone: 'success', key: 'report.lineEditDone' });
      await load();
    } catch (error) {
      setMessage({ tone: 'error', key: 'report.commitFailed' });
    } finally {
      setCommitting(false);
    }
  };

  const validateLine = async (line) => {
    const isEditingLine = !!editing && line.key === editing.line.key;
    const lineDate = isEditingLine ? editing.rows[0]?.date || date : date;
    const task = taskMap[line.task_id];
    const replaced = isEditingLine ? replacedMap : null;
    const issues = lineIssues({
      line, date: lineDate, task, blockMap, stockTotals, replaced, itemMap, t,
      storages, invoices, onHand: storageOnHand,
    });
    setIssuesByLine((prev) => ({ ...prev, [line.key]: issues }));
    if (issues.length) {
      setOpenKey(line.key);
      return;
    }
    if (isEditingLine) {
      await applyLine();
      return;
    }
    const marked = lines.map((row) => (row.key === line.key ? { ...row, validated: true } : row));
    const isLast = lines[lines.length - 1]?.key === line.key;
    if (isLast) {
      // The next task is entered on a fresh line, on the same farm and date.
      const created = newLine();
      setLines([...marked, created]);
      setOpenKey(created.key);
    } else {
      setLines(marked);
      setOpenKey(null);
    }
    setMessage({ tone: 'success', key: 'report.lineDone' });
  };

  // The whole farm's report is validated at once, then the next farm is offered.
  const commitDraft = async () => {
    const active = lines.filter(
      (line) =>
        line.task_id ||
        line.block_ids.length ||
        line.description ||
        (line.labour || []).length ||
        (line.machinery || []).length ||
        (line.inputs || []).length,
    );
    if (!active.length) return;
    const pending = active.filter((line) => !line.validated);
    if (pending.length) {
      setMessage({ tone: 'error', key: 'report.commitPending', vars: { n: pending.length } });
      return;
    }

    // The validation of a farm's report waits for the pointage of the day to be entirely
    // given out: every pointed worker must have all his days assigned to the reports.
    const left = new Map(assignedMap);
    active.forEach((line) => addLabourDays(left, line.labour));
    const notSettled = unsoldWorkers({ pointageDays, assigned: left, workerMap });
    if (notSettled.length) {
      setUnsold(notSettled);
      setMessage({ tone: 'error', key: 'report.unsoldBlocked' });
      return;
    }
    setUnsold([]);

    // Each depot answers only for its own stock: the demands of all lines are gathered
    // per depot before anything is written.
    const demand = new Map();
    active.forEach((line) =>
      mergeDemand(
        demand,
        demandByStorage({
          outflow: lineOutflow(line),
          blockIds: line.block_ids,
          blockMap,
          storages,
          invoices,
          onHand: storageOnHand,
        }),
      ),
    );
    const shortages = shortagesOf(demand, { onHand: storageOnHand, stockTotals });
    if (shortages.length) {
      setMessage({ tone: 'error', key: 'report.stockBlockedStorage' });
      return;
    }

    setCommitting(true);
    try {
      const written = [];
      for (const line of active) {
        const rows = await commitLine({
          line,
          date,
          blockMap,
          task: taskMap[line.task_id],
          workerMap,
          rateIndex,
          transportIndex,
          storages,
          invoices,
          onHand: storageOnHand,
        });
        written.push(...rows);
      }
      if (written.length) {
        await applyReportHours({ machines, added: reportHoursByMachine(written) });
      }

      if (draftId) await base44.entities.ReportDraft.delete(draftId);
      setDraftId(null);
      setLines([]);
      setOpenKey(null);
      savedRef.current = '[]';

      const index = farms.findIndex((farm) => farm.id === farmId);
      const next = farms.length > 1 ? farms[(index + 1) % farms.length] : null;
      setMessage({
        tone: 'success',
        key: next && next.id !== farmId ? 'report.commitDone' : 'report.commitDoneLast',
        vars: { farm: farmName, next: next?.name || '' },
      });

      await load();
      if (next && next.id !== farmId) setFarmId(next.id);
    } catch (error) {
      setMessage({ tone: 'error', key: 'report.commitFailed' });
    } finally {
      setCommitting(false);
    }
  };

  const startEdit = (rows) => {
    const draft = buildEditDraft(rows, movements, items);
    const total = (key) => {
      const sum = rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);
      return sum > 0 ? String(Math.round(sum * 1000) / 1000) : '';
    };
    const line = {
      key: `edit-${rows[0].id}`,
      task_id: draft.task_id,
      block_ids: rows.map((row) => row.block_id),
      description: draft.description,
      notes: draft.notes,
      pump_station_id: rows[0]?.pump_station_id || '',
      pump_hours: total('pump_hours'),
      water_m3: total('water_m3'),
      labour: draft.labour,
      machinery: draft.machinery,
      inputs: draft.inputs,
      validated: false,
    };
    setEditing({ rows, line });
    if (draft.date) setDate(draft.date);
    // The parcels of the report belong to one farm: its own parcels are shown with it.
    const reportFarm = farms.find((farm) => farm.name === blockMap[rows[0].block_id]?.farm);
    if (reportFarm && reportFarm.id !== farmId) setFarmId(reportFarm.id);
    setOpenKey(line.key);
    setEditChoice(null);
    setMessage(null);
  };

  // One report can stand for a whole entry: the scope is chosen before the form fills.
  const openEdit = (report) => {
    const group = entryReports(reports, report);
    if (group.length > 1) {
      setEditChoice({ report, group });
      return;
    }
    startEdit([report]);
  };

  const removeReport = async (report) => {
    await base44.entities.StockMovement.deleteMany({ report_id: report.id });
    await applyReportHours({ machines, removed: reportHoursByMachine([report]) });
    await base44.entities.DailyReport.delete(report.id);
    await load();
  };

  const ready = lines.filter((line) => line.validated).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('report.eyebrow')}
        title={t('report.title')}
        description={t('report.description')}
        action={
          <Link
            to="/report-import"
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.8} />
            {t('rimp.importLink')}
          </Link>
        }
      />

      <DraftHeader
        date={date}
        onDateChange={setDate}
        farms={farms}
        farmId={farmId}
        onFarmChange={setFarmId}
        saving={savingDraft}
        total={lines.length}
        ready={ready}
        committing={committing}
        onCommit={commitDraft}
      />

      {message && (
        <p
          className={cn(
            'rounded-xl border px-3 py-2 text-[12px] leading-relaxed',
            message.tone === 'success'
              ? 'border-primary/30 bg-primary/5 text-primary'
              : 'border-destructive/30 bg-destructive/5 text-destructive',
          )}
        >
          {t(message.key, message.vars || {})}
        </p>
      )}

      {editing && (
        <TaskLineCard
          line={editing.line}
          index={null}
          open={openKey === editing.line.key}
          onToggle={() => setOpenKey(openKey === editing.line.key ? null : editing.line.key)}
          onChange={updateEditing}
          onValidate={() => validateLine(editing.line)}
          onRemove={() => setEditing(null)}
          onCancelEdit={() => {
            setEditing(null);
            setOpenKey(null);
          }}
          issues={issuesByLine[editing.line.key] || []}
          ctx={{ ...ctx, replaced: replacedMap, date: editing.rows[0]?.date || date }}
        />
      )}

      <section className="space-y-3">
        {!farms.length && !loadingDraft ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="font-display text-lg tracking-tight">{t('report.noFarmTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t('report.noFarmHint')}</p>
            <Link to="/farms" className="mt-4 inline-flex text-xs font-medium text-primary hover:underline">
              {t('report.noFarmAction')}
            </Link>
          </div>
        ) : loadingDraft ? (
          <p className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
            {t('report.draftLoading')}
          </p>
        ) : lines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
            <p className="font-display text-lg tracking-tight">{t('report.linesEmptyTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t('report.linesEmpty')}</p>
            <Button type="button" onClick={addLine} className="mt-4 rounded-xl">
              <Plus className="h-4 w-4" /> {t('report.addLine')}
            </Button>
          </div>
        ) : (
          <>
            {lines.map((line, index) => (
              <TaskLineCard
                key={line.key}
                line={line}
                index={index + 1}
                open={openKey === line.key}
                onToggle={() => setOpenKey(openKey === line.key ? null : line.key)}
                onChange={(patch) => updateLine(line.key, patch)}
                onValidate={() => validateLine(line)}
                onRemove={() => removeLine(line.key)}
                issues={issuesByLine[line.key] || []}
                ctx={ctx}
              />
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={addLine} className="rounded-xl">
                <Plus className="h-4 w-4" /> {t('report.addLine')}
              </Button>
              <Button
                type="button"
                onClick={commitDraft}
                disabled={committing}
                className="ms-auto rounded-xl"
              >
                <CheckCircle2 className="h-4 w-4" />
                {committing ? t('common.saving') : t('report.commit')}
              </Button>
            </div>
          </>
        )}
      </section>

      <ReportHistory
        farms={farms}
        blocks={blocks}
        machines={machines}
        natures={natures}
        refreshKey={version}
        onEdit={openEdit}
        onDelete={removeReport}
      />

      <UnsoldDialog
        open={unsold.length > 0}
        workers={unsold}
        date={date}
        farmName={farmName}
        onClose={() => setUnsold([])}
      />

      <ReportEditDialog
        open={!!editChoice}
        count={editChoice?.group.length || 0}
        onClose={() => setEditChoice(null)}
        onSingle={() => startEdit(editChoice.group.filter((row) => row.id === editChoice.report.id))}
        onGroup={() => startEdit(editChoice.group)}
      />
    </div>
  );
}