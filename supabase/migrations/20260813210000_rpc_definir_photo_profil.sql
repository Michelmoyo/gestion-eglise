-- ouvriers_update (rls_policies.sql) ne laisse que le pasteur/assistant
-- modifier une fiche ouvrier -- un ouvrier ne peut donc pas mettre a jour
-- sa propre photo via un simple UPDATE (silencieusement filtre par la RLS,
-- sans erreur visible cote client). Cette RPC autorise explicitement
-- chacun a modifier UNIQUEMENT sa propre photo_url, sans toucher au reste
-- de la fiche.

create or replace function rpc_definir_photo_profil(p_photo_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ouvriers
  set photo_url = p_photo_url
  where id = fn_ouvrier_id_courant();
end;
$$;

revoke execute on function rpc_definir_photo_profil(text) from public;
grant execute on function rpc_definir_photo_profil(text) to authenticated;
