import { MapPin, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'onsite', label: 'Sur le site', icon: ShieldCheck, tone: 'ok' },
  { value: 'offsite', label: 'Hors site', icon: ShieldAlert, tone: 'warn' },
  { value: 'denied', label: 'Refus', icon: ShieldX, tone: 'stop' },
];

const TONES = {
  ok: 'border-primary bg-primary text-primary-foreground',
  warn: 'border-clay bg-clay text-clay-foreground',
  stop: 'border-destructive bg-destructive text-destructive-foreground',
};

const MESSAGES = {
  idle: 'Choisissez une position simulée pour tester le contrôle du site.',
  onsite: 'Position simulée : dans le périmètre du site. Le pointage est autorisé.',
  offsite: 'Position simulée : hors du périmètre du site. Le pointage n’est pas autorisé.',
  denied: 'Localisation simulée comme refusée. Le pointage n’est pas autorisé.',
};

export default function GeoSimulationCard({ value, onChange }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" strokeWidth={1.9} />
        <p className="text-[12px] font-semibold">Contrôle du site (simulé)</p>
      </div>
      <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{MESSAGES[value] || MESSAGES.idle}</p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5">
        {OPTIONS.map((option) => {
          const active = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-[11.5px] font-medium transition-colors duration-200',
                active ? TONES[option.tone] : 'border-border bg-background text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}