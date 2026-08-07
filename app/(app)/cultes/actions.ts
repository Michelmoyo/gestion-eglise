"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { culteSchema } from "@/lib/validations/culte";

async function getContexte() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: moi } = await supabase
    .from("ouvriers")
    .select("id, role_global")
    .eq("auth_user_id", user.id)
    .single();

  if (!moi) redirect("/connexion");

  return { supabase, moi, isPilotage: !!moi.role_global };
}

export async function creerCulte(formData: FormData) {
  const { supabase, moi, isPilotage } = await getContexte();
  if (!isPilotage) redirect("/cultes");

  const raw = {
    type: formData.get("type"),
    date_culte: formData.get("date_culte"),
    heure: formData.get("heure") || undefined,
    lieu: formData.get("lieu") || undefined,
    description: formData.get("description") || undefined,
  };

  const parsed = culteSchema.safeParse(raw);
  if (!parsed.success) redirect("/cultes/nouveau");

  const { data, error } = await supabase.from("cultes").insert({
    type: parsed.data.type,
    date_culte: parsed.data.date_culte,
    heure: parsed.data.heure || null,
    lieu: parsed.data.lieu || null,
    description: parsed.data.description || null,
    created_by: moi.id,
  }).select("id").single();

  if (error || !data) redirect("/cultes");

  redirect(`/cultes/${data.id}`);
}

export async function modifierCulte(culteId: string, formData: FormData) {
  const { supabase, isPilotage } = await getContexte();
  if (!isPilotage) redirect(`/cultes/${culteId}`);

  const raw = {
    type: formData.get("type"),
    date_culte: formData.get("date_culte"),
    heure: formData.get("heure") || undefined,
    lieu: formData.get("lieu") || undefined,
    description: formData.get("description") || undefined,
  };

  const parsed = culteSchema.safeParse(raw);
  if (!parsed.success) redirect(`/cultes/${culteId}/modifier`);

  await supabase.from("cultes").update({
    type: parsed.data.type,
    date_culte: parsed.data.date_culte,
    heure: parsed.data.heure || null,
    lieu: parsed.data.lieu || null,
    description: parsed.data.description || null,
  }).eq("id", culteId);

  redirect(`/cultes/${culteId}`);
}
