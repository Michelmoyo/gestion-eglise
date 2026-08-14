-- Meme logique que rpc_definir_photo_profil : ouvriers_update est reserve
-- au pasteur/assistant, donc un ouvrier ne peut pas mettre a jour son
-- propre telephone/adresse via un UPDATE direct. Cette RPC l'autorise a
-- modifier UNIQUEMENT ces deux champs sur sa propre fiche.

create or replace function rpc_modifier_coordonnees_ouvrier(
  p_telephone text,
  p_adresse text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update ouvriers
  set telephone = nullif(p_telephone, ''),
      adresse = nullif(p_adresse, '')
  where id = fn_ouvrier_id_courant();
end;
$$;

revoke execute on function rpc_modifier_coordonnees_ouvrier(text, text) from public;
grant execute on function rpc_modifier_coordonnees_ouvrier(text, text) to authenticated;
