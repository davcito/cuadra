#!/usr/bin/env node
/**
 * Cruza `vueltas_cerca()` contra `chapar()`, Vuelta por Vuelta, sin dejar rastro.
 *
 * LO QUE COMPRUEBA, Y POR QUÉ ES ESTO Y NO OTRA COSA
 *
 * Las dos funciones aplican las mismas puertas —modo seguro, ventana horaria,
 * temporada— escritas en dos archivos distintos. Comparar los textos SQL no
 * probaría nada: pueden ser idénticos y aun así comportarse distinto, o
 * diferentes y equivalentes. Lo único que importa es el contrato de producto:
 *
 *   · Si `vueltas_cerca` la muestra, `chapar()` NO puede rechazarla por una
 *     puerta. Mandar a alguien a caminar quince cuadras y negarle la chapada al
 *     llegar es el peor defecto posible en una app que se trata de caminar.
 *   · Si `vueltas_cerca` la esconde, tiene que haber un motivo: `chapar()` debe
 *     rechazarla desde su propia ubicación. Esconder una Vuelta chapable es
 *     contenido pagado que nadie ve.
 *
 * Cada llamada se hace parado EXACTAMENTE sobre el POI, así que la distancia
 * sale 0 y `lejos` queda descartado: lo único que puede rechazar son las
 * puertas. Todo corre dentro de un `begin ... rollback`.
 *
 *   node scripts/probar-vueltas-cerca.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TMP = mkdtempSync(join(tmpdir(), "cerca-"));

function sql(query) {
  const f = join(TMP, "q.json");
  writeFileSync(f, JSON.stringify({ query }));
  const out = execFileSync("node", [join(RAIZ, "scripts", "mcp-supabase.mjs"), "call", "execute_sql", `@${f}`], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
  });
  const m = out.match(/\[.*\]/s);
  if (!m) throw new Error(out.slice(0, 500));
  return JSON.parse(m[0].replace(/\\"/g, '"'));
}

const [{ uid }] = sql("select id::text as uid from profiles limit 1");

// Los motivos que significan "una puerta la cerró". `lejos` no está: parados
// sobre el POI no puede salir. `ya_chapada` tampoco: la transacción revierte.
const PUERTAS = ["zona_no_habilitada", "fuera_de_ventana", "fuera_de_temporada", "vuelta_no_disponible"];

const filas = sql(`
begin;
  create temp table veredictos (mission_id bigint, listada boolean, motivo text, titulo text) on commit drop;

  -- Una foto sintética por Vuelta: sin ella las que piden foto rebotarían por
  -- 'falta_foto', que no es una puerta y ensuciaría la comparación.
  insert into storage.objects (bucket_id, name, owner_id, metadata)
  select 'chapas', '${uid}/' || m.id || '/cruce.jpg', '${uid}',
         '{"mimetype":"image/jpeg","size":250000}'::jsonb
    from missions m where m.estado = 'activa';

  -- Solo las claims, SIN cambiar de rol. auth.uid() lee de este GUC, no del rol
  -- de sesión, y tanto chapar() como vueltas_cerca() son SECURITY DEFINER: corren
  -- como su dueño pase lo que pase. Cambiar de rol acá no acercaba la prueba a la
  -- realidad y sí rompía la limpieza entre iteraciones — el borrado de
  -- checkin_intentos no veía las filas que chapar() había escrito como dueño,
  -- borraba cero, y no avisaba. De ahí salían los 48 sin probar.
  set local request.jwt.claims = '{"sub":"${uid}","role":"authenticated"}';

  do $cruce$
  declare r record; v jsonb; visible boolean;
  begin
    for r in
      select m.id, m.titulo, p.lat, p.lng
        from missions m join pois p on p.id = m.poi_id
       where m.estado = 'activa' and p.lat is not null
       order by m.id
    loop
      -- ¿La lista la muestra, parado justo encima?
      select exists (select 1 from public.vueltas_cerca(r.lat, r.lng, 500) vc where vc.id = r.id)
        into visible;
      -- ¿Qué dice el validador desde ese mismo punto?
      v := public.chapar(r.id, r.lat, r.lng, '${uid}/' || r.id || '/cruce.jpg', false, 10);
      insert into veredictos values (r.id, visible, coalesce(v->>'motivo', 'ok'), r.titulo);
      -- Se deshace la completion para que la siguiente Vuelta del mismo usuario
      -- no choque con la racha ni con nada acumulado.
      delete from mission_completions where user_id = '${uid}'::uuid and mission_id = r.id;
      -- Y se limpia el contador de intentos. chapar() corta al intento 21 en 10
      -- minutos, y este bucle hace 69 seguidos: sin esto el limitador se comía
      -- la prueba —48 de 69 Vueltas volvían 'demasiados_intentos', que no es ni
      -- "ok" ni una puerta, así que ninguna de las dos comprobaciones las
      -- miraba y el script daba verde habiendo medido menos de un tercio.
      delete from checkin_intentos where user_id = '${uid}'::uuid;
    end loop;
  end
  $cruce$;


  select mission_id, listada, motivo, titulo from veredictos order by mission_id;
rollback;`);

const vs = filas.filter((f) => f.mission_id !== undefined && f.mission_id !== null);

// Falla A: la app la ofrece y el servidor la rechaza por una puerta.
const mentiras = vs.filter((v) => v.listada && PUERTAS.includes(v.motivo));
// Falla B: el servidor la aceptaría y la app no la muestra.
const invisibles = vs.filter((v) => !v.listada && v.motivo === "ok");
// Falla C: ni "ok" ni una puerta. Esta Vuelta NO se probó, y sin esta línea el
// script la contaba como aprobada. Fue real: el limitador de intentos devolvía
// 'demasiados_intentos' en 48 de 69 y el resumen igual decía ✓. Un verde que
// tapa cobertura perdida es peor que un rojo.
const sinProbar = vs.filter((v) => v.motivo !== "ok" && !PUERTAS.includes(v.motivo));

console.log(`${vs.length} Vuelta(s) activa(s) cruzadas, cada una desde su propio POI\n`);

const porMotivo = {};
for (const v of vs) {
  const k = `${v.listada ? "listada" : "oculta "} · ${v.motivo}`;
  porMotivo[k] = (porMotivo[k] ?? 0) + 1;
}
for (const [k, n] of Object.entries(porMotivo).sort()) console.log(`  ${String(n).padStart(3)}  ${k}`);

if (mentiras.length) {
  console.log(`\n✗ ${mentiras.length} la app las OFRECE y chapar() las rechaza:`);
  for (const v of mentiras.slice(0, 10)) console.log(`     #${v.mission_id} ${v.motivo} — ${v.titulo}`);
}
if (invisibles.length) {
  console.log(`\n✗ ${invisibles.length} son chapables y la app NO las muestra:`);
  for (const v of invisibles.slice(0, 10)) console.log(`     #${v.mission_id} — ${v.titulo}`);
}

if (sinProbar.length) {
  console.log(`\n✗ ${sinProbar.length} NO se probaron (veredicto que no es ni "ok" ni una puerta):`);
  for (const v of sinProbar.slice(0, 10)) console.log(`     #${v.mission_id} ${v.motivo} — ${v.titulo}`);
}

const bien = mentiras.length === 0 && invisibles.length === 0 && sinProbar.length === 0;
console.log(
  bien
    ? `\n✓ la lista y el validador coinciden en las ${vs.length}`
    : "\n✗ la lista y el validador NO coinciden"
);
process.exit(bien ? 0 : 1);
