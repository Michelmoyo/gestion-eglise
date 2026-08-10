-- ----------------------------------------------------------------------------
-- POINTS DE SUIVI (difficultes / besoins / objectifs)
-- Remplace la saisie en texte libre par rapport : un point de suivi vit
-- independamment du cycle mensuel, peut rester ouvert plusieurs mois, et se
-- coche comme resolu par le responsable du departement. Visible en
-- permanence sur la page du departement, pas seulement dans un rapport.
-- ----------------------------------------------------------------------------
create type type_suivi_enum as enum ('difficulte', 'besoin', 'objectif');

create table points_suivi (
  id              uuid primary key default gen_random_uuid(),
  departement_id  uuid not null references departements(id) on delete cascade,
  type            type_suivi_enum not null,
  contenu         text not null,
  resolu          boolean not null default false,
  date_creation   date not null default current_date,
  date_resolution date,
  cree_par        uuid not null references ouvriers(id),
  resolu_par      uuid references ouvriers(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_points_suivi_updated_at
  before update on points_suivi
  for each row execute function fn_set_updated_at();

create index idx_points_suivi_departement on points_suivi(departement_id);

alter table points_suivi enable row level security;

create policy points_suivi_select on points_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy points_suivi_insert on points_suivi for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

create policy points_suivi_update on points_suivi for update using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
) with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);
