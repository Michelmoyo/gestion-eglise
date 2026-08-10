"use client";

import { useMemo, useRef, useState, useTransition } from "react";
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
  mentionsNoms?: string[];
}

export interface PersonneTaguable {
  id: string;
  prenom: string;
  nom: string;
}

interface Props {
  commentaires: Commentaire[];
  moiId: string;
  peutSupprimerTout: boolean;
  personnesTaguables: PersonneTaguable[];
  ajouterAction: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
  supprimerAction: (commentaireId: string) => Promise<{ error?: string; success?: boolean }>;
}

// Met en évidence les "@Prénom Nom" déjà connus dans un commentaire affiché.
function texteAvecMentions(texte: string, noms: string[] | undefined) {
  if (!noms?.length) return texte;
  const parts: (string | { mention: string })[] = [texte];
  for (const nom of noms) {
    const cible = `@${nom}`;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (typeof part !== "string") continue;
      const idx = part.indexOf(cible);
      if (idx === -1) continue;
      const before = part.slice(0, idx);
      const after = part.slice(idx + cible.length);
      parts.splice(i, 1, before, { mention: nom }, after);
      break;
    }
  }
  return parts;
}

export function CommentairesSuivi({
  commentaires,
  moiId,
  peutSupprimerTout,
  personnesTaguables,
  ajouterAction,
  supprimerAction,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [mentions, setMentions] = useState<PersonneTaguable[]>([]);
  const [rechercheMention, setRechercheMention] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const suggestions = useMemo(() => {
    if (rechercheMention === null) return [];
    const q = rechercheMention.toLowerCase();
    return personnesTaguables
      .filter((p) => `${p.prenom} ${p.nom}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [rechercheMention, personnesTaguables]);

  function surChangement(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const valeur = e.target.value;
    setTexte(valeur);

    const curseur = e.target.selectionStart ?? valeur.length;
    const avantCurseur = valeur.slice(0, curseur);
    const match = avantCurseur.match(/(?:^|\s)@([^\s@]*)$/);
    setRechercheMention(match ? match[1] : null);
  }

  function choisirMention(personne: PersonneTaguable) {
    const el = textareaRef.current;
    const nomComplet = `${personne.prenom} ${personne.nom}`;
    if (el) {
      const curseur = el.selectionStart ?? texte.length;
      const avant = texte.slice(0, curseur);
      const apres = texte.slice(curseur);
      const remplace = avant.replace(/@([^\s@]*)$/, `@${nomComplet} `);
      const nouveauTexte = remplace + apres;
      setTexte(nouveauTexte);
    }
    setMentions((m) => (m.some((p) => p.id === personne.id) ? m : [...m, personne]));
    setRechercheMention(null);
  }

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!texte.trim()) return;
    const fd = new FormData();
    fd.set("contenu", texte.trim());
    for (const m of mentions) {
      if (texte.includes(`@${m.prenom} ${m.nom}`)) fd.append("mentions", m.id);
    }
    startTransition(async () => {
      setError(null);
      const res = await ajouterAction(fd);
      if (res.error) setError(res.error);
      else {
        setTexte("");
        setMentions([]);
      }
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
          {commentaires.map((c) => {
            const segments = texteAvecMentions(c.contenu, c.mentionsNoms);
            return (
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
                <p className="whitespace-pre-wrap">
                  {Array.isArray(segments)
                    ? segments.map((seg, i) =>
                        typeof seg === "string" ? (
                          <span key={i}>{seg}</span>
                        ) : (
                          <span key={i} className="text-primary font-medium">
                            @{seg.mention}
                          </span>
                        )
                      )
                    : segments}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <form onSubmit={envoyer} className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={texte}
            onChange={surChangement}
            placeholder="Ajouter un commentaire… (@ pour mentionner)"
            rows={2}
            disabled={isPending}
          />
          {rechercheMention !== null && suggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden">
              {suggestions.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => choisirMention(p)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  {p.prenom} {p.nom}
                </button>
              ))}
            </div>
          )}
        </div>
        <Button type="submit" size="sm" disabled={isPending || !texte.trim()}>
          {isPending ? "Envoi…" : "Commenter"}
        </Button>
      </form>
    </div>
  );
}
