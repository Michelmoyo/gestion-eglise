"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignerRole,
  suspendreOuvrier,
  reactiverOuvrier,
  marquerQuitte,
} from "@/app/(app)/departements/[id]/equipe/actions";

const ROLES = [
  { value: "president", label: "Président" },
  { value: "vice_president", label: "Vice-président" },
  { value: "secretaire", label: "Secrétaire" },
  { value: "tresorier", label: "Trésorier" },
  { value: "membre", label: "Membre" },
] as const;

interface Props {
  departementId: string;
  affectationId: string;
  statut: "actif" | "suspendu";
  roleActuel: string;
  isPilotage: boolean;
  isPresident: boolean;
}

export function EquipeActions({
  departementId,
  affectationId,
  statut,
  roleActuel,
  isPilotage,
  isPresident,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRoles, setShowRoles] = useState(false);
  const [showSuspension, setShowSuspension] = useState(false);
  const [indeterminee, setIndeterminee] = useState(true);
  const [dateFin, setDateFin] = useState("");

  const peutGerer = isPilotage || isPresident;

  if (!peutGerer) return null;

  function handle(fn: () => Promise<{ error?: string; success?: boolean }>, retourListe = false) {
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.error) {
        setError(res.error);
      } else if (retourListe) {
        router.push(`/departements/${departementId}/equipe`);
      } else {
        router.refresh();
      }
      setShowRoles(false);
      setShowSuspension(false);
    });
  }

  const aujourdHui = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-2">
      {statut === "actif" && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowRoles((v) => !v)}
            disabled={isPending}
          >
            Rôle : {ROLES.find((r) => r.value === roleActuel)?.label ?? roleActuel}
            <ChevronDown size={16} className="text-muted-foreground" />
          </Button>
          {showRoles && (
            <div className="absolute inset-x-0 top-full mt-1 z-10 bg-popover border border-border rounded-md shadow-md overflow-hidden">
              {ROLES.filter((r) => r.value !== "president" || isPilotage).map((r) => (
                <button
                  key={r.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                    r.value === roleActuel ? "font-semibold text-primary" : ""
                  }`}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("role", r.value);
                    handle(() => assignerRole(departementId, affectationId, fd));
                  }}
                  disabled={isPending || r.value === roleActuel}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {statut === "actif" && !showSuspension && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-orange-600 border-orange-600/30 hover:bg-orange-500/10 hover:text-orange-600"
          disabled={isPending}
          onClick={() => setShowSuspension(true)}
        >
          Suspendre
        </Button>
      )}

      {statut === "actif" && showSuspension && (
        <div className="border border-orange-600/30 rounded-md p-3 space-y-2">
          <p className="text-xs font-medium text-orange-600">Suspendre ce membre</p>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={indeterminee}
              onChange={(e) => setIndeterminee(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
            />
            Durée indéterminée
          </label>
          {!indeterminee && (
            <input
              type="date"
              value={dateFin}
              min={aujourdHui}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          )}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              disabled={isPending}
              onClick={() => {
                setShowSuspension(false);
                setIndeterminee(true);
                setDateFin("");
              }}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={isPending || (!indeterminee && !dateFin)}
              onClick={() =>
                handle(() =>
                  suspendreOuvrier(departementId, affectationId, indeterminee ? null : dateFin)
                )
              }
            >
              Confirmer
            </Button>
          </div>
        </div>
      )}

      {statut === "suspendu" && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-green-600 border-green-600/30 hover:bg-green-500/10 hover:text-green-600"
          disabled={isPending}
          onClick={() => handle(() => reactiverOuvrier(departementId, affectationId))}
        >
          Réactiver
        </Button>
      )}

      {isPilotage && (
        <Button
          type="button"
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          disabled={isPending}
          onClick={() => {
            if (!confirm("Marquer ce départ comme définitif ?")) return;
            handle(() => marquerQuitte(departementId, affectationId), true);
          }}
        >
          Marquer le départ définitif
        </Button>
      )}

      {error && <p className="text-xs text-destructive text-center">{error}</p>}
    </div>
  );
}
