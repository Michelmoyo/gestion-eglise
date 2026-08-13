"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "lucide-react";
import { AvatarOuvrier } from "@/components/ouvriers/avatar-ouvrier";
import { mettreAJourPhoto } from "@/app/(app)/mon-compte/actions";

interface Props {
  prenom: string;
  nom: string;
  photoUrl: string | null;
}

export function PhotoProfilForm({ prenom, nom, photoUrl }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(photoUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    if (!fichier) return;

    const previewLocal = URL.createObjectURL(fichier);
    setPreview(previewLocal);
    setError(null);

    const fd = new FormData();
    fd.set("photo", fichier);

    startTransition(async () => {
      const res = await mettreAJourPhoto(fd);
      if (res.error) {
        setError(res.error);
        setPreview(photoUrl);
      } else if (res.photoUrl) {
        setPreview(res.photoUrl);
      }
      URL.revokeObjectURL(previewLocal);
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
      {isPending && <p className="text-xs text-muted-foreground">Envoi…</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
