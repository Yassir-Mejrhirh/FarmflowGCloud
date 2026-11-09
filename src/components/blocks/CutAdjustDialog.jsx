import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import FormDialog from '@/components/FormDialog';
import Field from '@/components/Field';
import CutLineMap from '@/components/blocks/CutLineMap';
import { fetchList } from '@/lib/data';
import { polygonAreaHa } from '@/lib/geo';
import { cutToFlat, flatToCut, pieceIsEmpty, splitByCuts } from '@/lib/cutLines';
import { fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';

export default function CutAdjustDialog({ open, onOpenChange, block, onSaved }) {
  const { t } = useI18n();
  const [siblings, setSiblings] = useState([]);
  const [source, setSource] = useState([]);
  const [cuts, setCuts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !block?.id) return;
    setFailed(false);
    setSiblings([]);
    fetchList(base44.entities.FarmBlock, { split_group_id: block.split_group_id }).then((rows) => {
      const ordered = rows
        .slice()
        .sort((a, b) => (Number(a.split_index) || 0) - (Number(b.split_index) || 0));
      const host = ordered[0] || block;
      setSiblings(ordered);
      setSource((host.split_source || []).map((point) => ({ lat: point.lat, lng: point.lng })));
      setCuts((host.split_cuts || []).map(flatToCut));
    });
  }, [open, block]);

  const ready = source.length >= 3 && cuts.length > 0 && siblings.length === cuts.length + 1;
  const rings = useMemo(() => (ready ? splitByCuts(source, cuts) : []), [ready, source, cuts]);
  const emptyPiece = ready && rings.some((ring) => pieceIsEmpty(ring));

  const moveCut = (index, end, point) =>
    setCuts((prev) => prev.map((cut, i) => (i === index ? { ...cut, [end]: point } : cut)));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!ready || emptyPiece || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      for (let index = 0; index < siblings.length; index += 1) {
        await base44.entities.FarmBlock.update(siblings[index].id, {
          boundary: rings[index],
          area_ha: Number(polygonAreaHa(rings[index]).toFixed(2)),
          split_source: source,
          split_cuts: cuts.map(cutToFlat),
        });
      }
      setSaving(false);
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      setSaving(false);
      setFailed(true);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('cutAdjust.title')}
      description={t('cutAdjust.desc')}
      onSubmit={handleSubmit}
      saving={saving}
      submitDisabled={!ready || emptyPiece}
      submitLabel={t('cutAdjust.save')}
      wide
    >
      {ready ? (
        <>
          <Field label={t('blockSplit.cuts')} hint={t('cutAdjust.hint')}>
            <CutLineMap
              boundary={source}
              cuts={cuts}
              pieces={rings}
              labels={siblings.map((row) => row.name)}
              areas={rings.map((ring) => Number(polygonAreaHa(ring).toFixed(2)))}
              onMoveCut={moveCut}
            />
          </Field>

          <div className="space-y-1.5 rounded-xl border border-border/70 bg-secondary/40 p-3">
            {siblings.map((row, index) => (
              <p key={row.id} className="flex items-center justify-between gap-3 text-xs tabular-nums">
                <span className="truncate font-medium">{row.name}</span>
                <span className="text-muted-foreground">
                  {t('cutAdjust.areaRow', { area: fmtNum(polygonAreaHa(rings[index]), 2) })}
                </span>
              </p>
            ))}
          </div>

          {emptyPiece && <p className="text-[11px] font-medium text-destructive">{t('blockSplit.degenerate')}</p>}
          {failed && <p className="text-[11px] font-medium text-destructive">{t('cutAdjust.failed')}</p>}
          <p className="text-[11px] text-muted-foreground">{t('cutAdjust.dataNote')}</p>
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
          {t('cutAdjust.unavailable')}
        </p>
      )}
    </FormDialog>
  );
}