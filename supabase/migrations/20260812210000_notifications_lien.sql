-- Ajoute un lien de redirection aux notifications, pour que le clic sur une
-- notification amene directement sur la page concernee (departement,
-- activite, rapport, tache de suivi...) plutot que de rester sur la liste.

alter table notifications add column if not exists lien text;

-- Affectation : renvoie sur la fiche du departement concerne.
create or replace function fn_notifier_nouvelle_affectation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  values (
    new.ouvrier_id,
    'nouvelle_affectation',
    'Vous avez été affecté au département ' || coalesce(v_nom_departement, ''),
    '/departements/' || new.departement_id
  );

  return new;
end;
$$;

-- Nouvelle activite : renvoie sur la fiche de l'activite.
create or replace function fn_notifier_nouvelle_activite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  select
    a.ouvrier_id,
    'nouvelle_activite',
    'Nouvelle activité "' || new.titre || '" le ' || to_char(new.date_activite, 'DD/MM/YYYY')
      || ' — ' || coalesce(v_nom_departement, ''),
    '/departements/' || new.departement_id || '/activites/' || new.id
  from affectations a
  where a.departement_id = new.departement_id
    and a.statut = 'actif';

  return new;
end;
$$;

-- Rapport soumis : renvoie sur le rapport lui-meme.
create or replace function fn_notifier_rapport_soumis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  select
    o.id,
    'rapport_soumis',
    'Rapport soumis pour ' || coalesce(v_nom_departement, '')
      || ' (période du ' || to_char(new.periode, 'DD/MM/YYYY') || ')',
    '/rapports/' || new.id
  from ouvriers o
  where o.role_global in ('pasteur', 'assistant');

  return new;
end;
$$;

-- Nouveau point de suivi : renvoie sur la tache elle-meme.
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

  insert into notifications (destinataire_id, type, contenu, lien)
  select distinct o.id,
    'nouveau_point_suivi',
    'Nouvel élément « ' || coalesce(v_nom_liste, '') || ' » ajouté pour '
      || coalesce(v_nom_departement, '') || ' : ' || new.contenu,
    '/departements/' || new.departement_id || '/suivi/' || new.id
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

-- Commentaire (mention ou generique) : renvoie sur la tache commentee.
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
  v_lien text;
begin
  select nom into v_nom_departement from departements where id = new.departement_id;
  select contenu, liste_id into v_titre_point, v_liste_id from points_suivi where id = new.point_suivi_id;
  select prenom || ' ' || nom into v_nom_auteur from ouvriers where id = new.auteur_id;
  v_lien := '/departements/' || new.departement_id || '/suivi/' || new.point_suivi_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  select o.id,
    'mention_commentaire_suivi',
    coalesce(v_nom_auteur, 'Quelqu''un') || ' vous a mentionné dans un commentaire sur « '
      || coalesce(v_titre_point, '') || ' » (' || coalesce(v_nom_departement, '') || ')',
    v_lien
  from ouvriers o
  where o.id = any(new.mentions)
    and o.id <> new.auteur_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  select distinct o.id,
    'nouveau_commentaire_suivi',
    'Nouveau commentaire sur « ' || coalesce(v_titre_point, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')',
    v_lien
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

-- Ajout a une liste de suivi : renvoie sur la liste.
create or replace function fn_notifier_ajout_membre_liste()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_nom_liste text;
  v_departement_id uuid;
begin
  select d.id, d.nom, l.nom into v_departement_id, v_nom_departement, v_nom_liste
    from listes_suivi l join departements d on d.id = l.departement_id
    where l.id = new.liste_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  values (
    new.ouvrier_id,
    'ajout_membre_suivi',
    'Vous avez été ajouté à la liste « ' || coalesce(v_nom_liste, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')',
    '/departements/' || v_departement_id || '/suivi/liste/' || new.liste_id
  );

  return new;
end;
$$;

-- Ajout a une tache de suivi : renvoie sur la tache.
create or replace function fn_notifier_ajout_membre_tache()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nom_departement text;
  v_titre_point text;
  v_departement_id uuid;
begin
  select d.id, d.nom, p.contenu into v_departement_id, v_nom_departement, v_titre_point
    from points_suivi p join departements d on d.id = p.departement_id
    where p.id = new.point_id;

  insert into notifications (destinataire_id, type, contenu, lien)
  values (
    new.ouvrier_id,
    'ajout_membre_suivi',
    'Vous avez été ajouté à la tâche « ' || coalesce(v_titre_point, '') || ' » ('
      || coalesce(v_nom_departement, '') || ')',
    '/departements/' || v_departement_id || '/suivi/' || new.point_id
  );

  return new;
end;
$$;
