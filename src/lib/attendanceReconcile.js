// Rapprochement d'un classeur de pointage : lecture des noms et des journées, mise
// en forme des lignes validées, comparaison avec les pointages déjà enregistrés et
// écriture des feuilles au moment de l'intégration.

import { base44 } from '@/api/base44Client';
import { cellDays, detectColors, detectGrid, findNameColumn, groupSheets } from '@/lib/attendanceImport';
import { fetchList } from '@/lib/data';
import { todayISO } from '@/lib/format';
import { buildRateIndex, rateFor } from '@/lib/wageRates';
import { nameKey } from '@/lib/nameMatch';
import { guessMapping, parseNumber } from '@/lib/workerImport';

const round = (value) => Math.round(value * 100) / 100;

const normalizeText = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, '');

// Titres lus de haut en bas : la ligne des dates d'abord, puis les lignes de titre
// au-dessus, où l'équipe et le salaire sont parfois écrits seuls.
const titleRows = (headerIndex) => [
  headerIndex,
  ...Array.from({ length: headerIndex }, (_, index) => headerIndex - 1 - index),
];

const TEAM_TITLES = ['equipe', 'team', 'groupe', 'الفريق'];

// Colonne d'équipe : reconnue uniquement à l'identique, pour ne pas confondre un
// titre « Équipe Yassir » écrit dans une cellule avec un en-tête de colonne.
function teamColumnOf(rows, headerIndex, terms = {}) {
  const wanted = new Set([...(terms.team || []), ...TEAM_TITLES].map(normalizeText).filter(Boolean));
  for (const rowIndex of titleRows(headerIndex)) {
    const cells = rows[rowIndex] || [];
    for (let column = 0; column < cells.length; column += 1) {
      const text = normalizeText(cells[column]);
      if (text && wanted.has(text)) return column;
    }
  }
  return -1;
}

// Titres d'équipe (« Équipe Yassir ») écrits seuls : ils coiffent tout le classeur
// ou, quand ils sont dans la liste, ouvrent une section d'ouvriers.
const stripAccents = (value) =>
  String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();

const TEAM_LABEL = /^(?:equipe|team|groupe|الفريق)\b\s*[:\-–.]?\s*/i;

const knownList = (names = []) =>
  names
    .map((name) => ({ name: String(name || '').trim(), key: normalizeText(name) }))
    .filter((team) => team.name && team.key.length >= 3);

// Une équipe déjà connue est reprise avec son écriture exacte ; sinon le nom écrit
// après le mot « Équipe » est retenu.
function teamFromCells(cells = [], known = []) {
  for (const cell of cells) {
    const text = String(cell ?? '').trim();
    if (!text || text.length > 80) continue;
    const key = normalizeText(text);
    const found = known.find((team) => key.includes(team.key));
    if (found) return found.name;
    const plain = stripAccents(text);
    const label = TEAM_LABEL.exec(plain);
    if (!label) continue;
    const rest = plain.slice(label[0].length).replace(/[\s:\-–.]+$/, '').trim();
    if (rest) return rest;
  }
  return '';
}

export function teamFromTitles(rows = [], dataStart = 1, knownTeams = []) {
  const known = knownList(knownTeams);
  for (let row = 0; row < Math.min(dataStart, rows.length); row += 1) {
    const team = teamFromCells(rows[row] || [], known);
    if (team) return team;
  }
  return '';
}

// Colonne sans titre, repérée par son contenu : des montants réguliers sur les
// lignes d'ouvriers. Une numérotation 1, 2, 3… ou un matricule ne compte pas.
function amountColumn({ rows, grid, skip = new Set() }) {
  const blocked = new Set([...grid.dayColumns.map((column) => column.index), ...skip]);
  const width = rows
    .slice(grid.dataStart)
    .reduce((widest, row) => Math.max(widest, row?.length || 0), 0);
  let best = -1;
  let bestRatio = 0;

  for (let column = 0; column < width; column += 1) {
    if (blocked.has(column)) continue;
    const values = [];
    let filled = 0;
    for (let row = grid.dataStart; row < rows.length; row += 1) {
      const text = String(rows[row]?.[column] ?? '').trim();
      if (!text) continue;
      filled += 1;
      const value = parseNumber(text);
      if (value > 0) values.push(value);
    }
    if (filled < 2 || values.length < 2) continue;
    if (values.every((value, index) => value === index + 1)) continue;
    const plausible = values.filter((value) => value >= 10 && value <= 5000).length;
    if (plausible * 2 < values.length) continue;
    const ratio = values.length / filled;
    if (ratio >= 0.8 && ratio > bestRatio) {
      best = column;
      bestRatio = ratio;
    }
  }

  return best;
}

