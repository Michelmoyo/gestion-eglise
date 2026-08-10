-- ----------------------------------------------------------------------------
-- LISTES DE SUIVI
-- Remplace le type fige ('difficulte'/'besoin'/'objectif') par des listes
-- nommees et personnalisables par departement, a la maniere d'un outil de
-- gestion de projet (colonnes Trello). Difficultes/Besoins/Objectifs restent
-- les listes par defaut (creees automatiquement a la creation d'un
-- departement), mais le president peut en ajouter d'autres.
-- ----------------------------------------------------------------------------
create table listes_suivi (
  id             uuid primary key default gen_random_uuid(),
  departement_id uuid not null references departements(id) on delete cascade,
  nom            text not null,
  ordre          int not null default 0,
  cree_par       uuid references ouvriers(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (departement_id, nom)
);

create trigger trg_listes_suivi_updated_at
  before update on listes_suivi
  for each row execute function fn_set_updated_at();

create index idx_listes_suivi_departement on listes_suivi(departement_id);

-- Seed des 3 listes par defaut pour chaque departement deja existant.
insert into listes_suivi (departement_id, nom, ordre)
select d.id, l.nom, l.ordre
from departements d
cross join (values ('Difficultés', 0), ('Besoins', 1), ('Objectifs', 2)) as l(nom, ordre)
on conflict (departement_id, nom) do nothing;

-- points_suivi reference desormais une liste plutot qu'un type fige.
alter table points_suivi add column liste_id uuid references listes_suivi(id) on delete cascade;

update points_suivi p
set liste_id = l.id
from listes_suivi l
where l.departement_id = p.departement_id
  and l.nom = case p.type
    when 'difficulte' then 'Difficultés'
    when 'besoin' then 'Besoins'
    when 'objectif' then 'Objectifs'
  end;

alter table points_suivi alter column liste_id set not null;
alter table points_suivi drop column type;
drop type type_suivi_enum;

-- Suppression d'un point de suivi (demande produit : corriger une erreur de
-- saisie sans devoir le laisser traine "resolu").
create policy points_suivi_delete on points_suivi for delete using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

alter table listes_suivi enable row level security;

create policy listes_suivi_select on listes_suivi for select using (
  fn_is_pasteur_ou_assistant() or fn_est_affecte(departement_id)
);

create policy listes_suivi_insert on listes_suivi for insert with check (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

create policy listes_suivi_delete on listes_suivi for delete using (
  fn_is_pasteur_ou_assistant() or fn_gere_departement(departement_id)
);

-- Nouveau departement : seed automatique des 3 listes par defaut.
create or replace function fn_seed_listes_suivi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into listes_suivi (departement_id, nom, ordre) values
    (new.id, 'Difficultés', 0),
    (new.id, 'Besoins', 1),
    (new.id, 'Objectifs', 2);
  return new;
end;
$$;

drop trigger if exists trg_seed_listes_suivi on departements;
create trigger trg_seed_listes_suivi
  after insert on departements
  for each row execute function fn_seed_listes_suivi();
