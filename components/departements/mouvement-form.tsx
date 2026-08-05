"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";

interface Props {
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

const initial = { error: undefined as string | undefined, success: false };

export function MouvementForm({ action }: Props) {
  const [state, formAction, isPending] = useActionState(
    async (_: typeof initial, fd: FormData) => {
      const res = await action(fd);
      return { error: res.error, success: !!res.success };
    },
    initial
  );

  const today = new Date().toISOString().split("T")[0];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <PlusCircle size={16} />
          Nouveau mouvement
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-green-500 has-[:checked]:bg-green-50">
              <input type="radio" name="type" value="entree" defaultChecked className="accent-green-600" />
              <span className="text-sm font-medium text-green-700">Entrée</span>
            </label>
            <label className="flex items-center gap-2 border rounded-md p-3 cursor-pointer has-[:checked]:border-red-500 has-[:checked]:bg-red-50">
              <input type="radio" name="type" value="sortie" className="accent-red-600" />
              <span className="text-sm font-medium text-red-700">Sortie</span>
            </label>
          </div>

          {/* Montant */}
          <div className="space-y-1">
            <Label htmlFor="montant">Montant (FC)</Label>
            <Input
              id="montant"
              name="montant"
              type="number"
              min="1"
              step="1"
              placeholder="0"
              required
            />
          </div>

          {/* Motif */}
          <div className="space-y-1">
            <Label htmlFor="motif">
              Motif <span className="text-muted-foreground text-xs">(obligatoire pour une sortie)</span>
            </Label>
            <Input id="motif" name="motif" placeholder="Ex : Achat de fournitures…" />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="date_mouvement">Date</Label>
            <Input
              id="date_mouvement"
              name="date_mouvement"
              type="date"
              defaultValue={today}
              required
            />
          </div>

          {state.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          {state.success && (
            <p className="text-sm text-green-600">Mouvement enregistré.</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
