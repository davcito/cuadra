/**
 * SISTEMA DE CARA DE CALATO
 * =========================
 *
 * Problema que resuelve: el modelo generado automáticamente NO tiene huesos
 * faciales, y su despliegue UV reparte un solo ojo en 15 islas desperdigadas
 * por la textura — así que la expresión no se puede cambiar ni animando huesos
 * ni pintando el mapa. Los dos caminos obvios están cerrados y está medido.
 *
 * Salida: dos planos pequeños **hijos del hueso de la cabeza**, uno por ojo.
 * Al ser parte de la escena 3D rotan, se escalan y se ocultan con la cabeza
 * solos — no hay que perseguirlos en 2D cuadro por cuadro.
 *
 * Truco que simplifica todo: **por defecto están ocultos**. Los ojos horneados
 * del modelo ya están abiertos, así que sólo hace falta TAPARLOS en el momento
 * del parpadeo. No hay que replicar el ojo abierto ni borrar nada de la textura.
 *
 * Uso:
 *   import { montarCara } from './cara.js';
 *   const cara = montarCara(THREE, malla);     // devuelve la API
 *   cara.expresion('cerrados');                // tapa los ojos
 *   cara.expresion(null);                      // vuelve a los ojos del modelo
 *   cara.parpadeoEn(t, duracion);              // ¿toca parpadear en el segundo t?
 *   cara.calibrar({ ancho: 6 });               // ajuste fino en vivo
 *
 * Las medidas NO son a ojo: salen de lanzar un rayo a cada ojo del modelo y
 * convertir el punto al espacio local del hueso `Head`.
 */

export const CALIBRACION = {
  hueso: "Head",
  /**
   * Centro de cada ojo en el espacio LOCAL del hueso de la cabeza.
   * MEDIDO, no estimado: se renderiza la cabeza, se detectan los píxeles de
   * esclera en la imagen para sacar el centro exacto en pantalla, y se lanza
   * un rayo a ESE punto. La primera vez usé coordenadas de pantalla a ojo y
   * los planos quedaron 8 px corridos.
   */
  ojos: {
    izq: [-5.6892, 17.5989, -6.6298],
    der: [6.5592, 17.3523, -6.3169],
  },
  /**
   * Hacia dónde mira la cara, en coordenadas del MUNDO (el personaje mira a +Z).
   * OJO: no sirve usar un eje local del hueso — los huesos apuntan a lo largo de
   * su longitud, así que su -Z es "hacia arriba de la cabeza", no "hacia la cara".
   * Usar el eje del hueso metía los planos dentro de la frente.
   */
  frenteMundo: [0, 0, 1],
  /**
   * Tamaño del plano, en unidades locales del hueso (1 unidad ≈ 1 cm).
   * El ojo mide 84 × 55 px en pantalla a esta distancia; el plano va algo más
   * grande para tapar pestañas y el filo del párpado.
   */
  ancho: 5.4,
  alto: 8.6,
  /** Cuánto se despega el plano de la piel, para que no se pelee con la malla. */
  adelanto: 1.3,
  /** Color de la piel alrededor del ojo (muestreado de la textura del modelo). */
  piel: "#5A2B2B",
  /** Trazo del párpado. */
  trazo: "#3A1E1B",
};

