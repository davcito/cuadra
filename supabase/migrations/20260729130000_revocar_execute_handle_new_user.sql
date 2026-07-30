-- Quitarle a public/anon/authenticated el EXECUTE sobre handle_new_user().
--
-- Lo marcó el linter de Supabase (`anon_security_definer_function_executable`)
-- y es correcto: la función es SECURITY DEFINER, o sea que corre con los
-- privilegios de quien la creó, y tenía EXECUTE concedido a todo el mundo.
--
-- POR QUÉ ES SEGURO SACARLO (verificado, no supuesto):
--   · `pg_get_function_result` devuelve `trigger`, y Postgres rechaza invocar
--     una función que devuelve trigger fuera de un trigger.
--   · Está enganchada a 1 trigger, y los triggers se ejecutan con los permisos
--     del dueño de la tabla — no consultan el EXECUTE del que dispara el INSERT.
-- O sea: el alta de usuarios sigue funcionando igual, y los permisos que se
-- revocan no habilitaban nada por esta vía. Son privilegios de más, y los
-- privilegios de más solo esperan a que alguien encuentre el camino.

revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
