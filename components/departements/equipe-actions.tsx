"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  assignerRole,
  definirTitreFonction,
  creerTitreFonction,
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

interface TitrePersonnalise {
  id: string;
  nom: string;
}

interface Props {
  departementId: string;
  affectationId: string;
  statut: "actif" | "suspendu";
  roleActuel: string;
  titreFonctionId: string | null;
  titresPersonnalises: TitrePersonnalise[];
  isPilotage: boolean;
  isPresident: boolean;
  isPasteur: boolean;
}

export function EquipeActions({
  departementId,
  affectationId,
  statut,
  roleActuel,
  titreFonctionId,
  titresPersonnalises,
  isPilotage,
  isPresident,
  isPasteur,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRoles, setShowRoles] = useState(false);
  const [showSuspension, setShowSuspension] = useState(false);
  const [indeterminee, setIndeterminee] = useState(true);
  const [dateFin, setDateFin] = useState("");
  const [modeNouveau, setModeNouveau] = useState(false);
  const [nouveauTitre, setNouveauTitre] = useState("");

  const peutGerer = isPilotage || isPresident;

  if (!peutGerer) return null;

  // Assigner un role secondaire (ou nommer un president) est reserve au
  // pasteur et au president de ce departement -- l'assistant peut gerer
  // suspension/reactivation/depart ci-dessous, mais pas ca (cahier des
  // charges §3.8).
  const peutAssignerRole = isPasteur || isPresident;

  const labelRole = ROLES.find((r) => r.value === roleActuel)?.label ?? roleActuel;
  const titreActuel = titresPersonnalises.find((t) => t.id === titreFonctionId) ?? null;
  const labelAffiche = titreActuel?.nom || labelRole;

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
      setModeNouveau(false);
      setShowSuspension(false);
    });
  }

  function choisirRoleFixe(value: string) {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("role", value);
      const res = await assignerRole(departementId, affectationId, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      // Choisir un role fixe efface un eventuel titre personnalise : les
      // deux representent le meme "role affiche", on ne garde pas un
      // intitule perime a cote d'un role different.
      if (titreFonctionId) {
        const fdTitre = new FormData();
        await definirTitreFonction(departementId, affectationId, fdTitre);
      }
      router.refresh();
      setShowRoles(false);
    });
  }

  function choisirTitrePersonnalise(id: string) {
    startTransition(async () => {
      setError(null);
      const fd = new FormData();
      fd.set("titre_fonction_id", id);
      const res = await definirTitreFonction(departementId, affectationId, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      setShowRoles(false);
    });
  }

  function creerEtAssignerTitre() {
    const nom = nouveauTitre.trim();
    if (!nom) return;
    startTransition(async () => {
      setError(null);
      const resCreation = await creerTitreFonction(departementId, nom);
      if (resCreation.error || !resCreation.id) {
        setError(resCreation.error ?? "Erreur lors de la création du titre.");
        return;
      }
      const fd = new FormData();
      fd.set("titre_fonction_id", resCreation.id);
      const res = await definirTitreFonction(departementId, affectationId, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      setShowRoles(false);
      setModeNouveau(false);
      setNouveauTitre("");
    });
  }

  const aujourdHui = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-2">
      {statut === "actif" && peutAssignerRole && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            onClick={() => setShowRoles((v) => !v)}
            disabled={isPending}
          >
            Rôle : {labelAffiche}
            <ChevronDown size={16} className="text-muted-foreground" />
          </Button>
          {showRoles && (
            <div className="absolute inset-x-0 top-full mt-1 z-10 bg-popover border border-border rounded-md shadow-md max-h-72 overflow-y-auto overflow-x-hidden">
              {!modeNouveau ? (
                <>
                  {ROLES.filter((r) => r.value !== "president" || isPasteur).map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                        !titreFonctionId && r.value === roleActuel ? "font-semibold text-primary" : ""
                      }`}
                      onClick={() => choisirRoleFixe(r.value)}
                      disabled={isPending || (!titreFonctionId && r.value === roleActuel)}
                    >
                      {r.label}
                    </button>
                  ))}

                  {titresPersonnalises.length > 0 && (
                    <>
                      <div className="border-t border-border" />
                      {titresPersonnalises.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
                            t.id === titreFonctionId ? "font-semibold text-primary" : ""
                          }`}
                          onClick={() => choisirTitrePersonnalise(t.id)}
                          disabled={isPending || t.id === titreFonctionId}
                        >
                          {t.nom}
                        </button>
                      ))}
                    </>
                  )}

                  <div className="border-t border-border" />
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-accent transition-colors"
                    onClick={() => setModeNouveau(true)}
                    disabled={isPending}
                  >
                    + Nouveau titre…
                  </button>
                </>
              ) : (
                <div className="p-2 space-y-2">
                  <input
                    type="text"
                    autoFocus
                    value={nouveauTitre}
                    maxLength={60}
                    placeholder="ex. Chef de chorale"
                    onChange={(e) => setNouveauTitre(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                  <p className="text-[11px] text-muted-foreground px-0.5">
                    Reste « {labelRole} » pour les permissions ; ce titre sera ensuite disponible
                    pour tout le département.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={isPending}
                      onClick={() => {
                        setModeNouveau(false);
                        setNouveauTitre("");
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1"
                      disabled={isPending || !nouveauTitre.trim()}
                      onClick={creerEtAssignerTitre}
                    >
                      Créer
                    </Button>
                  </div>
                </div>
              )}
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
