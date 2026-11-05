export const CURRENCY = 'MAD';

let LOCALE = 'fr-FR';

export const setLocale = (locale) => {
  LOCALE = locale;
};

export const fmtNum = (n, digits = 1) => {
  const value = Number(n) || 0;
  return value.toLocaleString(LOCALE, { maximumFractionDigits: digits });
};

export const fmtMoney = (n) => {
  const value = Number(n) || 0;
  const formatted = value.toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${formatted} ${CURRENCY}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
};

export const fmtLongDate = () =>
  new Date().toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });

export const monthRange = (monthKey) => {
  // monthKey: YYYY-MM
  const [year, month] = monthKey.split('-').map(Number);
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 1);
  const end = endDate.toISOString().slice(0, 10);
  return { start, end };
};

export const currentMonthKey = () => new Date().toISOString().slice(0, 7);

export const monthLabel = (monthKey) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
};