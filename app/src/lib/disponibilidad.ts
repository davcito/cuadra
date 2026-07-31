/** Horario diurno exacto que usan `vueltas_cerca()` y `chapar()` en Supabase. */
export function horaEnLima(fecha = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(fecha)
  );
}

export function esModoSeguroNocturno(fecha = new Date()): boolean {
  const hora = horaEnLima(fecha);
  return hora < 6 || hora >= 18;
}
