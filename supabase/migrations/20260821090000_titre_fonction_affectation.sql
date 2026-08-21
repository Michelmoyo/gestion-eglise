-- Intitule libre affiche a cote du role fixe d'une affectation (ex: "Chef
-- de chorale"), purement cosmetique -- le role (role_departement_enum,
-- ferme a 5 valeurs) reste l'unique source de verite pour les permissions,
-- dans tout rls_policies.sql. Aucune policy RLS n'est touchee : l'ecriture
-- passe exclusivement par rpc_definir_titre_fonction, meme perimetre que
-- rpc_assigner_role.

alter table affectations add column if not exists titre_fonction text;

alter table affectations add constraint affectations_titre_fonction_longueur
  check (titre_fonction is null or char_length(titre_fonction) <= 60);

create or replace view v_effectifs_departement as
select
  a.id as affectation_id,
  a.departement_id,
  o.id as ouvrier_id,
  o.nom, o.postnom, o.prenom,
  a.role,
  a.statut,
  a.date_affectation,
  a.date_changement_statut,
  a.date_fin_suspension,
  o.photo_url,
  a.titre_fonction
from affectations a
join ouvriers o on o.id = a.ouvrier_id
where a.statut in ('actif', 'suspendu');

create or replace function rpc_definir_titre_fonction(p_affectation_id uuid, p_titre text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departement_id uuid;
  v_titre text;
begin
  select departement_id into v_departement_id from affectations where id = p_affectation_id;

  if v_departement_id is null then
    raise exception 'Affectation introuvable.';
  end if;

  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Seul le president de ce departement (ou le pasteur) peut definir un titre.';
  end if;

  v_titre := nullif(trim(p_titre), '');
  if v_titre is not null and char_length(v_titre) > 60 then
    raise exception 'Le titre est limite a 60 caracteres.';
  end if;

  update affectations
    set titre_fonction = v_titre
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_definir_titre_fonction(uuid, text) from public;
grant execute on function rpc_definir_titre_fonction(uuid, text) to authenticated;
