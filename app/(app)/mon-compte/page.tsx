import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChevronLeft } from "lucide-react";
import { ChangerMotDePasseForm } from "@/components/auth/changer-mot-de-passe-form";
import { PhotoProfilForm } from "@/components/mon-compte/photo-profil-form";
import { CoordonneesForm } from "@/components/mon-compte/coordonnees-form";

export default async function MonComptePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("prenom, nom, email, photo_url, telephone, adresse, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  const isPilotage = !!moi.role_global;
  const retourHref = isPilotage ? "/pilotage" : "/mon-espace";

  return (
    <>
      <TopBar title="Mon compte" />

      <div className="p-4 flex flex-col gap-6">
        <Link
          href={retourHref}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} />
          Retour
        </Link>

        <PhotoProfilForm prenom={moi.prenom} nom={moi.nom} photoUrl={moi.photo_url} />

        <div className="text-sm text-muted-foreground text-center">
          <p className="font-medium text-foreground">{moi.prenom} {moi.nom}</p>
          <p>{moi.email}</p>
        </div>

        <CoordonneesForm telephone={moi.telephone} adresse={moi.adresse} />

        <ChangerMotDePasseForm />
      </div>
    </>
  );
}
