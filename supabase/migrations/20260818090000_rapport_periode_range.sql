-- Remplace le rythme mensuel fixe des rapports par une plage de dates
-- libre (periode_debut / periode_fin), sur demande explicite : un rapport
-- peut desormais couvrir une semaine, plusieurs mois, etc.

alter table rapports add column if not exists periode_debut date;
alter table rapports add column if not exists periode_fin date;

-- Backfill des rapports existants : leur "periode" (1er jour du mois)
-- devient un intervalle couvrant tout ce mois-la, pour ne perdre aucune
-- donnee deja soumise.
update rapports
set periode_debut = periode,
    periode_fin = (periode + interval '1 month' - interval '1 day')::date
where periode_debut is null;

alter table rapports alter column periode_debut set not null;
alter table rapports alter column periode_fin set not null;

alter table rapports drop constraint if exists rapports_departement_id_periode_key;
alter table rapports drop column if exists periode;

alter table rapports add constraint rapports_periode_check check (periode_fin >= periode_debut);
alter table rapports add constraint rapports_departement_periode_unique
  unique (departement_id, periode_debut, periode_fin);

-- Notification de soumission : periode_debut/periode_fin au lieu de periode.
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
      || ' (période du ' || to_char(new.periode_debut, 'DD/MM/YYYY')
      || ' au ' || to_char(new.periode_fin, 'DD/MM/YYYY') || ')',
    '/rapports/' || new.id
  from ouvriers o
  where o.role_global in ('pasteur', 'assistant');

  return new;
end;
$$;

-- Sante du departement : "dernier rapport" se lit desormais sur la fin de
-- la periode couverte (indicateur de fraicheur), pas sur son debut. Seule
-- cette ligne (max(periode) -> max(periode_fin)) change par rapport a la
-- version existante -- copie exacte du reste pour ne pas alterer l'algorithme.
create or replace function fn_sante_departement(p_departement_id uuid)
returns sante_enum
language plpgsql
stable
as $$
declare
  v_derniere_activite date;
  v_taux_presence numeric;
  v_taux_presence_precedent numeric;
  v_dernier_rapport date;
  v_derniere_action_responsable date;
begin
  select max(date_activite) into v_derniere_activite
  from activites where departement_id = p_departement_id;

  select taux_presence into v_taux_presence
  from v_taux_presence_departement_30j where departement_id = p_departement_id;

  select taux_presence into v_taux_presence_precedent
  from v_taux_presence_departement_30j_precedent where departement_id = p_departement_id;

  select max(periode_fin) into v_dernier_rapport
  from rapports where departement_id = p_departement_id;

  select max(act.date_activite) into v_derniere_action_responsable
  from activites act
  where act.departement_id = p_departement_id
    and act.created_by in (
      select ouvrier_id from affectations
      where departement_id = p_departement_id
        and role in ('president', 'vice_president')
        and statut = 'actif'
    );

  -- ROUGE
  if v_derniere_activite is null
     or v_derniere_activite < current_date - interval '30 days'
     or coalesce(v_taux_presence, 0) < 50
     or v_dernier_rapport is null
     or v_dernier_rapport < current_date - interval '60 days'
     or v_derniere_action_responsable is null
     or v_derniere_action_responsable < current_date - interval '30 days'
  then
    return 'rouge';
  end if;

  -- ORANGE
  if v_taux_presence between 50 and 70
     or (v_taux_presence_precedent is not null and v_taux_presence_precedent - v_taux_presence > 15)
     or v_dernier_rapport < current_date - interval '30 days'
  then
    return 'orange';
  end if;

  return 'vert';
end;
$$;
