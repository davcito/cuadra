-- ============================================================
-- El jugador no se escribe su propia Calle
--
-- La migración anterior intentó `revoke update (calle_xp, rango, ...)` y NO
-- cerró nada, sin dar error. El motivo: el privilegio estaba concedido a nivel
-- TABLA, y Postgres no permite restar columnas de un grant de tabla — el revoke
-- por columnas solo aplica si el grant también fue por columnas. Verificado en
-- `information_schema.table_privileges`: una fila `UPDATE` de tabla para `anon`
-- y otra para `authenticated`.
--
-- La forma que sí funciona es revocar la tabla y volver a conceder columna por
-- columna. Se anota porque el modo de falla es traicionero: el SQL corre, la
-- migración dice `success`, y el agujero sigue abierto.
-- ============================================================

-- Qué había en juego: con la política `auth.uid() = id` (que filtra FILAS, no
-- columnas), un `PATCH /rest/v1/profiles` con `{"calle_xp": 999999, "rango":
-- "leyenda_del_barrio"}` devolvía 204. Toda la aritmética de `chapar()` era
-- decorativa, y como la política de SELECT de `profiles` es `using (true)`, ese
-- número inflado además salía en rankings y alcaldías.
revoke update on public.profiles from anon, authenticated;

-- Solo lo que de verdad le pertenece editar al usuario.
grant update (username, display_name, avatar_url, distrito_casa)
  on public.profiles to authenticated;

-- `anon` no edita perfiles, punto. No tiene sesión: no hay perfil que sea suyo.
-- Lo tenía por el default privilege de Supabase, no por una decisión.

-- Del mismo default vienen estos, que tampoco corresponden: nadie borra ni
-- vacía la tabla de perfiles desde el cliente. Hoy los tapa RLS, pero un
-- privilegio que solo está tapado por una política es un privilegio esperando
-- a que alguien afloje la política.
revoke delete, truncate on public.profiles from anon, authenticated;
revoke insert on public.profiles from anon, authenticated;

-- El alta la hace el trigger `handle_new_user` (security definer), no el
-- cliente, así que sacarle INSERT no rompe el registro.