// Colonne de salaire : son titre d'abord, puis son contenu à défaut de titre.
function salaryColumnOf({ rows, grid, nameColumn, teamColumn, terms = {} }) {
  for (const rowIndex of titleRows(grid.headerIndex)) {
    const mapping = guessMapping(rows[rowIndex] || [], terms);
    const column = mapping.daily_rate;
    if (column === undefined || column < 0) continue;
    if (column === nameColumn || column === teamColumn) continue;
    if (grid.dayColumns.some((day) => day.index === column)) continue;
    return column;
  }
  return amountColumn({ rows, grid, skip: new Set([nameColumn, teamColumn]) });
}

// Grille du classeur : jours, colonne des noms, couleurs et lignes d'ouvriers.
// Quand une quinzaine est choisie, seules ses journées sont retenues.
export function analyseSheet({ sheet, reference, farms = [], workers = [], period = null, terms = {} }) {
  const grid = detectGrid(sheet.rows, reference, sheet.fills, farms);
  if (!grid) return null;
  if (period?.start && period?.end) {
    grid.dayColumns = grid.dayColumns.filter(({ date }) => date >= period.start && date <= period.end);
  }
  const nameColumn = findNameColumn(sheet.rows, grid, workers);
  if (nameColumn < 0) return null;

  // Équipe et salaire : une colonne reconnue par son titre, sinon l'équipe écrite en
  // première ligne et une colonne de montants. Tout reste modifiable à l'écran.
  const knownTeams = [...new Set((workers || []).map((worker) => String(worker.team || '').trim()))]
    .filter(Boolean);
  // La colonne des noms ne peut pas être celle de l'équipe : un titre « Équipe » posé
  // au-dessus de la liste ne doit pas transformer chaque nom en équipe.
  const found = teamColumnOf(sheet.rows, grid.headerIndex, terms);
  const teamColumn = found === nameColumn ? -1 : found;
  const titleTeam = teamFromTitles(sheet.rows, grid.dataStart, knownTeams);
  const salaryColumn = salaryColumnOf({
    rows: sheet.rows,
    grid,
    nameColumn,
    teamColumn,
    terms,
  });

  const names = readNames({
    rows: sheet.rows,
    fills: sheet.fills,
    grid,
    nameColumn,
    farms,
    teamColumn,
    titleTeam,
    knownTeams,
    salaryColumn,
  });

  return {
    grid,
    nameColumn,
    teamColumn,
    titleTeam,
    teams: [...new Set(names.map((entry) => entry.team).filter(Boolean))],
    salaryColumn,
    colors: detectColors(sheet.rows, sheet.fills, grid),
    names,
  };
}

// Une entrée par nom écrit dans le classeur, avec ses journées et leur ferme.
function readNames({
  rows, fills, grid, nameColumn, farms, teamColumn = -1, titleTeam = '', knownTeams = [], salaryColumn = -1,
}) {
  const farmByColor = new Map();
  (farms || []).forEach((farm) => {
    const color = String(farm.color || '').toUpperCase();
    if (color) farmByColor.set(color, farm);
  });

  const found = new Map();
  const known = knownList(knownTeams);
  let sectionTeam = '';

  for (let row = grid.dataStart; row < rows.length; row += 1) {
    const cells = rows[row] || [];

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

    // Une ligne sans journée est un titre : si elle nomme une équipe, elle ouvre une
    // section et ses ouvriers en héritent jusqu'au titre d'équipe suivant.
    if (!worked.length) {
      const section = teamFromCells(cells, known);
      if (section) sectionTeam = section;
      continue;
    }

    const name = String(cells[nameColumn] ?? '').trim();
    if (!name) continue;

    const entry = found.get(name) || { name, key: nameKey(name), cells: [], total: 0, team: '', salary: '' };
    const team = teamColumn >= 0 ? String(cells[teamColumn] ?? '').trim() : '';
    const salary = salaryColumn >= 0 ? parseNumber(cells[salaryColumn]) : 0;
    if (!entry.team) entry.team = team || sectionTeam || titleTeam;
    if (!entry.salary && salary > 0) entry.salary = salary;
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