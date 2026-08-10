"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, Trash2, ChevronDown, ChevronRight, Paperclip } from "lucide-react";
import { format } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PointSuivi {
  id: string;
  contenu: string;
  resolu: boolean;
  date_creation: string;
  date_resolution: string | null;
  piece_jointe_nom?: string | null;
}

type Filtre = "ouverts" | "resolus" | "tous";

interface Props {
  departementId: string;
  listeId: string;
  nom: string;
  items: PointSuivi[];
  peutGerer: boolean;
  ajouterAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  resoudreAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  rouvrirAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction: (pointId: string) => Promise<{ error?: string; success?: boolean }>;
  supprimerListeAction: (listeId: string) => Promise<{ error?: string; success?: boolean }>;
}

const FILTRES: { value: Filtre; label: string }[] = [
  { value: "ouverts", label: "Ouverts" },
  { value: "resolus", label: "Résolus" },
  { value: "tous", label: "Tous" },
];

export function SuiviSection({
  departementId,
  listeId,
  nom,
  items,
  peutGerer,
  ajouterAction,
  resoudreAction,
  rouvrirAction,
  supprimerAction,
  supprimerListeAction,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [filtre, setFiltre] = useState<Filtre>("ouverts");

  const nbOuverts = items.filter((i) => !i.resolu).length;
  const visibles = items.filter((i) => {
    if (filtre === "ouverts") return !i.resolu;
    if (filtre === "resolus") return i.resolu;
    return true;
  });

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

  function toggle(id: string, resolu: boolean) {
    startTransition(async () => {
      setError(null);
      const res = resolu ? await rouvrirAction(id) : await resoudreAction(id);
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

  return (
    <Card>
      <details open className="group">
        <summary className="flex items-center justify-between gap-2 cursor-pointer select-none p-4 pb-2 list-none [&::-webkit-details-marker]:hidden">
          <span className="text-sm font-semibold flex items-center gap-2">
            <ChevronDown size={15} className="text-muted-foreground transition-transform group-open:rotate-0 -rotate-90" />
            {nom}
            {nbOuverts > 0 && <span className="text-muted-foreground font-normal">({nbOuverts})</span>}
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
          <div className="flex gap-1">
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
            <div className="space-y-2">
              {visibles.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  {peutGerer ? (
                    <button
                      type="button"
                      onClick={() => toggle(item.id, item.resolu)}
                      disabled={isPending}
                      className={cn(
                        "mt-0.5 h-5 w-5 flex-shrink-0 rounded border transition-colors flex items-center justify-center",
                        item.resolu
                          ? "bg-green-500 border-green-500 text-white hover:bg-green-600"
                          : "border-input hover:border-primary hover:bg-accent"
                      )}
                      aria-label={item.resolu ? "Rouvrir" : "Marquer résolu"}
                      title={item.resolu ? "Rouvrir" : "Marquer résolu"}
                    >
                      {item.resolu && <Check size={13} />}
                    </button>
                  ) : (
                    <span
                      className={cn(
                        "mt-0.5 h-5 w-5 flex-shrink-0 rounded border flex items-center justify-center",
                        item.resolu ? "bg-green-500 border-green-500 text-white" : "border-input"
                      )}
                    >
                      {item.resolu && <Check size={13} />}
                    </span>
                  )}
                  <Link
                    href={`/departements/${departementId}/suivi/${item.id}`}
                    className="flex-1 min-w-0 flex items-start justify-between gap-1 group/link"
                  >
                    <div className="min-w-0">
                      <p className={cn("text-sm group-hover/link:underline", item.resolu && "text-muted-foreground line-through")}>
                        {item.contenu}
                        {item.piece_jointe_nom && (
                          <Paperclip size={11} className="inline-block ml-1.5 text-muted-foreground align-middle" />
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Émis le {format.date(item.date_creation)}
                        {item.resolu && item.date_resolution ? ` · résolu le ${format.date(item.date_resolution)}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                  </Link>
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
