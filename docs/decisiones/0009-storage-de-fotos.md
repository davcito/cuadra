# 0009 — Las fotos de chapa viven en Supabase Storage, no en R2

**Fecha:** 2026-07-29 · **Estado:** aceptada

## Contexto

El stack congelado en `CLAUDE.md` dice **Cloudflare R2** para fotos, con URLs firmadas y subida
directa desde la app. La razón era buena y sigue siendo cierta: R2 no cobra egreso, y un producto
que muestra fotos en un Álbum va a servir muchas más veces de las que sube.

Al implementar `chapar()` aparece algo que la decisión original no podía ver, porque el
anti-fraude todavía no existía.

## El problema

La capa 1 del anti-fraude (documento maestro §7.6) es *"cámara in-app, sin galería"*. Pero el
servidor no ve la cámara: ve un `foto_url` que le manda el cliente. Y un cliente que quiere hacer
trampa manda el `foto_url` que quiera.

Para que la capa 1 sea real, el servidor tiene que poder responder tres preguntas **por su
cuenta**, sin creerle al cliente:

1. ¿Ese objeto existe de verdad?
2. ¿Lo subió **este** usuario?
3. ¿Lo subió **recién** — o está reciclando la foto de la semana pasada?

Con las fotos en R2, Postgres no puede responder ninguna. `chapar()` tendría que salir por la red
a consultar a Cloudflare desde dentro de una transacción —lento, frágil y con una llamada externa
que puede fallar a mitad de un check-in— o simplemente confiar. Confiar significa que
`foto_url` es una afirmación del cliente sin respaldo, y **la capa 1 se vuelve decorativa**.

## Decisión

**Las fotos de chapa van a Supabase Storage**, bucket privado `chapas`.

`storage.objects` es una tabla de Postgres, así que la verificación es una condición más dentro
de la misma transacción que valida el geofence:

```sql
exists (
  select 1 from storage.objects o
   where o.name = p_foto_url
     and o.bucket_id = 'chapas'
     and o.owner = v_user
     and o.created_at > now() - interval '15 minutes'
)
```

Tres preguntas, una condición, cero llamadas externas. **Ese es el motivo, y no es el costo.**

Convención de ruta: `<uid>/<archivo>`, con política que exige que el primer segmento sea el uid
de quien sube. `chapar()` igual revalida `owner`, pero sin la política el bucket sería un buzón
abierto donde cualquiera podría escribir en la carpeta de otro.

Sin `UPDATE`: una chapa no se edita. Permitir reemplazar el objeto dejaría cambiar la prueba
después del check-in, que es justo lo que la capa 1 tiene que impedir.

## Cuándo reevaluar

R2 no está descartado — está **pospuesto**, y esto es lo que lo trae de vuelta:

- **El egreso empieza a doler.** El Álbum sirve fotos cada vez que alguien lo abre. Cuando el
  costo de egreso de Storage supere lo que cuesta mantener las dos cosas, R2 gana.
- **El límite de Storage del plan queda corto.**

La salida no es "mover todo a R2": es **partir por rol**. La foto que `chapar()` verifica puede
quedarse en Storage (es chica, se lee una vez y su valor es ser verificable), y la copia que el
Álbum sirve puede vivir en R2 detrás de CDN. Perder de vista esa distinción —verificación vs.
distribución— es lo que haría que R2 rompa el anti-fraude.

## Consecuencias

**A favor**

- La capa 1 del anti-fraude pasa de ser una promesa a ser una condición SQL.
- Una dependencia externa menos en el camino crítico de un check-in.
- RLS y sesión de usuario ya funcionan; no hay que montar firma de URLs en el VPS para la demo.

**En contra**

- Egreso pago en un producto que, si funciona, va a servir muchas fotos. Es deuda conocida con
  disparador claro, no un olvido.
- `CLAUDE.md` dice R2 y ahora dice R2 con asterisco. Un stack "congelado" con excepciones se
  vuelve difícil de leer.

**Lo que NO resuelve**

- La foto se verifica como *reciente y del usuario*, no como *tomada en ese lugar*. Un teléfono
  rooteado puede falsear GPS y sacar una foto real de otra parte. Contra eso van las capas 3 y 4
  (mock-location y velocidad imposible), y por eso ninguna capa alcanza sola.
- No hay verificación de contenido: nadie mira todavía si la foto muestra lo que la instrucción
  pide. Eso es `3-verify-photos.ts`, que sigue siendo esqueleto.
