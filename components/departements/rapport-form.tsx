"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  periode: string;
  initialData: {
    difficultes: string;
    besoins: string;
    objectifs: string;
  };
}

const initial = { error: undefined as string | undefined, success: false };

export function RapportForm({ action, periode, initialData }: Props) {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initial, fd: FormData) => {
      const res = await action(fd);
      return { error: res.error, success: !!res.success };
    },
    initial
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Compléter le rapport</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="periode" value={periode} />

          <div className="space-y-1">
            <Label htmlFor="difficultes">Difficultés rencontrées</Label>
            <Textarea
              id="difficultes"
              name="difficultes"
              placeholder="Décrivez les difficultés ce mois…"
              defaultValue={initialData.difficultes}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="besoins">Besoins</Label>
            <Textarea
              id="besoins"
              name="besoins"
              placeholder="Quels sont vos besoins pour le mois prochain ?…"
              defaultValue={initialData.besoins}
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="objectifs">Objectifs du mois prochain</Label>
            <Textarea
              id="objectifs"
              name="objectifs"
              placeholder="Vos objectifs pour le mois à venir…"
              defaultValue={initialData.objectifs}
              rows={3}
            />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-green-600">Rapport soumis avec succès.</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Soumission…" : "Soumettre le rapport"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
