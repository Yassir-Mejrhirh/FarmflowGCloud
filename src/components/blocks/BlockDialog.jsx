import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import BoundaryDrawer from '@/components/blocks/BoundaryDrawer';
import IrrigationZones from '@/components/blocks/IrrigationZones';
import SubBlocksEditor from '@/components/blocks/SubBlocksEditor';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { polygonAreaHa } from '@/lib/geo';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

const EMPTY = {
  name: '', code: '', farm: '', crop_id: '', variety_id: '', planting_date: '', status: 'active', soil_type: '', notes: '', boundary: [], sub_blocks: [], irrigation_zones: [],
};

const STATUSES = ['active', 'preparing', 'harvest', 'fallow'];

const normalize = (value) => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const letters = (value) => normalize(value).replace(/[^a-z0-9]/g, '');

// Reduce a label to its consonants ("Mnabha1" -> "mnbh") so abbreviations like "MNB1" can match it.
const skeleton = (value) => letters(value).replace(/[0-9]/g, '').replace(/[aeiouy]/g, '');

const detectFarm = (labels, farms) => {
  const candidates = labels.map(letters).filter((label) => label.length >= 2);
  if (!candidates.length) return '';

  let best = '';
  let bestScore = 0;

  farms.forEach((farm) => {
    const farmLabel = letters(farm.name);
    if (farmLabel.length < 2) return;
    const farmSkeleton = skeleton(farm.name);
    const farmDigits = farmLabel.replace(/[^0-9]/g, '');

    candidates.forEach((candidate) => {
      let score = 0;
      if (candidate.includes(farmLabel)) {
        score = 100 + farmLabel.length;
      } else {
        const candidateSkeleton = skeleton(candidate);
        if (candidateSkeleton.length >= 3 && farmSkeleton.startsWith(candidateSkeleton)) {
          score = 50 + candidateSkeleton.length;
          const candidateDigits = candidate.replace(/[^0-9]/g, '');
          if (candidateDigits && candidateDigits === farmDigits) score += 10;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = farm.name;
      }
    });
  });

  return best;
};

export default function BlockDialog({ open, onOpenChange, block, crops, varieties, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [farms, setFarms] = useState([]);
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('FarmBlock', block);

  useEffect(() => {
    if (!open) return;
    setForm(
      block
        ? {
            name: block.name || '',
            code: block.code || '',
            farm: block.farm || '',
            crop_id: block.crop_id || '',
            variety_id: block.variety_id || '',
            planting_date: block.planting_date || '',
            status: block.status || 'active',
            soil_type: block.soil_type || '',
            notes: block.notes || '',
            boundary: block.boundary || [],
            sub_blocks: (block.sub_blocks || []).map((sub) => ({
              name: sub.name || '',
              area_ha: sub.area_ha ?? '',
              variety_id: sub.variety_id || '',
            })),
            irrigation_zones: (block.irrigation_zones || []).map((zone) => ({
              name: zone.name || '',
              area_ha: zone.area_ha ?? '',
            })),
          }
        : EMPTY,
    );
    fetchList(base44.entities.Farm, {}, { sort: 'name' }).then((list) => {
      setFarms(list);
      setForm((prev) => (prev.farm ? prev : { ...prev, farm: detectFarm([prev.name, prev.code], list) }));
    });
  }, [open, block]);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const withDetectedFarm = (prev, patch) => {
    const next = { ...prev, ...patch };
    const keepManual = prev.farm && prev.farm !== detectFarm([prev.name, prev.code], farms);
    return { ...next, farm: keepManual ? prev.farm : detectFarm([next.name, next.code], farms) };
  };

  const handleNameChange = (value) => setForm((prev) => withDetectedFarm(prev, { name: value }));
  const handleCodeChange = (value) => setForm((prev) => withDetectedFarm(prev, { code: value }));

  const farmNames = farms.map((farm) => farm.name);
  if (form.farm && !farmNames.includes(form.farm)) farmNames.unshift(form.farm);
  const area = polygonAreaHa(form.boundary);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      farm: form.farm.trim(),
      crop_id: form.crop_id,
      variety_id: form.variety_id,
      status: form.status,
      soil_type: form.soil_type,
      notes: form.notes,
      boundary: form.boundary,
      area_ha: Number(area.toFixed(2)),
      sub_blocks: form.sub_blocks
        .filter((sub) => sub.name?.trim() || Number(sub.area_ha) > 0 || sub.variety_id)
        .map((sub) => ({
          name: sub.name?.trim() || '',
          area_ha: Number(sub.area_ha) || 0,
          variety_id: sub.variety_id || '',
        })),
      irrigation_zones: form.irrigation_zones
        .filter((zone) => zone.name?.trim() || Number(zone.area_ha) > 0)
        .map((zone) => ({ name: zone.name?.trim() || '', area_ha: Number(zone.area_ha) || 0 })),
    };
    if (form.planting_date) payload.planting_date = form.planting_date;

    if (block?.id) await base44.entities.FarmBlock.update(block.id, payload);
    else await base44.entities.FarmBlock.create(payload);

    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const handleDelete = async () => {
    if (!block?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.FarmBlock.delete(block.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const varietyOptions = varieties
    .filter((variety) => !form.crop_id || variety.crop_id === form.crop_id)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={block ? t('blockDialog.editTitle') : t('blockDialog.newTitle')}
      description={t('blockDialog.desc')}
      onSubmit={handleSubmit}
      saving={saving}
      submitDisabled={lock.locked}
      submitLabel={block ? t('blockDialog.save') : t('blockDialog.create')}
      wide
    >
      <ParamLockNotice usage={lock.usage} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('blockDialog.blockName')}>
          <Input value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder={t('blockDialog.namePlaceholder')} required />
        </Field>
        <Field label={t('blockDialog.code')}>
          <Input value={form.code} onChange={(e) => handleCodeChange(e.target.value)} placeholder="OL-01" />
        </Field>
        <Field label={t('blockDialog.farm')}>
          <SelectField
            value={form.farm}
            onChange={(value) => update('farm', value)}
            noneLabel={t('blockDialog.farmNone')}
            options={farmNames.map((name) => ({ value: name, label: name }))}
            placeholder={t('blockDialog.farmPlaceholder')}
          />
        </Field>
        <Field label={t('common.crop')}>
          <SelectField
            value={form.crop_id}
            onChange={(value) => setForm((prev) => ({ ...prev, crop_id: value, variety_id: '' }))}
            noneLabel={t('blockDialog.noCropYet')}
            options={crops.map((crop) => ({ value: crop.id, label: crop.name }))}
          />
        </Field>
        <Field label={t('blockDialog.variety')}>
          <SelectField
            value={form.variety_id}
            onChange={(value) => update('variety_id', value)}
            noneLabel={t('blockDialog.noVariety')}
            options={varietyOptions}
            placeholder={form.crop_id ? t('blockDialog.selectVariety') : t('blockDialog.pickCropFirst')}
          />
        </Field>
        <Field label={t('blockDialog.plantingDate')}>
          <Input type="date" value={form.planting_date} onChange={(e) => update('planting_date', e.target.value)} />
        </Field>
        <Field label={t('common.status')}>
          <SelectField
            value={form.status}
            onChange={(value) => update('status', value)}
            options={STATUSES.map((value) => ({ value, label: t(`st.${value}`) }))}
          />
        </Field>
        <Field label={t('blockDialog.soilType')}>
          <Input value={form.soil_type} onChange={(e) => update('soil_type', e.target.value)} placeholder={t('blockDialog.soilPlaceholder')} />
        </Field>
        <Field label={t('blockDialog.measuredArea')}>
          <div className="flex h-10 items-center rounded-md border border-input bg-secondary/60 px-3 text-sm font-medium tabular-nums">
            {area.toFixed(2)} ha
          </div>
        </Field>
      </div>

      <Field label={t('blockDialog.subBlocks')} hint={t('blockDialog.subBlocksHint')}>
        <SubBlocksEditor
          subBlocks={form.sub_blocks}
          onChange={(subBlocks) => update('sub_blocks', subBlocks)}
          totalArea={area > 0 ? area : Number(block?.area_ha) || 0}
          blockName={form.name}
          cropId={form.crop_id}
          varieties={varieties}
        />
      </Field>

      <Field label={t('blockDialog.boundary')} hint={t('blockDialog.boundaryHint')}>
        <BoundaryDrawer points={form.boundary} onChange={(points) => update('boundary', points)} />
      </Field>

      <Field label={t('blockDialog.irrigationZones')} hint={t('blockDialog.irrigationHint')}>
        <IrrigationZones zones={form.irrigation_zones} onChange={(zones) => update('irrigation_zones', zones)} />
      </Field>

      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => update('notes', e.target.value)} rows={2} placeholder={t('blockDialog.notesPlaceholder')} />
      </Field>

      {block?.id && !lock.locked && (
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs font-medium text-destructive hover:underline"
        >
          {t('blockDialog.delete')}
        </button>
      )}
    </FormDialog>
  );
}