// Filters of the labour list (fiche MO): each criterion is combined with the others,
// an empty value meaning "no restriction on this criterion".
import { transportFor } from '@/lib/transportRates';
import { availableFarmNames, isFixedWorker, worksOnFarm } from '@/lib/workerFarms';

export const EMPTY_WORKER_FILTERS = {
  q: '',
  team: '',
  transporter: '',
  mobility: '',
  farm: '',
  fn: '',
  priority: '',
  declared: '',
};

export const hasActiveFilters = (filters) =>
  Object.values(filters || {}).some((value) => Boolean(value));

// Transporteur in force today for a worker, from the dated transport history.
export function workerTransporter(worker, index, today) {
  const transport = transportFor(worker, index, today);
  return (transport.transporter || worker?.transporter_name || '').trim();
}

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export function workerMatchesFilters(worker, filters, index, today) {
  if (!worker) return false;
  const query = String(filters.q || '').trim().toLowerCase();
  if (query && !String(worker.name || '').toLowerCase().includes(query)) return false;
  if (filters.team && !same(worker.team, filters.team)) return false;
  if (filters.transporter && !same(workerTransporter(worker, index, today), filters.transporter)) return false;
  if (filters.mobility === 'mobile' && isFixedWorker(worker)) return false;
  if (filters.mobility === 'fixed' && !isFixedWorker(worker)) return false;
  // Une ferme retient ses ouvriers fixes et les mobiles qui la desservent.
  if (filters.farm && !worksOnFarm(worker, filters.farm)) return false;
  if (filters.fn && !same(worker.worker_function, filters.fn)) return false;
  if (filters.priority && String(worker.priority || '1') !== String(filters.priority)) return false;
  if (filters.declared === 'declared' && !worker.declared) return false;
  if (filters.declared === 'undeclared' && worker.declared) return false;
  return true;
}

// Values proposed in the dropdowns, taken from the workers themselves.
export function filterOptions(workers = [], index, today) {
  const unique = (values) =>
    [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b),
    );

  return {
    teams: unique(workers.map((worker) => worker.team)),
    transporters: unique(workers.map((worker) => workerTransporter(worker, index, today))),
    farms: unique(workers.flatMap(availableFarmNames)),
    functions: unique(workers.map((worker) => worker.worker_function)),
  };
}