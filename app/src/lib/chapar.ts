/**
 * Chapar: subir la foto y pedirle el veredicto al servidor.
 *
 * El cliente NO decide nada (ADR-0001). Mide, sube, pregunta y muestra la
 * respuesta. El geofence que ves en pantalla es informativo: el que manda es el
 * que corre dentro de `chapar()`, sobre la ubicación que este archivo declara.
 *
 * LA RUTA DE LA FOTO ES PARTE DEL CONTRATO, no un detalle: `chapar()` exige
 * `<uid>/<mission_id>/<archivo>` y valida los dos primeros segmentos. Es lo que
 * ata la foto a esta Vuelta — sin eso, una sola subida servía para chapar todas.
 */

import * as Location from "expo-location";

import { MODO_PRUEBA_VUELTAS } from "@/lib/modo-prueba";
import { supabase } from "@/lib/supabase";

/** Radio del geofence, en metros. Igual que el del servidor (regla dura #5). */
export const GEOFENCE_M = 75;

/** Peso mínimo aceptado por el servidor. Una foto más chica no es una foto. */
const MINIMO_BYTES = 50_000;
const MAXIMO_BYTES = 8_388_608;

export type VeredictoOk = {
  ok: true;
  distancia_m: number;
  calle_xp: number;
  calle_total: number;
  racha: number;
  figurita_id: number | null;
  en_revision: boolean;
};

export type VeredictoNo = {
  ok: false;
  motivo: string;
  mensaje: string;
  distancia_m?: number;
  ventanas?: string[];
};

export type Veredicto = VeredictoOk | VeredictoNo;

/** Un fallo del lado del cliente, con la misma forma que un rechazo del servidor. */
function falla(motivo: string, mensaje: string): VeredictoNo {
  return { ok: false, motivo, mensaje };
}

export type Ubicacion = {
  lat: number;
  lng: number;
  /** Radio de error del GPS en metros. Va al servidor para poder calibrar después. */
  precision: number | null;
  /** Android reporta si la posición viene de una app de ubicación falsa. */
  simulada: boolean;
};

const TIMEOUT_UBICACION_MS = 12_000;

async function conTimeout<T>(promesa: Promise<T>, ms: number): Promise<T> {
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promesa,
      new Promise<never>((_, rechazar) => {
        temporizador = setTimeout(
          () => rechazar(new Error("La ubicación tardó demasiado.")),
          ms
        );
      }),
    ]);
  } finally {
    if (temporizador) clearTimeout(temporizador);
  }
}

/**
 * Posición actual, con lo que hace falta para el anti-fraude.
 *
 * `BestForNavigation` y no `Balanced`: la diferencia entre 40 m y 80 m de error
 * decide si alguien parado en la puerta entra o no en el geofence, y un rechazo
 * por precisión mala se lee como "la app está rota".
 */
export async function ubicacionActual({ pedir = false } = {}): Promise<Ubicacion | null> {
  // `getForegroundPermissionsAsync` solo CONSULTA; no pide nada. La primera
  // versión de esto solo consultaba, así que en un equipo sin permiso concedido
  // devolvía null en cada intento y la pantalla se quedaba en "Buscando dónde
  // estás…" para siempre: sin error, sin log, sin forma de notarlo leyendo el
  // código. Pedir va detrás de una bandera porque el diálogo del sistema no
  // puede aparecer desde un poll de fondo — lo dispara la pantalla, una vez.
  let permiso = await Location.getForegroundPermissionsAsync();
  if (!permiso.granted && pedir && permiso.canAskAgain) {
    permiso = await Location.requestForegroundPermissionsAsync();
  }
  if (!permiso.granted) return null;

  // iOS puede tardar indefinidamente buscando una lectura nueva con precisión
  // de navegación (sobre todo bajo techo). Una UI no puede quedar congelada
  // por eso: damos 12 s y, si existe, usamos una lectura reciente y razonable.
  const ultima = await Location.getLastKnownPositionAsync({
    maxAge: 60_000,
    requiredAccuracy: 200,
  }).catch(() => null);

  let p: Location.LocationObject;
  try {
    p = await conTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      }),
      TIMEOUT_UBICACION_MS
    );
  } catch {
    if (!ultima) {
      throw new Error("No pudimos fijar tu ubicación. Revisá el GPS e intentá de nuevo.");
    }
    p = ultima;
  }

  return {
    lat: p.coords.latitude,
    lng: p.coords.longitude,
    precision: p.coords.accuracy ?? null,
    // `mocked` solo existe en Android; en iOS no hay forma de saberlo desde la
    // app, así que allá esta capa la cubren el geofence y la velocidad.
    simulada: p.mocked === true,
  };
}

