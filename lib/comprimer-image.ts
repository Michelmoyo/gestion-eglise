// Redimensionne et reencode une image cote navigateur avant envoi (avatar :
// pas besoin de conserver la resolution d'origine d'une photo de telephone).
// Retombe sur le fichier original si la compression echoue (format exotique,
// API indisponible...).
export async function comprimerImage(
  fichier: File,
  tailleMax = 512,
  qualite = 0.8
): Promise<File> {
  try {
    const bitmap = await createImageBitmap(fichier);
    const ratio = Math.min(1, tailleMax / Math.max(bitmap.width, bitmap.height));
    const largeur = Math.round(bitmap.width * ratio);
    const hauteur = Math.round(bitmap.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = largeur;
    canvas.height = hauteur;
    const ctx = canvas.getContext("2d");
    if (!ctx) return fichier;

    ctx.drawImage(bitmap, 0, 0, largeur, hauteur);
    bitmap.close();

    // PNG et WebP peuvent porter une transparence : la reencoder en JPEG
    // (pas de canal alpha) l'aplatirait sur un fond opaque (noir dans la
    // plupart des navigateurs) -- on ne recompresse en JPEG que les
    // sources qui n'ont de toute facon pas de transparence a perdre.
    const conserveTransparence = fichier.type === "image/png" || fichier.type === "image/webp";
    const formatSortie = conserveTransparence ? "image/png" : "image/jpeg";
    const extension = conserveTransparence ? "png" : "jpg";

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, formatSortie, qualite)
    );
    if (!blob || blob.size >= fichier.size) return fichier;

    return new File([blob], `image.${extension}`, { type: formatSortie });
  } catch {
    return fichier;
  }
}
