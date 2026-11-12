// Unités de mesure prédéfinies : chaque unité porte sa famille et son équivalence
// dans l'unité de base de sa famille (litre pour les volumes, kilo pour les masses).
export const PREDEFINED_UNITS = [
  { value: 'L', family: 'volume', factor: 1 },
  { value: 'ml', family: 'volume', factor: 0.001 },
  { value: 'hl', family: 'volume', factor: 100 },
  { value: 'baril', family: 'volume', factor: 45 },
  { value: 'KG', family: 'mass', factor: 1 },
  { value: 'g', family: 'mass', factor: 0.001 },
  { value: 'Quintal', family: 'mass', factor: 100 },
  { value: 'Tonne', family: 'mass', factor: 1000 },
  { value: 'Sac', family: 'pack', factor: null },
  { value: 'Carton', family: 'pack', factor: null },
  { value: 'Bidon', family: 'pack', factor: null },
  { value: 'Flacon', family: 'pack', factor: null },
  { value: 'Bouteille', family: 'pack', factor: null },
  { value: 'Palette', family: 'pack', factor: null },
  { value: 'Unité', family: 'pack', factor: null },
  { value: 'Bobine', family: 'pack', factor: null },
  { value: 'Mètre linéaire', family: 'length', factor: 1 },
];

export const UNIT_OPTIONS = PREDEFINED_UNITS.map((unit) => ({ value: unit.value, label: unit.value }));

const findUnit = (value) => PREDEFINED_UNITS.find((unit) => unit.value === value);

const fmtFactor = (value) => String(Number(Number(value).toFixed(4)));

// Équivalence déduite des unités prédéfinies : combien d'unités principales dans une secondaire.
export function suggestedFactor(primary, secondary) {
  const from = findUnit(primary);
  const to = findUnit(secondary);
  if (!from || !to || !from.factor || !to.factor || from.family !== to.family) return null;
  return to.factor / from.factor;
}

// Facteur enregistré sur l'intrant : nombre d'unités principales pour une unité secondaire.
export function itemFactor(item) {
  const value = Number(item?.secondary_factor) || 0;
  return value > 0 ? value : 0;
}

// Libellé lisible de l'équivalence : « 1 baril = 45 L ».
export function conversionLabel(item) {
  const factor = itemFactor(item);
  if (!item?.secondary_unit || !factor) return '';
  return `1 ${item.secondary_unit} = ${fmtFactor(factor)} ${item.unit || ''}`.trim();
}

// Unités proposées à la saisie pour un intrant : principale puis secondaire.
export function unitChoices(item) {
  if (!item) return [];
  return [item.unit, item.secondary_unit].filter(Boolean);
}

// Options d'unité pour une ligne de saisie, selon l'intrant choisi.
export function unitOptionsFor(item) {
  const choices = unitChoices(item);
  return choices.length ? choices.map((value) => ({ value, label: value })) : UNIT_OPTIONS;
}

// Quantité ramenée dans l'unité principale de l'intrant.
export function toPrimary(quantity, unit, item) {
  const value = Number(quantity) || 0;
  if (!item || !unit || unit === item.unit) return value;
  if (unit === item.secondary_unit) {
    const factor = itemFactor(item);
    return factor ? value * factor : value;
  }
  return value;
}

// Prix unitaire ramené dans l'unité principale de l'intrant.
export function priceToPrimary(price, unit, item) {
  const value = Number(price) || 0;
  if (!item || !unit || unit === item.unit) return value;
  if (unit === item.secondary_unit) {
    const factor = itemFactor(item);
    return factor ? value / factor : value;
  }
  return value;
}