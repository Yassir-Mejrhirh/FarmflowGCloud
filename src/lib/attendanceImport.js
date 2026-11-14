// Lecture d'une liste de pointage sur une quinzaine : le nom de l'ouvrier donne la
// ligne, l'en-tête de colonne donne le jour, et la couleur de la cellule donne la
// ferme. La valeur de la cellule est le nombre de jours travaillés (1, 0,5, …).

const pad = (value) => String(value).padStart(2, '0');

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const compact = (value) => normalize(value).replace(/[^a-z0-9\u0600-\u06FF]/g, '');

function iso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return '';
  }
  return `${year}-${pad(month)}-${pad(day)}`;
}

// Un numéro de série Excel compte les jours depuis le 30/12/1899.
function fromSerial(serial) {
  const date = new Date(Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000);
  return iso(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

// Un en-tête de colonne donne la date du jour ; sans mois ni année, la date de
// référence complète l'en-tête.
export function parseHeaderDate(value, reference = new Date()) {
  const text = String(value ?? '').trim();
  if (!text) return '';

  const yearFirst = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(text);
  if (yearFirst) return iso(Number(yearFirst[1]), Number(yearFirst[2]), Number(yearFirst[3]));

  const dayFirst = /^(\d{1,2})[/\-.\s](\d{1,2})(?:[/\-.\s](\d{2,4}))?$/.exec(text);
  if (dayFirst) {
    const day = Number(dayFirst[1]);
    const month = Number(dayFirst[2]);
    let year = reference.getFullYear();
    if (dayFirst[3]) {
      year = Number(dayFirst[3]);
      if (dayFirst[3].length === 2) year += 2000;
    }
    return iso(year, month, day);
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    const number = Number(text);
    if (number >= 20000 && number <= 80000) return fromSerial(number);
    if (number >= 1 && number <= 31) {
      return iso(reference.getFullYear(), reference.getMonth() + 1, number);
    }
  }

  return '';
}

export function workerIndexes(workers = []) {
  const map = new Map();
  workers.forEach((worker) => {
    const full = normalize(worker.name);
    if (full && !map.has(full)) map.set(full, worker);
    const short = compact(worker.name);
    if (short && !map.has(short)) map.set(short, worker);
  });
  return map;
}

export function findWorker(index, name) {
  return index.get(normalize(name)) || index.get(compact(name)) || null;
}

// Ligne d'en-tête : celle qui contient le plus de jours reconnus.
export function detectGrid(rows, reference = new Date()) {
  let headerIndex = -1;
  let best = 0;
  const limit = Math.min(rows.length, 15);
  for (let row = 0; row < limit; row += 1) {
    const count = (rows[row] || []).filter((cell) => parseHeaderDate(cell, reference)).length;
    if (count > best) {
      best = count;
      headerIndex = row;
    }
  }
  if (headerIndex < 0 || best < 2) return null;

  const dayColumns = [];
  (rows[headerIndex] || []).forEach((cell, index) => {
    const date = parseHeaderDate(cell, reference);
    if (date) dayColumns.push({ index, date, label: String(cell ?? '').trim() });
  });
  return { headerIndex, dayColumns };
}

// Colonne des noms : celle où les ouvriers connus se retrouvent le plus.
export function findNameColumn(rows, headerIndex, dayColumns, workers = []) {
  const blocked = new Set(dayColumns.map((column) => column.index));
  const index = workerIndexes(workers);
  const body = rows.slice(headerIndex + 1);
  const width = body.reduce((widest, row) => Math.max(widest, row?.length || 0), 0);

  let bestIndex = -1;
  let bestScore = 0;
  let fallback = -1;

  for (let column = 0; column < width; column += 1) {
    if (blocked.has(column)) continue;
    let score = 0;
    let hasText = false;
    body.forEach((row) => {
      const value = String(row?.[column] ?? '').trim();
      if (!value) return;
      if (findWorker(index, value)) score += 2;
      else if (/[a-zA-Z\u0600-\u06FF]/.test(value) && value.length >= 3) hasText = true;
    });
    if (hasText && fallback < 0) fallback = column;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = column;
    }
  }

  return bestScore > 0 ? bestIndex : fallback;
}

// Couleurs présentes dans les colonnes de jours, avec le nombre de cellules.
export function detectColors(rows, fills, grid) {
  const counts = new Map();
  for (let row = grid.headerIndex + 1; row < rows.length; row += 1) {
    grid.dayColumns.forEach(({ index }) => {
      const color = String(fills?.[row]?.[index] || '').toUpperCase();
      if (!color) return;
      counts.set(color, (counts.get(color) || 0) + 1);
    });
  }
  return [...counts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count);
}

// Nombre de jours écrit dans la cellule : un nombre, une fraction ou un simple
// signe de présence. Une cellule colorée sans valeur compte une journée.
export function cellDays(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return 1;

  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(text);
  if (fraction && Number(fraction[2]) > 0) return Number(fraction[1]) / Number(fraction[2]);

  const decimals = Number(text.replace(',', '.'));
  if (!Number.isNaN(decimals)) return decimals > 0 ? decimals : 0;

  if (/^(x|o|v|✓|✔|p|présent|present|حاضر|ح)$/i.test(text)) return 1;
  if (/^(demi|½|نصف)$/i.test(text)) return 0.5;
  return 1;
}

const round = (value) => Math.round(value * 100) / 100;

// Pointages lus dans le classeur : une ligne par ouvrier, par jour et par ferme.
export function buildAnalysis({ rows, fills, grid, nameColumn, workers, farms, colorMap }) {
  const index = workerIndexes(workers);
  const farmById = new Map(farms.map((farm) => [farm.id, farm]));
  const merged = new Map();
  const unknown = new Map();
  const unmapped = new Set();
  const missingColor = { count: 0, samples: [] };

  for (let row = grid.headerIndex + 1; row < rows.length; row += 1) {
    const cells = rows[row] || [];
    const name = String(cells[nameColumn] ?? '').trim();
    if (!name) continue;
    const worker = findWorker(index, name);

    grid.dayColumns.forEach(({ index: column, date }) => {
      const raw = String(cells[column] ?? '').trim();
      const color = String(fills?.[row]?.[column] || '').toUpperCase();

      if (!color) {
        if (raw) {
          missingColor.count += 1;
          if (missingColor.samples.length < 4) missingColor.samples.push(`${name} · ${date}`);
        }
        return;
      }

      const farmId = colorMap[color] || '';
      if (!farmId || !farmById.has(farmId)) {
        unmapped.add(color);
        return;
      }

      const days = cellDays(raw);
      if (!days) return;

      if (!worker) {
        unknown.set(name, (unknown.get(name) || 0) + 1);
        return;
      }

      const key = `${worker.id}|${date}|${farmId}`;
      const found = merged.get(key);
      if (found) {
        found.days = round(found.days + days);
      } else {
        merged.set(key, {
          date,
          worker_id: worker.id,
          worker_name: worker.name,
          farm_id: farmId,
          farm_name: farmById.get(farmId).name,
          color,
          days,
        });
      }
    });
  }

  const entries = [...merged.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.farm_name.localeCompare(b.farm_name) ||
      a.worker_name.localeCompare(b.worker_name),
  );

  return {
    entries,
    unknown: [...unknown.entries()].map(([name, count]) => ({ name, count })),
    unmapped: [...unmapped],
    missingColor,
  };
}

// Feuilles de pointage à écrire : une par jour et par ferme.
export function groupSheets(entries) {
  const groups = new Map();
  entries.forEach((entry) => {
    const key = `${entry.date}|${entry.farm_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: entry.date,
        farm_id: entry.farm_id,
        farm_name: entry.farm_name,
        lines: new Map(),
      });
    }
    const group = groups.get(key);
    group.lines.set(entry.worker_id, round((group.lines.get(entry.worker_id) || 0) + entry.days));
  });
  return [...groups.values()];
}