"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  periode: string;
}

const initial = { error: undefined as string | undefined, success: false };

export function RapportForm({ action, periode }: Props) {
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
        <CardTitle className="text-sm">Soumettre le rapport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Les difficultés, besoins et objectifs affichés ci-dessus seront inclus tels quels
          dans le rapport. Pour les modifier, utilisez la page « Difficultés/Besoins/Objectifs »
          du département avant de soumettre.
        </p>
        <form action={formAction}>
          <input type="hidden" name="periode" value={periode} />

          {state.error && <p className="text-sm text-destructive mb-2">{state.error}</p>}
          {state.success && (
            <p className="text-sm text-green-600 mb-2">Rapport soumis avec succès.</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Soumission…" : "Soumettre le rapport"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
