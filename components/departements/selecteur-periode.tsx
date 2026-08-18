"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Props {
  departementId: string;
  periodeDebut: string;
  periodeFin: string;
  aujourdHui: string;
}

export function SelecteurPeriode({ departementId, periodeDebut, periodeFin, aujourdHui }: Props) {
  const router = useRouter();
  const [debut, setDebut] = useState(periodeDebut);
  const [fin, setFin] = useState(periodeFin);

  const invalide = !debut || !fin || fin < debut;

  function appliquer() {
    if (invalide) return;
    router.push(`/departements/${departementId}/rapport?debut=${debut}&fin=${fin}`);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={debut}
          max={aujourdHui}
          onChange={(e) => setDebut(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Début de la période"
        />
        <span className="text-muted-foreground text-sm">→</span>
        <input
          type="date"
          value={fin}
          max={aujourdHui}
          onChange={(e) => setFin(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          aria-label="Fin de la période"
        />
      </div>
      <Button type="button" variant="outline" size="sm" disabled={invalide} onClick={appliquer}>
        Changer
      </Button>
      {invalide && debut && fin && (
        <p className="text-xs text-destructive">La date de fin doit suivre la date de début.</p>
      )}
    </div>
  );
}
