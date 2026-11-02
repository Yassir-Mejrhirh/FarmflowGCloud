export const BUILT_IN_TYPES = [
  'planting',
  'irrigation',
  'fertilising',
  'spraying',
  'harvest',
  'maintenance',
  'transport',
  'other',
];

export const NEW_NATURE = '__new_nature__';

export function natureLabel(type, natures, t) {
  if (!type) return '';
  if (BUILT_IN_TYPES.includes(type)) return t(`tt.${type}`);
  const custom = (natures || []).find((nature) => nature.name === type);
  return custom?.name || type;
}