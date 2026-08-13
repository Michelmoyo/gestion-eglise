import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/top-bar";
import { ChangerMotDePasseForm } from "@/components/auth/changer-mot-de-passe-form";
import { PhotoProfilForm } from "@/components/mon-compte/photo-profil-form";

export default async function MonComptePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("prenom, nom, email, photo_url")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  return (
    <>
      <TopBar title="Mon compte" />

      <div className="p-4 flex flex-col gap-6">
        <PhotoProfilForm prenom={moi.prenom} nom={moi.nom} photoUrl={moi.photo_url} />

        <div className="text-sm text-muted-foreground text-center">
          <p className="font-medium text-foreground">{moi.prenom} {moi.nom}</p>
          <p>{moi.email}</p>
        </div>

        <ChangerMotDePasseForm />
      </div>
    </>
  );
}
