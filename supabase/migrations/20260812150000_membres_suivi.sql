-- ----------------------------------------------------------------------------
-- Acces etendu au suivi : au-dela des responsables du departement
-- (president/vice-president/secretaire) et du pilotage, on peut desormais
-- ajouter explicitement des ouvriers precis :
--   - membre d'une LISTE entiere -> voit et peut faire avancer (statut,
--     commentaires) TOUTES les taches de cette liste
--   - membre d'une seule TACHE -> voit et peut faire avancer UNIQUEMENT
--     cette tache, pas le reste de la liste
-- Toujours reserve aux responsables/pilotage d'ajouter/retirer ces membres :
-- un membre ajoute ne peut pas en ajouter d'autres, ni supprimer une tache/
-- liste, ni changer l'inclusion dans le rapport -- seulement voir et faire
-- avancer ce a quoi il a acces (changer le statut, commenter).
-- ----------------------------------------------------------------------------

create table liste_suivi_membres (
  id         uuid primary key default gen_random_uuid(),
  liste_id   uuid not null references listes_suivi(id) on delete cascade,
  ouvrier_id uuid not null references ouvriers(id) on delete cascade,
  ajoute_par uuid references ouvriers(id),
  created_at timestamptz not null default now(),
  unique (liste_id, ouvrier_id)
);

create table point_suivi_membres (
  id         uuid primary key default gen_random_uuid(),
  point_id   uuid not null references points_suivi(id) on delete cascade,
  ouvrier_id uuid not null references ouvriers(id) on delete cascade,
  ajoute_par uuid references ouvriers(id),
  created_at timestamptz not null default now(),
  unique (point_id, ouvrier_id)
);

create index idx_liste_suivi_membres_liste on liste_suivi_membres(liste_id);
create index idx_liste_suivi_membres_ouvrier on liste_suivi_membres(ouvrier_id);
create index idx_point_suivi_membres_point on point_suivi_membres(point_id);
create index idx_point_suivi_membres_ouvrier on point_suivi_membres(ouvrier_id);

-- ----------------------------------------------------------------------------
-- Fonctions utilitaires (SECURITY DEFINER, cf. rls_policies.sql)
-- ----------------------------------------------------------------------------

create or replace function fn_est_membre_liste(p_liste_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from liste_suivi_membres
    where liste_id = p_liste_id and ouvrier_id = fn_ouvrier_id_courant()
  )
$$;

create or replace function fn_est_membre_tache(p_point_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from point_suivi_membres
    where point_id = p_point_id and ouvrier_id = fn_ouvrier_id_courant()
  )
$$;

-- Manager du departement, membre de la liste, ou membre de cette tache
-- precise : les trois façons de "voir" une tache.
create or replace function fn_peut_voir_tache(p_point_id uuid)
returns boolean language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from points_suivi p
    where p.id = p_point_id
      and (
        fn_is_pasteur_ou_assistant()
        or fn_gere_departement(p.departement_id)
        or fn_est_membre_liste(p.liste_id)
        or fn_est_membre_tache(p_point_id)
      )
  )
$$;

-- ----------------------------------------------------------------------------
-- RLS : liste_suivi_membres / point_suivi_membres
-- Gestion (ajout/retrait) reservee aux responsables du departement concerne.
-- Un ouvrier peut en plus lire ses PROPRES lignes d'appartenance (necessaire
-- pour qu'il retrouve ses listes/taches sur "Mes taches").
-- ----------------------------------------------------------------------------
alter table liste_suivi_membres enable row level security;

create policy liste_suivi_membres_select on liste_suivi_membres for select using (
  ouvrier_id = fn_ouvrier_id_courant()
  or exists (
    select 1 from listes_suivi l
    where l.id = liste_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(l.departement_id))
  )
);

create policy liste_suivi_membres_insert on liste_suivi_membres for insert with check (
  exists (
    select 1 from listes_suivi l
    where l.id = liste_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(l.departement_id))
  )
);

create policy liste_suivi_membres_delete on liste_suivi_membres for delete using (
  exists (
    select 1 from listes_suivi l
    where l.id = liste_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(l.departement_id))
  )
);

