// Rapprochement d'un classeur de pointage : lecture des noms et des journées, mise
// en forme des lignes validées, comparaison avec les pointages déjà enregistrés et
// écriture des feuilles au moment de l'intégration.

import { base44 } from '@/api/base44Client';
import { cellDays, detectColors, detectGrid, findNameColumn, groupSheets } from '@/lib/attendanceImport';
import { fetchList } from '@/lib/data';
import { todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { nameKey } from '@/lib/nameMatch';

const round = (value) => Math.round(value * 100) / 100;

// Grille du classeur : jours, colonne des noms, couleurs et lignes d'ouvriers.
export function analyseSheet({ sheet, reference, farms = [], workers = [] }) {
  const grid = detectGrid(sheet.rows, reference, sheet.fills, farms);
  if (!grid) return null;
  const nameColumn = findNameColumn(sheet.rows, grid, workers);
  if (nameColumn < 0) return null;

  return {
    grid,
    nameColumn,
    colors: detectColors(sheet.rows, sheet.fills, grid),
    names: readNames({ rows: sheet.rows, fills: sheet.fills, grid, nameColumn, farms }),
  };
}

// Une entrée par nom écrit dans le classeur, avec ses journées et leur ferme.
function readNames({ rows, fills, grid, nameColumn, farms }) {
  const farmByColor = new Map();
  (farms || []).forEach((farm) => {
    const color = String(farm.color || '').toUpperCase();
    if (color) farmByColor.set(color, farm);
  });

  const found = new Map();

  for (let row = grid.dataStart; row < rows.length; row += 1) {
    const cells = rows[row] || [];
    const name = String(cells[nameColumn] ?? '').trim();
    if (!name) continue;

    const worked = [];
    grid.dayColumns.forEach(({ index: column, date }) => {
      const raw = String(cells[column] ?? '').trim();
      const cellColor = String(fills?.[row]?.[column] || '').toUpperCase();
      if (!raw && !cellColor) return;
      const days = cellDays(raw);
      if (!days) return;
      const color = grid.columnColors?.[column] || cellColor;
      const farm = farmByColor.get(color) || null;
      worked.push({ date, days, color, farm_id: farm?.id || '', farm_name: farm?.name || '' });
    });

    if (!worked.length) continue;

    const entry = found.get(name) || { name, key: nameKey(name), cells: [], total: 0 };
    worked.forEach((cell) => {
      entry.cells.push(cell);
      entry.total = round(entry.total + cell.days);
    });
    found.set(name, entry);
  }

  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Lignes validées : un ouvrier et une ferme donnent une ligne, les journées sont
// additionnées quand un même ouvrier est écrit deux fois dans le classeur.
export function buildLines({ names = [], resolution = {}, workers = [], wageRates = [], periodStart }) {
  const workersById = new Map((workers || []).map((worker) => [worker.id, worker]));
  const rateIndex = buildRateIndex(wageRates);
  const lines = new Map();

  names.forEach((entry) => {
    const workerId = resolution[entry.name];
    if (!workerId) return;
    const worker = workersById.get(workerId);
    if (!worker) return;

    entry.cells.forEach((cell) => {
      // Une colonne sans ferme reconnue ne peut pas être pointée.
      if (!cell.farm_id) return;
      const key = `${workerId}|${cell.farm_id}`;
      const line =
        lines.get(key) ||
        {
          worker_id: workerId,
          worker_name: worker.name,
          farm_id: cell.farm_id,
          farm_name: cell.farm_name,
          daily_rate: rateFor(worker, rateIndex, periodStart),
          days: {},
          total_days: 0,
          source_names: [],
        };
      line.days[cell.date] = round((line.days[cell.date] || 0) + cell.days);
      line.total_days = round(line.total_days + cell.days);
      if (!line.source_names.includes(entry.name)) line.source_names.push(entry.name);
      lines.set(key, line);
    });
  });

  return [...lines.values()].sort(
    (a, b) => a.worker_name.localeCompare(b.worker_name) || a.farm_name.localeCompare(b.farm_name),
  );
}

// Journées restées sans ferme : elles ne peuvent pas être rapprochées.
export function daysWithoutFarm({ names = [], resolution = {} }) {
  let count = 0;
  names.forEach((entry) => {
    if (!resolution[entry.name]) return;
    entry.cells.forEach((cell) => {
      if (!cell.farm_id) count += 1;
    });
  });
  return count;
}

// Une ligne par jour et par ferme, dans la forme lue par le module Pointage.
export function toEntries(lines = []) {
  const entries = [];
  lines.forEach((line) => {
    Object.entries(line.days || {}).forEach(([date, days]) => {
      const value = Number(days) || 0;
      if (value <= 0 || !line.worker_id || !line.farm_id) return;
      entries.push({
        date,
        worker_id: line.worker_id,
        worker_name: line.worker_name,
        farm_id: line.farm_id,
        farm_name: line.farm_name,
        days: value,
      });
    });
  });
  return entries;
}

// Feuilles à écrire : celles qui existent déjà sont complétées, jamais remplacées.
export function buildSheetWrites(entries = [], existing = []) {
  const groups = groupSheets(entries);
  const byKey = new Map((existing || []).map((row) => [`${row.date}|${row.farm_id}`, row]));
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

  return { creations, updates };
}

// Écarts entre le classeur et le pointage déjà saisi, pour la revue avant validation.
export function compareWithPointages({ lines = [], sheets = [] }) {
  const existing = new Map();
  (sheets || []).forEach((sheet) => {
    (sheet.lines || []).forEach((line) => {
      existing.set(`${sheet.date}|${sheet.farm_id}|${line.worker_id}`, Number(line.days) || 0);
    });
  });

  const differences = [];
  let newCells = 0;

  lines.forEach((line) => {
    Object.entries(line.days || {}).forEach(([date, days]) => {
      const key = `${date}|${line.farm_id}|${line.worker_id}`;
      if (!existing.has(key)) {
        newCells += 1;
        return;
      }
      const before = existing.get(key);
      if (Math.abs(before - Number(days)) < 0.001) return;
      differences.push({
        date,
        farm_name: line.farm_name,
        worker_name: line.worker_name,
        from: before,
        to: Number(days),
      });
    });
  });

  differences.sort((a, b) => a.date.localeCompare(b.date) || a.worker_name.localeCompare(b.worker_name));
  return { differences, newCells };
}

// Contenu de la liste d'attente : tout ce qu'il faut pour reprendre la vérification
// plus tard, sans écrire aucune feuille de pointage à ce stade.
export function buildQueuePayload({ fileName, names = [], resolution = {}, lines = [], period = {} }) {
  const kept = lines.filter((line) => line.total_days > 0);
  return {
    file_name: fileName,
    status: 'pending',
    period_start: period.from || '',
    period_end: period.to || '',
    farm_names: [...new Set(kept.map((line) => line.farm_name).filter(Boolean))],
    lines: kept.map((line) => ({
      worker_id: line.worker_id,
      worker_name: line.worker_name,
      farm_id: line.farm_id,
      farm_name: line.farm_name,
      daily_rate: round(Number(line.daily_rate) || 0),
      total_days: round(line.total_days),
      days: line.days,
      source_names: line.source_names || [],
    })),
    unmatched: names
      .filter((entry) => !resolution[entry.name])
      .map((entry) => ({ name: entry.name, days: round(entry.total) })),
    workers_count: new Set(kept.map((line) => line.worker_id)).size,
    total_days: round(kept.reduce((sum, line) => sum + line.total_days, 0)),
    total_cost: round(
      kept.reduce((sum, line) => sum + line.total_days * (Number(line.daily_rate) || 0), 0),
    ),
  };
}

// Feuilles de pointage existantes sur la période et les fermes du rapprochement.
export async function fetchPeriodSheets({ dates = [], farmIds = [] }) {
  if (!dates.length || !farmIds.length) return [];
  return fetchList(
    base44.entities.AttendanceSheet,
    { date: { $in: dates }, farm_id: { $in: farmIds } },
    { limit: 500 },
  );
}

// Intégration au module Pointage : les journées validées rejoignent les feuilles
// existantes de la période, puis la mise en attente passe en « intégré ».
export async function integrateQueueItem(item) {
  const entries = toEntries(item?.lines || []);
  if (!entries.length) return { creations: 0, updates: 0 };

  const dates = [...new Set(entries.map((entry) => entry.date))].sort();
  const farmIds = [...new Set(entries.map((entry) => entry.farm_id))];
  const existing = await fetchPeriodSheets({ dates, farmIds });
  const { creations, updates } = buildSheetWrites(entries, existing);

  if (creations.length) await base44.entities.AttendanceSheet.bulkCreate(creations);
  if (updates.length) await base44.entities.AttendanceSheet.bulkUpdate(updates);

  await base44.entities.AttendanceReconciliation.update(item.id, {
    status: 'applied',
    applied_at: todayISO(),
  });

  return { creations: creations.length, updates: updates.length };
}