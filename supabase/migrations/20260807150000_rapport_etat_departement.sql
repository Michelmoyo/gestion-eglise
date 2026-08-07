-- ----------------------------------------------------------------------------
-- Support pour le rapport enrichi (etat des ouvriers, presence au culte,
-- bilan de caisse debut/fin de periode).
-- ----------------------------------------------------------------------------

-- Meme regle d'autorisation que fn_solde_departement, mais borne a une date
-- (utilise par le rapport mensuel pour le bilan "solde au debut / a la fin
-- de la periode", pas seulement le solde courant).
create or replace function fn_solde_departement_a_date(p_departement_id uuid, p_date date)
returns numeric
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_solde numeric;
begin
  if not (fn_is_pasteur_ou_assistant() or fn_est_affecte(p_departement_id)) then
    raise exception 'Non autorise.';
  end if;

  select coalesce(sum(case when type = 'entree' then montant else -montant end), 0)
    into v_solde
    from mouvements_caisse
    where departement_id = p_departement_id
      and date_mouvement <= p_date;

  return v_solde;
end;
$$;

revoke execute on function fn_solde_departement_a_date(uuid, date) from public;
grant execute on function fn_solde_departement_a_date(uuid, date) to authenticated;

-- Le secretaire (ou tout gestionnaire) d'un departement peut lire la
-- presence au culte des MEMBRES DE CE DEPARTEMENT -- necessaire pour
-- compiler le rapport mensuel, meme s'il ne peut pas pointer lui-meme.
drop policy if exists presences_culte_select on presences_culte;
create policy presences_culte_select on presences_culte for select using (
  fn_is_pasteur_ou_assistant()
  or fn_est_president_ou_vice()
  or ouvrier_id = fn_ouvrier_id_courant()
  or exists (
    select 1 from affectations a
    where a.ouvrier_id = presences_culte.ouvrier_id
      and a.statut = 'actif'
      and fn_gere_departement(a.departement_id)
  )
);
