import { Link } from 'react-router-dom';
import {
  BarChart3, Boxes, CalendarRange, ChevronRight, ClipboardList, Layers, ListChecks, MapPin,
  Settings2, Sprout, Tractor, Truck, Users, Wallet, Leaf, ClipboardCheck, Receipt,
} from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';

export default function OverviewGroups() {
  const { t } = useI18n();

  const groups = [
    {
      key: 'param',
      icon: Settings2,
      items: [
        { to: '/seasons', label: t('param.season'), icon: CalendarRange },
        { to: '/tasks', label: t('param.tasks'), icon: ListChecks },
        { to: '/blocks', label: t('param.blocks'), icon: MapPin },
        { to: '/crops', label: t('param.crops'), icon: Sprout },
        { to: '/varieties', label: t('param.varieties'), icon: Leaf },
        { to: '/workers', label: t('param.labour'), icon: Users },
        { to: '/machinery', label: t('param.machinery'), icon: Tractor },
        { to: '/inventory', label: t('param.inputs'), icon: Boxes },
        { to: '/suppliers', label: t('param.suppliers'), icon: Truck },
      ],
    },
    {
      key: 'entry',
      icon: ClipboardCheck,
      items: [
        { to: '/planting', label: t('ov.entryCrops'), icon: Layers },
        { to: '/daily-report', label: t('ov.entryReport'), icon: ClipboardList },
        { to: '/input-invoices', label: t('ov.entryInvoices'), icon: Receipt },
      ],
    },
    {
      key: 'reports',
      icon: BarChart3,
      items: [
        { to: '/costs', label: t('ov.reportCosts'), icon: Wallet },
        { to: '/daily-report', label: t('ov.reportJournal'), icon: ClipboardList },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.key} className="rounded-2xl border border-border/70 bg-card p-4 sm:p-5">
          <div className="mb-3 flex items-start gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
              <group.icon className="h-3.5 w-3.5" strokeWidth={1.9} />
            </span>
            <div>
              <h2 className="font-display text-base leading-tight tracking-tight">{t(`ov.${group.key}`)}</h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{t(`ov.${group.key}Hint`)}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <Link
                key={`${group.key}-${item.label}`}
                to={item.to}
                className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 text-sm transition-all duration-200 hover:border-primary/40 hover:bg-accent"
              >
                <item.icon className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.7} />
                <span className="truncate">{item.label}</span>
                <ChevronRight className="ms-auto h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}