-- Chaque culte recurrent a desormais une heure de fin en plus de l'heure de
-- debut (ex. mardi 17h30-19h30), necessaire pour pre-remplir correctement le
-- formulaire "Nouveau culte" par type recurrent.
alter table cultes add column if not exists heure_fin time;
