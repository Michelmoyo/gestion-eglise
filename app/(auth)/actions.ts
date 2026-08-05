"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email ou mot de passe incorrect." };
  }

  // Rediriger selon le rôle global (§12 cahier des charges)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: ouvrier } = await supabase
      .from("ouvriers")
      .select("role_global")
      .eq("auth_user_id", user.id)
      .single();

    if (ouvrier?.role_global === "pasteur" || ouvrier?.role_global === "assistant") {
      redirect("/pilotage");
    }
  }

  redirect("/mon-espace");
}

export async function sendResetEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(".supabase.co", "")}/reinitialiser-mot-de-passe`,
  });

  if (error) {
    return { error: "Une erreur est survenue. Vérifiez l'adresse email." };
  }

  return { success: true };
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: "Impossible de mettre à jour le mot de passe." };
  }

  redirect("/mon-espace");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
