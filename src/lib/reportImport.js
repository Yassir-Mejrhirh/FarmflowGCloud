// Lecture d'un classeur de rapports journaliers : chaque feuille est une journée.
// La position des colonnes change d'une feuille à l'autre et les cellules fusionnées
// effacent parfois des colonnes entières : les en-têtes sont donc retrouvés par leur
// libellé, jamais par leur numéro de colonne.

export const clean = (value) => String(value ?? '').trim();

export const fold = (value) =>
  clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

const num = (value) => {
  const text = clean(value).replace(/\s/g, '').replace(',', '.');
  if (!text || text === '-') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

// Une date du classeur peut être écrite en ISO, en format français ou en numéro de
// série Excel : les trois formes sont ramenées au format AAAA-MM-JJ.
export function toISODate(value) {
  const text = clean(value);
  if (!text) return '';
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const serial = num(text);
  if (serial !== null && serial > 20000 && serial < 80000) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
    return new Date(ms).toISOString().slice(0, 10);
  }
  const french = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (french) {
    const year = french[3].length === 2 ? `20${french[3]}` : french[3];
    return `${year}-${french[2].padStart(2, '0')}-${french[1].padStart(2, '0')}`;
  }
  return '';
}

const HEADER_LABELS = [
  ['place', /^lieu de travail/],
  ['work', /^superficie/],
  ['nature', /^nature de travail/],
  ['engin', /^type engins/],
  ['counterStart', /^depart compteur/],
  ['counterEnd', /^arrivee compteur/],
  ['m3', /^m3/],
  ['hours', /^heure/],
  ['matter', /^matiere/],
  ['unit', /^unite/],
  ['stockIn', /^entrees/],
  ['stockOut', /^sorties/],
  ['stockLeft', /^stock/],
  ['delivery', /^lieu ou bl/],
  ['total', /^total/],
];

function columnMap(headerRow) {
  const map = {};
  HEADER_LABELS.forEach(([key, pattern]) => {
    const index = headerRow.findIndex((cell) => pattern.test(fold(cell)));
    if (index >= 0) map[key] = index;
  });
  return map;
}

// La ferme est écrite à droite du libellé « FERME: », quelle que soit sa colonne.
function farmOf(rows, headerRow) {
  for (let i = 0; i < headerRow; i += 1) {
    const cells = rows[i] || [];
    for (let c = 0; c < cells.length; c += 1) {
      if (!/^ferme\s*:?$/.test(fold(cells[c]))) continue;
      for (let n = c + 1; n < cells.length; n += 1) {
        if (clean(cells[n])) return clean(cells[n]);
      }
    }
  }
  return '';
}

function dateOf(rows, headerRow) {
  for (let i = 0; i < headerRow; i += 1) {
    const cells = rows[i] || [];
    for (let c = 0; c < cells.length; c += 1) {
      if (!fold(cells[c]).startsWith('date')) continue;
      for (let n = c + 1; n < cells.length; n += 1) {
        const date = toISODate(cells[n]);
        if (date) return date;
      }
    }
  }
  return '';
}

const STOP_WORDS = /^(total|signature|observation|visa|responsable|arret|commentaire)/;

