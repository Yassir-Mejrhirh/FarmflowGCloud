import SelectField from '@/components/SelectField';
import { useI18n } from '@/lib/I18nContext';

export default function StockFilters({ storages = [], categories = [], storage, category, onStorage, onCategory }) {
  const { t } = useI18n();

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:max-w-xl">
      <SelectField
        value={storage}
        onChange={onStorage}
        placeholder={t('stock.filterStorage')}
        noneLabel={t('stock.allStorages')}
        options={storages.map((row) => ({ value: row.id, label: row.name }))}
      />
      <SelectField
        value={category}
        onChange={onCategory}
        placeholder={t('stock.filterCategory')}
        noneLabel={t('stock.allCategories')}
        options={categories.map((name) => ({ value: name, label: name }))}
      />
    </div>
  );
}