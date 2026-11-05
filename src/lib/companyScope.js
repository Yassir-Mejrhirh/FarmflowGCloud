import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'terra.company_id';

// Company itself, and the platform User entity, are never scoped.
const UNSCOPED = new Set(['Company', 'User']);

const SCOPED_ENTITIES = [
  'Farm',
  'FarmBlock',
  'Crop',
  'Variety',
  'Season',
  'Task',
  'TaskNature',
  'WorkerFunction',
  'Worker',
  'Machine',
  'MaintenanceLog',
  'Storage',
  'InputItem',
  'InputCategory',
  'InputInvoice',
  'Supplier',
  'Expense',
  'Harvest',
  'StockMovement',
  'Attendance',
  'DailyReport',
];

let installed = false;
let rawEntities = null;

export function getActiveCompanyId() {
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function setActiveCompanyId(id) {
  if (id) window.localStorage.setItem(STORAGE_KEY, id);
  else window.localStorage.removeItem(STORAGE_KEY);
}

const scopedQuery = (query) => {
  const companyId = getActiveCompanyId();
  return companyId ? { ...(query || {}), company_id: companyId } : query;
};

const scopedData = (data) => {
  const companyId = getActiveCompanyId();
  return companyId ? { ...data, company_id: companyId } : data;
};

function scopeHandler(handler) {
  return {
    ...handler,
    list: (...args) => {
      const companyId = getActiveCompanyId();
      return companyId ? handler.filter({ company_id: companyId }, ...args) : handler.list(...args);
    },
    filter: (query, ...args) => handler.filter(scopedQuery(query), ...args),
    count: (query) => handler.count(scopedQuery(query)),
    aggregate: (spec) => handler.aggregate({ ...spec, query: scopedQuery(spec?.query) }),
    create: (data) => handler.create(scopedData(data)),
    bulkCreate: (records) => handler.bulkCreate(records.map(scopedData)),
    upsert: (records, options) => handler.upsert(records.map(scopedData), options),
    deleteMany: (query) => handler.deleteMany(scopedQuery(query)),
    updateMany: (query, data) => handler.updateMany(scopedQuery(query), data),
  };
}

export function installCompanyScope() {
  if (installed) return;
  installed = true;
  rawEntities = base44.entities;

  base44.entities = new Proxy(
    {},
    {
      get(_, entityName) {
        const handler = rawEntities[entityName];
        if (typeof entityName !== 'string' || UNSCOPED.has(entityName) || !handler) return handler;
        return scopeHandler(handler);
      },
    },
  );
}

// Records created before companies existed carry no company: they are handed
// over to the first company so nothing disappears from the app.
export async function adoptUnassignedRecords(companyId) {
  if (!rawEntities || !companyId) return;
  await Promise.all(
    SCOPED_ENTITIES.map((name) =>
      rawEntities[name]
        .updateMany({ company_id: null }, { $set: { company_id: companyId } })
        .catch(() => null),
    ),
  );
}