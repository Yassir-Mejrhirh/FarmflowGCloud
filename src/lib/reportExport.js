import { buildXlsx, downloadBytes } from '@/lib/xlsxWriter';

// Export of the data currently filtered on a report screen. Everything is built
// from the rows the screen already holds, so the whole filtered set is exported,
// not only the lines that fit on screen, and nothing is stored in the database.

const locale = () => (document.documentElement.lang === 'ar' ? 'ar-MA' : 'fr-FR');

const formatNumber = (value, column) => {
  const digits = column.digits ?? 2;
  const text = Number(value).toLocaleString(locale(), { maximumFractionDigits: digits });
  return column.money ? `${text} MAD` : text;
};

const fileSlug = (base) =>
  String(base || 'rapport')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'rapport';

export const exportFileName = (base, extension) =>
  `${fileSlug(base)}-${new Date().toISOString().slice(0, 10)}.${extension}`;

const cellText = (value, column) => {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return formatNumber(value, column);
  return String(value);
};

export function exportExcel({ base, columns, rows, sheets }) {
  const built = sheets || [
    {
      name: base,
      columns: columns.map((column) => ({ label: column.label, width: column.width })),
      rows: rows.map((row) => columns.map((column) => row[column.key] ?? '')),
    },
  ];
  downloadBytes(
    exportFileName(base, 'xlsx'),
    buildXlsx(built),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

function buildSheetElement({ title, subtitle, columns, rows, rtl }) {
  const wrap = document.createElement('div');
  const align = (column) => (column.align === 'end' ? 'right' : 'left');
  wrap.setAttribute('dir', rtl ? 'rtl' : 'ltr');
  wrap.style.cssText = [
    'position:fixed',
    'left:-20000px',
    'top:0',
    'width:1120px',
    'background:#ffffff',
    'padding:28px 32px 34px',
    'box-sizing:border-box',
    'font-family:Helvetica,Arial,sans-serif',
    'color:#1d2621',
    'direction:' + (rtl ? 'rtl' : 'ltr'),
  ].join(';');

  const head = columns
    .map(
      (column) =>
        `<th style="padding:8px 10px;border-bottom:1px solid #cfcbbd;background:#f3f1e9;text-align:${align(column)};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#5c6a61;">${escapeHtml(column.label)}</th>`,
    )
    .join('');

  const body = rows
    .map((row, index) => {
      const cells = columns
        .map(
          (column) =>
            `<td style="padding:7px 10px;border-bottom:1px solid #eceae1;text-align:${align(column)};font-size:11.5px;color:#25302a;">${escapeHtml(cellText(row[column.key], column))}</td>`,
        )
        .join('');
      const background = index % 2 ? '#ffffff' : '#fbfaf5';
      return `<tr style="background:${background};">${cells}</tr>`;
    })
    .join('');

  wrap.innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:24px;border-bottom:2px solid #92400e;padding-bottom:10px;">
      <div style="font-size:20px;font-weight:700;color:#1d2621;">${escapeHtml(title)}</div>
      <div style="font-size:11px;color:#63746b;">FarmFlow</div>
    </div>
    ${subtitle ? `<div style="margin-top:8px;font-size:11px;color:#63746b;">${escapeHtml(subtitle)}</div>` : ''}
    <table style="width:100%;margin-top:14px;border-collapse:collapse;">
      <thead><tr>${head}</tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div style="margin-top:12px;font-size:10px;color:#8a988f;">${escapeHtml(
      `${rows.length} ${rows.length > 1 ? 'lignes' : 'ligne'} · ${new Date().toLocaleString(locale())}`,
    )}</div>`;

  return wrap;
}

export async function exportPdf({ base, title, subtitle, columns, rows }) {
  const rtl = document.documentElement.lang === 'ar';
  const [{ jsPDF }, html2canvasModule] = await Promise.all([import('jspdf'), import('html2canvas')]);
  const html2canvas = html2canvasModule.default;
  const element = buildSheetElement({ title: title || base, subtitle, columns, rows, rtl });
  document.body.appendChild(element);

  // Layout is measured before the sheet leaves the page.
  const elementWidth = element.offsetWidth || 1120;
  const box = element.getBoundingClientRect();
  const table = element.querySelector('table');
  const headOffset = table.querySelector('thead').getBoundingClientRect().top - box.top;
  const rowOffsets = [...table.querySelectorAll('tbody tr')].map((row) => row.getBoundingClientRect().bottom - box.top);

  let canvas;
  try {
    canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
  } finally {
    element.remove();
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imageWidth = pageWidth - margin * 2;
  const pixelsPerMm = canvas.width / imageWidth;
  const pageHeightPx = (pageHeight - margin * 2) * pixelsPerMm;

  // Page breaks only fall between two rows, and every page repeats the header.
  const scale = canvas.width / elementWidth;
  const headTop = Math.max(0, Math.round(headOffset * scale));
  const bottoms = rowOffsets.map((offset) => Math.round(offset * scale));

  const pages = [];
  let start = 0;
  let limit = pageHeightPx;
  let last = 0;
  bottoms.forEach((bottom) => {
    if (bottom > limit && last > start) {
      pages.push({ start, end: last });
      start = headTop;
      limit = start + pageHeightPx;
    }
    last = bottom;
  });
  pages.push({ start, end: last || canvas.height });

  pages.forEach((page, index) => {
    const height = Math.min(page.end - page.start, canvas.height - page.start);
    if (height <= 0) return;
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = height;
    const context = slice.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, page.start, canvas.width, height, 0, 0, canvas.width, height);

    if (index > 0) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, imageWidth, height / pixelsPerMm);
  });

  pdf.save(exportFileName(base, 'pdf'));
}