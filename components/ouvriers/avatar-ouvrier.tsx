interface Props {
  photoUrl?: string | null;
  prenom: string;
  nom: string;
  size?: number;
  className?: string;
}

export function AvatarOuvrier({ photoUrl, prenom, nom, size = 40, className = "" }: Props) {
  const initiales = `${prenom[0] ?? ""}${nom[0] ?? ""}`;
  const styleTaille = { width: size, height: size };

  if (photoUrl) {
    // <img> brut plutôt que next/image : les aperçus locaux (blob:) avant
    // envoi ne passent pas par l'optimiseur d'images, et un avatar est trop
    // petit pour que ça vaille la peine de gérer les deux cas séparément.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={photoUrl}
        alt={`${prenom} ${nom}`}
        style={styleTaille}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      style={styleTaille}
      className={`rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0 ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.4) }}>{initiales}</span>
    </div>
  );
}