/** Dibuja el párpado cerrado en un canvas. Sin arte externo: se genera acá. */
function texturaCerrado(THREE, cal) {
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d");

  // Óvalo de piel que tapa el ojo horneado, con borde difuminado para que
  // no se note el canto del plano contra la piel del modelo.
  const grad = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S * 0.5);
  grad.addColorStop(0, cal.piel);
  grad.addColorStop(0.72, cal.piel);
  grad.addColorStop(1, cal.piel + "00");
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(S / 2, S / 2, S * 0.5, S * 0.5, 0, 0, Math.PI * 2);
  g.fill();

  // Línea del párpado: un arco suave, no una recta. Un ojo cerrado de dibujo
  // es una curva con la panza hacia abajo.
  g.strokeStyle = cal.trazo;
  g.lineCap = "round";
  g.lineWidth = S * 0.075;
  g.beginPath();
  g.moveTo(S * 0.26, S * 0.47);
  g.quadraticCurveTo(S * 0.5, S * 0.64, S * 0.74, S * 0.47);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function montarCara(THREE, malla, opciones = {}) {
  const cal = { ...CALIBRACION, ...opciones };
  const cabeza = malla.skeleton.bones.find((b) => b.name === cal.hueso);
  if (!cabeza) throw new Error(`No encontré el hueso "${cal.hueso}"`);

  const texturas = { cerrados: texturaCerrado(THREE, cal) };
  const planos = {};

  /** "Hacia afuera de la cara", traducido del mundo al espacio del hueso. */
  function frenteLocal() {
    cabeza.updateWorldMatrix(true, false);
    const rot = new THREE.Matrix3().setFromMatrix4(cabeza.matrixWorld).invert();
    return new THREE.Vector3(...cal.frenteMundo).applyMatrix3(rot).normalize();
  }

  /** Coloca y orienta un plano sobre el ojo, mirando hacia afuera de la cara. */
  function ubicar(plano, p) {
    const f = frenteLocal();
    plano.position.set(
      p[0] + f.x * cal.adelanto,
      p[1] + f.y * cal.adelanto,
      p[2] + f.z * cal.adelanto
    );
    plano.lookAt(
      plano.position.x + f.x * 100,
      plano.position.y + f.y * 100,
      plano.position.z + f.z * 100
    );
  }

  for (const [lado, p] of Object.entries(cal.ojos)) {
    const mat = new THREE.MeshStandardMaterial({
      map: texturas.cerrados,
      transparent: true,
      roughness: 0.85,
      // Se dibuja pegado a la piel: sin esto pelea con la malla y titila.
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
    });
    const plano = new THREE.Mesh(new THREE.PlaneGeometry(cal.ancho, cal.alto), mat);
    cabeza.add(plano);          // primero al hueso: `ubicar` necesita su matriz
    ubicar(plano, p);
    plano.renderOrder = 10;
    plano.visible = false; // por defecto se ven los ojos del modelo
    plano.name = `cara_ojo_${lado}`;
    planos[lado] = plano;
  }

  const api = {
    cal,
    planos,
    /** null = ojos del modelo (abiertos). 'cerrados' = tapados. */
    expresion(nombre) {
      const visible = nombre === "cerrados";
      Object.values(planos).forEach((p) => {
        p.visible = visible;
        if (visible && texturas[nombre]) p.material.map = texturas[nombre];
      });
      return nombre;
    },
    /**
     * Devuelve true si en el segundo `t` toca tener los ojos cerrados.
     * Un parpadeo humano dura ~120 ms y ocurre cada 3–5 s. Acá se puede
     * pedir a ritmo fijo para que sea reproducible entre renders.
     */
    parpadeoEn(t, cada = 2.6, duracion = 0.14, desfase = 0.9) {
      const fase = (t - desfase) % cada;
      return fase >= 0 && fase < duracion;
    },
    /** Ajuste fino en vivo, sin recargar: cara.calibrar({ ancho: 6.2 }) */
    calibrar(cambios) {
      Object.assign(cal, cambios);
      for (const [lado, p] of Object.entries(cal.ojos)) {
        const plano = planos[lado];
        plano.geometry.dispose();
        plano.geometry = new THREE.PlaneGeometry(cal.ancho, cal.alto);
        ubicar(plano, p);
      }
      if (cambios.piel || cambios.trazo) {
        texturas.cerrados = texturaCerrado(THREE, cal);
        Object.values(planos).forEach((p) => (p.material.map = texturas.cerrados));
      }
      Object.values(planos).forEach((p) => (p.material.needsUpdate = true));
      return cal;
    },
  };

  return api;
}
