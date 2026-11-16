import { detectGender } from '@/lib/workerGender';
import { cn } from '@/lib/utils';

// Fond bleu pour un prénom masculin, rose pour un prénom féminin, neutre quand la
// détection n'est pas fiable.
const TONES = {
  male: 'bg-sky-100 text-sky-950 dark:bg-sky-400/20 dark:text-sky-50',
  female: 'bg-pink-100 text-pink-950 dark:bg-pink-400/20 dark:text-pink-50',
};

export default function WorkerName({ name, className }) {
  const gender = detectGender(name);
  if (!name) return <span className={className}>—</span>;
  if (!gender) return <span className={className}>{name}</span>;

  return <span className={cn('rounded px-1.5 py-0.5', TONES[gender], className)}>{name}</span>;
}