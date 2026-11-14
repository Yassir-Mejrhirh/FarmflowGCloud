// Lecture d'un classeur Excel (.xlsx) sans bibliothèque : un .xlsx est une archive
// ZIP dont les feuilles sont du XML. L'archive est ouverte à la main et le contenu
// est décompressé avec l'API du navigateur.
// La couleur de fond de chaque cellule est lue dans styles.xml : c'est elle qui
// identifie la ferme des pointages importés.

const decoder = new TextDecoder('utf-8');

const inflate = async (bytes) => {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
};

async function openZip(buffer) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  // Le répertoire central est décrit juste avant la fin du fichier.
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66000); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip');

  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries = new Map();

  for (let i = 0; i < count; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, { method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  return {
    async text(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const localNameLength = view.getUint16(entry.localOffset + 26, true);
      const localExtraLength = view.getUint16(entry.localOffset + 28, true);
      const start = entry.localOffset + 30 + localNameLength + localExtraLength;
      const data = bytes.subarray(start, start + entry.compressedSize);
      const raw = entry.method === 0 ? data : await inflate(data);
      return decoder.decode(raw);
    },
  };
}

async function firstSheetPath(zip) {
  const workbook = await zip.text('xl/workbook.xml');
  const rels = await zip.text('xl/_rels/workbook.xml.rels');
  const sheetId = workbook?.match(/<sheet[^>]*r:id="([^"]+)"/)?.[1];
  if (sheetId && rels) {
    const doc = new DOMParser().parseFromString(rels, 'application/xml');
    const link = [...doc.getElementsByTagName('Relationship')].find((node) => node.getAttribute('Id') === sheetId);
    const target = link?.getAttribute('Target');
    if (target) return target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  }
  return 'xl/worksheets/sheet1.xml';
}

// Une référence de cellule ("BC12") donne l'index de sa colonne.
function columnIndex(reference) {
  const letters = String(reference || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  let index = 0;
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64);
  return index - 1;
}

function parseSharedStrings(xml) {
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return [...doc.getElementsByTagName('si')].map((item) =>
    [...item.getElementsByTagName('t')].map((node) => node.textContent).join(''),
  );
}

// Palette du thème Office : une couleur de cellule peut renvoyer à un index de thème.
const DEFAULT_THEME = [
  '#FFFFFF', '#000000', '#E7E6E6', '#44546A', '#4472C4', '#ED7D31',
  '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47', '#0563C1', '#954F72',
];

// Palette indexée historique d'Excel.
const INDEXED = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
  '#9999FF', '#993366', '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF',
  '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080', '#800000', '#008080', '#0000FF',
  '#00CCFF', '#CCFFFF', '#CCFFCC', '#FFFF99', '#99CCFF', '#FF99CC', '#CC99FF', '#FFCC99',
  '#3366FF', '#33CCCC', '#99CC00', '#FFCC00', '#FF9900', '#FF6600', '#666699', '#969696',
  '#003366', '#339966', '#003300', '#333300', '#993300', '#993366', '#333399', '#333333',
];

function applyTint(color, tint) {
  if (!tint) return color;
  const channels = [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16));
  const next = channels.map((channel) => {
    const value = tint < 0 ? channel * (1 + tint) : channel + (255 - channel) * tint;
    return Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0');
  });
  return `#${next.join('').toUpperCase()}`;
}

// La couleur blanche revient à une cellule sans couleur : elle n'identifie aucune ferme.
function colorOf(node, palette) {
  if (!node) return '';
  let value = '';
  const rgb = node.getAttribute('rgb');
  if (rgb && rgb.length >= 6) {
    value = `#${rgb.slice(-6).toUpperCase()}`;
  } else if (node.getAttribute('theme') !== null) {
    const base = palette[Number(node.getAttribute('theme'))];
    value = base ? applyTint(base, Number(node.getAttribute('tint') || 0)) : '';
  } else if (node.getAttribute('indexed') !== null) {
    value = INDEXED[Number(node.getAttribute('indexed'))] || '';
  }
  return value.toUpperCase() === '#FFFFFF' ? '' : value;
}

