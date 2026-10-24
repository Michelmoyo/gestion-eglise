-- Deux corrections sur presences_culte, suite a un audit de la fonctionnalite
-- "cultes" (non specifiee dans le cahier des charges, developpee ad hoc) :
--
-- 1. Tracabilite manquante : plusieurs presidents/vice-presidents (parfois
--    de departements differents) peuvent ecrire sur les memes lignes, sans
--    circuit de validation -- comme pour mouvements_caisse, dont la colonne
--    auteur_id sert explicitement de garde-fou (cahier des charges §4.7).
--    presences_culte n'avait pas d'equivalent.
--
-- 2. Perimetre trop large : fn_est_president_ou_vice() donnait a N'IMPORTE
--    QUEL president/vice-president une portee EGLISE ENTIERE sur les
--    presences au culte, alors que partout ailleurs dans l'app (caisse,
--    equipe, activites) son autorite est strictement limitee a SON
--    departement. fn_gere_ouvrier_via_departement() la remplace : le
--    president ne lit/ecrit que sur les ouvriers de ses propres
--    departements. Plusieurs departements pointent donc le meme culte en
--    parallele, chacun sa propre equipe -- toujours pas d'embouteillage sur
--    le pasteur, mais sans portee globale non plus.

alter table presences_culte add column if not exists modifie_par uuid references ouvriers(id);

-- Les policies qui referencent fn_est_president_ou_vice() doivent disparaitre
-- avant la fonction elle-meme (dependance Postgres).
drop policy if exists presences_culte_select on presences_culte;
drop policy if exists presences_culte_insert on presences_culte;
drop policy if exists presences_culte_update on presences_culte;

drop function if exists fn_est_president_ou_vice();

create or replace function fn_gere_ouvrier_via_departement(p_ouvrier_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from affectations moi
    join affectations cible
      on cible.departement_id = moi.departement_id
     and cible.ouvrier_id = p_ouvrier_id
     and cible.statut = 'actif'
    where moi.ouvrier_id = fn_ouvrier_id_courant()
      and moi.role in ('president', 'vice_president')
      and moi.statut = 'actif'
  )
$$;

create policy presences_culte_select on presences_culte for select using (
  fn_is_pasteur_ou_assistant()
  or ouvrier_id = fn_ouvrier_id_courant()
  or exists (
    select 1 from affectations a
    where a.ouvrier_id = presences_culte.ouvrier_id
      and a.statut = 'actif'
      and fn_gere_departement(a.departement_id)
  )
);

create policy presences_culte_insert on presences_culte for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_ouvrier_via_departement(ouvrier_id)
);

create policy presences_culte_update on presences_culte for update using (
  fn_is_pasteur_ou_assistant() or fn_gere_ouvrier_via_departement(ouvrier_id)
) with check (
  fn_is_pasteur_ou_assistant() or fn_gere_ouvrier_via_departement(ouvrier_id)
);
