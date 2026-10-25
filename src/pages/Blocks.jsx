import { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Ruler, MapPin, Scale, Globe } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import BlockMap, { BLOCK_STATUS_COLORS } from '@/components/blocks/BlockMap';
import BlockDialog from '@/components/blocks/BlockDialog';
import HarvestDialog from '@/components/blocks/HarvestDialog';
import ProductivityPanel from '@/components/blocks/ProductivityPanel';
import HarvestLog from '@/components/blocks/HarvestLog';
import { Button } from '@/components/ui/button';
import { fetchList, byId } from '@/lib/data';
import { fmtNum, fmtDate } from '@/lib/format';
import { downloadBlockKml, blockKmlFilename } from '@/lib/kml';
import { cn } from '@/lib/utils';

const STATUS_LABEL = { active: 'Growing', preparing: 'Preparing', harvest: 'Harvesting', fallow: 'Fallow' };
const STATUS_TONE = { active: 'moss', preparing: 'amber', harvest: 'clay', fallow: 'stone' };

export default function Blocks() {
  const [blocks, setBlocks] = useState([]);
  const [crops, setCrops] = useState([]);
  const [varieties, setVarieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [harvestDialogOpen, setHarvestDialogOpen] = useState(false);
  const [harvestBlock, setHarvestBlock] = useState(null);

  const load = async () => {
    const [blockRows, cropRows, varietyRows, harvestRows] = await Promise.all([
      fetchList(base44.entities.FarmBlock, {}, { sort: 'name' }),
      fetchList(base44.entities.Crop, {}, { sort: 'name' }),
      fetchList(base44.entities.Variety, {}, { sort: 'name' }),
      fetchList(base44.entities.Harvest, {}, { sort: '-date' }),
    ]);
    setBlocks(blockRows);
    setCrops(cropRows);
    setVarieties(varietyRows);
    setHarvests(harvestRows);
    setSelectedId((prev) => (blockRows.some((b) => b.id === prev) ? prev : blockRows[0]?.id || null));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const cropMap = useMemo(() => byId(crops), [crops]);
  const varietyMap = useMemo(() => byId(varieties), [varieties]);
  const blockMap = useMemo(() => byId(blocks), [blocks]);
  const totalArea = blocks.reduce((sum, block) => sum + (Number(block.area_ha) || 0), 0);
  const unmapped = blocks.filter((block) => !block.boundary || block.boundary.length < 3).length;
  const totalHarvested = harvests.reduce((sum, harvest) => sum + (Number(harvest.quantity_kg) || 0), 0);
  const harvestByBlock = useMemo(() => {
    const map = {};
    harvests.forEach((harvest) => {
      const entry = map[harvest.block_id] || (map[harvest.block_id] = { total: 0, count: 0, last: null });
      entry.total += Number(harvest.quantity_kg) || 0;
      entry.count += 1;
      if (!entry.last || harvest.date > entry.last) entry.last = harvest.date;
    });
    return map;
  }, [harvests]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (block) => {
    setEditing(block);
    setDialogOpen(true);
  };

  const openHarvest = (block) => {
    setHarvestBlock(block || null);
    setHarvestDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Georeferencing"
        title="Blocks"
        description="Every field drawn on satellite imagery, with its crop, variety and measured area."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => downloadBlockKml(blocks)} className="rounded-xl">
              <Globe className="mr-1.5 h-4 w-4" /> Google Earth
            </Button>
            <Button variant="outline" onClick={() => openHarvest(null)} className="rounded-xl">
              <Scale className="mr-1.5 h-4 w-4" /> Log harvest
            </Button>
            <Button onClick={openNew} className="rounded-xl">
              <Plus className="mr-1.5 h-4 w-4" /> New block
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile icon={MapPin} label="Blocks" value={blocks.length} />
        <SummaryTile icon={Ruler} label="Mapped area" value={`${fmtNum(totalArea, 2)} ha`} />
        <SummaryTile icon={Scale} label="Total harvested" value={`${fmtNum(totalHarvested, 0)} kg`} tone="sage" />
        <SummaryTile icon={MapPin} label="Needs boundary" value={unmapped} tone="clay" />
      </div>

      {loading ? (
        <div className="h-[430px] animate-pulse rounded-2xl bg-muted" />
      ) : blocks.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No blocks yet"
          description="Draw your first field boundary on the satellite map to start tracking area, crops and costs."
          action={<Button onClick={openNew}>Plot a block</Button>}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
          <div className="rounded-2xl border border-border/70 bg-card p-2">
            <BlockMap blocks={blocks} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3">
              {Object.entries(STATUS_LABEL).map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: BLOCK_STATUS_COLORS[key] }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2 xl:max-h-[520px] xl:overflow-y-auto xl:pr-1">
            {blocks.map((block) => {
              const crop = cropMap[block.crop_id];
              const variety = varietyMap[block.variety_id];
              const harvestStats = harvestByBlock[block.id];
              const active = block.id === selectedId;
              return (
                <div
                  key={block.id}
                  className={cn(
                    'rounded-2xl border bg-card p-4 transition-all duration-200',
                    active ? 'border-primary/40 shadow-[0_18px_40px_-38px_rgba(20,45,35,0.9)]' : 'border-border/70',
                  )}
                >
                  <button type="button" onClick={() => setSelectedId(block.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-base leading-tight">{block.name}</p>
                        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          {block.code || 'No code'}
                        </p>
                      </div>
                      <StatusPill tone={STATUS_TONE[block.status] || 'stone'}>
                        {STATUS_LABEL[block.status] || block.status}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular-nums">{fmtNum(block.area_ha, 2)} ha</span>
                      <span className="truncate">
                        {crop ? `${crop.name}${variety ? ` · ${variety.name}` : ''}` : 'No crop assigned'}
                      </span>
                    </div>
                    {harvestStats && (
                      <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-sage">
                        <span className="font-medium tabular-nums">{fmtNum(harvestStats.total, 0)} kg harvested</span>
                        <span className="tabular-nums">
                          {fmtNum(Number(block.area_ha) > 0 ? harvestStats.total / Number(block.area_ha) : 0, 0)} kg/ha
                        </span>
                        <span>last {fmtDate(harvestStats.last)}</span>
                      </p>
                    )}
                  </button>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {block.boundary?.length || 0} boundary points
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => downloadBlockKml([block], blockKmlFilename(block))}
                        className="text-[11px] font-medium text-sage hover:underline"
                      >
                        Google Earth
                      </button>
                      <button
                        type="button"
                        onClick={() => openHarvest(block)}
                        className="text-[11px] font-medium text-sage hover:underline"
                      >
                        Log harvest
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(block)}
                        className="text-[11px] font-medium text-primary hover:underline"
                      >
                        Edit block
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <ProductivityPanel
          blocks={blocks}
          harvests={harvests}
          cropMap={cropMap}
          onLogHarvest={() => openHarvest(null)}
        />
        <HarvestLog harvests={harvests} blockMap={blockMap} onDeleted={load} />
      </div>

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        block={editing}
        crops={crops}
        varieties={varieties}
        onSaved={load}
      />

      <HarvestDialog
        open={harvestDialogOpen}
        onOpenChange={setHarvestDialogOpen}
        block={harvestBlock}
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