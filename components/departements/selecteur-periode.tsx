"use client";

import { useRouter } from "next/navigation";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

interface Props {
  departementId: string;
  moisSelectionne: number;
  anneeSelectionnee: number;
  anneeMax: number;
  moisMax: number;
}

export function SelecteurPeriode({
  departementId,
  moisSelectionne,
  anneeSelectionnee,
  anneeMax,
  moisMax,
}: Props) {
  const router = useRouter();
  const anneeMin = anneeMax - 5;
  const anneesDisponibles = Array.from({ length: anneeMax - anneeMin + 1 }, (_, i) => anneeMin + i);

  function naviguer(mois: number, annee: number) {
    const periode = `${annee}-${String(mois).padStart(2, "0")}`;
    router.push(`/departements/${departementId}/rapport?periode=${periode}`);
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <select
        value={moisSelectionne}
        onChange={(e) => naviguer(Number(e.target.value), anneeSelectionnee)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        aria-label="Mois"
      >
        {MOIS.map((label, i) => {
          const valeur = i + 1;
          const desactive = anneeSelectionnee === anneeMax && valeur > moisMax;
          return (
            <option key={valeur} value={valeur} disabled={desactive}>
              {label}
            </option>
          );
        })}
      </select>
      <select
        value={anneeSelectionnee}
        onChange={(e) => naviguer(moisSelectionne, Number(e.target.value))}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        aria-label="Année"
      >
        {anneesDisponibles.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
    </div>
  );
}