function parseSheet(sheet) {
  const rows = sheet.rows || [];
  const headerRow = rows.findIndex(
    (row) =>
      row.some((cell) => fold(cell).includes('nature de travail')) &&
      row.some((cell) => fold(cell).includes('superficie')),
  );
  if (headerRow < 0) {
    return { name: sheet.name, farmName: '', date: '', rows: [], issue: 'structure' };
  }

  const columns = columnMap(rows[headerRow]);
  const farmName = farmOf(rows, headerRow);
  const date = dateOf(rows, headerRow);

  // Les colonnes de main-d'œuvre sont les nombres de salaire journalier compris entre
  // la nature de travail et le total.
  const from = (columns.nature ?? -1) + 1;
  const to = columns.total ?? columns.engin ?? rows[headerRow].length;
  const wages = [];
  for (let c = from; c < to; c += 1) {
    const rate = num(rows[headerRow][c]);
    if (rate && rate > 0) wages.push({ index: c, rate: Math.round(rate * 100) / 100 });
  }

  const cellAt = (cells, key) => (columns[key] === undefined ? '' : cells[columns[key]]);

  const lines = [];
  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const cells = rows[i] || [];
    const place = clean(cellAt(cells, 'place'));
    if (!place || STOP_WORDS.test(fold(place))) continue;

    const labour = wages
      .map((wage) => ({ rate: wage.rate, days: num(cells[wage.index]) }))
      .filter((entry) => entry.days && entry.days > 0);

    const engin = clean(cellAt(cells, 'engin'));
    const hours = num(cellAt(cells, 'hours'));
    const machinery =
      engin && hours && hours > 0
        ? {
            name: engin,
            hours,
            m3: num(cellAt(cells, 'm3')),
            counterStart: num(cellAt(cells, 'counterStart')),
            counterEnd: num(cellAt(cells, 'counterEnd')),
          }
        : null;

    const matter = clean(cellAt(cells, 'matter'));
    const quantity = num(cellAt(cells, 'stockOut'));
    const input =
      matter && quantity && quantity > 0
        ? { name: matter, unit: clean(cellAt(cells, 'unit')), quantity }
        : null;

    const nature = clean(cellAt(cells, 'nature'));
    if (!nature && !labour.length && !machinery && !input) continue;

    lines.push({
      key: `${sheet.name}|${i}`,
      row: i + 1,
      place,
      nature,
      work: num(cellAt(cells, 'work')),
      delivery: clean(cellAt(cells, 'delivery')),
      labour,
      machinery,
      input,
    });
  }

  const issue = !farmName ? 'farm' : !date ? 'date' : '';
  return { name: sheet.name, farmName, date, rows: lines, issue };
}

// Résumé du classeur : feuilles, jours, fermes, salaires et éléments à rapprocher.
export function parseReportWorkbook(sheets = []) {
  const parsed = sheets.map(parseSheet);
  const wages = new Map();
  const places = new Map();
  const natures = new Map();
  const machines = new Map();
  const items = new Map();
  const dates = new Set();
  const farms = new Set();
  let totalRows = 0;

  parsed.forEach((sheet) => {
    if (sheet.farmName) farms.add(sheet.farmName);
    if (sheet.date) dates.add(sheet.date);
    totalRows += sheet.rows.length;

    sheet.rows.forEach((row) => {
      row.labour.forEach((entry) => {
        const current = wages.get(entry.rate) || { rate: entry.rate, days: 0, uses: 0 };
        current.days += entry.days;
        current.uses += 1;
        wages.set(entry.rate, current);
      });

      const placeKey = `${sheet.farmName}|${row.place}`;
      const place = places.get(placeKey) || {
        key: placeKey,
        farmName: sheet.farmName,
        place: row.place,
        rows: 0,
      };
      place.rows += 1;
      places.set(placeKey, place);

      if (row.nature) {
        const nature = natures.get(row.nature) || { key: row.nature, name: row.nature, rows: 0 };
        nature.rows += 1;
        natures.set(row.nature, nature);
      }

      if (row.machinery) {
        const machine = machines.get(row.machinery.name) || {
          key: row.machinery.name,
          name: row.machinery.name,
          hours: 0,
          rows: 0,
        };
        machine.hours += row.machinery.hours;
        machine.rows += 1;
        machines.set(row.machinery.name, machine);
      }

      if (row.input) {
        const item = items.get(row.input.name) || {
          key: row.input.name,
          name: row.input.name,
          unit: row.input.unit,
          quantity: 0,
          rows: 0,
        };
        item.quantity += row.input.quantity;
        item.rows += 1;
        items.set(row.input.name, item);
      }
    });
  });

  const issues = parsed
    .filter((sheet) => sheet.issue)
    .map((sheet) => ({ sheet: sheet.name, key: sheet.issue }));

  return {
    sheets: parsed,
    dates: [...dates].sort(),
    farmNames: [...farms].sort((a, b) => a.localeCompare(b)),
    wages: [...wages.values()].sort((a, b) => a.rate - b.rate),
    places: [...places.values()],
    natures: [...natures.values()],
    machines: [...machines.values()],
    items: [...items.values()],
    issues,
    totalRows,
  };
}