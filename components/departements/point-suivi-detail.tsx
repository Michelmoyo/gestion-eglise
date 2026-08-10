"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Paperclip, Download, X } from "lucide-react";
import { format } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StatutPointSuiviEnum } from "@/lib/supabase/types";
import { STATUTS_POINT_SUIVI, STATUT_POINT_SUIVI_STYLE } from "@/lib/suivi";

interface Props {
  departementId: string;
  point: {
    id: string;
    contenu: string;
    description: string | null;
    statut: StatutPointSuiviEnum;
    date_creation: string;
    date_resolution: string | null;
    piece_jointe_nom: string | null;
  };
  pieceJointeUrl: string | null;
  peutGerer: boolean;
  modifierAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  changerStatutAction: (statut: StatutPointSuiviEnum) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction: () => Promise<{ error?: string; success?: boolean }>;
  uploaderAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  supprimerPieceJointeAction: () => Promise<{ error?: string; success?: boolean }>;
}

export function PointSuiviDetail({
  departementId,
  point,
  pieceJointeUrl,
  peutGerer,
  modifierAction,
  changerStatutAction,
  supprimerAction,
  uploaderAction,
  supprimerPieceJointeAction,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [contenu, setContenu] = useState(point.contenu);
  const [description, setDescription] = useState(point.description ?? "");

  function enregistrer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set("contenu", contenu);
    fd.set("description", description);
    startTransition(async () => {
      setError(null);
      setSaved(false);
      const res = await modifierAction(fd);
      if (res.error) setError(res.error);
      else setSaved(true);
    });
  }

  function changerStatut(statut: StatutPointSuiviEnum) {
    startTransition(async () => {
      setError(null);
      const res = await changerStatutAction(statut);
      if (res.error) setError(res.error);
    });
  }

  function supprimer() {
    if (!confirm("Supprimer cet élément définitivement ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerAction();
      if (res.error) setError(res.error);
      else router.push(`/departements/${departementId}/suivi`);
    });
  }

  function uploader(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;
    const fd = new FormData();
    fd.set("fichier", fichier);
    startTransition(async () => {
      setError(null);
      const res = await uploaderAction(fd);
      if (res.error) setError(res.error);
    });
    e.target.value = "";
  }

  function supprimerPiece() {
    if (!confirm("Retirer la pièce jointe ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerPieceJointeAction();
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {peutGerer ? (
          <div className="flex gap-1.5">
            {STATUTS_POINT_SUIVI.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => changerStatut(s.value)}
                disabled={isPending}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border transition-colors",
                  point.statut === s.value
                    ? `border-transparent ${STATUT_POINT_SUIVI_STYLE[s.value]}`
                    : "border-input text-muted-foreground hover:bg-accent"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className={cn("text-sm px-3 py-1.5 rounded-full", STATUT_POINT_SUIVI_STYLE[point.statut])}>
            {STATUTS_POINT_SUIVI.find((s) => s.value === point.statut)?.label}
          </span>
        )}
        {peutGerer && (
          <button
            type="button"
            onClick={supprimer}
            disabled={isPending}
            className="text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Supprimer"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Émis le {format.date(point.date_creation)}
        {point.statut === "termine" && point.date_resolution ? ` · résolu le ${format.date(point.date_resolution)}` : ""}
      </p>

      <form onSubmit={enregistrer} className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="contenu">Titre</Label>
          <Input
            id="contenu"
            value={contenu}
            onChange={(e) => { setContenu(e.target.value); setSaved(false); }}
            disabled={!peutGerer || isPending}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
            disabled={!peutGerer || isPending}
            rows={6}
            placeholder="Détailler ici…"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-600">Enregistré.</p>}

        {peutGerer && (
          <Button type="submit" disabled={isPending || !contenu.trim()}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        )}
      </form>

      <div className="space-y-2 pt-2 border-t border-border">
        <Label>Pièce jointe</Label>
        {point.piece_jointe_nom ? (
          <div className="flex items-center gap-2 text-sm">
            <Paperclip size={14} className="text-muted-foreground flex-shrink-0" />
            {pieceJointeUrl ? (
              <a
                href={pieceJointeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 truncate"
              >
                <Download size={13} />
                {point.piece_jointe_nom}
              </a>
            ) : (
              <span className="truncate">{point.piece_jointe_nom}</span>
            )}
            {peutGerer && (
              <button
                type="button"
                onClick={supprimerPiece}
                disabled={isPending}
                className="text-muted-foreground hover:text-destructive flex-shrink-0"
                aria-label="Retirer la pièce jointe"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune pièce jointe.</p>
        )}
        {peutGerer && (
          <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer">
            <Paperclip size={14} />
            {point.piece_jointe_nom ? "Remplacer le fichier" : "Ajouter un fichier"}
            <input type="file" className="hidden" onChange={uploader} disabled={isPending} />
          </label>
        )}
      </div>
    </div>
  );
}