async function readTheme(zip) {
  const xml = await zip.text('xl/theme/theme1.xml');
  if (!xml) return null;
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const scheme = [...doc.getElementsByTagName('*')].find((node) => node.localName === 'clrScheme');
  if (!scheme) return null;
  const slots = {};
  [...scheme.children].forEach((slot) => {
    const color = [...slot.getElementsByTagName('*')].find(
      (node) => node.localName === 'srgbClr' || node.localName === 'sysClr',
    );
    if (!color) return;
    const value = color.localName === 'srgbClr' ? color.getAttribute('val') : color.getAttribute('lastClr');
    if (value) slots[slot.localName] = `#${value.toUpperCase()}`;
  });
  const palette = [
    slots.lt1, slots.dk1, slots.lt2, slots.dk2,
    slots.accent1, slots.accent2, slots.accent3, slots.accent4, slots.accent5, slots.accent6,
    slots.hlink, slots.folHlink,
  ];
  return palette.some(Boolean) ? palette.map((color, index) => color || DEFAULT_THEME[index]) : null;
}

function fillColor(fill, palette) {
  const pattern = [...fill.children].find((node) => node.localName === 'patternFill');
  if (!pattern) return '';
  const type = pattern.getAttribute('patternType');
  if (!type || type === 'none') return '';
  const fg = [...pattern.children].find((node) => node.localName === 'fgColor');
  const bg = [...pattern.children].find((node) => node.localName === 'bgColor');
  return type === 'solid' ? colorOf(fg || bg, palette) : colorOf(bg || fg, palette);
}

// Une couleur par style de cellule, prête à être lue depuis l'attribut "s" des cellules.
async function readStyleFills(zip) {
  const xml = await zip.text('xl/styles.xml');
  if (!xml) return [];
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const palette = (await readTheme(zip)) || DEFAULT_THEME;

  const fillsNode = doc.getElementsByTagName('fills')[0];
  const fills = fillsNode
    ? [...fillsNode.children]
        .filter((node) => node.localName === 'fill')
        .map((fill) => fillColor(fill, palette))
    : [];

  const xfsNode = doc.getElementsByTagName('cellXfs')[0];
  if (!xfsNode) return [];
  return [...xfsNode.children]
    .filter((node) => node.localName === 'xf')
    .map((xf) => fills[Number(xf.getAttribute('fillId') || 0)] || '');
}

function parseSheet(xml, shared, styleFills = []) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rows = [];
  const fills = [];

  [...doc.getElementsByTagName('row')].forEach((rowNode) => {
    const rowIndex = Number(rowNode.getAttribute('r')) - 1;
    const cells = [];
    const colors = [];

    [...rowNode.getElementsByTagName('c')].forEach((cell) => {
      const index = columnIndex(cell.getAttribute('r'));
      const type = cell.getAttribute('t');
      let value = '';
      if (type === 'inlineStr') {
        value = [...cell.getElementsByTagName('t')].map((node) => node.textContent).join('');
      } else {
        const node = cell.getElementsByTagName('v')[0];
        if (node) value = type === 's' ? shared[Number(node.textContent)] ?? '' : node.textContent;
      }
      const at = index >= 0 ? index : cells.length;
      cells[at] = value;
      colors[at] = styleFills[Number(cell.getAttribute('s') || 0)] || '';
    });

    const target = Number.isInteger(rowIndex) && rowIndex >= 0 ? rowIndex : rows.length;
    rows[target] = cells;
    fills[target] = colors;
  });

  return {
    rows: rows.map((cells) => Array.from(cells || [], (value) => String(value ?? '').trim())),
    fills: Array.from(fills, (colors) => Array.from(colors || [], (value) => value || '')),
  };
}

// Lignes de la première feuille, avec la couleur de fond de chaque cellule.
export async function readXlsxSheet(file) {
  if (typeof DecompressionStream === 'undefined') throw new Error('unsupported');
  const zip = await openZip(await file.arrayBuffer());
  const sheetXml = await zip.text(await firstSheetPath(zip));
  if (!sheetXml) throw new Error('sheet');
  const [shared, styleFills] = await Promise.all([
    zip.text('xl/sharedStrings.xml').then(parseSharedStrings),
    readStyleFills(zip),
  ]);
  return parseSheet(sheetXml, shared, styleFills);
}

// Renvoie les lignes de la première feuille : un tableau de tableaux de textes.
export async function readXlsxRows(file) {
  return (await readXlsxSheet(file)).rows;
}