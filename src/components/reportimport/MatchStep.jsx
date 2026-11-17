import { useMemo } from 'react';
import { useI18n } from '@/lib/I18nContext';
import MatchRow from '@/components/reportimport/MatchRow';
import StatusBadge from '@/components/reportimport/StatusBadge';

export default function MatchStep({ analysis, choices, farms, blocks, tasks, machines, items, onChange }) {
  const { t } = useI18n();

  const sections = useMemo(() => {
    const farmNameById = new Map(farms.map((farm) => [farm.id, farm.name]));
    const farmOptions = farms.map((farm) => ({ value: farm.id, label: farm.name }));

    return [
      {
        key: 'farmChoices',
        title: t('rimp.match.farms'),
        rows: analysis.farmNames.map((name) => ({
          key: name,
          label: name,
          value: choices.farmChoices[name] || '',
          options: farmOptions,
        })),
      },
      {
        key: 'blockChoices',
        title: t('rimp.match.places'),
        rows: analysis.places.map((row) => {
          const farmName = farmNameById.get(choices.farmChoices[row.farmName]);
          const scoped = blocks.filter((block) => !farmName || block.farm === farmName);
          return {
            key: row.key,
            label: row.place,
            hint: [row.farmName, farmName].filter(Boolean).join(' → '),
            count: t('rimp.match.rows', { n: row.rows }),
            value: choices.blockChoices[row.key] || '',
            options: scoped.map((block) => ({ value: block.id, label: block.name })),
          };
        }),
      },
      {
        key: 'taskChoices',
        title: t('rimp.match.tasks'),
        rows: analysis.natures.map((row) => ({
          key: row.name,
          label: row.name,
          count: t('rimp.match.rows', { n: row.rows }),
          value: choices.taskChoices[row.name] || '',
          options: tasks.map((task) => ({ value: task.id, label: task.title })),
        })),
      },
      {
        key: 'machineChoices',
        title: t('rimp.match.machines'),
        rows: analysis.machines.map((row) => ({
          key: row.name,
          label: row.name,
          count: `${row.hours} h`,
          value: choices.machineChoices[row.name] || '',
          options: machines.map((machine) => ({ value: machine.id, label: machine.name })),
        })),
      },
      {
        key: 'itemChoices',
        title: t('rimp.match.items'),
        rows: analysis.items.map((row) => ({
          key: row.name,
          label: row.name,
          hint: row.unit || '',
          count: `${row.quantity}`,
          value: choices.itemChoices[row.name] || '',
          options: items.map((item) => ({ value: item.id, label: item.name })),
        })),
      },
    ].filter((section) => section.rows.length > 0);
  }, [analysis, choices, farms, blocks, tasks, machines, items, t]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-xl tracking-tight">{t('rimp.match.title')}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t('rimp.match.description')}
        </p>
      </div>

      {sections.map((section) => {
        const missing = section.rows.filter((row) => !row.value).length;
        return (
          <section key={section.key} className="overflow-hidden rounded-2xl border border-border/70 bg-card">
            <header className="flex items-center gap-3 border-b border-border/60 bg-secondary/50 px-4 py-2.5">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {section.title}
              </h3>
              <StatusBadge tone={missing ? 'warn' : 'ok'} className="ms-auto">
                {missing ? `${missing} / ${section.rows.length}` : t('rimp.match.allMatched')}
              </StatusBadge>
            </header>
            <ul className="max-h-[320px] divide-y divide-border/50 overflow-y-auto">
              {section.rows.map((row) => (
                <MatchRow
                  key={`${section.key}-${row.key}`}
                  label={row.label}
                  hint={row.hint}
                  count={row.count}
                  value={row.value}
                  options={row.options}
                  onChange={(next) => onChange(section.key, row.key, next)}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}