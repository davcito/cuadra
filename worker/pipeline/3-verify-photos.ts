/**
 * Pipeline paso 3 — Verificación visual por muestreo (anti-fraude capa 5).
 * Corre diario en el VPS (cron). Documento maestro §7.6.
 *
 * Política: muestreo 10% de check-ins + 100% en figuritas raras/temporada
 * y en TODO lo que toque B2B (visitas facturables = verificación reforzada).
 *
 * Uso:  npm run verify-photos -- [--dry-run]
 *
 * ESTADO: stub (sesión 1). Implementación llega con el loop completable
 * (cuando existan fotos reales en R2).
 */
console.log("[verify-photos] stub — pendiente de implementar");
console.log("  1. Seleccionar completions verificacion='auto' (10% + 100% raras/B2B).");
console.log("  2. Bajar foto de R2 (URL firmada) + instruccion_verificacion de la mission.");
console.log("  3. Claude visión: ¿la foto cumple la instrucción? -> ia_ok | ia_rechazada.");
console.log("  4. Marcar sospecha_fraude si corresponde; actualizar verificacion.");
process.exit(0);
