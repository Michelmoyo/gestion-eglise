"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { newPasswordSchema, type NewPasswordInput } from "@/lib/validations/auth";
import { updatePassword } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Etat = "verification" | "pret" | "invalide";

export default function ReinitialiserMotDePassePage() {
  const [etat, setEtat] = useState<Etat>("verification");
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
  });

  useEffect(() => {
    // Le lien envoyé par email transporte la session via un fragment d'URL
    // (#access_token=...&type=recovery), lisible uniquement côté navigateur.
    // Le client Supabase le détecte et l'échange automatiquement au chargement
    // (detectSessionInUrl) ; getSession() attend cette étape avant de répondre.
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    if (hash.get("error") || query.get("error")) {
      setEtat("invalide");
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setEtat(data.session ? "pret" : "invalide");
    });
  }, []);

  async function onSubmit(data: NewPasswordInput) {
    setLoading(true);
    setServerError(null);

    const formData = new FormData();
    formData.set("password", data.password);

    const result = await updatePassword(formData);
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Définir mon mot de passe</CardTitle>
          {etat === "pret" && (
            <CardDescription>Choisissez un mot de passe sécurisé.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {etat === "verification" && (
            <p className="text-sm text-muted-foreground text-center">Vérification du lien…</p>
          )}

          {etat === "invalide" && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-destructive">
                Ce lien est invalide ou a expiré. Demandez un nouveau lien.
              </p>
              <Button asChild className="w-full">
                <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
              </Button>
            </div>
          )}

          {etat === "pret" && (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nouveau mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirmer le mot de passe</Label>
                <Input
                  id="confirm"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirm")}
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm.message}</p>
                )}
              </div>

              {serverError && (
                <p className="text-sm text-destructive text-center">{serverError}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Enregistrement…" : "Enregistrer mon mot de passe"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
