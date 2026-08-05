"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Ouvrier = { id: string; prenom: string; nom: string };

type Activite = {
  titre: string;
  date_activite: string;
  heure: string | null;
  lieu: string | null;
  description: string | null;
  responsable_id: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Activite>;
  membres: Ouvrier[];
  submitLabel?: string;
};

export function ActiviteForm({ action, defaultValues, membres, submitLabel = "Enregistrer" }: Props) {
  const [, formAction, pending] = useActionState(
    async (_: unknown, formData: FormData) => {
      await action(formData);
      return null;
    },
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="titre">Titre *</Label>
        <Input
          id="titre"
          name="titre"
          required
          defaultValue={defaultValues?.titre ?? ""}
          placeholder="Réunion mensuelle, culte d'intercession…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_activite">Date *</Label>
        <Input
          id="date_activite"
          name="date_activite"
          type="date"
          required
          defaultValue={defaultValues?.date_activite ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="heure">Heure</Label>
        <Input
          id="heure"
          name="heure"
          type="time"
          defaultValue={defaultValues?.heure ?? ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lieu">Lieu</Label>
        <Input
          id="lieu"
          name="lieu"
          defaultValue={defaultValues?.lieu ?? ""}
          placeholder="Salle principale, hall…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Détails sur l'activité…"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {membres.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="responsable_id">Responsable</Label>
          <select
            id="responsable_id"
            name="responsable_id"
            defaultValue={defaultValues?.responsable_id ?? ""}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">— Aucun —</option>
            {membres.map((m) => (
              <option key={m.id} value={m.id}>
                {m.prenom} {m.nom}
              </option>
            ))}
          </select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
