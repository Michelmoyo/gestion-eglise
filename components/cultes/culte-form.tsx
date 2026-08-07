"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TYPES_SUGGERES = [
  "Culte dominical",
  "Intercession",
  "Nuit de prière",
  "Retraite spirituelle",
  "Formation",
];

type Culte = {
  type: string;
  date_culte: string;
  heure: string | null;
  lieu: string | null;
  description: string | null;
};

type Props = {
  action: (formData: FormData) => Promise<void>;
  defaultValues?: Partial<Culte>;
  submitLabel?: string;
};

export function CulteForm({ action, defaultValues, submitLabel = "Enregistrer" }: Props) {
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
        <Label htmlFor="type">Type *</Label>
        <Input
          id="type"
          name="type"
          required
          list="types-culte-suggeres"
          defaultValue={defaultValues?.type ?? ""}
          placeholder="Culte dominical, intercession…"
        />
        <datalist id="types-culte-suggeres">
          {TYPES_SUGGERES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date_culte">Date *</Label>
        <Input
          id="date_culte"
          name="date_culte"
          type="date"
          required
          defaultValue={defaultValues?.date_culte ?? ""}
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
          placeholder="Temple principal…"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Détails…"
          rows={3}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enregistrement…" : submitLabel}
      </Button>
    </form>
  );
}
