// Quinzaine de pointage : le mois et la moitié du mois (1–15 ou 16–fin).
// Elle sert de période de référence à la lecture du classeur, ce qui évite les
// erreurs de détection sur les en-têtes écrits sans mois ni année.

const pad = (value) => String(value).padStart(2, '0');

export const monthKeyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

// Quinzaine qui contient une date écrite en YYYY-MM-DD.
export function quinzaineOf(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`);
  return { month: monthKeyOf(date), half: date.getDate() > 15 ? '2' : '1' };
}

// Premier et dernier jour de la quinzaine choisie.
export function quinzaineRange({ month, half } = {}) {
  const key = /^\d{4}-\d{2}$/.test(month || '') ? month : monthKeyOf(new Date());
  const [year, monthIndex] = key.split('-').map(Number);
  const lastDay = new Date(year, monthIndex, 0).getDate();
  return half === '2'
    ? { start: `${key}-16`, end: `${key}-${pad(lastDay)}` }
    : { start: `${key}-01`, end: `${key}-15` };
}

// Mois proposés au choix : les mois précédents puis les suivants, autour du mois courant.
export function recentMonths(isoDate, back = 6, ahead = 2) {
  const date = new Date(`${isoDate}T00:00:00`);
  const months = [];
  for (let offset = -back; offset <= ahead; offset += 1) {
    months.push(monthKeyOf(new Date(date.getFullYear(), date.getMonth() + offset, 1)));
  }
  return months;
}