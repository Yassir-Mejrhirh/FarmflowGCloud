import { useState } from 'react';
import { Lock, Plus, Tags, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useI18n } from '@/lib/I18nContext';

export default function CategoryList({ categories, items, onChanged }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(null);

  const usageOf = (category) =>
    items.filter((item) => (item.category || '').trim() === category.name).length;

  const add = async (event) => {
    event.preventDefault();
    const value = name.trim();
    if (!value || saving) return;
    if (categories.some((category) => category.name.toLowerCase() === value.toLowerCase())) {
      toast({ title: t('inv.categoryExists') });
      return;
    }
    setSaving(true);
    await base44.entities.InputCategory.create({ name: value });
    setSaving(false);
    setName('');
    await onChanged();
  };

  const remove = async (category) => {
    setBusy(category.id);
    await base44.entities.InputCategory.delete(category.id);
    setBusy(null);
    await onChanged();
  };

  return (
    <div className="space-y-4">
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('inv.categoryPlaceholder')}
          className="h-9 max-w-sm rounded-xl"
        />
        <Button type="submit" variant="outline" className="rounded-xl" disabled={saving || !name.trim()}>
          <Plus className="mr-1.5 h-4 w-4" /> {t('inv.addCategory')}
        </Button>
      </form>

      {categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title={t('inv.emptyCategoriesTitle')}
          description={t('inv.emptyCategoriesDesc')}
        />
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {categories.map((category) => {
            const used = usageOf(category);
            return (
              <li key={category.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{category.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {used ? t('inv.categoryUsed', { n: used }) : t('inv.categoryFree')}
                  </p>
                </div>
                {used ? (
                  <span
                    title={t('inv.categoryLocked')}
                    className="flex items-center gap-1.5 px-1.5 text-[11px] font-medium text-muted-foreground"
                  >
                    <Lock className="h-3.5 w-3.5" strokeWidth={1.9} /> {t('inv.categoryLocked')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => remove(category)}
                    disabled={busy === category.id}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.8} />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}