alter table point_suivi_membres enable row level security;

create policy point_suivi_membres_select on point_suivi_membres for select using (
  ouvrier_id = fn_ouvrier_id_courant()
  or exists (
    select 1 from points_suivi p
    where p.id = point_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(p.departement_id))
  )
);

create policy point_suivi_membres_insert on point_suivi_membres for insert with check (
  exists (
    select 1 from points_suivi p
    where p.id = point_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(p.departement_id))
  )
);

create policy point_suivi_membres_delete on point_suivi_membres for delete using (
  exists (
    select 1 from points_suivi p
    where p.id = point_id
      and (fn_is_pasteur_ou_assistant() or fn_gere_departement(p.departement_id))
  )
);

-- ----------------------------------------------------------------------------
-- Elargit la visibilite de listes_suivi / points_suivi / commentaires_suivi
-- aux membres ajoutes, en plus des responsables/pilotage deja en place.
-- ----------------------------------------------------------------------------
drop policy if exists listes_suivi_select on listes_suivi;
create policy listes_suivi_select on listes_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id) or fn_est_membre_liste(id)
);

drop policy if exists points_suivi_select on points_suivi;
create policy points_suivi_select on points_suivi for select using (
  fn_peut_voir_tache(id)
);

drop policy if exists commentaires_suivi_select on commentaires_suivi;
create policy commentaires_suivi_select on commentaires_suivi for select using (
  fn_peut_voir_tache(point_suivi_id)
);

drop policy if exists commentaires_suivi_insert on commentaires_suivi;
create policy commentaires_suivi_insert on commentaires_suivi for insert with check (
  fn_peut_voir_tache(point_suivi_id)
);

-- ----------------------------------------------------------------------------
-- Changer le statut d'une tache (a_faire/en_cours/termine) : les managers
-- ET les membres ajoutes doivent pouvoir le faire, mais la policy UPDATE
-- de points_suivi reste reservee aux managers (elle couvre aussi contenu/
-- description, qu'un simple membre ne doit pas pouvoir modifier -- une
-- policy RLS ne distingue pas les colonnes, une fonction si, cf. entete de
-- rls_policies.sql). On passe donc par une fonction SECURITY DEFINER dediee.
-- ----------------------------------------------------------------------------
create or replace function rpc_changer_statut_point_suivi(p_point_id uuid, p_statut statut_point_suivi_enum)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not fn_peut_voir_tache(p_point_id) then
    raise exception 'Non autorise.';
  end if;

  update points_suivi
    set statut = p_statut,
        date_resolution = case when p_statut = 'termine' then current_date else null end,
        resolu_par = case when p_statut = 'termine' then fn_ouvrier_id_courant() else null end
    where id = p_point_id;
end;
$$;

revoke execute on function rpc_changer_statut_point_suivi(uuid, statut_point_suivi_enum) from public;
grant execute on function rpc_changer_statut_point_suivi(uuid, statut_point_suivi_enum) to authenticated;

-- ----------------------------------------------------------------------------
-- Personnes "taguables" dans un commentaire : desormais calcule pour UNE
-- tache precise (et non plus tout le departement), pour inclure les membres
-- de liste/tache sans jamais depasser ce qu'ils ont le droit de voir.
-- ----------------------------------------------------------------------------
create or replace function fn_personnes_taguables_suivi(p_point_id uuid)
returns table(id uuid, prenom text, nom text)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_departement_id uuid;
  v_liste_id uuid;
begin
  select departement_id, liste_id into v_departement_id, v_liste_id
    from points_suivi where id = p_point_id;

  if v_departement_id is null then
    raise exception 'Element introuvable.';
  end if;

  if not fn_peut_voir_tache(p_point_id) then
    raise exception 'Non autorise.';
  end if;

  return query
    select distinct o.id, o.prenom, o.nom
    from ouvriers o
    where o.role_global in ('pasteur', 'assistant')
       or exists (
         select 1 from affectations a
         where a.ouvrier_id = o.id
           and a.departement_id = v_departement_id
           and a.statut = 'actif'
           and a.role in ('president', 'vice_president', 'secretaire')
       )
       or exists (
         select 1 from liste_suivi_membres m
         where m.liste_id = v_liste_id and m.ouvrier_id = o.id
       )
       or exists (
         select 1 from point_suivi_membres m
         where m.point_id = p_point_id and m.ouvrier_id = o.id
       );
