-- Rapport soumis (insert) ou resoumis ce mois-ci (update, cf. upsert dans
-- l'action) : notifie tout le pilotage (pasteur + assistants), pas un
-- destinataire fixe -- il peut y en avoir plusieurs.
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

  insert into notifications (destinataire_id, type, contenu)
  select
    o.id,
    'rapport_soumis',
    'Rapport soumis pour ' || coalesce(v_nom_departement, '')
      || ' (période du ' || to_char(new.periode, 'DD/MM/YYYY') || ')'
  from ouvriers o
  where o.role_global in ('pasteur', 'assistant');

  return new;
end;
$$;

drop trigger if exists trg_notifier_rapport_soumis on rapports;
create trigger trg_notifier_rapport_soumis
  after insert or update on rapports
  for each row execute function fn_notifier_rapport_soumis();
