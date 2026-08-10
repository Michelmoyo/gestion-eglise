"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  initialData: {
    nomEglise: string;
    reseau: string;
    adresse: string;
    telephone: string;
    email: string;
  };
}

const initial = { error: undefined as string | undefined, success: false };

export function ParametresForm({ action, initialData }: Props) {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initial, fd: FormData) => {
      const res = await action(fd);
      return { error: res.error, success: !!res.success };
    },
    initial
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="nomEglise">Nom de l&apos;église</Label>
        <Input
          id="nomEglise"
          name="nomEglise"
          defaultValue={initialData.nomEglise}
          placeholder="Église La Compassion Masina"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="reseau">Réseau / mouvement (optionnel)</Label>
        <Input
          id="reseau"
          name="reseau"
          defaultValue={initialData.reseau}
          placeholder="Centre de Réveil d'Évangélisation…"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          name="adresse"
          defaultValue={initialData.adresse}
          placeholder="Avenue, quartier, ville…"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          id="telephone"
          name="telephone"
          defaultValue={initialData.telephone}
          placeholder="+243 900 000 000"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          defaultValue={initialData.email}
          placeholder="contact@eglise.org"
        />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm text-green-600">Enregistré.</p>}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
