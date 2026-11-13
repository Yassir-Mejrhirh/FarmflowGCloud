import CompanySwitcher from '@/components/CompanySwitcher';
import UserBadge from '@/components/UserBadge';
import LanguageSwitcher from '@/components/LanguageSwitcher';

// Entité active, utilisateur connecté et langue : le groupe se place à droite de
// l'en-tête de l'accueil, à l'opposé de la date.
export default function DashboardControls() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CompanySwitcher />
      <UserBadge />
      <LanguageSwitcher />
    </div>
  );
}