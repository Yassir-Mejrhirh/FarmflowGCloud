import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CalendarRange, Plus } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatusPill from '@/components/StatusPill';
import EmptyState from '@/components/EmptyState';
import FormDialog from '@/components/FormDialog';
import ParamLockNotice from '@/components/ParamLockNotice';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchList } from '@/lib/data';
import { fmtDate } from '@/lib/format';
import { useI18n } from '@/lib/I18nContext';
import { useParamLock } from '@/lib/paramUsage';

const STATUSES = ['planned', 'active', 'closed'];
const TONE = { planned: 'sand', active: 'moss', closed: 'stone' };

export default function Seasons() {
  const { t } = useI18n();
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setSeasons(await fetchList(base44.entities.Season, {}, { sort: '-start_date' }));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={t('seasons.eyebrow')}
        title={t('seasons.title')}
        description={t('seasons.description')}
        action={
          <Button
            className="rounded-xl"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> {t('seasons.new')}
          </Button>
        }
      />

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      ) : seasons.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title={t('seasons.emptyTitle')}
          description={t('seasons.emptyDesc')}
          action={<Button onClick={() => setOpen(true)}>{t('seasons.add')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {seasons.map((season) => (
            <button
              key={season.id}
              type="button"
              onClick={() => {
                setEditing(season);
                setOpen(true);
              }}
              className="rounded-2xl border border-border/70 bg-card p-5 text-start transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_45px_-38px_rgba(20,45,35,0.9)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-lg leading-tight">{season.name}</p>
                <StatusPill tone={TONE[season.status] || 'stone'}>{t(`seasonSt.${season.status}`)}</StatusPill>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                {season.start_date
                  ? `${fmtDate(season.start_date)} → ${season.end_date ? fmtDate(season.end_date) : '…'}`
                  : t('seasons.noDates')}
              </p>
              {season.notes && (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{season.notes}</p>
              )}
            </button>
          ))}
        </div>
      )}

      <SeasonDialog open={open} onOpenChange={setOpen} season={editing} onSaved={load} />
    </div>
  );
}

function SeasonDialog({ open, onOpenChange, season, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', start_date: '', end_date: '', status: 'active', notes: '' });
  const [saving, setSaving] = useState(false);
  const lock = useParamLock('Season', season);

  useEffect(() => {
    if (!open) return;
    setForm({
      name: season?.name || '',
      start_date: season?.start_date || '',
      end_date: season?.end_date || '',
      status: season?.status || 'active',
      notes: season?.notes || '',
    });
  }, [open, season]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || lock.locked) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      start_date: form.start_date,
      end_date: form.end_date,
      status: form.status,
      notes: form.notes,
    };
    if (season?.id) await base44.entities.Season.update(season.id, payload);
    else await base44.entities.Season.create(payload);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  const remove = async () => {
    if (!season?.id || lock.locked) return;
    setSaving(true);
    await base44.entities.Season.delete(season.id);
    setSaving(false);
    onOpenChange(false);
    onSaved();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={season ? t('seasons.dialogEdit') : t('seasons.dialogNew')}
      onSubmit={submit}
      saving={saving}
      submitDisabled={lock.locked}
    >
      <ParamLockNotice usage={lock.usage} />

      <Field label={t('common.name')}>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={t('seasons.namePlaceholder')}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('seasons.startDate')}>
          <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </Field>
        <Field label={t('seasons.endDate')}>
          <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </Field>
      </div>
      <Field label={t('common.status')}>
        <SelectField
          value={form.status}
          onChange={(value) => setForm({ ...form, status: value })}
          options={STATUSES.map((value) => ({ value, label: t(`seasonSt.${value}`) }))}
        />
      </Field>
      <Field label={t('common.notes')}>
        <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
      </Field>
      {season?.id && !lock.locked && (
        <button type="button" onClick={remove} className="text-xs font-medium text-destructive hover:underline">
          {t('seasons.delete')}
        </button>
      )}
    </FormDialog>
  );
}