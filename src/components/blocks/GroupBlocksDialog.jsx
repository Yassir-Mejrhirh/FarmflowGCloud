import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import { Input } from '@/components/ui/input';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function GroupBlocksDialog({ open, onOpenChange, blocks, onSaved }) {
  const { t } = useI18n();
  const [farm, setFarm] = useState('');
  const [locality, setLocality] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFarm('');
    setLocality('');
    setSelected([]);
  }, [open]);

  const toggle = (id) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]));

  const groups = useMemo(() => {
    const map = new Map();
    blocks.forEach((block) => {
      const key = block.farm?.trim() || t('blocks.groupUnassigned');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(block);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, rows]) => ({ label, rows }));
  }, [blocks, t]);

  const allSelected = blocks.length > 0 && selected.length === blocks.length;
  const canSave = selected.length > 0 && (farm.trim() || locality.trim());

  const submit = async (event) => {
    event.preventDefault();
    if (!canSave) return;
    const patch = {};
    if (farm.trim()) patch.farm = farm.trim();
    if (locality.trim()) patch.locality = locality.trim();
    setSaving(true);
    await base44.entities.FarmBlock.bulkUpdate(selected.map((id) => ({ id, ...patch })));
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('groupDialog.title')}
      description={t('groupDialog.desc')}
      onSubmit={submit}
      saving={saving}
      submitLabel={t('groupDialog.apply')}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('blockDialog.farm')}>
          <Input value={farm} onChange={(e) => setFarm(e.target.value)} placeholder={t('blockDialog.farmPlaceholder')} />
        </Field>
        <Field label={t('blockDialog.locality')}>
          <Input
            value={locality}
            onChange={(e) => setLocality(e.target.value)}
            placeholder={t('blockDialog.localityPlaceholder')}
          />
        </Field>
      </div>

      <Field label={`${t('groupDialog.parcels')} (${selected.length}/${blocks.length})`}>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/70 p-2">
          <button
            type="button"
            onClick={() => setSelected(allSelected ? [] : blocks.map((block) => block.id))}
            className="w-full rounded-lg px-2 py-1.5 text-start text-xs font-medium text-primary hover:bg-secondary"
          >
            {allSelected ? t('groupDialog.clearAll') : t('groupDialog.selectAll')}
          </button>
          {groups.map((group) => {
            const groupArea = group.rows.reduce((sum, block) => sum + (Number(block.area_ha) || 0), 0);
            return (
              <div key={group.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 px-2 pt-1.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </p>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {group.rows.length} · {fmtNum(groupArea, 2)} ha
                  </span>
                </div>
                {group.rows.map((block) => {
                  const checked = selected.includes(block.id);
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => toggle(block.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-sm transition-colors',
                        checked ? 'bg-secondary' : 'hover:bg-muted/60',
                      )}
                    >
                      <span
                        className={cn(
                          'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                          checked ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
                        )}
                      >
                        {checked && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{block.name}</span>
                      <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                        {fmtNum(block.area_ha, 2)} ha
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Field>
      <p className="text-[11px] text-muted-foreground">{t('groupDialog.hint')}</p>
    </FormDialog>
  );
}