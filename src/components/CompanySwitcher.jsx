import { useState } from 'react';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Field from '@/components/Field';
import { useCompany } from '@/lib/CompanyContext';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

export default function CompanySwitcher({ className }) {
  const { companies, activeCompany, selectCompany, createCompany } = useCompany();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await createCompany(name.trim());
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex max-w-[11rem] items-center gap-1.5 rounded-xl border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:border-primary/40',
              className,
            )}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{activeCompany?.name || t('company.none')}</span>
            <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('company.switch')}
          </DropdownMenuLabel>
          {companies.length === 0 && (
            <p className="px-2 py-2 text-xs text-muted-foreground">{t('company.empty')}</p>
          )}
          {companies.map((company) => (
            <DropdownMenuItem
              key={company.id}
              onClick={() => selectCompany(company.id)}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">{company.name}</span>
              {activeCompany?.id === company.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('company.new')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{t('company.new')}</DialogTitle>
            <DialogDescription>{t('company.createHint')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <Field label={t('company.name')}>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t('company.namePlaceholder')}
                autoFocus
              />
            </Field>
            <Button type="submit" className="w-full rounded-xl" disabled={saving || !name.trim()}>
              {saving ? t('common.saving') : t('company.create')}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}