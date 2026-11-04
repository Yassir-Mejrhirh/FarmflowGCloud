import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Ruler, MapPin, Globe, Upload, Layers, Satellite } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import SatelliteDialog from '@/components/blocks/SatelliteDialog';
import BlockDialog from '@/components/blocks/BlockDialog';
import BlockList from '@/components/blocks/BlockList';
import GroupBlocksDialog from '@/components/blocks/GroupBlocksDialog';
import { Button } from '@/components/ui/button';
import { fetchList, byId } from '@/lib/data';
import { fmtNum } from '@/lib/format';
import { downloadBlockKml, parseKmlBlocks } from '@/lib/kml';
import { readKmzText } from '@/lib/kmz';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function Blocks() {
  const { t } = useI18n();
  const [blocks, setBlocks] = useState([]);
  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const { toast } = useToast();

  const load = async () => {
    const [blockRows, cropRows, varietyRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchList(base44.entities.Variety, {}, { sort: 'name' }),
    ]);
    setBlocks(blockRows);
    setCrops(cropRows);
    setVarieties(varietyRows);
    setSelectedId((prev) => (blockRows.some((b) => b.id === prev) ? prev : blockRows[0]?.id || null));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cropMap = useMemo(() => byId(crops), [crops]);
  const varietyMap = useMemo(() => byId(varieties), [varieties]);
  const totalArea = blocks.reduce((sum, block) => sum + (Number(block.area_ha) || 0), 0);
  const unmapped = blocks.filter((block) => !block.boundary || block.boundary.length < 3).length;

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (block) => {
    setEditing(block);
    setDialogOpen(true);
  };

  const handleImportKmz = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setImporting(true);
    try {
      const parsed = [];
      for (const file of files) {
        parsed.push(...parseKmlBlocks(await readKmzText(await file.arrayBuffer())));
      }
      if (!parsed.length) {
        toast({ title: t('blocks.toastNoBoundaries'), description: t('blocks.toastNoBoundariesDesc'), variant: 'destructive' });
        return;
      }
      await base44.entities.FarmBlock.bulkCreate(parsed.map((block) => ({ ...block, status: 'preparing' })));
      await load();
      toast({ title: t('blocks.toastImported', { n: parsed.length }), description: t('blocks.toastImportedDesc') });
    } catch (error) {
      toast({ title: t('blocks.toastImportFailed'), description: error.message || t('blocks.toastImportFailedDesc'), variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('blocks.eyebrow')}
        title={t('blocks.title')}
        description={t('blocks.description')}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => importInputRef.current?.click()} disabled={importing} className="rounded-xl">
              <Upload className="mr-1.5 h-4 w-4" /> {importing ? t('blocks.importing') : t('blocks.importKml')}
            </Button>
            <Button variant="outline" onClick={() => downloadBlockKml(blocks)} className="rounded-xl">
              <Globe className="mr-1.5 h-4 w-4" /> Google Earth
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".kmz,application/vnd.google-earth.kmz"
              multiple
              className="hidden"
              onChange={handleImportKmz}
            />
            <Button variant="outline" onClick={() => setMapOpen(true)} className="rounded-xl" disabled={!blocks.length}>
              <Satellite className="mr-1.5 h-4 w-4" /> {t('blocks.satellite')}
            </Button>
            <Button variant="outline" onClick={() => setGroupDialogOpen(true)} className="rounded-xl" disabled={!blocks.length}>
              <Layers className="mr-1.5 h-4 w-4" /> {t('blocks.groupButton')}
            </Button>
            <Button onClick={openNew} className="rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> {t('blocks.newBlock')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryTile icon={MapPin} label={t('blocks.tilesBlocks')} value={blocks.length} />
        <SummaryTile icon={Ruler} label={t('blocks.mappedArea')} value={`${fmtNum(totalArea, 2)} ha`} />
        <SummaryTile icon={MapPin} label={t('blocks.needsBoundary')} value={unmapped} tone="clay" />
      </div>

      {loading ? (
        <div className="h-[430px] animate-pulse rounded-2xl bg-muted" />
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={t('blocks.noBlocksTitle')}
          description={t('blocks.noBlocksDesc')}
          action={<Button onClick={openNew}>{t('blocks.plotBlock')}</Button>}
        />
      ) : (
        <div className="grid gap-5">
          <BlockList
            blocks={blocks}
            cropMap={cropMap}
            varietyMap={varietyMap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onEdit={openEdit}
          />
        </div>
      )}

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        block={editing}
        crops={crops}
        varieties={varieties}
        onSaved={load}
      />

      <SatelliteDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        blocks={blocks}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      <GroupBlocksDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        blocks={blocks}
        onSaved={load}
      />
    </div>
  );
}

function SummaryTile({ icon: Icon, label, value, tone = 'sand' }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3">
      <span
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-lg',
          tone === 'clay' && 'bg-clay/10 text-clay',
          tone === 'sage' && 'bg-sage/10 text-sage',
          tone !== 'clay' && tone !== 'sage' && 'bg-secondary text-primary',
        )}
      >
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="font-display text-lg leading-tight tabular-nums">{value}</p>
      </div>
    </div>
  );
}