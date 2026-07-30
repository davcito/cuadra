/**
 * Los distritos que el pipeline sabe sincronizar, con su caja envolvente.
 *
 * Está en un archivo aparte y como DATO a propósito: sumar un distrito tiene que
 * ser agregar cuatro números, no tocar el pipeline. Cuando Cuadra salga de
 * Barranco, esto es lo único que cambia.
 *
 * Las cajas salen de los límites administrativos de OSM, redondeadas HACIA AFUERA
 * (un POI de más se cura; uno de menos no existe). Se verifican mirando el
 * distrito en https://www.openstreetmap.org y leyendo las esquinas.
 */

export type Distrito = {
  /** Clave para --distrito. Minúscula, sin tildes ni espacios. */
  clave: string;
  /** Como se escribe en `cells.distrito`. Es lo que ve el jugador. */
  nombre: string;
  ciudad: string;
  pais: string;
  /** [sur, oeste, norte, este] — el orden que pide Overpass. */
  caja: readonly [number, number, number, number];
};

export const DISTRITOS: readonly Distrito[] = [
  {
    clave: "barranco",
    nombre: "Barranco",
    ciudad: "Lima",
    pais: "PE",
    // Barranco es chico (3,33 km²): del Malecón al este hasta la Vía Expresa, y
    // de la quebrada de Armendáriz al sur hasta el límite con Chorrillos.
    caja: [-12.1585, -77.0295, -12.1345, -77.0085],
  },
  {
    clave: "morales-duarez",
    nombre: "Cercado de Lima",
    ciudad: "Lima",
    pais: "PE",
    // NO es todo Cercado de Lima: es el corredor de la Av. Morales Duárez, a lo
    // largo del Rímac. Se agrega para poder probar el check-in caminando de
    // verdad, sin viajar a Barranco — probar el geofence con datos reales pero
    // lejos del lugar es probar la mitad.
    //
    // La caja cubre los cuatro tramos que devuelve el geocodificador para esa
    // avenida (lng -77.054 a -77.077), con margen para las cuadras vecinas.
    // Cuando haga falta el distrito entero, esto se reemplaza por su límite
    // administrativo real y cambia el nombre de la clave.
    caja: [-12.045, -77.085, -12.028, -77.048],
  },
] as const;

export function buscarDistrito(clave: string): Distrito | undefined {
  return DISTRITOS.find((d) => d.clave === clave.toLowerCase());
}

export function clavesDeDistritos(): string {
  return DISTRITOS.map((d) => d.clave).join(", ");
}
