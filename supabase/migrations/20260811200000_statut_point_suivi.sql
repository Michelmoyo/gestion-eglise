-- ----------------------------------------------------------------------------
-- Les listes de suivi (Difficultes/Besoins/Objectifs + listes personnalisees)
-- servent parfois a gerer des taches type projet, pas seulement des points
-- resolus/non-resolus. Remplace le booleen "resolu" par un statut a trois
-- valeurs : a_faire, en_cours, termine.
-- ----------------------------------------------------------------------------
create type statut_point_suivi_enum as enum ('a_faire', 'en_cours', 'termine');

alter table points_suivi
  add column statut statut_point_suivi_enum not null default 'a_faire';

update points_suivi
  set statut = (case when resolu then 'termine' else 'a_faire' end)::statut_point_suivi_enum;

alter table points_suivi drop column resolu;
