import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Rafraîchit le token — IMPORTANT : ne pas supprimer cet appel
  // En cas d'erreur réseau, on laisse passer la requête
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    return supabaseResponse;
  }

  const { pathname } = request.nextUrl;

  const isPublicPage =
    pathname.startsWith("/connexion") ||
    pathname.startsWith("/mot-de-passe-oublie") ||
    pathname.startsWith("/reinitialiser-mot-de-passe") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/confirmation") ||
    pathname.startsWith("/api/");

  // Non authentifié → page protégée : redirige vers la connexion
  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL("/connexion", request.url));
  }

  // Authentifié → page de connexion : redirige vers l'app
  // (la page elle-même gère la redirection vers /pilotage pour le pasteur)
  if (user && isPublicPage && !pathname.startsWith("/setup") && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/mon-espace", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // manifest.json et sw.js doivent rester accessibles sans authentification :
    // Chrome les recupere en arriere-plan pour evaluer l'installabilite PWA,
    // et une redirection vers /connexion a leur place rend le site non
    // installable (le manifest n'est alors jamais lu comme du JSON valide).
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
