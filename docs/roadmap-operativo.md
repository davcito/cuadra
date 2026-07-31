# Roadmap operativo — cómo construimos Cuadra sin perder el orden

**Vigente desde:** 2026-07-31

Este archivo ordena el trabajo inmediato. El documento maestro conserva la visión y
`plan-rup.md` conserva las fases; este roadmap responde una pregunta más concreta:
**qué se hace ahora, qué depende de qué y cuándo algo se considera terminado**.

## Metodología

Cuadra usa tres capas compatibles:

1. **RUP liviano para el proyecto:** avanzar por riesgos, no por cantidad de pantallas.
2. **Tajadas verticales para construir:** cada entrega cruza datos → lógica → interfaz → prueba
   en teléfono; no dejamos “todo el backend” o “todo el diseño” aislados.
3. **Kanban con WIP 1 para ejecutar:** una sola tajada principal abierta. Los hallazgos nuevos
   entran a la cola; no interrumpen la tajada salvo que prueben que su base es incorrecta.

La secuencia de una tajada es siempre:

> hipótesis/riesgo → escenario verificable → diseño/ADR si cambia arquitectura → código y
> datos → pruebas automáticas → prueba con datos reales → prueba en teléfono → pulido → cierre

## Definición de terminado

Una funcionalidad no está terminada solo porque compile. Debe cumplir lo aplicable:

- escenario principal y estados de carga, vacío, error y deshabilitado;
- typecheck y tests verdes;
- export/build correspondiente;
- datos reales, no solo mocks;
- verificación en Expo Go o build nativo cuando toca interfaz/dispositivo;
- seguridad y permisos coherentes con servidor;
- documentación/ADR actualizada si cambió una decisión;
- sin migraciones o trabajos de datos a medio aplicar.

El checkpoint y el commit se hacen al cerrar la iteración, no por cada archivo tocado.

## Estado real de las fases

| Bloque | Estado | Evidencia / falta |
|---|---|---|
| E0 · identidad y base Expo | cerrado | sistema visual, Calato y navegación existen |
| E1 · contenido real | cerrado | 522 POIs totales; Barranco superó la meta; pipeline y validadores reales |
| E2 · Chapar | código construido, validación incompleta | falta recorrido real de punta a punta en teléfono |
| E2.1 · exploración ampliable | código construido | falta prueba visual/táctil en Expo Go |
| E3 · loop y Álbum | abierto | Álbum aún no es dinámico ni tiene arte publicado |
| Construcción/escala | no iniciada | requiere cerrar primero el loop demostrable |

## Cola ordenada

### AHORA — Validar exploración ampliable

Escenario: desde Morales Duárez, abrir Cuadra, ver Calato y pines cercanos, cambiar desde
**Por acá nomás** hasta **Hoy me voy lejos**, abrir un cluster, tocar un pin y comprobar que la
tarjeta corresponde al lugar.

Salida: correcciones visuales/de interacción necesarias y confirmación en teléfono real.

### SIGUE — Cerrar E2 con una Chapada real

Escenario: elegir una Vuelta real, navegar, llegar, sacar foto, recibir veredicto, sumar Calle,
racha y figurita. Probar también fuera de rango y repetida.

Dependencia: exploración debe elegir correctamente el mismo POI que valida el servidor.

### DESPUÉS — Álbum real, piloto de 10 lugares

Tajada vertical:

1. `place_media` + storage y procedencia;
2. 10 fotos factuales autorizadas de Barranco;
3. 10 artes de figurita revisados;
4. Álbum dinámico por barrio, progreso real y detalle;
5. Chapada revela exactamente la figurita del POI visitado.

No se automatizan cientos de imágenes antes de que estas diez prueben el formato.

### LUEGO — Consola de operaciones de contenido

Una sola cola para:

- importar un distrito;
- resolver duplicados;
- revisar/encender celdas;
- corregir POIs sin que la sync los pise;
- registrar licencia y atribución de medios;
- aprobar Vueltas;
- ver figuritas sin arte;
- publicar o retirar sin borrar historial.

Esta consola sube de prioridad respecto del plan antiguo: sin ella Lima completa sería una
colección de scripts y trabajo invisible.

### PRUEBA DE ESCALA — Un segundo distrito completo

Repetir la cadena con Cercado de Lima u otro distrito elegido, midiendo:

- POIs ingeridos, duplicados y porcentaje útil;
- celdas que requirieron revisión;
- horas de curación y medios;
- Vueltas rechazadas por validadores/humano;
- costo de generación;
- fallos encontrados en caminata real.

Solo después se proyectan tiempos y costos para Lima completa.

### CIERRE DE ELABORACIÓN — Demo del loop

Un usuario sin ayuda completa: onboarding → exploración → elección → llegada → cámara →
Chapada → figurita → Álbum → racha. Video real de 60 segundos y criterios de E3 cumplidos.

## Reglas contra el desorden

- Una sesión produce una tajada demostrable o una decisión documentada, no cinco frentes.
- Un bug que invalida el escenario actual entra de inmediato; una mejora lateral va a la cola.
- No automatizamos volumen antes de aprobar manualmente una muestra pequeña.
- Nada se declara “igual” o “resuelto” sin mirar la fuente viva.
- El mapa, la lista y `chapar()` comparten contratos; no se crean consultas paralelas con
  reglas de seguridad distintas.
- Toda imagen publicada conserva fuente, licencia y atribución.
