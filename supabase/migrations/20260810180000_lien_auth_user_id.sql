-- ----------------------------------------------------------------------------
-- Lien automatique ouvriers.auth_user_id <-> auth.users
--
-- Jusqu'ici rien ne reliait la fiche ouvrier au compte Auth cree par
-- l'invitation (admin.auth.admin.inviteUserByEmail) : auth_user_id restait
-- NULL indefiniment, ce qui faisait echouer /mon-espace (redirect vers
-- /api/auth/signout, donc retour immediat a /connexion) pour tout ouvrier
-- invite. Ce trigger lie automatiquement les deux par email des que le
-- compte Auth est cree, avant meme que le mot de passe soit defini.
-- ----------------------------------------------------------------------------
create or replace function fn_lier_auth_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update ouvriers
  set auth_user_id = new.id
  where email = new.email
    and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function fn_lier_auth_user_id();

-- Rattrapage : lier retroactivement les comptes deja invites mais jamais lies.
update ouvriers o
set auth_user_id = u.id
from auth.users u
where o.auth_user_id is null
  and o.email = u.email;
