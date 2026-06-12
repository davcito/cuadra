/**
 * Valida la conexión app→DB y que las políticas RLS hacen lo que deben
 * (documento maestro §12.3.5: testear las reglas RLS con la anon key).
 *
 * Usa SOLO la anon key (pública) leída de app/.env via PostgREST.
 * No requiere dependencias: fetch nativo de Node. No imprime la key.
 *
 * Uso:  node scripts/validar-rls.mjs
 */
import { readFileSync } from "node:fs";

// --- leer app/.env sin dependencias ---
const env = Object.fromEntries(
  readFileSync(new URL("../app/.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const URL_BASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_BASE || !ANON) {
  console.error("Faltan EXPO_PUBLIC_SUPABASE_URL / ANON_KEY en app/.env");
  process.exit(1);
}

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const rest = (path, init) => fetch(`${URL_BASE}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) } });

let fallos = 0;
const ok = (cond, msg, extra = "") => {
  console.log(`  ${cond ? "✅" : "❌"} ${msg}${extra ? `  — ${extra}` : ""}`);
  if (!cond) fallos++;
};

console.log(`\n🔌 Conectando a ${URL_BASE} (rol anon)\n`);

// 1. La app SÍ lee celdas (RLS select público)
{
  const r = await rest("cells?select=h3_index");
  const filas = r.ok ? await r.json() : [];
  ok(r.ok && filas.length === 37, "anon LEE las 37 celdas de Barranco", `${filas.length} filas, HTTP ${r.status}`);
}

// 2. La app SÍ lee POIs activos
{
  const r = await rest("pois?select=id,nombre&activo=eq.true");
  const filas = r.ok ? await r.json() : [];
  ok(r.ok && filas.length >= 3, "anon LEE los POIs activos", `${filas.length} filas`);
}

// 3. La app SÍ lee vueltas activas (estado='activa')
{
  const r = await rest("missions?select=id,titulo");
  const filas = r.ok ? await r.json() : [];
  ok(r.ok && filas.length >= 3, "anon LEE las vueltas activas", `${filas.length} filas`);
}

// 4. La app NO ve negocios B2B (tabla SIN policy de select = invisible)
{
  const r = await rest("businesses?select=id");
  const filas = r.ok ? await r.json() : null;
  ok(r.ok && Array.isArray(filas) && filas.length === 0, "anon NO ve businesses (datos de contacto B2B protegidos)", `HTTP ${r.status}, ${Array.isArray(filas) ? filas.length : "?"} filas`);
}

// 5. La app NO puede insertar check-ins directos (ADR-0001: solo via RPC)
{
  const r = await rest("mission_completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: "00000000-0000-0000-0000-000000000000",
      mission_id: 1,
      ubicacion_checkin: "POINT(-77.02 -12.14)",
    }),
  });
  ok(r.status === 401 || r.status === 403, "anon NO puede insertar check-ins directos (RLS los bloquea)", `HTTP ${r.status} (esperado 401/403)`);
}

// 6. La app NO puede escribir celdas (escritura solo service_role)
{
  const r = await rest("cells", {
    method: "POST",
    headers: { "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify({ h3_index: "test_hack", distrito: "X" }),
  });
  ok(r.status === 401 || r.status === 403, "anon NO puede escribir celdas (contenido solo service_role)", `HTTP ${r.status} (esperado 401/403)`);
}

console.log(`\n${fallos === 0 ? "🟢 TODO OK" : `🔴 ${fallos} FALLO(S)`} — conexión app→DB y RLS verificados\n`);
process.exit(fallos === 0 ? 0 : 1);
