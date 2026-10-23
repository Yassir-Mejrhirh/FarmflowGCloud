import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Map, Sprout, ListChecks, Users, Tractor, Boxes, Wallet, Leaf,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GROUPS = [
  {
    label: 'Farm',
    items: [
      { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/blocks', label: 'Blocks', icon: Map },
      { to: '/crops', label: 'Crops & varieties', icon: Sprout },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/tasks', label: 'Tasks', icon: ListChecks },
      { to: '/workers', label: 'Workers', icon: Users },
      { to: '/machinery', label: 'Machinery', icon: Tractor },
      { to: '/inventory', label: 'Inventory', icon: Boxes },
    ],
  },
  {
    label: 'Finance',
    items: [{ to: '/costs', label: 'Costs', icon: Wallet }],
  },
];

export default function Sidebar({ onNavigate }) {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 px-5 pb-7 pt-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Leaf className="h-[18px] w-[18px]" strokeWidth={1.9} />
        </span>
        <div className="leading-none">
          <p className="font-display text-lg tracking-tight">Terra</p>
          <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Farm suite</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )
                    }
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-border/70 px-5 py-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Season 2026 · Blocks, crew and costs in one place.
        </p>
      </div>
    </div>
  );
}