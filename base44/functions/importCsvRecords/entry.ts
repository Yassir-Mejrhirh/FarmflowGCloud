import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Invited users may only feed this company's data.
const ALLOWED_COMPANY_NAME = 'chammam prod';
const MAX_ROWS = 2000;
const CHUNK = 100;

const f = (name, label, kind = 'string', extra = {}) => ({ name, label, kind, ...extra });

const TABLES = [
  {
    entity: 'Farm',
    label: 'Fermes',
    route: '/farms',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('latitude', 'Latitude', 'number'),
      f('longitude', 'Longitude', 'number'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'FarmBlock',
    label: 'Parcelles',
    route: '/blocks',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('code', 'Code'),
      f('farm', 'Ferme'),
      f('area_ha', 'Superficie (ha)', 'number'),
      f('crop_id', 'Culture', 'string', { ref: 'Crop' }),
      f('variety_id', 'Variété', 'string', { ref: 'Variety' }),
      f('season_id', 'Saison', 'string', { ref: 'Season' }),
      f('planting_date', 'Date de plantation', 'date'),
      f('crop_end_date', 'Fin de culture', 'date'),
      f('status', 'Statut', 'enum', { options: ['active', 'preparing', 'harvest', 'fallow'] }),
      f('soil_type', 'Type de sol'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Crop',
    label: 'Cultures',
    route: '/crops',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('category', 'Catégorie', 'enum', { options: ['cereal', 'vegetable', 'fruit_tree', 'legume', 'fodder', 'other'] }),
      f('cycle_days', 'Durée du cycle (jours)', 'number'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Variety',
    label: 'Variétés',
    route: '/varieties',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('crop_id', 'Culture', 'string', { ref: 'Crop' }),
      f('maturity_days', 'Jours avant maturité', 'number'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Season',
    label: 'Saisons',
    route: '/seasons',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('start_date', 'Début', 'date'),
      f('end_date', 'Fin', 'date'),
      f('status', 'Statut', 'enum', { options: ['planned', 'active', 'closed'] }),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'TaskNature',
    label: 'Natures de tâche',
    route: '/tasks',
    fields: [f('name', 'Nom', 'string', { required: true })],
  },
  {
    entity: 'WorkerFunction',
    label: 'Fonctions',
    route: '/workers',
    fields: [f('name', 'Nom', 'string', { required: true })],
  },
  {
    entity: 'MachineType',
    label: 'Types de matériel',
    route: '/machinery',
    fields: [f('name', 'Nom', 'string', { required: true })],
  },
  {
    entity: 'Task',
    label: 'Tâches',
    route: '/tasks',
    fields: [
      f('title', 'Intitulé', 'string', { required: true }),
      f('type', 'Nature', 'enum', { options: ['planting', 'irrigation', 'fertilising', 'spraying', 'harvest', 'maintenance', 'transport', 'other'] }),
      f('subtask', 'Sous-tâche'),
      f('description', 'Description'),
      f('block_id', 'Parcelle', 'string', { ref: 'FarmBlock' }),
      f('crop_id', 'Culture', 'string', { ref: 'Crop' }),
      f('assignee_id', 'Assignée à', 'string', { ref: 'Worker' }),
      f('due_date', 'Échéance', 'date'),
      f('status', 'Statut', 'enum', { options: ['todo', 'in_progress', 'done'] }),
      f('priority', 'Priorité', 'enum', { options: ['low', 'medium', 'high'] }),
      f('machine_required', 'Machine obligatoire', 'boolean'),
      f('estimated_cost', 'Coût estimé', 'number'),
      f('actual_cost', 'Coût réel', 'number'),
      f('completed_date', 'Date de réalisation', 'date'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Worker',
    label: 'Ouvriers',
    route: '/workers',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('priority', 'Priorité', 'enum', { options: ['1', '2', '3'] }),
      f('definition', 'Définition', 'enum', { options: ['nominative', 'salary_band'] }),
      f('worker_function', 'Fonction'),
      f('farm', 'Ferme'),
      f('team', 'Équipe'),
      f('registration_number', 'N° d’immatriculation'),
      f('declared', 'Déclaré', 'boolean'),
      f('phone', 'Téléphone'),
      f('daily_rate', 'Salaire journalier', 'number'),
      f('start_date', 'Date d’embauche', 'date'),
      f('active', 'Actif', 'boolean'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Machine',
    label: 'Machines',
    route: '/machinery',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('type', 'Type'),
      f('year', 'Année', 'number'),
      f('plate', 'Plaque / n° de série'),
      f('hourly_rate', 'Coût par heure', 'number'),
      f('hours', 'Heures', 'number'),
      f('status', 'Statut', 'enum', { options: ['operational', 'maintenance', 'retired'] }),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Storage',
    label: 'Magasins',
    route: '/storages',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('kind', 'Type', 'enum', { options: ['warehouse', 'cold_room', 'silo', 'shed'] }),
      f('farm', 'Ferme'),
      f('location', 'Emplacement'),
      f('latitude', 'Latitude', 'number'),
      f('longitude', 'Longitude', 'number'),
      f('capacity_note', 'Capacité'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'InputCategory',
    label: 'Catégories d’intrant',
    route: '/inventory',
    fields: [f('name', 'Nom', 'string', { required: true })],
  },
  {
    entity: 'InputItem',
    label: 'Intrants',
    route: '/inventory',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('category', 'Catégorie'),
      f('formulation', 'Formulation'),
      f('unit', 'Unité'),
      f('min_stock_enabled', 'Alerte de stock', 'boolean'),
      f('min_stock', 'Seuil d’alerte', 'number'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Supplier',
    label: 'Fournisseurs',
    route: '/suppliers',
    fields: [
      f('name', 'Nom', 'string', { required: true }),
      f('contact_name', 'Contact'),
      f('phone', 'Téléphone'),
      f('email', 'E-mail'),
      f('category', 'Catégorie', 'enum', { options: ['inputs', 'equipment', 'services', 'transport', 'other'] }),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'InputInvoice',
    label: 'Factures d’achat',
    route: '/input-invoices/all',
    fields: [
      f('date', 'Date', 'date', { required: true }),
      f('invoice_number', 'N° de facture'),
      f('supplier_id', 'Fournisseur', 'string', { ref: 'Supplier' }),
      f('storage_id', 'Magasin', 'string', { ref: 'Storage' }),
      f('amount', 'Montant', 'number', { required: true }),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'StockMovement',
    label: 'Mouvements de stock',
    route: '/inventory',
    fields: [
      f('item_id', 'Intrant', 'string', { required: true, ref: 'InputItem' }),
      f('kind', 'Sens', 'enum', { options: ['in', 'out'] }),
      f('quantity', 'Quantité', 'number'),
      f('date', 'Date', 'date', { required: true }),
      f('cost', 'Coût', 'number'),
      f('storage_id', 'Magasin', 'string', { ref: 'Storage' }),
      f('block_id', 'Parcelle', 'string', { ref: 'FarmBlock' }),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Expense',
    label: 'Dépenses',
    route: '/costs',
    fields: [
      f('date', 'Date', 'date', { required: true }),
      f('category', 'Catégorie', 'enum', { options: ['labour', 'inputs', 'machinery', 'transport', 'utilities', 'other'] }),
      f('amount', 'Montant', 'number', { required: true }),
      f('description', 'Description'),
      f('block_id', 'Parcelle', 'string', { ref: 'FarmBlock' }),
      f('machine_id', 'Machine', 'string', { ref: 'Machine' }),
    ],
  },
  {
    entity: 'Harvest',
    label: 'Récoltes',
    route: '/blocks',
    fields: [
      f('block_id', 'Parcelle', 'string', { required: true, ref: 'FarmBlock' }),
      f('date', 'Date', 'date', { required: true }),
      f('quantity_kg', 'Poids (kg)', 'number'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'Attendance',
    label: 'Jours travaillés',
    route: '/workers',
    fields: [
      f('worker_id', 'Ouvrier', 'string', { required: true, ref: 'Worker' }),
      f('date', 'Date', 'date', { required: true }),
      f('days', 'Jours', 'number'),
      f('amount', 'Montant', 'number'),
      f('paid', 'Payé', 'boolean'),
      f('notes', 'Notes'),
    ],
  },
  {
    entity: 'MaintenanceLog',
    label: 'Entretiens',
    route: '/machinery',
    fields: [
      f('machine_id', 'Machine', 'string', { required: true, ref: 'Machine' }),
      f('date', 'Date', 'date', { required: true }),
      f('kind', 'Type', 'enum', { options: ['service', 'repair', 'inspection'] }),
      f('description', 'Description'),
      f('cost', 'Coût', 'number'),
      f('hours_reading', 'Relevé des heures', 'number'),
    ],
  },
  {
    entity: 'DailyReport',
    label: 'Rapports journaliers',
    route: '/daily-report',
    fields: [
      f('date', 'Date', 'date', { required: true }),
      f('block_id', 'Parcelle', 'string', { required: true, ref: 'FarmBlock' }),
      f('task_id', 'Tâche', 'string', { ref: 'Task' }),
      f('operation', 'Opération', 'enum', { options: ['planting', 'irrigation', 'fertilising', 'spraying', 'harvest', 'maintenance', 'transport', 'other'] }),
      f('description', 'Description'),
      f('notes', 'Notes'),
    ],
  },
];

const tableFor = (entity) => TABLES.find((table) => table.entity === entity) || null;

function normalizeDate(raw) {
  const value = String(raw).trim();
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const month = iso[2].padStart(2, '0');
    const day = iso[3].padStart(2, '0');
    if (Number(month) > 12 || Number(day) > 31) return null;
    return `${iso[1]}-${month}-${day}`;
  }
  const local = value.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (local) {
    const month = local[2].padStart(2, '0');
    const day = local[1].padStart(2, '0');
    if (Number(month) > 12 || Number(day) > 31) return null;
    return `${local[3]}-${month}-${day}`;
  }
  return null;
}

function coerce(field, raw) {
  const value = String(raw).trim();
  if (field.kind === 'number') {
    const parsed = Number(value.replace(/\s/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) return { error: 'number' };
    return { value: parsed };
  }
  if (field.kind === 'boolean') {
    const lowered = value.toLowerCase();
    if (['true', '1', 'oui', 'yes', 'vrai', 'نعم'].includes(lowered)) return { value: true };
    if (['false', '0', 'non', 'no', 'faux', 'لا'].includes(lowered)) return { value: false };
    return { error: 'boolean' };
  }
  if (field.kind === 'date') {
    const parsed = normalizeDate(value);
    if (!parsed) return { error: 'date' };
    return { value: parsed };
  }
  if (field.kind === 'enum') {
    const match = (field.options || []).find((option) => option.toLowerCase() === value.toLowerCase());
    if (!match) return { error: 'option' };
    return { value: match };
  }
  return { value };
}

async function loadReferenceMap(base44, entity, companyId) {
  const res = await base44.asServiceRole.entities[entity].filter({ company_id: companyId }, { limit: 2000 });
  const items = Array.isArray(res) ? res : res?.items || [];
  const map = new Map();
  items.forEach((record) => {
    [record.name, record.title, record.code].forEach((label) => {
      if (label) map.set(String(label).trim().toLowerCase(), record.id);
    });
  });
  return map;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const companies = await base44.asServiceRole.entities.Company.list('-created_date');
    const allowedCompany = companies.find(
      (company) => String(company.name || '').trim().toLowerCase() === ALLOWED_COMPANY_NAME,
    );
    const isAdmin = user.role === 'admin';

    if (body.action === 'catalog') {
      return Response.json({
        tables: TABLES,
        companies: companies.map((company) => ({ id: company.id, name: company.name })),
        allowedCompanyId: isAdmin ? '' : allowedCompany?.id || '',
      });
    }

    if (body.action !== 'import') return Response.json({ error: 'Unknown action' }, { status: 400 });

    const table = tableFor(body.entity);
    if (!table) return Response.json({ error: 'Unknown table' }, { status: 400 });

    const company = companies.find((item) => item.id === body.company_id);
    if (!company) return Response.json({ error: 'Unknown company' }, { status: 400 });
    if (!isAdmin && (!allowedCompany || allowedCompany.id !== company.id)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rows = Array.isArray(body.rows) ? body.rows : [];
    if (!rows.length) return Response.json({ error: 'No rows' }, { status: 400 });
    if (rows.length > MAX_ROWS) return Response.json({ error: 'Too many rows' }, { status: 400 });

    const refNames = [...new Set(table.fields.filter((field) => field.ref).map((field) => field.ref))];
    const referenceMaps = {};
    for (const name of refNames) {
      referenceMaps[name] = await loadReferenceMap(base44, name, company.id);
    }

    const records = [];
    const errors = [];

    rows.forEach((row, index) => {
      const record = { company_id: company.id };
      let valid = true;

      table.fields.forEach((field) => {
        const raw = row && row[field.name] !== undefined && row[field.name] !== null ? String(row[field.name]).trim() : '';
        if (!raw) {
          if (field.required) {
            errors.push({ row: index + 2, field: field.label, message: 'required' });
            valid = false;
          }
          return;
        }
        const result = coerce(field, raw);
        if (result.error) {
          errors.push({ row: index + 2, field: field.label, message: result.error });
          valid = false;
          return;
        }
        if (field.ref) {
          const map = referenceMaps[field.ref];
          const looked = map.get(String(result.value).trim().toLowerCase());
          if (looked) record[field.name] = looked;
          else if (/^[a-f0-9]{20,}$/i.test(String(result.value).trim())) record[field.name] = String(result.value).trim();
          else {
            errors.push({ row: index + 2, field: field.label, message: 'reference' });
            valid = false;
          }
          return;
        }
        record[field.name] = result.value;
      });

      if (valid) records.push(record);
    });

    if (errors.length) {
      return Response.json({ error: 'validation', errors: errors.slice(0, 60) }, { status: 400 });
    }

    for (let i = 0; i < records.length; i += CHUNK) {
      await base44.asServiceRole.entities[table.entity].bulkCreate(records.slice(i, i + CHUNK));
    }

    return Response.json({ created: records.length, entity: table.entity });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}