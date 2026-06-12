/**
 * HTML del mapa de Cuadra: MapLibre GL JS + OpenFreeMap (ADR-0004).
 * Se carga dentro de una WebView. Expone funciones globales que RN invoca
 * con injectJavaScript, y avisa a RN cuando el mapa terminó de cargar.
 *
 * Contrato:
 *   RN → mapa:  window.setUser(lng, lat)   centra y marca al usuario
 *   mapa → RN:  postMessage({type:'mapaListo'})   cuando el estilo cargó
 */

// Centro por defecto: Plaza de Barranco (mientras llega el GPS real).
const CENTRO_BARRANCO = "[-77.0205, -12.1494]";
const MAPLIBRE = "4.7.1";

export const MAPA_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <script src="https://unpkg.com/maplibre-gl@${MAPLIBRE}/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@${MAPLIBRE}/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #FBF7F0; }
    #map { position: absolute; inset: 0; }
    .pin {
      width: 22px; height: 22px; border-radius: 50%;
      background: #E8622C; border: 3px solid #fff;
      box-shadow: 0 0 0 2px rgba(232,98,44,0.35);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: ${CENTRO_BARRANCO},
      zoom: 14
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    var userMarker = null;
    window.setUser = function (lng, lat) {
      map.flyTo({ center: [lng, lat], zoom: 16, speed: 1.2 });
      if (!userMarker) {
        var el = document.createElement('div');
        el.className = 'pin';
        userMarker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      } else {
        userMarker.setLngLat([lng, lat]);
      }
    };

    function avisar(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }
    map.on('load', function () { avisar({ type: 'mapaListo' }); });
    map.on('error', function (e) {
      avisar({ type: 'mapaError', mensaje: (e && e.error && e.error.message) || 'error de mapa' });
    });
  </script>
</body>
</html>`;
