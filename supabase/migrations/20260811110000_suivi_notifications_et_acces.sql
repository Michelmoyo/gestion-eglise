-- ----------------------------------------------------------------------------
-- RESSERREMENT DE L'ACCES AU SUIVI
-- Les informations de suivi (difficultes/besoins/objectifs + commentaires)
-- sont sensibles : un simple ouvrier (role "membre" ou "tresorier") n'y a
-- pas acces, seulement les responsables du departement (president,
-- vice-president, secretaire) et le pilotage (pasteur/assistant).
-- ----------------------------------------------------------------------------
drop policy if exists listes_suivi_select on listes_suivi;
create policy listes_suivi_select on listes_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

drop policy if exists points_suivi_select on points_suivi;
create policy points_suivi_select on points_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

drop policy if exists commentaires_suivi_select on commentaires_suivi;
create policy commentaires_suivi_select on commentaires_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

drop policy if exists commentaires_suivi_insert on commentaires_suivi;
create policy commentaires_suivi_insert on commentaires_suivi for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS : SUIVI DU DEPARTEMENT
-- "Personnes concernees" = pasteur/assistant + les autres responsables
-- (president/vice-president/secretaire) de CE departement, jamais l'auteur
-- de l'action lui-meme. Coherent avec le resserrement d'acces ci-dessus :
-- on ne notifie que des gens qui ont de toute facon le droit de voir.
-- ----------------------------------------------------------------------------
create or replace function fn_notifier_nouveau_point_suivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_nom_liste text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;
  select nom into v_nom_liste from listes_suivi where id = new.liste_id;

  insert into notifications (destinataire_id, type, contenu)
  select distinct o.id,
    'nouveau_point_suivi',
    'Nouvel élément « ' || coalesce(v_nom_liste, '') || ' » ajouté pour '
      || coalesce(v_nom_departement, '') || ' : ' || new.contenu
  from ouvriers o
  where o.id <> new.cree_par
    and (
      o.role_global in ('pasteur', 'assistant')
      or exists (
        select 1 from affectations a
        where a.ouvrier_id = o.id
          and a.departement_id = new.departement_id
          and a.statut = 'actif'
          and a.role in ('president', 'vice_president', 'secretaire')
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouveau_point_suivi on points_suivi;
create trigger trg_notifier_nouveau_point_suivi
  after insert on points_suivi
  for each row execute function fn_notifier_nouveau_point_suivi();

create or replace function fn_notifier_nouveau_commentaire_suivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_titre_point text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;
  select contenu into v_titre_point from points_suivi where id = new.point_suivi_id;

  insert into notifications (destinataire_id, type, contenu)
  select distinct o.id,
    'nouveau_commentaire_suivi',
    'Nouveau commentaire sur « ' || coalesce(v_titre_point, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')'
  from ouvriers o
  where o.id <> new.auteur_id
    and (
      o.role_global in ('pasteur', 'assistant')
      or exists (
        select 1 from affectations a
        where a.ouvrier_id = o.id
          and a.departement_id = new.departement_id
          and a.statut = 'actif'
          and a.role in ('president', 'vice_president', 'secretaire')
      )
    );

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouveau_commentaire_suivi on commentaires_suivi;
create trigger trg_notifier_nouveau_commentaire_suivi
  after insert on commentaires_suivi
  for each row execute function fn_notifier_nouveau_commentaire_suivi();
