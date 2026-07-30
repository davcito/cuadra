#!/usr/bin/env node
/**
 * Cliente MCP mínimo para el servidor de Supabase, por HTTP directo.
 *
 * POR QUÉ EXISTE: el servidor MCP quedó configurado y autenticado, pero las
 * herramientas de un servidor MCP se cargan en el manifiesto de la conversación
 * al arrancarla. Una conversación que ya estaba abierta no las ve, por más que
 * el servidor esté conectado — y reanudarla conserva el manifiesto viejo.
 *
 * El token OAuth, en cambio, ya está en disco: Claude Code lo guarda en
 * `~/.claude/.credentials.json` bajo `mcpOAuth.supabase|<hash>`. Con eso se puede
 * hablar el protocolo MCP (JSON-RPC sobre HTTP) sin intermediario.
 *
 *   node scripts/mcp-supabase.mjs tools                 # qué se puede hacer
 *   node scripts/mcp-supabase.mjs call <tool> '<json>'  # ejecutar una
 *
 * El token NUNCA se imprime.
 */

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function credencial() {
  const ruta = join(homedir(), ".claude", ".credentials.json");
  let cred;
  try {
    cred = JSON.parse(readFileSync(ruta, "utf8"));
  } catch (e) {
    throw new Error(`No pude leer ${ruta}: ${e.message}`);
  }
  const entrada = Object.entries(cred.mcpOAuth ?? {}).find(([k]) => k.startsWith("supabase|"));
  if (!entrada) throw new Error("No hay credencial OAuth de supabase. Corré /mcp y autenticá.");
  const [, v] = entrada;
  if (v.expiresAt && Date.now() > v.expiresAt) {
    throw new Error(`El token de supabase venció (${new Date(v.expiresAt).toISOString()}). Reautenticá con /mcp.`);
  }
  return { token: v.accessToken, url: v.serverUrl };
}

const { token, url } = credencial();

let sesion = null;
let seq = 0;

async function rpc(method, params) {
  const cabeceras = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    Authorization: `Bearer ${token}`,
  };
  if (sesion) cabeceras["Mcp-Session-Id"] = sesion;

  const r = await fetch(url, {
    method: "POST",
    headers: cabeceras,
    body: JSON.stringify({ jsonrpc: "2.0", id: ++seq, method, params }),
  });

  const sid = r.headers.get("mcp-session-id");
  if (sid) sesion = sid;

  const crudo = await r.text();
  if (!r.ok) throw new Error(`HTTP ${r.status}: ${crudo.slice(0, 400)}`);
  if (!crudo.trim()) return null; // notificaciones no devuelven cuerpo

  // El transporte HTTP puede responder JSON plano o SSE (`data: {...}`).
  const cuerpo = crudo.includes("data:")
    ? crudo.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("")
    : crudo;

  const j = JSON.parse(cuerpo);
  if (j.error) throw new Error(`${j.error.code}: ${j.error.message}`);
  return j.result;
}

async function conectar() {
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "cuadra-cli", version: "1.0.0" },
  });
  // El handshake exige la notificación; sin ella el servidor rechaza los calls.
  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
      ...(sesion ? { "Mcp-Session-Id": sesion } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });
}

const [accion, ...resto] = process.argv.slice(2);
await conectar();

if (accion === "tools" || !accion) {
  const { tools } = await rpc("tools/list", {});
  console.log(`${tools.length} herramientas:\n`);
  for (const t of tools) {
    const req = t.inputSchema?.required ?? [];
    console.log(`  ${t.name}${req.length ? `(${req.join(", ")})` : "()"}`);
    if (t.description) console.log(`      ${t.description.split("\n")[0].slice(0, 110)}`);
  }
} else if (accion === "call") {
  const [nombre, argsJson] = resto;
  if (!nombre) throw new Error("Uso: call <tool> '<json>' | call <tool> @archivo.json");
  // `@archivo` evita pelear con el escapado de SQL en la shell: comillas simples,
  // dobles, `$` y saltos de línea pasan intactos.
  const bruto = argsJson?.startsWith("@") ? readFileSync(argsJson.slice(1), "utf8") : (argsJson ?? "{}");
  const res = await rpc("tools/call", { name: nombre, arguments: JSON.parse(bruto) });
  for (const c of res.content ?? []) console.log(c.type === "text" ? c.text : JSON.stringify(c));
  if (res.isError) process.exit(1);
} else {
  throw new Error(`Acción desconocida: ${accion}. Usá "tools" o "call".`);
}
