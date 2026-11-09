import { useState } from 'react';
import { Scissors } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import BlockMap, { BLOCK_STATUS_COLORS } from '@/components/blocks/BlockMap';
import CutAdjustDialog from '@/components/blocks/CutAdjustDialog';
import { useI18n } from '@/lib/I18nContext';

const STATUS_KEYS = ['active', 'preparing', 'harvest', 'fallow'];

export default function SatelliteDialog({ open, onOpenChange, blocks, selectedId, onSelect, onSaved }) {
  const { t } = useI18n();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const selected = (blocks || []).find((block) => block.id === selectedId);
  const splittable = !!selected?.split_group_id && (selected?.split_source || []).length >= 3;

  return (
    <>
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setAdjustOpen(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{t('blocks.satelliteTitle')}</DialogTitle>
          <DialogDescription className="text-sm">{t('blocks.satelliteDesc')}</DialogDescription>
        </DialogHeader>

        {open && <BlockMap blocks={blocks} selectedId={selectedId} onSelect={onSelect} />}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {STATUS_KEYS.map((key) => (
              <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLOCK_STATUS_COLORS[key] }} />
                {t(`st.${key}`)}
              </span>
            ))}
          </div>
          {splittable && (
            <Button variant="outline" size="sm" className="rounded-lg" onClick={() => setAdjustOpen(true)}>
              <Scissors className="h-3.5 w-3.5" /> {t('cutAdjust.open')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <CutAdjustDialog
      open={adjustOpen}
      onOpenChange={setAdjustOpen}
      block={selected}
      onSaved={onSaved}
    />
    </>
  );
}