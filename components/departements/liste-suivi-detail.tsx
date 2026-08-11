"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, ChevronRight, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatutPointSuiviEnum } from "@/lib/supabase/types";
import { STATUTS_POINT_SUIVI, STATUT_POINT_SUIVI_STYLE } from "@/lib/suivi";
import { MembresSuivi, type OuvrierSuivi } from "@/components/departements/membres-suivi";

export interface PointSuiviItem {
  id: string;
  contenu: string;
  statut: StatutPointSuiviEnum;
  piece_jointe_nom?: string | null;
}

type Filtre = StatutPointSuiviEnum | "tous";

// La ligne d'une tache partage sa largeur avec le selecteur de statut et le
// bouton supprimer -- pas la place pour un titre long en entier.
const LONGUEUR_MAX_CONTENU = 40;

// Affichage seulement : le contenu stocke garde la casse telle que saisie.
function formaterContenu(texte: string, max: number): string {
  const minuscule = texte.toLowerCase();
  const capitalise = minuscule.charAt(0).toUpperCase() + minuscule.slice(1);
  return capitalise.length > max ? `${capitalise.slice(0, max).trimEnd()}…` : capitalise;
}

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "tous", label: "Tous" },
  ...STATUTS_POINT_SUIVI,
];

interface Props {
  departementId: string;
  liste: {
    id: string;
    nom: string;
    description: string | null;
    inclure_rapport: boolean;
  };
  items: PointSuiviItem[];
  // Gestion structurelle (nom/description, suppression, ajout/suppression
  // de taches, inclusion au rapport, membres) : managers/pilotage.
  peutGerer: boolean;
  // Voir + agir (changer le statut d'une tache) : peutGerer, ou membre
  // ajoute a cette liste.
  peutAgir: boolean;
  modifierListeAction?: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  supprimerListeAction?: () => Promise<{ error?: string; success?: boolean }>;
  changerInclureRapportAction?: (inclure: boolean) => Promise<{ error?: string; success?: boolean }>;
  ajouterAction?: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  changerStatutAction: (
    pointId: string,
    statut: StatutPointSuiviEnum
  ) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction?: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  membresListe: OuvrierSuivi[];
  candidatsListe: OuvrierSuivi[];
  ajouterMembreListeAction?: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
  retirerMembreListeAction?: (ouvrierId: string) => Promise<{ error?: string; success?: boolean }>;
}

export function ListeSuiviDetail({
  departementId,
  liste,
  items,
  peutGerer,
  peutAgir,
  modifierListeAction,
  supprimerListeAction,
  changerInclureRapportAction,
  ajouterAction,
  changerStatutAction,
  supprimerAction,
  membresListe,
  candidatsListe,
  ajouterMembreListeAction,
  retirerMembreListeAction,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [nom, setNom] = useState(liste.nom);
  const [description, setDescription] = useState(liste.description ?? "");
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("tous");

  const visibles = items.filter((i) => filtre === "tous" || i.statut === filtre);
  const nbActifs = items.filter((i) => i.statut !== "termine").length;

  function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!modifierListeAction) return;
    const fd = new FormData();
    fd.set("nom", nom);
    fd.set("description", description);
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res = await modifierListeAction(fd);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  function supprimer() {
    if (!supprimerListeAction || !confirm(`Supprimer la liste « ${liste.nom} » et tout son contenu ?`)) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerListeAction();
      if (res.error) setError(res.error);
      else router.push(`/departements/${departementId}/suivi`);
    });
  }

  function toggleInclureRapport(checked: boolean) {
    if (!changerInclureRapportAction) return;
    startTransition(async () => {
      setError(null);
      const res = await changerInclureRapportAction(checked);
      if (res.error) setError(res.error);
    });
  }

  function ajouter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!nouveauTexte.trim() || !ajouterAction) return;
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

  function supprimerTache(id: string) {
    if (!supprimerAction || !confirm("Supprimer cet élément ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerAction(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Identité : nom + actions de gestion */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          {peutGerer && modifierListeAction ? (
            <Input
              value={nom}
              onChange={(e) => { setNom(e.target.value); setSaved(false); }}
              disabled={isPending}
              placeholder="Nom de la liste"
              className="flex-1 min-w-0 h-auto border-none shadow-none px-0 text-xl font-semibold focus-visible:ring-0"
            />
          ) : (
            <h1 className="flex-1 min-w-0 text-xl font-semibold">{liste.nom}</h1>
          )}
          {peutGerer && (
            <div className="flex items-center gap-3 flex-shrink-0 pt-1.5">
              {ajouterMembreListeAction && retirerMembreListeAction && (
                <MembresSuivi
                  membres={membresListe}
                  candidats={candidatsListe}
                  ajouterAction={ajouterMembreListeAction}
                  retirerAction={retirerMembreListeAction}
                />
              )}
              {supprimerListeAction && (
                <button
                  type="button"
                  onClick={supprimer}
                  disabled={isPending}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  aria-label="Supprimer la liste"
                  title="Supprimer la liste"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {nbActifs} tâche{nbActifs > 1 ? "s" : ""} active{nbActifs > 1 ? "s" : ""} sur {items.length}
          </p>
        )}
      </div>

      {/* Description, modifiable par un manager */}
      {peutGerer && modifierListeAction ? (
        <form onSubmit={enregistrer} className="space-y-3 pt-3 border-t border-border">
          <div className="space-y-1">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
              disabled={isPending}
              rows={3}
              placeholder="À quoi sert cette liste…"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-green-600">Enregistré.</p>}
          <Button type="submit" size="sm" disabled={isPending || !nom.trim()}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </form>
      ) : (
        liste.description && (
          <p className="text-sm text-muted-foreground pt-3 border-t border-border">{liste.description}</p>
        )
      )}

      {peutGerer && changerInclureRapportAction && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={liste.inclure_rapport}
            onChange={(e) => toggleInclureRapport(e.target.checked)}
            disabled={isPending}
            className="h-3.5 w-3.5 rounded border-input accent-primary cursor-pointer"
          />
          Inclure dans le rapport mensuel
        </label>
      )}

      <div className="pt-3 border-t border-border space-y-3">
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

        {!visibles.length ? (
          <p className="text-sm text-muted-foreground">Rien à afficher.</p>
        ) : (
          <div className="space-y-2.5">
            {visibles.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 hover:border-primary/30 transition-colors"
              >
                <Link
                  href={`/departements/${departementId}/suivi/${item.id}`}
                  className="flex-1 min-w-0 flex items-start justify-between gap-1 group/link"
                >
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
                  <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                </Link>
                {peutAgir ? (
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
                {peutGerer && supprimerAction && (
                  <button
                    type="button"
                    onClick={() => supprimerTache(item.id)}
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

        {!peutGerer && error && <p className="text-xs text-destructive">{error}</p>}

        {peutGerer && ajouterAction && (
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
      </div>
    </div>
  );
}
