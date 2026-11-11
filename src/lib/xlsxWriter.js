// Minimal XLSX writer: builds a real Excel file (zip + SpreadsheetML) without
// any external dependency. Values are written as numbers when they are numbers,
// otherwise as inline text.

const encoder = new TextEncoder();
const bytesOf = (text) => encoder.encode(text);

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let k = 0; k < 8; k += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[i] = value >>> 0;
  }
  return table;
})();

const crc32 = (data) => {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

function zip(files) {
  const entries = files.map((file) => {
    const name = bytesOf(file.name);
    const data = file.data;
    return { name, data, crc: crc32(data) };
  });

  const centralSize = entries.reduce((sum, entry) => sum + 46 + entry.name.length, 0);
  const localSize = entries.reduce((sum, entry) => sum + 30 + entry.name.length + entry.data.length, 0);

  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let pos = 0;
  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;

  const write16 = (value) => {
    view.setUint16(pos, value, true);
    pos += 2;
  };
  const write32 = (value) => {
    view.setUint32(pos, value, true);
    pos += 4;
  };
  const writeBytes = (data) => {
    out.set(data, pos);
    pos += data.length;
  };

  entries.forEach((entry) => {
    entry.offset = pos;
    write32(0x04034b50);
    write16(20);
    write16(0x0800);
    write16(0);
    write16(time);
    write16(date);
    write32(entry.crc);
    write32(entry.data.length);
    write32(entry.data.length);
    write16(entry.name.length);
    write16(0);
    writeBytes(entry.name);
    writeBytes(entry.data);
  });

  const centralStart = pos;
  entries.forEach((entry) => {
    write32(0x02014b50);
    write16(20);
    write16(20);
    write16(0x0800);
    write16(0);
    write16(time);
    write16(date);
    write32(entry.crc);
    write32(entry.data.length);
    write32(entry.data.length);
    write16(entry.name.length);
    write16(0);
    write16(0);
    write16(0);
    write16(0);
    write32(0);
    write32(entry.offset);
    writeBytes(entry.name);
  });

  const centralEnd = pos;
  write32(0x06054b50);
  write16(0);
  write16(0);
  write16(entries.length);
  write16(entries.length);
  write32(centralEnd - centralStart);
  write32(centralStart);
  write16(0);

  return out;
}

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

const columnName = (index) => {
  let name = '';
  let value = index + 1;
  while (value > 0) {
    const rest = (value - 1) % 26;
    name = String.fromCharCode(65 + rest) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
};

const sheetName = (name, index) => {
  const clean = String(name || `Feuille ${index + 1}`)
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31);
  return clean || `Feuille ${index + 1}`;
};

function cellXml(reference, value, bold) {
  const style = bold ? ' s="1"' : '';
  if (value === null || value === undefined || value === '') return `<c r="${reference}"${style}/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}"${style}><v>${value}</v></c>`;
  return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function sheetXml(sheet) {
  const columns = sheet.columns || [];
  const widths = columns
    .map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width || 18}" customWidth="1"/>`)
    .join('');

  const header = `<row r="1">${columns.map((column, index) => cellXml(`${columnName(index)}1`, column.label, true)).join('')}</row>`;
  const body = (sheet.rows || [])
    .map((row, rowIndex) => {
      const number = rowIndex + 2;
      const cells = row.map((value, index) => cellXml(`${columnName(index)}${number}`, value)).join('');
      return `<row r="${number}">${cells}</row>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${widths ? `<cols>${widths}</cols>` : ''}<sheetData>${header}${body}</sheetData></worksheet>`;
}

export function buildXlsx(sheets) {
  const list = sheets.length ? sheets : [{ name: 'Feuille 1', columns: [], rows: [] }];

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${list
    .map((sheet, index) => `<sheet name="${escapeXml(sheetName(sheet.name, index))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`)
    .join('')}</sheets></workbook>`;

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list
    .map(
      (_sheet, index) =>
        `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
    )
    .join('')}<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${list
    .map(
      (_sheet, index) =>
        `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join('')}</Types>`;

  const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

  const files = [
    { name: '[Content_Types].xml', data: bytesOf(contentTypes) },
    { name: '_rels/.rels', data: bytesOf(rootRels) },
    { name: 'xl/workbook.xml', data: bytesOf(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: bytesOf(workbookRels) },
    { name: 'xl/styles.xml', data: bytesOf(styles) },
    ...list.map((sheet, index) => ({
      name: `xl/worksheets/sheet${index + 1}.xml`,
      data: bytesOf(sheetXml(sheet)),
    })),
  ];

  return zip(files);
}

export function downloadBytes(fileName, data, mime) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}