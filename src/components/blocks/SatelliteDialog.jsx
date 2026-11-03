import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import BlockMap, { BLOCK_STATUS_COLORS } from '@/components/blocks/BlockMap';
import { useI18n } from '@/lib/I18nContext';

const STATUS_KEYS = ['active', 'preparing', 'harvest', 'fallow'];

export default function SatelliteDialog({ open, onOpenChange, blocks, selectedId, onSelect }) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] gap-4 overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-normal tracking-tight">{t('blocks.satelliteTitle')}</DialogTitle>
          <DialogDescription className="text-sm">{t('blocks.satelliteDesc')}</DialogDescription>
        </DialogHeader>

        {open && <BlockMap blocks={blocks} selectedId={selectedId} onSelect={onSelect} />}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          {STATUS_KEYS.map((key) => (
            <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLOCK_STATUS_COLORS[key] }} />
              {t(`st.${key}`)}
            </span>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}