import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, Gauge, Leaf, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/I18nContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CompanySwitcher from '@/components/CompanySwitcher';
import UserBadge from '@/components/UserBadge';

// La barre ne reprend pas les raccourcis de la page d'accueil : ceux-ci restent
// sur l'accueil, la barre ne garde que les destinations qui n'y sont pas.
export default function Sidebar({ onNavigate, collapsed = false, onToggle }) {
  const { t } = useI18n();

  const groups = [
    {
      label: t('nav.farm'),
      items: [{ to: '/', label: t('nav.overview'), icon: LayoutDashboard, end: true }],
    },
    {
      label: t('nav.finance'),
      items: [{ to: '/costs', label: t('nav.costs'), icon: Wallet }],
    },
    {
      label: t('nav.quality'),
      items: [{ to: '/load-test', label: t('nav.loadTest'), icon: Gauge }],
    },
  ];

  const toggleLabel = collapsed ? t('sidebar.expand') : t('sidebar.collapse');

  return (
    <div className="flex h-full w-full flex-col">
      <div
        className={cn(
          'flex gap-2 pb-6 pt-6',
          collapsed ? 'flex-col items-center px-0' : 'items-center px-5',
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Leaf className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        {!collapsed && (
          <div className="leading-none">
            <p className="font-display text-lg tracking-tight">Terra</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {t('sidebar.tagline')}
            </p>
          </div>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            aria-label={toggleLabel}
            title={toggleLabel}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground',
              !collapsed && 'ms-auto',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" strokeWidth={1.7} />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" strokeWidth={1.7} />
            )}
          </button>
        )}
      </div>

      <nav className={cn('flex-1 overflow-y-auto pb-6', collapsed ? 'px-2' : 'px-3')}>
        {groups.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && 'mt-5')}>
            {collapsed
              ? index > 0 && <div className="mx-2 mb-4 h-px bg-border/70" />
              : (
                <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
                  {group.label}
                </p>
              )}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center rounded-xl text-sm transition-all duration-200',
                        collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="space-y-3 border-t border-border/70 px-5 py-4">
          <CompanySwitcher className="w-full justify-between" />
          <UserBadge className="w-full" />
          <LanguageSwitcher />
          <p className="text-[11px] leading-relaxed text-muted-foreground">{t('sidebar.footer')}</p>
        </div>
      )}
    </div>
  );
}