-- ----------------------------------------------------------------------------
-- Avec plusieurs listes de suivi possibles par departement (au-dela des 3
-- listes par defaut), il faut pouvoir choisir lesquelles apparaissent dans
-- le rapport mensuel genere -- y compris desactiver Difficultes/Besoins/
-- Objectifs si besoin. inclure_rapport est a true par defaut pour ne rien
-- changer au comportement existant des listes deja creees.
--
-- Le rapport devient une COPIE figee de N listes (pas forcement 3), donc
-- les colonnes difficultes/besoins/objectifs de "rapports" ne suffisent
-- plus : on les laisse en place pour les rapports deja soumis (archives
-- datees, jamais modifiees) et on ajoute suivi_snapshot (jsonb) pour les
-- nouvelles soumissions -- un tableau [{ nom, texte }] a plat.
-- ----------------------------------------------------------------------------
alter table listes_suivi
  add column inclure_rapport boolean not null default true;

alter table rapports
  add column suivi_snapshot jsonb;