end;
$$;

revoke execute on function fn_personnes_taguables_suivi(uuid) from public;
grant execute on function fn_personnes_taguables_suivi(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- Notifications : les membres ajoutes doivent aussi entendre parler de ce
-- qui se passe sur ce qu'ils peuvent voir desormais.
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
      or exists (
        select 1 from liste_suivi_membres m
        where m.liste_id = new.liste_id and m.ouvrier_id = o.id
      )
    );

  return new;
end;
$$;

create or replace function fn_notifier_nouveau_commentaire_suivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_titre_point text;
  v_nom_auteur text;
  v_liste_id uuid;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;
  select contenu, liste_id into v_titre_point, v_liste_id from points_suivi where id = new.point_suivi_id;
  select prenom || ' ' || nom into v_nom_auteur from ouvriers where id = new.auteur_id;

  insert into notifications (destinataire_id, type, contenu)
  select o.id,
    'mention_commentaire_suivi',
    coalesce(v_nom_auteur, 'Quelqu''un') || ' vous a mentionné dans un commentaire sur « '
      || coalesce(v_titre_point, '') || ' » (' || coalesce(v_nom_departement, '') || ')'
  from ouvriers o
  where o.id = any(new.mentions)
    and o.id <> new.auteur_id;

  insert into notifications (destinataire_id, type, contenu)
  select distinct o.id,
    'nouveau_commentaire_suivi',
    'Nouveau commentaire sur « ' || coalesce(v_titre_point, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')'
  from ouvriers o
  where o.id <> new.auteur_id
    and not (o.id = any(new.mentions))
    and (
      o.role_global in ('pasteur', 'assistant')
      or exists (
        select 1 from affectations a
        where a.ouvrier_id = o.id
          and a.departement_id = new.departement_id
          and a.statut = 'actif'
          and a.role in ('president', 'vice_president', 'secretaire')
      )
      or exists (
        select 1 from liste_suivi_membres m
        where m.liste_id = v_liste_id and m.ouvrier_id = o.id
      )
      or exists (
        select 1 from point_suivi_membres m
        where m.point_id = new.point_suivi_id and m.ouvrier_id = o.id
      )
    );

  return new;
end;
$$;

-- Nouveau : prevenir l'ouvrier lui-meme quand on l'ajoute a une liste/tache.
create or replace function fn_notifier_ajout_membre_liste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_nom_liste text;
begin
  select d.nom, l.nom into v_nom_departement, v_nom_liste
    from listes_suivi l join departements d on d.id = l.departement_id
    where l.id = new.liste_id;

  insert into notifications (destinataire_id, type, contenu)
  values (
    new.ouvrier_id,
    'ajout_membre_suivi',
    'Vous avez été ajouté à la liste « ' || coalesce(v_nom_liste, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')'
  );

  return new;
end;
$$;

drop trigger if exists trg_notifier_ajout_membre_liste on liste_suivi_membres;
create trigger trg_notifier_ajout_membre_liste
  after insert on liste_suivi_membres
  for each row execute function fn_notifier_ajout_membre_liste();

create or replace function fn_notifier_ajout_membre_tache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_titre_point text;
begin
  select d.nom, p.contenu into v_nom_departement, v_titre_point
    from points_suivi p join departements d on d.id = p.departement_id
    where p.id = new.point_id;

  insert into notifications (destinataire_id, type, contenu)
  values (
    new.ouvrier_id,
    'ajout_membre_suivi',
    'Vous avez été ajouté à la tâche « ' || coalesce(v_titre_point, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')'
  );

  return new;
end;
$$;

drop trigger if exists trg_notifier_ajout_membre_tache on point_suivi_membres;
create trigger trg_notifier_ajout_membre_tache
  after insert on point_suivi_membres
  for each row execute function fn_notifier_ajout_membre_tache();
