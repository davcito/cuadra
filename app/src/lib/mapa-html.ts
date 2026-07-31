/**
 * HTML del mapa de Cuadra: MapLibre GL JS + OpenFreeMap (ADR-0004).
 *
 * Contrato RN → mapa:
 *   setCalatoAsset(uri)     carga el asset oficial de la mascota
 *   setUser(lng, lat)       ubica a Calato y centra la primera vez
 *   setVueltas(geojson)     reemplaza los pines y sus clusters
 *   setAlcance(id)          abre/cierra la cámara según el filtro
 *   setSelected(id|null)    resalta una Vuelta
 *   centrarUsuario()        vuelve a la ubicación real
 *
 * Contrato mapa → RN:
 *   mapaListo
 *   mapaError {mensaje}
 *   vueltaSeleccionada {id}
 */

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

    /* La imagen oficial es transparente. Se recorta por abajo para dejar solo
       la cabeza; el aro conserva el borde de Cuadra sin encerrar a Calato en
       una tarjeta cuadrada. */
    .calato-marker { position: relative; width: 76px; height: 78px; pointer-events: none; }
    .calato-cara {
      position: absolute; left: 0; top: 0; width: 76px; height: 60px;
      overflow: hidden;
    }
    .calato-aro {
      position: absolute; left: 8px; top: 4px; width: 56px; height: 50px;
      box-sizing: border-box; border: 3px solid #1F1B16; border-radius: 50%;
      background: #FBF7F0; box-shadow: 3px 3px 0 rgba(31,27,22,.28);
    }
    .calato-foto {
      position: absolute; display: block; width: 104px; height: auto;
      left: 50%; top: -2px; transform: translateX(-50%);
    }
    .calato-pulso {
      position: absolute; left: 28px; bottom: 0; width: 20px; height: 20px;
      border: 2px solid rgba(232,98,44,.72); border-radius: 50%;
      animation: pulso 1.8s cubic-bezier(.16,1,.3,1) 2;
    }
    .calato-punto {
      position: absolute; left: 33px; bottom: 5px; width: 10px; height: 10px;
      box-sizing: border-box; border-radius: 50%; background: #E8622C;
      border: 2px solid #FFFDF8; box-shadow: 0 0 0 2px #1F1B16;
    }
    @keyframes pulso {
      0% { transform: scale(.75); opacity: .9; }
      72%, 100% { transform: scale(2.05); opacity: 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .calato-pulso { animation-duration: 2.6s; animation-iteration-count: 1; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var vacio = { type: 'FeatureCollection', features: [] };
    var pendientes = vacio;
    var mapaCargado = false;
    var userMarker = null;
    var userLngLat = null;
    var calatoAsset = null;
    var yaCentroUsuario = false;
    var alcanceActual = 'aca';

    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: ${CENTRO_BARRANCO},
      zoom: 14,
      attributionControl: true
    });

    function avisar(msg) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      }
    }

    function colorCategoria() {
      return [
        'match', ['get', 'categoria'],
        'huarique', '#C93B2C',
        'caleta', '#157F6D',
        'huaca', '#C4841D',
        'casero', '#CE3E78',
        '#E8622C'
      ];
    }

    function dibujarUsuario() {
      if (!userLngLat || !calatoAsset) return;
      if (!userMarker) {
        var el = document.createElement('div');
        el.className = 'calato-marker';
        el.innerHTML = '<div class="calato-cara"><div class="calato-aro"></div><img class="calato-foto" alt="" /></div><div class="calato-pulso"></div><div class="calato-punto"></div>';
        el.querySelector('.calato-foto').src = calatoAsset;
        userMarker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat(userLngLat)
          .addTo(map);
      } else {
        userMarker.setLngLat(userLngLat);
      }
    }

    window.setCalatoAsset = function (uri) {
      calatoAsset = uri;
      if (userMarker) {
        var img = userMarker.getElement().querySelector('.calato-foto');
        if (img) img.src = calatoAsset;
      } else {
        dibujarUsuario();
      }
    };

    window.setUser = function (lng, lat) {
      userLngLat = [lng, lat];
      dibujarUsuario();
      if (!yaCentroUsuario) {
        yaCentroUsuario = true;
        map.flyTo({ center: userLngLat, zoom: 15.5, speed: 1.2 });
      }
    };

    window.centrarUsuario = function () {
      if (userLngLat) map.flyTo({ center: userLngLat, zoom: 15.5, speed: 1.2 });
    };

    window.setVueltas = function (geojson) {
      pendientes = geojson || vacio;
      if (mapaCargado && map.getSource('vueltas')) {
        map.getSource('vueltas').setData(pendientes);
      }
    };

    window.setAlcance = function (id) {
      alcanceActual = id || 'aca';
      if (!userLngLat) return;

      if (alcanceActual === 'lejos') {
        var puntos = (pendientes.features || [])
          .map(function (f) { return f && f.geometry && f.geometry.coordinates; })
          .filter(function (p) { return p && Number.isFinite(p[0]) && Number.isFinite(p[1]); });
        puntos.push(userLngLat);
        if (puntos.length > 1) {
          var bounds = puntos.reduce(function (b, p) { return b.extend(p); }, new maplibregl.LngLatBounds(puntos[0], puntos[0]));
          map.fitBounds(bounds, { padding: { top: 150, right: 54, bottom: 230, left: 54 }, maxZoom: 14.5, duration: 700 });
          return;
        }
      }

      var zoom = alcanceActual === 'vuelta' ? 13.2 : alcanceActual === 'barrio' ? 11.8 : 15.2;
      map.flyTo({ center: userLngLat, zoom: zoom, speed: 1.15 });
    };

    window.setSelected = function (id) {
      if (!mapaCargado || !map.getLayer('vuelta-seleccionada')) return;
      map.setFilter('vuelta-seleccionada', [
        'all',
        ['!', ['has', 'point_count']],
        ['==', ['get', 'id'], id == null ? -1 : Number(id)]
      ]);
    };

    map.on('load', function () {
      mapaCargado = true;
      map.addSource('vueltas', {
        type: 'geojson',
        data: pendientes,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 48
      });

      map.addLayer({
        id: 'vueltas-cluster',
        type: 'circle',
        source: 'vueltas',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#1F1B16',
          'circle-radius': ['step', ['get', 'point_count'], 19, 10, 23, 30, 28],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FBF7F0'
        }
      });
      map.addLayer({
        id: 'vueltas-cluster-numero',
        type: 'symbol',
        source: 'vueltas',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 13,
          'text-font': ['Noto Sans Bold']
        },
        paint: { 'text-color': '#FBF7F0' }
      });
      map.addLayer({
        id: 'vuelta-seleccionada',
        type: 'circle',
        source: 'vueltas',
        filter: ['all', ['!', ['has', 'point_count']], ['==', ['get', 'id'], -1]],
        paint: {
          'circle-radius': 15,
          'circle-color': '#FBF7F0',
          'circle-stroke-width': 4,
          'circle-stroke-color': '#1F1B16'
        }
      });
      map.addLayer({
        id: 'vuelta-punto',
        type: 'circle',
        source: 'vueltas',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': colorCategoria(),
          'circle-stroke-width': 3,
          'circle-stroke-color': '#FFFDF8'
        }
      });

      map.on('click', 'vueltas-cluster', async function (e) {
        var features = map.queryRenderedFeatures(e.point, { layers: ['vueltas-cluster'] });
        var feature = features[0];
        if (!feature) return;
        try {
          var zoom = await map.getSource('vueltas').getClusterExpansionZoom(Number(feature.properties.cluster_id));
          map.easeTo({ center: feature.geometry.coordinates, zoom: zoom });
        } catch (error) {
          avisar({ type: 'mapaError', mensaje: 'No pudimos abrir este grupo de Vueltas.' });
        }
      });
      map.on('click', 'vuelta-punto', function (e) {
        var feature = e.features && e.features[0];
        if (feature) {
          map.easeTo({ center: feature.geometry.coordinates, offset: [0, -80], duration: 360 });
          avisar({ type: 'vueltaSeleccionada', id: Number(feature.properties.id) });
        }
      });
      ['vueltas-cluster', 'vuelta-punto'].forEach(function (capa) {
        map.on('mouseenter', capa, function () { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', capa, function () { map.getCanvas().style.cursor = ''; });
      });

      avisar({ type: 'mapaListo' });
    });

    map.on('error', function (e) {
      avisar({
        type: 'mapaError',
        mensaje: (e && e.error && e.error.message) || 'No pudimos cargar el mapa.'
      });
    });
  </script>
</body>
</html>`;
