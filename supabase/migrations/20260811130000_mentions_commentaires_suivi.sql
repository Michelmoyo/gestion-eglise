-- ----------------------------------------------------------------------------
-- MENTIONS DANS LES COMMENTAIRES DE SUIVI
-- Stockage structure (tableau d'uuid) plutot que du parsing de texte "@Nom" --
-- evite toute ambiguite en cas d'homonymes. La personne mentionnee recoit un
-- message de notification distinct et plus direct que la notification
-- generique "nouveau commentaire".
-- ----------------------------------------------------------------------------
alter table commentaires_suivi add column mentions uuid[] not null default '{}';

-- Liste des personnes "taguables" dans un commentaire de suivi d'un
-- departement donne : exactement le meme ensemble que "qui a acces au
-- suivi" (cf. rls_policies.sql), donc jamais un simple ouvrier. SECURITY
-- DEFINER car un president ne peut normalement pas lire la fiche ouvrier
-- d'un pasteur/assistant via la policy ouvriers_select -- ici on ne renvoie
-- que id/prenom/nom, rien de sensible, et seulement si l'appelant a lui-meme
-- acces au suivi de ce departement.
create or replace function fn_personnes_taguables_suivi(p_departement_id uuid)
returns table(id uuid, prenom text, nom text)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  if not (fn_is_pasteur_ou_assistant() or fn_gere_departement(p_departement_id)) then
    raise exception 'Non autorise.';
  end if;

  return query
    select o.id, o.prenom, o.nom
    from ouvriers o
    where o.role_global in ('pasteur', 'assistant')
       or exists (
         select 1 from affectations a
         where a.ouvrier_id = o.id
           and a.departement_id = p_departement_id
           and a.statut = 'actif'
           and a.role in ('president', 'vice_president', 'secretaire')
       );
end;
$$;

revoke execute on function fn_personnes_taguables_suivi(uuid) from public;
grant execute on function fn_personnes_taguables_suivi(uuid) to authenticated;

-- Notification : message dedie pour les personnes taguees, message
-- generique pour le reste des personnes concernees (jamais les deux a la
-- meme personne, jamais l'auteur).
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
begin
  select nom into v_nom_departement from departements where id = new.departement_id;
  select contenu into v_titre_point from points_suivi where id = new.point_suivi_id;
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
    );

  return new;
end;
$$;
