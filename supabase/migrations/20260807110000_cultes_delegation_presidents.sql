-- ----------------------------------------------------------------------------
-- Delegation de la saisie des presences au culte aux presidents/vice-presidents
-- de departement, en plus du pasteur/assistant. Decision produit : passer
-- uniquement par le pasteur pour pointer un culte embouteille la saisie.
-- La creation/modification du culte lui-meme reste pasteur/assistant only.
-- ----------------------------------------------------------------------------

-- L'utilisateur courant est-il president ou vice-president d'AU MOINS UN
-- departement (peu importe lequel) ? Un culte n'appartient a aucun
-- departement en particulier, donc fn_gere_departement (qui prend un
-- departement precis en parametre) ne peut pas etre reutilisee ici.
create or replace function fn_est_president_ou_vice()
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from affectations
    where ouvrier_id = fn_ouvrier_id_courant()
      and role in ('president', 'vice_president')
      and statut = 'actif'
  )
$$;

drop policy if exists presences_culte_select on presences_culte;
create policy presences_culte_select on presences_culte for select using (
  fn_is_pasteur_ou_assistant()
  or fn_est_president_ou_vice()
  or ouvrier_id = fn_ouvrier_id_courant()
);

drop policy if exists presences_culte_insert on presences_culte;
create policy presences_culte_insert on presences_culte for insert with check (
  fn_is_pasteur_ou_assistant() or fn_est_president_ou_vice()
);

drop policy if exists presences_culte_update on presences_culte;
create policy presences_culte_update on presences_culte for update using (
  fn_is_pasteur_ou_assistant() or fn_est_president_ou_vice()
) with check (
  fn_is_pasteur_ou_assistant() or fn_est_president_ou_vice()
);
