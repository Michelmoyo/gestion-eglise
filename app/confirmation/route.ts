import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Route de confirmation pour les liens email (invitation, reinitialisation
// de mot de passe). Le lien par defaut de Supabase (flux code/PKCE) echoue
// systematiquement ici : le "code" est lie a un code_verifier stocke cote
// client au moment de l'appel serveur (creerOuvrier / renvoyerInvitation /
// mot de passe oublie), jamais present dans le navigateur du destinataire
// qui clique sur le lien plus tard, potentiellement sur un autre appareil.
// La solution documentee par Supabase pour ce cas est de pointer les
// templates email vers cette route avec token_hash + type, verifies ici
// cote serveur via verifyOtp (aucun secret client necessaire).
//
// Chemin volontairement hors de /auth/* : app/(auth) (groupe de routes) et
// un eventuel app/auth/* (segment reel) entrent en collision dans le routeur
// Next.js -- tout ce qui commence par /auth/ finit par rediriger vers
// /connexion, quel que soit le contenu de la route.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/mon-espace";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/reinitialiser-mot-de-passe?error=lien_invalide`);
}
