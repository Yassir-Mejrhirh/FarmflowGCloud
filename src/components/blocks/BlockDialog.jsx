import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import BoundaryDrawer from '@/components/blocks/BoundaryDrawer';
import IrrigationZones from '@/components/blocks/IrrigationZones';
import SubBlocksEditor from '@/components/blocks/SubBlocksEditor';
import FarmSelect from '@/components/blocks/FarmSelect';
import BlockSplitDialog from '@/components/blocks/BlockSplitDialog';
import BlockHistoryDialog from '@/components/blocks/BlockHistoryDialog';
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

export default function BlockDialog({ open, onOpenChange, block, varieties, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(EMPTY);
  const [farms, setFarms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [historyOpen, setHistoryOpen] = useState(false);
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
    // A farm already assigned is never cleared: detection only fills or replaces it.
    return { ...next, farm: keepManual ? prev.farm : detectFarm([next.name, next.code], farms) || prev.farm };
  };

  const handleNameChange = (value) => setForm((prev) => withDetectedFarm(prev, { name: value }));
  const handleCodeChange = (value) => setForm((prev) => withDetectedFarm(prev, { code: value }));

  const area = polygonAreaHa(form.boundary);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      farm: form.farm.trim() || block?.farm || '',
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

  return (
    <>
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
          <FarmSelect value={form.farm} farms={farms} onChange={(value) => update('farm', value)} />
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
          onSplit={
            block?.id
              ? (count) => {
                  setSplitCount(count);
                  setSplitOpen(true);
                }
              : undefined
          }
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

      {block?.id && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <History className="h-3.5 w-3.5" /> {t('blockDialog.history')}
          </button>
          {!lock.locked && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-medium text-destructive hover:underline"
            >
              {t('blockDialog.delete')}
            </button>
          )}
        </div>
      )}
    </FormDialog>

    {block?.id && (
      <BlockHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        block={block}
        onRestored={() => {
          onOpenChange(false);
          onSaved();
        }}
      />
    )}

    {block?.id && (
      <BlockSplitDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        block={block}
        count={splitCount}
        varieties={varieties}
        onDone={() => {
          onOpenChange(false);
          onSaved();
        }}
      />
    )}
    </>
  );
}