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

// Noms de mois écrits en toutes lettres, en français et en arabe.
const MONTH_NAMES = {
  janvier: 1, janv: 1, jan: 1, fevrier: 2, fevr: 2, fev: 2,
  mars: 3, mar: 3, avril: 4, avr: 4, mai: 5, juin: 6,
  juillet: 7, juil: 7, aout: 8, aou: 8, septembre: 9, sept: 9, sep: 9,
  octobre: 10, oct: 10, novembre: 11, nov: 11, decembre: 12, dec: 12,
  'يناير': 1, 'فبراير': 2, 'مارس': 3, 'ابريل': 4, 'أبريل': 4, 'ماي': 5, 'مايو': 5,
  'يونيو': 6, 'يوليوز': 7, 'يوليو': 7, 'غشت': 8, 'اغسطس': 8, 'أغسطس': 8,
  'شتنبر': 9, 'سبتمبر': 9, 'اكتوبر': 10, 'أكتوبر': 10, 'نونبر': 11, 'نوفمبر': 11,
  'دجنبر': 12, 'ديسمبر': 12,
};

const monthNumber = (word) => MONTH_NAMES[normalize(word).replace(/\./g, '')] || 0;

// Un en-tête de colonne peut commencer par le jour de la semaine (« sam 01/11 »).
const WEEKDAY = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|lun|mar|mer|jeu|ven|sam|dim|mon|tue|wed|thu|fri|sat|sun|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت|الأحد|الاحد)\s*\.?\s*/i;

// Un en-tête de colonne donne la date du jour ; sans mois ni année, la date de
// référence complète l'en-tête.
export function parseHeaderDate(value, reference = new Date()) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const text = raw.replace(WEEKDAY, '').trim();
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

  // « 3 nov », « 03-nov-2026 », « 3 نوفمبر ».
  const named = /^(\d{1,2})[\s./-]*([a-z\u0600-\u06FF]{3,})[\s./-]*(\d{2,4})?$/i.exec(text);
  if (named) {
    const month = monthNumber(named[2]);
    if (month) {
      let year = reference.getFullYear();
      if (named[3]) {
        year = Number(named[3]);
        if (named[3].length === 2) year += 2000;
      }
      return iso(year, month, Number(named[1]));
    }
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

// Grille du classeur : la ligne des dates (en général la première), puis la ligne
// d'attribution des fermes qui suit et colore les colonnes. Les pointages
// commencent sous ces deux lignes.
export function detectGrid(rows, reference = new Date(), fills = [], farms = []) {
  const farmNames = new Set(farms.map((farm) => normalize(farm.name)).filter(Boolean));
  let headerIndex = -1;
  let best = 0;
  const limit = Math.min(rows.length, 10);
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

  // Ligne d'attribution : elle colore la plupart des colonnes de jours et ne
  // porte pas de valeur de présence, contrairement à une ligne d'ouvrier.
  const threshold = Math.max(2, Math.ceil(dayColumns.length * 0.6));
  let colorRow = -1;
  for (let row = headerIndex + 1; row <= Math.min(headerIndex + 2, rows.length - 1); row += 1) {
    if (!rows[row]) continue;
    const colored = dayColumns.filter(({ index }) => String(fills?.[row]?.[index] || '')).length;
    const filled = dayColumns.filter(({ index }) => /^\d/.test(String(rows[row][index] ?? '').trim())).length;
    const named = farmNames.size > 0 && (rows[row] || []).some((cell) => farmNames.has(normalize(cell)));
    if ((colored >= threshold && filled <= Math.floor(dayColumns.length * 0.2)) || (named && filled === 0)) {
      colorRow = row;
      break;
    }
  }

  const columnColors = {};
  if (colorRow >= 0) {
    dayColumns.forEach(({ index }) => {
      const color = String(fills?.[colorRow]?.[index] || '').toUpperCase();
      if (color) columnColors[index] = color;
    });
  }

  return {
    headerIndex,
    colorRow,
    columnColors,
    dataStart: (colorRow >= 0 ? colorRow : headerIndex) + 1,
    dayColumns,
  };
}

// Colonne des noms : celle où les ouvriers connus se retrouvent le plus.
export function findNameColumn(rows, grid, workers = []) {
  const blocked = new Set(grid.dayColumns.map((column) => column.index));
  const index = workerIndexes(workers);
  const body = rows.slice(grid.dataStart);
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
  const bump = (color) => {
    if (color) counts.set(color, (counts.get(color) || 0) + 1);
  };
  // Les couleurs de la ligne d'attribution donnent la ferme de chaque colonne.
  Object.values(grid.columnColors || {}).forEach(bump);
  for (let row = grid.dataStart; row < rows.length; row += 1) {
    grid.dayColumns.forEach(({ index }) => bump(String(fills?.[row]?.[index] || '').toUpperCase()));
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
  const columns = grid.dayColumns.map(({ index: column, date }) => ({
    column,
    date,
    color: grid.columnColors?.[column] || '',
  }));

  for (let row = grid.dataStart; row < rows.length; row += 1) {
    const cells = rows[row] || [];
    const name = String(cells[nameColumn] ?? '').trim();
    if (!name) continue;
    const worker = findWorker(index, name);

    columns.forEach(({ column, date, color: columnColor }) => {
      const raw = String(cells[column] ?? '').trim();
      // La couleur de la ligne d'attribution donne la ferme de la colonne ; à
      // défaut, la couleur de la cellule de présence la donne.
      const cellColor = String(fills?.[row]?.[column] || '').toUpperCase();
      const color = columnColor || cellColor;

      // Une cellule vide ne compte que si elle est elle-même colorée.
      if (!raw && !cellColor) return;

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