/**
 * Sube la foto al bucket `chapas` y devuelve su ruta.
 *
 * Se lee el archivo como ArrayBuffer en vez de mandar el `uri`: el cliente de
 * Supabase necesita bytes, y pasarle un objeto `{uri}` sube un JSON de 200 bytes
 * que después el servidor rechaza por peso — con un mensaje que se lee como
 * fraude en vez de como bug de subida.
 */
async function subirFoto(uri: string, misionId: number, uid: string): Promise<string> {
  const respuesta = await fetch(uri);
  const bytes = await respuesta.arrayBuffer();

  if (bytes.byteLength < MINIMO_BYTES) {
    throw new Error(`La foto salió demasiado chica (${Math.round(bytes.byteLength / 1024)} KB).`);
  }
  if (bytes.byteLength > MAXIMO_BYTES) {
    throw new Error("La foto pesa demasiado. Probá de nuevo.");
  }

  // `<uid>/<mission_id>/<archivo>`: los dos primeros segmentos los valida el
  // servidor. El timestamp evita pisar una foto anterior del mismo intento.
  const ruta = `${uid}/${misionId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage.from("chapas").upload(ruta, bytes, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`No pudimos subir la foto: ${error.message}`);

  return ruta;
}

/**
 * El check-in completo: ubicación, foto y veredicto.
 *
 * Devuelve SIEMPRE un veredicto con motivo — nunca lanza. La pantalla solo tiene
 * que mostrar `mensaje`, y los motivos existen para que pueda decidir qué hacer
 * después (reintentar, volver, o mandar al Álbum).
 */
export async function chapar(
  misionId: number,
  fotoUri: string | null,
  opciones: { simular?: boolean; calleXp?: number } = {}
): Promise<Veredicto> {
  // Desarrollo: prueba todo el flujo visual sin subir la foto, llamar la RPC
  // ni escribir completaciones. Solo se habilita con la bandera local ignorada
  // por Git; una build normal nunca entra acá.
  if (opciones.simular && MODO_PRUEBA_VUELTAS) {
    const calle = opciones.calleXp ?? 25;
    return {
      ok: true,
      distancia_m: 0,
      calle_xp: calle,
      calle_total: calle,
      racha: 1,
      figurita_id: null,
      en_revision: false,
    };
  }

  const { data: sesion } = await supabase.auth.getSession();
  const uid = sesion.session?.user.id;
  if (!uid) return falla("sin_sesion", "Tenés que iniciar sesión para chapar.");

  let donde: Ubicacion | null;
  try {
    donde = await ubicacionActual();
  } catch {
    return falla("sin_ubicacion", "No pudimos leer tu ubicación. Revisá el GPS.");
  }
  if (!donde) return falla("sin_permiso_ubicacion", "Necesitamos tu ubicación para chapar.");

  let rutaFoto: string | null = null;
  if (fotoUri) {
    try {
      rutaFoto = await subirFoto(fotoUri, misionId, uid);
    } catch (e) {
      return falla("subida_fallida", e instanceof Error ? e.message : "No pudimos subir la foto.");
    }
  }

  const { data, error } = await supabase.rpc("chapar", {
    p_mission_id: misionId,
    p_lat: donde.lat,
    p_lng: donde.lng,
    p_foto_path: rutaFoto,
    p_mock_location: donde.simulada,
    p_precision_m: donde.precision,
  });

  if (error) return falla("error_red", "No pudimos completar la chapada. Probá de nuevo.");
  return data as Veredicto;
}
