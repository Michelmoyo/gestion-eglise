import { headers } from "next/headers";

// Utilisable uniquement cote serveur (Server Actions / Route Handlers) :
// derive l'origine reelle de la requete plutot que de coder en dur une URL,
// pour que les liens envoyes par email (reset, invitation) pointent toujours
// vers le bon environnement (local, preview Vercel, production).
export async function getOrigin() {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}
