// Lecture d'un classeur Excel (.xlsx) sans bibliothèque : un .xlsx est une archive
// ZIP dont les feuilles sont du XML. L'archive est ouverte à la main et le contenu
// est décompressé avec l'API du navigateur.

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

function parseSheet(xml, shared) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const rows = [];

  [...doc.getElementsByTagName('row')].forEach((rowNode, fallbackIndex) => {
    const rowIndex = Number(rowNode.getAttribute('r')) - 1;
    const cells = [];
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
      cells[index >= 0 ? index : cells.length] = value;
    });
    const target = Number.isInteger(rowIndex) && rowIndex >= 0 ? rowIndex : rows.length;
    rows[target] = cells;
  });

  return rows.map((cells) => Array.from(cells || [], (value) => String(value ?? '').trim()));
}

// Renvoie les lignes de la première feuille : un tableau de tableaux de textes.
export async function readXlsxRows(file) {
  if (typeof DecompressionStream === 'undefined') throw new Error('unsupported');
  const zip = await openZip(await file.arrayBuffer());
  const sheetXml = await zip.text(await firstSheetPath(zip));
  if (!sheetXml) throw new Error('sheet');
  return parseSheet(sheetXml, parseSharedStrings(await zip.text('xl/sharedStrings.xml')));
}