"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { modifierCoordonnees } from "@/app/(app)/mon-compte/actions";

interface Props {
  telephone: string | null;
  adresse: string | null;
}

export function CoordonneesForm({ telephone, adresse }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      setError(null);
      setSucces(false);
      const res = await modifierCoordonnees(formData);
      if (res.error) setError(res.error);
      else setSucces(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Mes coordonnées</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input id="telephone" name="telephone" type="tel" defaultValue={telephone ?? ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adresse">Adresse</Label>
            <Input id="adresse" name="adresse" defaultValue={adresse ?? ""} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {succes && <p className="text-sm text-green-600">Coordonnées enregistrées.</p>}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
