import { useState } from 'react';
import { CheckCircle2, ChevronDown, Plus, Tractor, Trash2, Users } from 'lucide-react';
import NewTaskDialog from '@/components/dailyreport/NewTaskDialog';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import StatusPill from '@/components/StatusPill';
import LineModule from '@/components/dailyreport/LineModule';
import BlockPicker from '@/components/dailyreport/BlockPicker';
import LabourField from '@/components/dailyreport/LabourField';
import LabourRateNote from '@/components/dailyreport/LabourRateNote';
import UsageField from '@/components/dailyreport/UsageField';
import FuelLine from '@/components/dailyreport/FuelLine';
import OtherInputsPanel from '@/components/dailyreport/OtherInputsPanel';
import InputStockNote from '@/components/dailyreport/InputStockNote';
import InputSupplyActions from '@/components/dailyreport/InputSupplyActions';
import InputPurchaseDialog from '@/components/dailyreport/InputPurchaseDialog';
import ItemDialog from '@/components/inventory/ItemDialog';
import StockShortageAlert from '@/components/stock/StockShortageAlert';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { natureLabel } from '@/lib/taskNature';
import { lineShortages } from '@/lib/reportLines';
import { stockForFarm } from '@/lib/reportStock';
import { storagesForFarm } from '@/lib/storageScope';
import { fmtDayDate, fmtNum } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

