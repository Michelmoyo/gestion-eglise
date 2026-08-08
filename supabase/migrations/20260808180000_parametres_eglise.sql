-- ----------------------------------------------------------------------------
-- PARAMETRES EGLISE
-- Ligne unique (pas de eglise_id, une seule eglise). Alimente l'entete des
-- documents generes (rapports). Modifiable par le pasteur uniquement -- PAS
-- les assistants (decision produit).
-- ----------------------------------------------------------------------------
create table parametres_eglise (
  id          uuid primary key default gen_random_uuid(),
  adresse     text,
  telephone   text,
  email       text,
  updated_at  timestamptz not null default now()
);

create trigger trg_parametres_eglise_updated_at
  before update on parametres_eglise
  for each row execute function fn_set_updated_at();

insert into parametres_eglise (adresse, telephone, email) values (null, null, null);

alter table parametres_eglise enable row level security;

create policy parametres_eglise_select on parametres_eglise for select using (
  auth.uid() is not null
);

create policy parametres_eglise_update on parametres_eglise for update using (
  fn_is_pasteur()
) with check (
  fn_is_pasteur()
);
