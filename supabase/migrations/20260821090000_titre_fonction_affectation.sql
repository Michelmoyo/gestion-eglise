-- Titres/fonctions personnalises : appartiennent au departement (catalogue
-- partage), pas a un ouvrier -- une fois cree pour un departement, un
-- titre est reutilisable pour n'importe lequel de ses membres, au meme
-- niveau que les 5 roles fixes dans le menu de selection. Purement
-- cosmetique : le role (role_departement_enum) reste l'unique source de
-- verite pour les permissions dans tout rls_policies.sql.

create table titres_fonction_departement (
  id             uuid primary key default gen_random_uuid(),
  departement_id uuid not null references departements(id) on delete cascade,
  nom            text not null,
  created_at     timestamptz not null default now(),
  unique (departement_id, nom),
  check (char_length(nom) between 1 and 60)
);

create index idx_titres_fonction_departement on titres_fonction_departement(departement_id);

alter table titres_fonction_departement enable row level security;

-- Meme visibilite que rapports_select : faible sensibilite, utile a toute
-- l'equipe du departement.
create policy titres_fonction_departement_select on titres_fonction_departement for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

-- Creation directe (pas de RPC necessaire : cette table n'est pas
-- `affectations`, cf. CLAUDE.md). Meme perimetre que rpc_assigner_role :
-- pasteur/assistant ou president de ce departement.
create policy titres_fonction_departement_insert on titres_fonction_departement for insert with check (
  fn_is_pasteur_ou_assistant() or fn_role_departement(departement_id) = 'president'
);

alter table affectations
  add column if not exists titre_fonction_id uuid references titres_fonction_departement(id) on delete set null;

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
  a.titre_fonction_id,
  tf.nom as titre_fonction_nom
from affectations a
join ouvriers o on o.id = a.ouvrier_id
left join titres_fonction_departement tf on tf.id = a.titre_fonction_id
where a.statut in ('actif', 'suspendu');

-- Assigne (ou retire, si null) un titre personnalise a une affectation.
-- Ne touche jamais `role`. Meme perimetre que rpc_assigner_role.
create or replace function rpc_definir_titre_fonction(p_affectation_id uuid, p_titre_fonction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_departement_id uuid;
  v_titre_departement_id uuid;
begin
  select departement_id into v_departement_id from affectations where id = p_affectation_id;

  if v_departement_id is null then
    raise exception 'Affectation introuvable.';
  end if;

  if not (fn_is_pasteur_ou_assistant() or fn_role_departement(v_departement_id) = 'president') then
    raise exception 'Seul le president de ce departement (ou le pasteur) peut definir un titre.';
  end if;

  if p_titre_fonction_id is not null then
    select departement_id into v_titre_departement_id
      from titres_fonction_departement where id = p_titre_fonction_id;

    if v_titre_departement_id is null or v_titre_departement_id <> v_departement_id then
      raise exception 'Ce titre n''appartient pas a ce departement.';
    end if;
  end if;

  update affectations
    set titre_fonction_id = p_titre_fonction_id
    where id = p_affectation_id;
end;
$$;

revoke execute on function rpc_definir_titre_fonction(uuid, uuid) from public;
grant execute on function rpc_definir_titre_fonction(uuid, uuid) to authenticated;
