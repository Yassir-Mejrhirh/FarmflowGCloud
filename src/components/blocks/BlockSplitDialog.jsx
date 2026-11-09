import { useEffect, useMemo, useState } from 'react';
import { Plus, Scissors, Trash2 } from 'lucide-react';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import CutLineMap from '@/components/blocks/CutLineMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fmtNum, fmtMoney } from '@/lib/format';
import { polygonAreaHa } from '@/lib/geo';
import { defaultCuts, pieceIsEmpty, splitByCuts } from '@/lib/cutLines';
import { loadBlockUsage, canSplit, shareWeights, splitBlock, summarizeUsage } from '@/lib/blockSplit';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const buildParts = (count, block, baseArea, t) => {
  const name = (block?.name || '').trim();
  const share = baseArea > 0 ? Math.floor((baseArea / count) * 100) / 100 : '';
  return Array.from({ length: count }, (_, index) => {
    const last = index === count - 1;
    const area = baseArea > 0 ? (last ? Number((baseArea - share * (count - 1)).toFixed(2)) : share) : '';
    return {
      name: name ? `${name} ${index + 1}` : t('blockSplit.defaultName', { n: index + 1 }),
      area_ha: area,
      variety_id: '',
    };
  });
};

export default function BlockSplitDialog({ open, onOpenChange, block, count = 2, varieties = [], onDone }) {
  const { t } = useI18n();
  const [parts, setParts] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [usage, setUsage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState('');
  const [failed, setFailed] = useState(false);

  const boundary = useMemo(() => (block?.boundary?.length >= 3 ? block.boundary : []), [block]);
  const mapped = boundary.length >= 3;

  const baseArea = useMemo(
    () => Number(block?.area_ha) || polygonAreaHa(block?.boundary || []) || 0,
    [block],
  );

  const equalCuts = (nextParts) =>
    mapped && nextParts.length > 1 ? defaultCuts(boundary, nextParts.map(() => 1 / nextParts.length)) : [];

  useEffect(() => {
    if (!open || !block?.id) return;
    const nextParts = buildParts(count || 2, block, baseArea, t);
    setParts(nextParts);
    setCuts(equalCuts(nextParts));
    setUsage(null);
    setBlocked('');
    setFailed(false);
    loadBlockUsage(block.id).then(async (loaded) => {
      setUsage(loaded);
      if (!(await canSplit(loaded))) setBlocked(t('blockSplit.adminOnly'));
    });
  }, [open, block, count, baseArea, t, mapped, boundary]);

  const rings = useMemo(
    () => (mapped && cuts.length ? splitByCuts(boundary, cuts) : []),
    [mapped, boundary, cuts],
  );

  // With a boundary, the drawing decides where each parcel is and how big it is.
  const displayParts = useMemo(
    () =>
      parts.map((part, index) =>
        mapped && rings[index] ? { ...part, area_ha: Number(polygonAreaHa(rings[index]).toFixed(2)) } : part,
      ),
    [parts, mapped, rings],
  );

  const traced = !mapped || (cuts.length === parts.length - 1 && rings.length === parts.length);
  const emptyPiece = traced && mapped && rings.some((ring) => pieceIsEmpty(ring));
  const weights = useMemo(() => shareWeights(displayParts), [displayParts]);
  const total = displayParts.reduce((sum, part) => sum + (Number(part.area_ha) || 0), 0);
  const areaMismatch = !mapped && baseArea > 0 && Math.abs(total - baseArea) > 0.02;
  const named = parts.length > 1 && parts.every((part) => part.name?.trim());
  const canDivide = !!usage && named && !areaMismatch && !emptyPiece && traced && !blocked && !saving;
  const summary = useMemo(() => (usage ? summarizeUsage(usage) : null), [usage]);

  const applyParts = (nextParts) => {
    setParts(nextParts);
    setCuts(equalCuts(nextParts));
  };

  const updatePart = (index, key, value) =>
    setParts((prev) => prev.map((part, i) => (i === index ? { ...part, [key]: value } : part)));

  const moveCut = (index, end, point) =>
    setCuts((prev) => prev.map((cut, i) => (i === index ? { ...cut, [end]: point } : cut)));

  const varietyOptions = varieties
    .filter((variety) => !block?.crop_id || variety.crop_id === block.crop_id)
    .map((variety) => ({ value: variety.id, label: variety.name }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canDivide) return;
    setSaving(true);
    setFailed(false);
    try {
      await splitBlock({ block, parts: displayParts, usage, cuts: mapped ? cuts : null });
      setSaving(false);
      onOpenChange(false);
      onDone();
    } catch (error) {
      setSaving(false);
      setFailed(true);
    }
  };

  const rows = summary
    ? [
        { key: 'reports', label: t('blockSplit.reports'), value: summary.reports },
        { key: 'labour', label: t('blockSplit.labour'), value: `${fmtNum(summary.labourDays, 2)} j` },
        { key: 'machinery', label: t('blockSplit.machinery'), value: `${fmtNum(summary.machineHours, 2)} h` },
        { key: 'inputs', label: t('blockSplit.inputs'), value: summary.inputLines },
        { key: 'tasks', label: t('blockSplit.tasks'), value: summary.tasks },
        { key: 'harvests', label: t('blockSplit.harvests'), value: `${fmtNum(summary.harvestKg, 0)} kg` },
        { key: 'expenses', label: t('blockSplit.expenses'), value: fmtMoney(summary.expenseAmount) },
        { key: 'movements', label: t('blockSplit.movements'), value: summary.movements },
      ].filter((row) => Number(String(row.value).replace(/[^0-9.]/g, '')) > 0)
    : [];

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('blockSplit.title')}
      description={t('blockSplit.desc', { name: block?.name || '' })}
      onSubmit={handleSubmit}
      saving={saving}
      submitDisabled={!canDivide}
      submitLabel={t('blockSplit.confirm')}
      wide
    >
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => applyParts(buildParts(2, block, baseArea, t))}>
          <Scissors className="h-3.5 w-3.5" /> {t('blockSplit.into2')}
        </Button>
        <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => applyParts(buildParts(3, block, baseArea, t))}>
          <Scissors className="h-3.5 w-3.5" /> {t('blockSplit.into3')}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-lg"
          onClick={() => applyParts([...parts, { name: '', area_ha: '', variety_id: '' }])}
        >
          <Plus className="h-3.5 w-3.5" /> {t('blockSplit.addPart')}
        </Button>
      </div>

      <Field label={t('blockSplit.parts')}>
        <div className="space-y-2">
          {displayParts.map((part, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-border/60 p-2 sm:grid-cols-[1fr_6.5rem_10rem_auto] sm:items-center sm:border-0 sm:p-0">
              <Input
                value={part.name}
                onChange={(event) => updatePart(index, 'name', event.target.value)}
                placeholder={t('blockSplit.partName')}
              />
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={part.area_ha ?? ''}
                  onChange={(event) => updatePart(index, 'area_ha', event.target.value)}
                  className={cn('pe-8', mapped && 'bg-secondary/60 text-muted-foreground')}
                  readOnly={mapped}
                  aria-label={t('blockSplit.area')}
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[11px] text-muted-foreground">ha</span>
              </div>
              <SelectField
                value={part.variety_id}
                onChange={(value) => updatePart(index, 'variety_id', value)}
                noneLabel={t('blockDialog.noVariety')}
                options={varietyOptions}
                placeholder={t('blockDialog.selectVariety')}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => applyParts(parts.filter((_, i) => i !== index))}
                disabled={parts.length <= 2}
                aria-label={t('blockSplit.removePart')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </Field>

      <Field label={t('blockSplit.cuts')} hint={mapped ? t('blockSplit.cutsHint') : undefined}>
        {mapped ? (
          <CutLineMap
            boundary={boundary}
            cuts={cuts}
            pieces={rings}
            labels={displayParts.map((part) => part.name)}
            areas={displayParts.map((part) => part.area_ha)}
            onMoveCut={moveCut}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
            {t('blockSplit.noBoundary')}
          </p>
        )}
      </Field>

      <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/40 p-3">
        {displayParts.map((part, index) => (
          <p key={index} className="flex items-center justify-between gap-3 text-xs tabular-nums">
            <span className="truncate font-medium">{part.name || '—'}</span>
            <span className="text-muted-foreground">
              {t('blockSplit.share', {
                pct: Math.round((weights[index] || 0) * 1000) / 10,
                area: fmtNum(Number(part.area_ha) || 0, 2),
              })}
            </span>
          </p>
        ))}
        <p className={cn('pt-1 text-[11px] tabular-nums', areaMismatch || emptyPiece ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {baseArea > 0
            ? areaMismatch
              ? t('blockSplit.areaMismatch', { area: fmtNum(baseArea, 2) })
              : t('blockSplit.total', { total: fmtNum(total, 2), area: fmtNum(baseArea, 2) })
            : t('blockSplit.noArea')}
        </p>
        {emptyPiece && <p className="text-[11px] font-medium text-destructive">{t('blockSplit.degenerate')}</p>}
      </div>

      <Field label={t('blockSplit.redistribution')}>
        {!summary ? (
          <p className="text-xs text-muted-foreground">{t('blockSplit.loading')}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('blockSplit.nothing')}</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {rows.map((row) => (
              <p key={row.key} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </p>
            ))}
          </div>
        )}
      </Field>

      {blocked && <p className="text-[11px] font-medium text-destructive">{blocked}</p>}
      {failed && <p className="text-[11px] font-medium text-destructive">{t('blockSplit.failed')}</p>}

      <p className="text-[11px] font-medium text-destructive">{t('blockSplit.deleteWarning')}</p>
    </FormDialog>
  );
}