"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, MessageCircle } from "lucide-react";
import { format } from "@/lib/format";

export interface Commentaire {
  id: string;
  contenu: string;
  created_at: string;
  auteur_id: string;
  auteurNom: string;
}

interface Props {
  commentaires: Commentaire[];
  moiId: string;
  peutSupprimerTout: boolean;
  ajouterAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction: (commentaireId: string) => Promise<{ error?: string; success?: boolean }>;
}

export function CommentairesSuivi({
  commentaires,
  moiId,
  peutSupprimerTout,
  ajouterAction,
  supprimerAction,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [texte, setTexte] = useState("");

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!texte.trim()) return;
    const fd = new FormData();
    fd.set("contenu", texte.trim());
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(fd);
      if (res.error) setError(res.error);
      else setTexte("");
    });
  }

  function supprimer(id: string) {
    if (!confirm("Supprimer ce commentaire ?")) return;
    startTransition(async () => {
      setError(null);
      const res = await supprimerAction(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <p className="text-sm font-medium flex items-center gap-2">
        <MessageCircle size={15} className="text-muted-foreground" />
        Commentaires {commentaires.length > 0 && `(${commentaires.length})`}
      </p>

      {!commentaires.length ? (
        <p className="text-sm text-muted-foreground">Aucun commentaire.</p>
      ) : (
        <div className="space-y-3">
          {commentaires.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="font-medium">{c.auteurNom}</span>{" "}
                  <span className="text-xs text-muted-foreground">{format.date(c.created_at)}</span>
                </div>
                {(peutSupprimerTout || c.auteur_id === moiId) && (
                  <button
                    type="button"
                    onClick={() => supprimer(c.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    aria-label="Supprimer le commentaire"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.contenu}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <form onSubmit={envoyer} className="space-y-2">
        <Textarea
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="Ajouter un commentaire…"
          rows={2}
          disabled={isPending}
        />
        <Button type="submit" size="sm" disabled={isPending || !texte.trim()}>
          {isPending ? "Envoi…" : "Commenter"}
        </Button>
      </form>
    </div>
  );
}
