const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

// Irrigation and fertigation always run through a pumping station, so their hours
// and water volume have to be recorded with the report.
const IRRIGATION_WORDS = [
  'irrigation',
  'irriguer',
  'irrigate',
  'fertigation',
  'fertirrigation',
  'arrosage',
  'سقي',
  'الري',
  'ري',
  'تسميد بالري',
];

export function requiresPumpStation(task) {
  if (!task) return false;
  const haystack = `${normalize(task.type)} ${normalize(task.title)}`;
  return IRRIGATION_WORDS.some((word) => haystack.includes(normalize(word)));
}

// Fertigation goes through the pumping station alone: no work machine is needed.
const FERTIGATION_WORDS = ['fertigation', 'fertirrigation', 'تسميد بالري'];

export function isFertigation(task) {
  if (!task) return false;
  const haystack = `${normalize(task.type)} ${normalize(task.title)}`;
  return FERTIGATION_WORDS.some((word) => haystack.includes(normalize(word)));
}