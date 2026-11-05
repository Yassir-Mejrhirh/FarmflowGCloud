import { Link } from 'react-router-dom';
import {
  BarChart3, Boxes, CalendarRange, ChevronRight, ClipboardList, Layers, ListChecks, MapPin,
  Settings2, Sprout, Tractor, Truck, Users, Wallet, Leaf, ClipboardCheck, Receipt, House, Warehouse,
} from 'lucide-react';
import { useI18n } from '@/lib/I18nContext';

export default function OverviewGroups() {
  const { t } = useI18n();

  const groups = [
    {
      key: 'param',
      icon: Settings2,
      items: [
        { to: '/farms', label: t('param.farms'), icon: House },
        { to: '/storages', label: t('param.storages'), icon: Warehouse },
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
    <div className="space-y-2.5">
      {groups.map((group) => (
        <section key={group.key} className="rounded-xl border border-border/70 bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
              <group.icon className="h-3 w-3" strokeWidth={2} />
            </span>
            <h2 className="font-display text-sm leading-tight tracking-tight">{t(`ov.${group.key}`)}</h2>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
            {group.items.map((item) => (
              <Link
                key={`${group.key}-${item.label}`}
                to={item.to}
                className="group flex items-center gap-1.5 rounded-lg border border-border/60 bg-background/50 px-2 py-1 text-[11px] transition-colors duration-200 hover:border-primary/40 hover:bg-accent"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={1.8} />
                <span className="truncate">{item.label}</span>
                <ChevronRight className="ms-auto h-3 w-3 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}