-- ----------------------------------------------------------------------------
-- CULTES
-- Evenements a l'echelle de l'eglise (culte dominical, intercession, nuit de
-- priere, retraite, formation...), distincts des activites de departement
-- (cf. cahier des charges S4.5 et S5). "type" est en texte libre : le pasteur
-- peut ajouter un nouveau type de rassemblement sans migration.
-- Creation et saisie des presences reservees pasteur/assistant.
-- ----------------------------------------------------------------------------
create table cultes (
  id           uuid primary key default gen_random_uuid(),
  type         text not null,
  date_culte   date not null,
  heure        time,
  lieu         text,
  description  text,
  created_by   uuid not null references ouvriers(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_cultes_updated_at
  before update on cultes
  for each row execute function fn_set_updated_at();

create index idx_cultes_date on cultes(date_culte);

-- Presence nominative au culte. Contrairement a "presences" (departement,
-- petit effectif, visible de tous les membres), l'assemblee peut compter des
-- centaines de personnes : un ouvrier ne voit que sa propre ligne (voir RLS).
create table presences_culte (
  id           uuid primary key default gen_random_uuid(),
  culte_id     uuid not null references cultes(id) on delete cascade,
  ouvrier_id   uuid not null references ouvriers(id) on delete cascade,
  statut       statut_presence_enum not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (culte_id, ouvrier_id)
);

create trigger trg_presences_culte_updated_at
  before update on presences_culte
  for each row execute function fn_set_updated_at();

create index idx_presences_culte_culte on presences_culte(culte_id);
create index idx_presences_culte_ouvrier on presences_culte(ouvrier_id);

-- Taux de presence par culte (indicateurs globaux, cahier des charges S5).
create view v_taux_presence_culte as
select
  culte_id,
  count(*) filter (where statut = 'present') as nb_presents,
  count(*) as nb_total,
  round(100.0 * count(*) filter (where statut = 'present') / nullif(count(*), 0), 1) as taux_presence
from presences_culte
group by culte_id;

-- ----------------------------------------------------------------------------
-- RLS : CULTES
-- Evenement d'eglise (pas confidentiel) : visible par tout utilisateur
-- connecte. Creation/modification/suppression reservees pasteur/assistant --
-- un culte n'appartient a aucun departement, donc pas de fn_gere_departement
-- possible ici.
-- ----------------------------------------------------------------------------
alter table cultes enable row level security;

create policy cultes_select on cultes for select using (
  auth.uid() is not null
);

create policy cultes_insert on cultes for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy cultes_update on cultes for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);

create policy cultes_delete on cultes for delete using (
  fn_is_pasteur_ou_assistant()
);

-- ----------------------------------------------------------------------------
-- RLS : PRESENCES CULTE
-- A la difference de "presences" (departement, petit effectif, visible par
-- toute l'equipe), l'assemblee peut compter des centaines de personnes : un
-- ouvrier ne voit que sa propre ligne, jamais celle des autres. Saisie
-- reservee pasteur/assistant (decision produit -- pas de delegation en V1).
-- ----------------------------------------------------------------------------
alter table presences_culte enable row level security;

create policy presences_culte_select on presences_culte for select using (
  fn_is_pasteur_ou_assistant() or ouvrier_id = fn_ouvrier_id_courant()
);

create policy presences_culte_insert on presences_culte for insert with check (
  fn_is_pasteur_ou_assistant()
);

create policy presences_culte_update on presences_culte for update using (
  fn_is_pasteur_ou_assistant()
) with check (
  fn_is_pasteur_ou_assistant()
);