// One task of the day: its parcels, its labour, its machinery and its inputs. The
// line stays open while it is written, then folds back once it is pre-validated.
export default function TaskLineCard({
  line, index, open, onToggle, onChange, onValidate, onRemove, onCancelEdit, issues = [], ctx,
}) {
  const { t } = useI18n();
  const {
    tasks, natures, blockGroups, blockMap, workerMap, labourGroupsFor, rateIndex, transportIndex,
    machineOptions, machineMap, availableInputs, items, itemMap, stockTotals, replaced, date,
    storages, invoices, onHand, farmName, pointageDays, pointageRemaining, reloadTasks,
    suppliers, reloadStock,
  } = ctx;
  const [creatingTask, setCreatingTask] = useState(false);
  const [creatingItem, setCreatingItem] = useState(false);
  const [purchaseItemId, setPurchaseItemId] = useState('');
  // The invoice dialog also opens without a chosen input: any purchase can be written.
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const openInvoice = (itemId) => {
    setPurchaseItemId(itemId || '');
    setPurchaseOpen(true);
  };

  const task = tasks.find((row) => row.id === line.task_id);
  const blockNames = line.block_ids.map((id) => blockMap[id]?.name).filter(Boolean);
  const blockArea = line.block_ids.reduce((sum, id) => sum + (Number(blockMap[id]?.area_ha) || 0), 0);
  const labourCount = (line.labour || []).length;
  const machineryCount = (line.machinery || []).length;
  const inputCount = (line.inputs || []).length;
  const shortages = lineShortages({ line, blockMap, storages, invoices, onHand, stockTotals, replaced });
  // The invoice opens on the input already written on the line, when there is one.
  const purchaseSeedId = (line.inputs || []).find((row) => row.item_id)?.item_id || '';
  const isEditing = line.key.startsWith('edit-');

  // The missing input is put on the line right away, so the purchase only has to be written.
  const putInputOnLine = (itemId) => {
    const rows = line.inputs || [];
    if (rows.some((row) => row.item_id === itemId)) return;
    const emptyIndex = rows.findIndex((row) => !row.item_id);
    onChange({
      inputs:
        emptyIndex >= 0
          ? rows.map((row, i) => (i === emptyIndex ? { ...row, item_id: itemId } : row))
          : [...rows, { item_id: itemId, quantity: '' }],
    });
  };

  // A created input is supplied at once: its purchase invoice opens on its name.
  const afterItemCreated = async (created) => {
    if (!created?.id) return;
    await reloadStock();
    putInputOnLine(created.id);
    openInvoice(created.id);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border bg-card transition-colors',
        line.validated ? 'border-primary/30' : open ? 'border-primary/40' : 'border-border/70',
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 px-4 py-3 text-start">
        {index ? (
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold tabular-nums text-muted-foreground">
            {index}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-sm font-medium">
              {task ? natureLabel(task.type, natures, t) : t('report.lineNoTask')}
            </span>
            {line.validated ? (
              <StatusPill tone="moss">{t('report.lineValidated')}</StatusPill>
            ) : (
              <StatusPill tone="clay">{t('report.linePending')}</StatusPill>
            )}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {line.validated && blockNames.length ? (
              <>
                <span>{t('report.blockCount', { n: blockNames.length })}</span>
                <span>{t('report.blockArea', { area: fmtNum(blockArea) })}</span>
              </>
            ) : (
              <span className="truncate">
                {blockNames.length ? blockNames.join(' · ') : t('report.chooseBlocks')}
              </span>
            )}
            <span>{t('report.labourCount', { n: labourCount })}</span>
            <span>{t('report.machineCount', { n: machineryCount })}</span>
            <span>{t('report.inputCount', { n: inputCount })}</span>
          </span>
        </span>
        <ChevronDown
          className={cn('mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-border/70 px-4 py-4">
          {isEditing && (
            <p className="rounded-lg bg-clay/10 px-3 py-2 text-[11px] font-medium text-clay">
              {t('report.editBanner', { date: fmtDayDate(date) })}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('report.task')}>
              <SelectField
                value={line.task_id}
                onChange={(value) => onChange({ task_id: value })}
                options={tasks.map((row) => ({ value: row.id, label: natureLabel(row.type, natures, t) }))}
              />
              <button
                type="button"
                onClick={() => setCreatingTask(true)}
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> {t('report.newTask')}
              </button>
            </Field>
            <Field label={t('report.blocks')}>
              {isEditing ? (
                <>
                  <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm">
                    {blockNames.join(' · ') || '—'}
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">{t('report.blocksLocked')}</p>
                </>
              ) : (
                <BlockPicker
                  groups={blockGroups}
                  selected={line.block_ids}
                  onChange={(ids) => onChange({ block_ids: ids })}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <LineModule
              icon={Users}
              title={t('report.labour')}
              count={labourCount}
              hint={t('report.moduleOpen')}
            >
              <LabourField
                title={t('report.labourPick')}
                placeholder={t('report.chooseLabour')}
                lines={line.labour || []}
                onChange={(rows) => onChange({ labour: rows })}
                groups={labourGroupsFor(line)}
                workerMap={workerMap}
                qtyLabel={t('report.days')}
                emptyLabel={t('report.noLabour')}
                suggested={pointageDays}
                remaining={pointageRemaining}
                renderMeta={(row) => (
                  <LabourRateNote
                    line={row}
                    worker={workerMap[row.worker_id]}
                    rateIndex={rateIndex}
                    transportIndex={transportIndex}
                    date={date}
                  />
                )}
              />
            </LineModule>

            <LineModule
              icon={Tractor}
              title={t('report.machinery')}
              count={machineryCount}
              hint={t('report.moduleOpen')}
            >
              <UsageField
                title={t('report.chooseMachinery')}
                placeholder={t('report.chooseMachinery')}
                lines={line.machinery || []}
                onChange={(rows) => onChange({ machinery: rows })}
                options={machineOptions}
                idKey="machine_id"
                qtyKey="hours"
                qtyLabel={t('report.hours')}
                addLabel={t('report.addMachine')}
                emptyLabel={t('report.noMachine')}
                pickExtras={() => ({
                  fuel_item_id: '',
                  fuel_quantity: '',
                  lubricant_item_id: '',
                  lubricant_quantity: '',
                })}
                renderMeta={(row, patch) => (
                  <FuelLine
                    line={row}
                    patch={patch}
                    machine={machineMap[row.machine_id]}
                    items={availableInputs}
                    allItems={items}
                  />
                )}
              />
              {machineryCount > 0 && (
                <p className="text-[11px] leading-snug text-muted-foreground">{t('report.fuelHint')}</p>
              )}
            </LineModule>
          </div>

          <OtherInputsPanel
            lines={line.inputs || []}
            onChange={(rows) => onChange({ inputs: rows })}
            availableItems={availableInputs}
            items={items}
            renderMeta={(row) => (
              <InputStockNote
                item={itemMap[row.item_id]}
                stock={stockForFarm(storages, invoices, onHand, farmName, row.item_id)}
                used={Number(row.quantity) || 0}
              />
            )}
          />

          <InputSupplyActions
            shortages={shortages}
            itemMap={itemMap}
            suggestedItemId={purchaseSeedId}
            onInvoice={openInvoice}
            onCreateItem={() => setCreatingItem(true)}
          />

          <Field label={t('report.descLabel')}>
            <Textarea
              rows={2}
              value={line.description || ''}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder={t('report.descPlaceholder')}
            />
          </Field>

          <StockShortageAlert shortages={shortages} items={items} storages={storages} />

          <NewTaskDialog
            open={creatingTask}
            onOpenChange={setCreatingTask}
            natures={natures}
            onCreated={async (created) => {
              await reloadTasks();
              onChange({ task_id: created.id });
            }}
          />

          <ItemDialog open={creatingItem} onOpenChange={setCreatingItem} onSaved={afterItemCreated} />

          <InputPurchaseDialog
            open={purchaseOpen}
            onOpenChange={(value) => {
              setPurchaseOpen(value);
              if (!value) setPurchaseItemId('');
            }}
            seedItem={items.find((row) => row.id === purchaseItemId)}
            suppliers={suppliers || []}
            items={items}
            storages={storages}
            defaultStorageId={storagesForFarm(storages, farmName)[0]?.id || ''}
            onSaved={async () => {
              await reloadStock();
              setPurchaseOpen(false);
              setPurchaseItemId('');
            }}
          />

          {issues.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] font-medium text-destructive">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={onValidate} className="rounded-xl">
              <CheckCircle2 className="h-4 w-4" />
              {isEditing ? t('report.update') : t('report.lineValidate')}
            </Button>
            {isEditing ? (
              <Button type="button" variant="ghost" onClick={onCancelEdit} className="rounded-xl">
                {t('report.cancelEdit')}
              </Button>
            ) : (
              <button
                type="button"
                onClick={onRemove}
                className="ms-auto inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
              >
                <Trash2 className="h-3 w-3" /> {t('report.lineRemove')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}