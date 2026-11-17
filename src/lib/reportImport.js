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

// La valeur suit le libellé, dans la première cellule non vide à sa droite.
function labelValue(cells, start, pick) {
  for (let n = start + 1; n < cells.length; n += 1) {
    const value = pick(cells[n]);
    if (value) return value;
  }
  return '';
}

const STOP_WORDS = /^(total|signature|observation|visa|responsable|arret|commentaire)/;

// Colonnes de main-d'œuvre : les nombres de salaire journalier situés entre la nature de
// travail et le total. Elles sont relues à chaque en-tête, une feuille pouvant contenir
// plusieurs sections.
function wageColumns(cells, columns) {
  const from = (columns.nature ?? -1) + 1;
  const to = columns.total ?? columns.engin ?? cells.length;
  const wages = [];
  for (let c = from; c < to; c += 1) {
    const rate = num(cells[c]);
    if (rate && rate > 0) wages.push({ index: c, rate: Math.round(rate * 100) / 100 });
  }
  return wages;
}

// Une même feuille peut contenir plusieurs fermes : « FERME: » réapparaît alors plus bas,
// et les lignes qui suivent prennent la ferme active. La première ferme trouvée n'est
// donc plus imposée à toute la feuille, et la date est relue de la même façon.
function parseSheet(sheet) {
  const rows = sheet.rows || [];
  const lines = [];
  const farmNames = [];
  const dates = [];
  const remember = (list, value) => {
    if (value && !list.includes(value)) list.push(value);
  };

  let columns = null;
  let wages = [];
  let farmName = '';
  let date = '';

  const cellAt = (cells, key) => (columns[key] === undefined ? '' : cells[columns[key]]);

  for (let i = 0; i < rows.length; i += 1) {
    const cells = rows[i] || [];
    const folded = cells.map((cell) => fold(cell));

    // Nouvelle section : l'en-tête des colonnes se répète.
    if (
      folded.some((cell) => cell.includes('nature de travail')) &&
      folded.some((cell) => cell.includes('superficie'))
    ) {
      columns = columnMap(cells);
      wages = wageColumns(cells, columns);
      continue;
    }

    // Libellés de section : la ferme (et la date) en vigueur change à partir d'ici.
    let farmLabel = false;
    folded.forEach((cell, index) => {
      if (/^ferme\s*:?$/.test(cell)) {
        const value = labelValue(cells, index, clean);
        if (!value) return;
        farmName = value;
        remember(farmNames, value);
        farmLabel = true;
      } else if (cell.startsWith('date')) {
        const value = labelValue(cells, index, toISODate);
        if (!value) return;
        date = value;
        remember(dates, value);
      }
    });
    if (farmLabel) continue;

    if (!columns) continue;

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
      farmName,
      date,
      place,
      nature,
      work: num(cellAt(cells, 'work')),
      delivery: clean(cellAt(cells, 'delivery')),
      labour,
      machinery,
      input,
    });
  }

  const issue = !lines.length
    ? 'structure'
    : lines.some((line) => !line.farmName)
      ? 'farm'
      : lines.some((line) => !line.date)
        ? 'date'
        : '';

  return {
    name: sheet.name,
    farmName: farmNames[0] || '',
    farmNames,
    date: dates[0] || '',
    dates,
    rows: lines,
    issue,
  };
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
    (sheet.farmNames || []).forEach((name) => farms.add(name));
    (sheet.dates || []).forEach((date) => dates.add(date));
    totalRows += sheet.rows.length;

    sheet.rows.forEach((row) => {
      row.labour.forEach((entry) => {
        const current = wages.get(entry.rate) || { rate: entry.rate, days: 0, uses: 0 };
        current.days += entry.days;
        current.uses += 1;
        wages.set(entry.rate, current);
      });

      const placeKey = `${row.farmName}|${row.place}`;
      const place = places.get(placeKey) || {
        key: placeKey,
        farmName: row.farmName,
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