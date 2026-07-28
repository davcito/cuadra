/**
 * HTML de Calato en 3D: three.js dentro de una WebView.
 *
 * Sigue el mismo patrón que el mapa (ADR-0004): en vez de traer un módulo
 * nativo nuevo, corremos la librería web dentro de `react-native-webview`.
 * Ventaja concreta: es el MISMO motor que `scripts/inspector/index.html`, así
 * que lo que medimos en la computadora es lo que corre en el teléfono.
 *
 * Contrato:
 *   RN → escena:  window.setAmortiguacion(0..1)   suaviza cadera/columna
 *                 window.setFondo('papel'|'transparente')
 *                 window.setClip(indice)
 *   escena → RN:  postMessage({type:'listo', triangulos, huesos, clips})
 *                 postMessage({type:'fps', fps, min, dibujadas})  cada 1 s
 */

const THREE_VER = "0.169.0";

/** Huesos cuya rotación amplifica el mocap humano en un personaje de patas cortas. */
const HUESOS_TRONCO = ["Hips", "Spine", "Spine01", "Spine02"];

export function calato3dHtml(urlGlb: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#FBF7F0; }
  canvas { display:block; }
</style>
</head>
<body>
<script type="importmap">
{"imports":{
  "three":"https://unpkg.com/three@${THREE_VER}/build/three.module.js",
  "three/addons/":"https://unpkg.com/three@${THREE_VER}/examples/jsm/"
}}
</script>
<script type="module">
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const HUESOS_TRONCO = ${JSON.stringify(HUESOS_TRONCO)};
const avisar = (o) => window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(o));

const escena = new THREE.Scene();
escena.background = new THREE.Color(0xFBF7F0);

const camara = new THREE.PerspectiveCamera(32, innerWidth/innerHeight, 0.01, 50);
const render = new THREE.WebGLRenderer({ antialias:true, alpha:true });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
render.setSize(innerWidth, innerHeight);
render.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(render.domElement);

escena.add(new THREE.HemisphereLight(0xffffff, 0x8a7e6e, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 1.5); key.position.set(2,3,4); escena.add(key);
const fill = new THREE.DirectionalLight(0xffffff, .6); fill.position.set(-3,1,2); escena.add(fill);

let mezclador=null, clipsOrig=[], clipsSuaves=[], accion=null, indiceClip=0, amortiguacion=0;
let centroModelo=null, tamModelo=null;

/**
 * Encuadra el modelo COMPLETO. Hay que considerar el alto y el ancho por
 * separado: en una pantalla vertical y angosta, encuadrar solo por el radio
 * deja al personaje saliéndose por los costados.
 */
function encuadrar() {
  if (!centroModelo) return;
  const fov = camara.fov * Math.PI/180;
  const distAlto  = (tamModelo.y/2) / Math.tan(fov/2);
  const distAncho = (tamModelo.x/2) / Math.tan(fov/2) / camara.aspect;
  const dist = Math.max(distAlto, distAncho) * 1.45;   // 45% de aire alrededor
  camara.position.set(centroModelo.x, centroModelo.y, centroModelo.z + dist);
  camara.lookAt(centroModelo);
}
window.encuadrar = encuadrar;

/**
 * Suaviza las pistas de cadera/columna hacia su primer fotograma.
 * Los 678 clips son captura HUMANA; en un personaje de patas cortas la
 * rotación de cadera se amplifica y el cuerpo se tumba (medido: de -3.3° a
 * +40.8° en el pico del saludo). Esto la reduce sin tocar brazos ni cabeza.
 */
function suavizar(clip, factor) {
  const c = clip.clone();
  c.tracks.forEach((t) => {
    const hueso = t.name.substring(0, t.name.lastIndexOf("."));
    if (!HUESOS_TRONCO.some((n) => hueso.endsWith(n))) return;
    if (t.name.endsWith(".quaternion")) {
      const q0 = new THREE.Quaternion().fromArray(t.values, 0);
      for (let i=0; i<t.values.length; i+=4) {
        const qi = new THREE.Quaternion().fromArray(t.values, i);
        q0.clone().slerp(qi, 1-factor).toArray(t.values, i);
      }
    } else if (t.name.endsWith(".position")) {
      const p0 = [t.values[0], t.values[1], t.values[2]];
      for (let i=0; i<t.values.length; i+=3)
        for (let k=0; k<3; k++) t.values[i+k] = p0[k] + (t.values[i+k]-p0[k])*(1-factor);
    }
  });
  return c;
}

function reproducir() {
  if (!mezclador) return;
  const lista = amortiguacion > 0 ? clipsSuaves : clipsOrig;
  const clip = lista[indiceClip];
  if (!clip) return;
  mezclador.stopAllAction();
  accion = mezclador.clipAction(clip);
  accion.reset().play();
}

window.setAmortiguacion = (v) => {
  amortiguacion = Math.max(0, Math.min(1, v));
  clipsSuaves = clipsOrig.map((c) => suavizar(c, amortiguacion));
  reproducir();
};
window.setFondo = (modo) => {
  if (modo === "transparente") { escena.background = null; render.setClearAlpha(0); document.body.style.background = "transparent"; }
  else { escena.background = new THREE.Color(0xFBF7F0); render.setClearAlpha(1); document.body.style.background = "#FBF7F0"; }
};
window.setClip = (i) => { indiceClip = i; reproducir(); };

new GLTFLoader().load(${JSON.stringify(urlGlb)}, (gltf) => {
  const raiz = gltf.scene;
  escena.add(raiz);

  let triangulos = 0, huesos = 0;
  raiz.traverse((o) => {
    if (o.isMesh) { const g=o.geometry; triangulos += (g.index ? g.index.count : g.attributes.position.count)/3; }
    if (o.isBone) huesos++;
  });

  const caja = new THREE.Box3().setFromObject(raiz);
  centroModelo = caja.getCenter(new THREE.Vector3());
  tamModelo = caja.getSize(new THREE.Vector3());
  encuadrar();

  clipsOrig = gltf.animations || [];
  clipsSuaves = clipsOrig.slice();
  if (clipsOrig.length) { mezclador = new THREE.AnimationMixer(raiz); reproducir(); }

  avisar({ type:"listo", triangulos: Math.round(triangulos), huesos,
           clips: clipsOrig.map((c) => c.name.split("|")[1] || c.name) });
}, undefined, (e) => avisar({ type:"error", mensaje: String(e && e.message || e) }));

// ── Medición de fps: promedio y el peor del segundo (el que se siente) ──
const reloj = new THREE.Clock();
let cuadros=0, acumulado=0, peorDt=0;
function bucle() {
  requestAnimationFrame(bucle);
  const dt = reloj.getDelta();
  if (mezclador) mezclador.update(dt);
  render.render(escena, camara);
  cuadros++; acumulado += dt; if (dt > peorDt) peorDt = dt;
  if (acumulado >= 1) {
    avisar({ type:"fps",
      fps: Math.round(cuadros/acumulado),
      min: Math.round(1/Math.max(peorDt, 1e-6)),
      dibujadas: render.info.render.calls,
      triangulos: render.info.render.triangles });
    cuadros=0; acumulado=0; peorDt=0;
  }
}
bucle();

addEventListener("resize", () => {
  camara.aspect = innerWidth/innerHeight;
  camara.updateProjectionMatrix();
  render.setSize(innerWidth, innerHeight);
  encuadrar();
});
</script>
</body>
</html>`;
}
