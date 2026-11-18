import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Field from '@/components/Field';
import SelectField from '@/components/SelectField';
import { DEMO_FUNCTIONS } from '@/lib/pointagePrototypeData';

export default function AddWorkerSheet({ open, onOpenChange, prefillName = '', onAdd }) {
  const [name, setName] = useState('');
  const [workerFunction, setWorkerFunction] = useState('Récolte');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (open) {
      setName(prefillName || '');
      setWorkerFunction('Récolte');
      setPhone('');
    }
  }, [open, prefillName]);

  const submit = (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    onAdd({ name: name.trim(), worker_function: workerFunction, phone: phone.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Ajouter un ouvrier (démo)</DialogTitle>
          <DialogDescription className="text-[12px] leading-relaxed">
            Profil fictif ajouté à la liste temporaire du prototype. Aucune équipe, aucun transport et aucune fiche FarmFlow ne sont créés.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Nom complet">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="اسم العامل"
              dir="auto"
              autoFocus
            />
          </Field>
          <Field label="Fonction">
            <SelectField
              value={workerFunction}
              onChange={setWorkerFunction}
              options={DEMO_FUNCTIONS.map((value) => ({ value, label: value }))}
            />
          </Field>
          <Field label="Téléphone (facultatif)">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="06 00 00 00 00" inputMode="tel" />
          </Field>
          <Button type="submit" className="w-full rounded-xl" disabled={!name.trim()}>
            Ajouter à la démonstration
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}