-- Permet a un ouvrier de supprimer ses propres notifications (aucune
-- policy DELETE n'existait jusqu'ici). Complement au filtrage cote
-- application qui masque deja une notification de la liste une fois lue --
-- ceci ajoute un moyen explicite de l'effacer definitivement.

create policy notifications_delete on notifications for delete using (
  destinataire_id = fn_ouvrier_id_courant()
);
