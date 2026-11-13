import { isFuelItem, isLubricantItem } from '@/lib/machineryCosts';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const BUTANE_WORDS = ['butane', 'gpl', 'gaz butane', 'bouteille de gaz', 'بوتان', 'غاز البوطان', 'قاز'];
const PUMP_WORDS = ['pomp', 'pump', 'ضخ', 'مضخة'];

// A pumping station feeds on butane, not on gasoil.
export function isPumpingMachine(machine) {
  const type = normalize(machine?.type);
  return PUMP_WORDS.some((word) => type.includes(word));
}

export function isButaneItem(item) {
  const haystack = `${normalize(item?.category)} ${normalize(item?.name)}`;
  return BUTANE_WORDS.some((word) => haystack.includes(word));
}

const byName = (a, b) => (a.name || '').localeCompare(b.name || '');
const toOption = (item) => ({ value: item.id, label: `${item.name}${item.unit ? ` (${item.unit})` : ''}` });

// Consumables a machine may draw from stock: a tractor only gasoil, a pumping
// station only butane. Lubricants are the only thing both are allowed besides.
// Other machine types keep the whole list, as before.
export function machineConsumableItems(machine, items = []) {
  const lubricants = items.filter(isLubricantItem).sort(byName);

  if (isPumpingMachine(machine)) {
    return { fuel: items.filter((item) => isButaneItem(item) && !isFuelItem(item)).sort(byName), lubricants };
  }

  if (normalize(machine?.type) === 'tractor') {
    return { fuel: items.filter((item) => isFuelItem(item) && !isButaneItem(item)).sort(byName), lubricants };
  }

  return {
    fuel: [...items].sort((a, b) => Number(isFuelItem(b)) - Number(isFuelItem(a))),
    lubricants: [...items].sort((a, b) => Number(isLubricantItem(b)) - Number(isLubricantItem(a))),
  };
}

export function machineConsumables(machine, items = []) {
  const { fuel, lubricants } = machineConsumableItems(machine, items);
  return { fuel: fuel.map(toOption), lubricants: lubricants.map(toOption) };
}