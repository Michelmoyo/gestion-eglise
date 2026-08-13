"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarOuvrier } from "@/components/ouvriers/avatar-ouvrier";
import { mettreAJourPhoto } from "@/app/(app)/mon-compte/actions";

interface Props {
  prenom: string;
  nom: string;
  photoUrl: string | null;
}

export function PhotoProfilForm({ prenom, nom, photoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fichierChoisi, setFichierChoisi] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    setFichierChoisi(fichier);
    setPreview(URL.createObjectURL(fichier));
    setError(null);
    setEnregistre(false);
  }

  function annuler() {
    setFichierChoisi(null);
    setPreview(photoUrl);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function enregistrer() {
    if (!fichierChoisi) return;

    const fd = new FormData();
    fd.set("photo", fichierChoisi);

    startTransition(async () => {
      setError(null);
      const res = await mettreAJourPhoto(fd);
      if (res.error) {
        setError(res.error);
      } else {
        if (res.photoUrl) setPreview(res.photoUrl);
        setFichierChoisi(null);
        setEnregistre(true);
      }
    });
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <AvatarOuvrier photoUrl={preview} prenom={prenom} nom={nom} size={80} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background disabled:opacity-50"
          aria-label="Changer la photo de profil"
        >
          <Camera size={14} />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {fichierChoisi && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={annuler}>
            Annuler
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={enregistrer}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      )}

      {!fichierChoisi && enregistre && (
        <p className="text-xs text-muted-foreground">Photo enregistrée.</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
