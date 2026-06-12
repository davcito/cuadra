/**
 * Contrato de salida del generador de Vueltas (documento maestro §7.3).
 * Regla dura #1: la IA nunca inventa lugares — toda vuelta referencia un
 * poi_id que DEBE existir en el lote de POIs enviado en el prompt.
 * Si el JSON no cumple el schema: descartar y reintentar, nunca insertar parcial.
 */
import { z } from "zod";

export const TIPOS_VUELTA = ["observacion", "consumo", "social", "patrimonio"] as const;
export const CATEGORIAS = ["huarique", "caleta", "huaca", "casero"] as const;
export const VENTANAS = ["mañana", "tarde", "noche"] as const;

export const VueltaSchema = z
  .object({
    poi_id: z.number().int().positive(),
    titulo: z.string().min(1).max(60),
    descripcion: z.string().min(1).max(280),
    tipo: z.enum(TIPOS_VUELTA),
    categoria: z.enum(CATEGORIAS),
    dificultad: z.number().int().min(1).max(3),
    calle_xp: z.number().int().positive(),
    ventana_horaria: z.array(z.enum(VENTANAS)).nonempty(),
    requiere_foto: z.boolean(),
    instruccion_verificacion: z.string().min(1),
  })
  .strict();

export const LoteVueltasSchema = z.array(VueltaSchema);

export type Vuelta = z.infer<typeof VueltaSchema>;

/**
 * Valida el lote completo Y la regla anti-alucinación: cada poi_id debe
 * pertenecer al conjunto de POIs reales que se le dio al modelo.
 * Devuelve el lote válido o lanza con el detalle (el caller reintenta).
 */
export function validarLoteVueltas(json: unknown, poiIdsReales: Set<number>): Vuelta[] {
  const lote = LoteVueltasSchema.parse(json);
  const inventados = lote.filter((v) => !poiIdsReales.has(v.poi_id));
  if (inventados.length > 0) {
    throw new Error(
      `La IA referenció ${inventados.length} poi_id inexistentes: ` +
        inventados.map((v) => `${v.poi_id} ("${v.titulo}")`).join(", ")
    );
  }
  return lote;
}
