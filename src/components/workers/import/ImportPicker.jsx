import { useState } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/I18nContext';
import { cn } from '@/lib/utils';

const ADD = '__add__';

// Liste d'équipe ou de transporteur de l'import : elle propose les valeurs
// connues et un choix « Ajouter » qui crée une nouvelle valeur mémorisée pour
// les imports suivants.
export default function ImportPicker({
  value, options = [], onChange, onCreate, noneLabel, placeholder, compact, className,
}) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const optionList = options
    .map((option) => (typeof option === 'string' ? { value: option, label: option } : option))
    .filter((option) => option && option.value);
  const known = optionList.some((option) => option.value === value);

  const confirm = () => {
    const name = draft.trim();
    if (!name) return;
    onCreate(name);
    onChange(name);
    setDraft('');
    setAdding(false);
  };

  if (adding) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Input
          autoFocus
          className={cn('text-xs', compact ? 'h-7 px-1.5' : 'h-9')}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              confirm();
            }
            if (event.key === 'Escape') setAdding(false);
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0"
          onClick={confirm}
          disabled={!draft.trim()}
          title={t('wimport.addSave')}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={() => setAdding(false)}
          title={t('wimport.addCancel')}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || 'none'}
      onValueChange={(next) => {
        if (next === ADD) {
          setAdding(true);
          return;
        }
        onChange(next === 'none' ? '' : next);
      }}
    >
      <SelectTrigger className={cn('w-full text-xs', compact ? 'h-7 px-2' : 'h-9', className)}>
        <SelectValue placeholder={noneLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{noneLabel || t('wimport.none')}</SelectItem>
        {value && !known && <SelectItem value={value}>{value}</SelectItem>}
        {optionList.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
        <SelectItem value={ADD}>
          <span className="flex items-center gap-1.5 font-medium text-primary">
            <Plus className="h-3.5 w-3.5" /> {t('wimport.add')}
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}