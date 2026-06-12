# ADR-0001 — El check-in entra por RPC server-side, no por insert directo

**Fecha:** 2026-06-11 · **Estado:** aceptada · **Sesión:** 1 (fundaciones)

## Contexto

El documento maestro (§7.5) sugiere para RLS: "completions/user_cards: insert solo del propio usuario". Pero las reglas duras #4 y #5 (CLAUDE.md) exigen que el geofence < 75 m y la velocidad imposible **no se puedan debilitar**. Si el cliente inserta directo en `mission_completions`, la validación de distancia ocurre en el teléfono — y un cliente modificado puede mentir. El anti-fraude sería decorativo, y las visitas verificadas son justo lo que se factura al B2B (§5.3: "te lo demuestro con GPS").

## Decisión

`mission_completions`, `user_cards` y `streaks` **no tienen política de INSERT/UPDATE para el cliente**. El check-in se hará via una función RPC `chapar(mission_id, lat, lng, foto_url)` `security definer` (llega en la sesión del loop completable, semanas 5–6) que en el servidor:

1. Valida geofence con PostGIS (`ST_DWithin` ≤ 75 m contra el POI real).
2. Valida velocidad imposible contra el último check-in del usuario.
3. Inserta la completion, otorga la figurita, actualiza racha y Calle.
4. Devuelve el resultado ("¡Chapada!" o rechazo con motivo).

## Consecuencias

- (+) Las capas anti-fraude 2 y 4 son inviolables desde el cliente; la promesa B2B se sostiene.
- (+) Otorgar figurita + racha + XP es atómico (una transacción), sin estados a medias.
- (−) La RPC es un punto único que hay que testear bien (anon vs authenticated vs service_role).
- (·) El cliente calcula la distancia igualmente (radar UX), pero esa cifra es informativa, jamás autoritativa.
