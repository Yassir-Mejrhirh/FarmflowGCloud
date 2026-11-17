import { isPumpingMachine } from '@/lib/machineInputs';

const normalize = (value = '') =>
  String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

// Ferme désignée par le nom d'une station : « Station Pompage Ferme A » désigne la
// ferme A. Le nom de ferme le plus long l'emporte quand plusieurs correspondent.
export function detectFarm(name, farms = []) {
  const haystack = normalize(name);
  if (!haystack) return null;
  const found = farms
    .filter((farm) => farm?.name && normalize(farm.name).length >= 3 && haystack.includes(normalize(farm.name)))
    .sort((a, b) => String(b.name).length - String(a.name).length);
  return found[0] || null;
}

// Stations d'une ferme : celles qui lui sont déjà rattachées, puis celles dont le nom
// la désigne. Une ferme sans aucune station garde les stations encore sans ferme,
// pour qu'une station neuve puisse servir une fois et retenir sa ferme.
export function stationsForFarm({ machines = [], farms = [], farmName = '' }) {
  const stations = machines.filter(isPumpingMachine);
  if (!farmName) return stations;

  const matching = stations.filter((station) => {
    if (station.farm) return station.farm === farmName;
    return detectFarm(station.name, farms)?.name === farmName;
  });
  if (matching.length) return matching;

  return stations.filter((station) => !station.farm && !detectFarm(station.name, farms));
}