"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ChevronDown, ChevronRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatutPointSuiviEnum } from "@/lib/supabase/types";
import { STATUTS_POINT_SUIVI, STATUT_POINT_SUIVI_STYLE } from "@/lib/suivi";

export interface PointSuivi {
  id: string;
  contenu: string;
  statut: StatutPointSuiviEnum;
  date_creation: string;
  date_resolution: string | null;
  piece_jointe_nom?: string | null;
}

type Filtre = StatutPointSuiviEnum | "tous";

// La ligne d'un element partage sa largeur avec le selecteur de statut, le
// chevron et le bouton supprimer -- pas la place pour un titre long en
// entier une fois la liste depliee.
const LONGUEUR_MAX_CONTENU = 40;

// Affichage seulement : le contenu stocke garde la casse telle que saisie.
function formaterContenu(texte: string, max: number): string {
  const minuscule = texte.toLowerCase();
  const capitalise = minuscule.charAt(0).toUpperCase() + minuscule.slice(1);
  return capitalise.length > max ? `${capitalise.slice(0, max).trimEnd()}…` : capitalise;
}

interface Props {
  departementId: string;
  listeId: string;
  nom: string;
  inclureRapport: boolean;
  items: PointSuivi[];
  peutGerer: boolean;
  ajouterAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  changerStatutAction: (
    pointId: string,
    statut: StatutPointSuiviEnum
  ) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  supprimerListeAction: (listeId: string) => Promise<{ error?: string; success?: boolean }>;
  changerInclureRapportAction: (
    listeId: string,
    inclure: boolean
  ) => Promise<{ error?: string; success?: boolean }>;
}

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "tous", label: "Tous" },
  ...STATUTS_POINT_SUIVI,
];

export function SuiviSection({
  departementId,
  listeId,
  nom,
  inclureRapport,
  items,
  peutGerer,
  ajouterAction,
  changerStatutAction,
  supprimerAction,
  supprimerListeAction,
  changerInclureRapportAction,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const nbActifs = items.filter((i) => i.statut !== "termine").length;
  const visibles = items.filter((i) => filtre === "tous" || i.statut === filtre);

  function ajouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nouveauTexte.trim()) return;
    const fd = new FormData();
    fd.set("contenu", nouveauTexte.trim());
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(fd);
      if (res.error) setError(res.error);
      else setNouveauTexte("");
    });
  }

  function changerStatut(id: string, statut: StatutPointSuiviEnum) {
    startTransition(async () => {
      setError(null);
      const res = await changerStatutAction(id, statut);
      if (res.error) setError(res.error);
    });
  }

  function supprimer(id: string) {
    if (!confirm("Supprimer cet élément ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerAction(id);
      if (res.error) setError(res.error);
    });
  }

  function supprimerListe() {
    if (!confirm(`Supprimer la liste « ${nom} » et tout son contenu ?`)) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerListeAction(listeId);
      if (res.error) setError(res.error);
    });
  }

  function toggleInclureRapport(checked: boolean) {
    startTransition(async () => {
      setError(null);
      const res = await changerInclureRapportAction(listeId, checked);
      if (res.error) setError(res.error);
    });
  }

  return (
    <Card>
      <details open className="group">
        <summary className="flex items-center justify-between gap-2 cursor-pointer select-none p-4 pb-2 list-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold flex items-center gap-2">
            <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-0 -rotate-90" />
            {nom}
            {nbActifs > 0 && <span className="text-muted-foreground font-normal">({nbActifs})</span>}
          </span>
          {peutGerer && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                supprimerListe();
              }}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Supprimer la liste"
            >
              <Trash2 size={14} />
            </button>
          )}
        </summary>

        <CardContent className="pt-0 space-y-3">
          <div className="flex gap-1 flex-wrap">
            {FILTRES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFiltre(f.value)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  filtre === f.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input text-muted-foreground hover:bg-accent"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {peutGerer && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={inclureRapport}
                onChange={(e) => toggleInclureRapport(e.target.checked)}
                disabled={isPending}
                className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
              />
              Inclure dans le rapport mensuel
            </label>
          )}

          {!visibles.length ? (
            <p className="text-sm text-muted-foreground">Rien à afficher.</p>
          ) : (
            <div className="space-y-2">
              {visibles.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <Link
                    href={`/departements/${departementId}/suivi/${item.id}`}
                    className="flex-1 min-w-0 flex items-start justify-between gap-1 group/link"
                  >
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm group-hover/link:underline",
                          item.statut === "termine" && "text-muted-foreground line-through"
                        )}
                        title={item.contenu}
                      >
                        {formaterContenu(item.contenu, LONGUEUR_MAX_CONTENU)}
                        {item.piece_jointe_nom && (
                          <Paperclip size={11} className="inline-block ml-1.5 text-muted-foreground align-middle" />
                        )}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  </Link>
                  {peutGerer ? (
                    <select
                      value={item.statut}
                      onChange={(e) => changerStatut(item.id, e.target.value as StatutPointSuiviEnum)}
                      disabled={isPending}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "text-xs rounded-full border-none px-2 py-1 flex-shrink-0 mt-0.5 cursor-pointer",
                        STATUT_POINT_SUIVI_STYLE[item.statut]
                      )}
                    >
                      {STATUTS_POINT_SUIVI.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "text-xs rounded-full px-2 py-1 flex-shrink-0 mt-0.5",
                        STATUT_POINT_SUIVI_STYLE[item.statut]
                      )}
                    >
                      {STATUTS_POINT_SUIVI.find((s) => s.value === item.statut)?.label}
                    </span>
                  )}
                  {peutGerer && (
                    <button
                      type="button"
                      onClick={() => supprimer(item.id)}
                      disabled={isPending}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5"
                      aria-label="Supprimer"
                      title="Supprimer"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}

          {peutGerer && (
            <form onSubmit={ajouter} className="flex gap-2 pt-1">
              <Input
                value={nouveauTexte}
                onChange={(e) => setNouveauTexte(e.target.value)}
                placeholder="Ajouter un élément…"
                disabled={isPending}
                className="text-sm"
              />
              <Button type="submit" size="icon" disabled={isPending || !nouveauTexte.trim()} aria-label="Ajouter">
                <Plus size={16} />
              </Button>
            </form>
          )}
        </CardContent>
      </details>
    </Card>
  );
}
