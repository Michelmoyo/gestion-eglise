"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mettreAJourLogo } from "@/app/(app)/parametres/actions";
import { comprimerImage } from "@/lib/comprimer-image";

interface Props {
  logoUrl: string | null;
}

export function LogoForm({ logoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichierChoisi, setFichierChoisi] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [compression, setCompression] = useState(false);
  const [enregistre, setEnregistre] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setError(null);
    setEnregistre(false);
    setCompression(true);

    const compresse = await comprimerImage(fichier, 800, 0.85);

    setFichierChoisi(compresse);
    setPreview(URL.createObjectURL(compresse));
    setCompression(false);
  }

  function annuler() {
    setFichierChoisi(null);
    setPreview(logoUrl);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function enregistrer() {
    if (!fichierChoisi) return;

    const fd = new FormData();
    fd.set("logo", fichierChoisi);

    startTransition(async () => {
      setError(null);
      const res = await mettreAJourLogo(fd);
      if (res.error) {
        setError(res.error);
      } else {
        if (res.logoUrl) setPreview(res.logoUrl);
        setFichierChoisi(null);
        setEnregistre(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="h-24 rounded-md border border-dashed border-input bg-background flex items-center justify-center overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo de l'église" className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon size={20} />
            <span className="text-xs">Aucun logo</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {compression && <p className="text-xs text-muted-foreground">Compression…</p>}

      {!fichierChoisi && !compression && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          {logoUrl ? "Changer le logo" : "Ajouter un logo"}
        </Button>
      )}

      {fichierChoisi && !compression && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" disabled={isPending} onClick={annuler}>
            Annuler
          </Button>
          <Button type="button" size="sm" className="flex-1" disabled={isPending} onClick={enregistrer}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}

      {!fichierChoisi && enregistre && (
        <p className="text-xs text-muted-foreground">Logo enregistré.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
