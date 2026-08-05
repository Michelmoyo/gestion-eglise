-- ----------------------------------------------------------------------------
-- NOTIFICATIONS AUTOMATIQUES (US7.1, US7.4 du backlog)
-- "notifications" n'a pas de policy INSERT (voir rls_policies.sql) : seul le
-- backend peut y ecrire. On le fait ici via des triggers SECURITY DEFINER,
-- au meme titre que les fonctions rpc_* de la migration initiale.
-- Les rappels avant activite (US7.2) et le rapport en retard (US7.3) ne sont
-- PAS couverts ici : ils dependent du temps qui passe, pas d'un insert, et
-- necessitent donc un job planifie plutot qu'un trigger.
-- ----------------------------------------------------------------------------
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

  insert into notifications (destinataire_id, type, contenu)
  values (
    new.ouvrier_id,
    'nouvelle_affectation',
    'Vous avez été affecté au département ' || coalesce(v_nom_departement, '')
  );

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouvelle_affectation on affectations;
create trigger trg_notifier_nouvelle_affectation
  after insert on affectations
  for each row execute function fn_notifier_nouvelle_affectation();

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

  insert into notifications (destinataire_id, type, contenu)
  select
    a.ouvrier_id,
    'nouvelle_activite',
    'Nouvelle activité "' || new.titre || '" le ' || to_char(new.date_activite, 'DD/MM/YYYY')
      || ' — ' || coalesce(v_nom_departement, '')
  from affectations a
  where a.departement_id = new.departement_id
    and a.statut = 'actif';

  return new;
end;
$$;

drop trigger if exists trg_notifier_nouvelle_activite on activites;
create trigger trg_notifier_nouvelle_activite
  after insert on activites
  for each row execute function fn_notifier_nouvelle_activite();
