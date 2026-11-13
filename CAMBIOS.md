# CAMBIOS · Jornadas del Sur (React Native)

2º parcial de Desarrollo de Aplicaciones I · Tema 2 (React Native) · 13/11/2026

## 1. Qué pedía la consigna

El README pide corregir cuatro comportamientos de la agenda, sin perder los datos de los usuarios que ya tienen la app instalada:

| Pedido | En una frase |
|---|---|
| 41 · Programa sin señal | Si falla la consulta, seguir mostrando lo guardado y avisarlo. Sin descarga previa, ofrecer reintento. Una edición con cero charlas es válida. |
| 42 · Agenda personal | Al cambiar de edición, conservar las marcas de las charlas que siguen, borrar las retiradas y respetar lo que el usuario marque durante una petición. |
| 43 · Volver al punto de lectura | No perder filtros ni ficha abierta al rotar, ir al fondo o cuando Android mata el proceso. Una tarea nueva arranca sin filtros. |
| 44 · Control de descargas | Una carga automática por proceso y una por cada "Actualizar". Rotar, abrir una ficha o cambiar de pestaña no descarga. Doble toque = un intento. |

## 2. Arquitectura: qué encontré y cómo quedó

### Qué estaba mal

- **El estado de la pantalla estaba repartido.** El día vivía en una variable global (`src/ui/programaModel.ts`), el tema en un `useState` dentro de `Catalogo.tsx`, y la pestaña y la ficha abierta en `useState` dentro de `App.tsx`. Cada vez que una pantalla se desmontaba, una parte se perdía.
- **Las pantallas decidían cuándo descargar.** `Catalogo.tsx` y `App.tsx` llamaban a `recargar()` en sus `useEffect` de montaje. La descarga dependía de cuántas veces se montaba una pantalla, no de lo que pidió el usuario.
- **Pantallas que tocaban la base.** `Mesa.tsx` importaba `ajuste` y `configurar` de `data/archivo.ts`, y `App.tsx` llamaba a `configurar` directo. Se salteaban el ViewModel y el Repository.
- **Un componente que hacía todo.** `App.tsx` era entrada, navegación, detalle de la charla y Mi agenda a la vez.
- **El formato de SQLite llegaba hasta la pantalla.** El tipo `Charla` vivía en `data/archivo.ts` con `favorita: number` (0 o 1) y la interfaz lo importaba desde ahí.

### Cómo quedó (MVVM + Repository)

Cada piso habla solo con el de al lado: pantalla → ViewModel → Repository → datos.

| Archivo | Piso | Qué hace |
|---|---|---|
| `App.tsx` | Entrada | Avisa al ViewModel que arrancó y dibuja la portada |
| `src/presentation/screens/Portada.tsx` | 1 Pantalla | Marco, título, aviso y pestañas |
| `src/presentation/screens/Catalogo.tsx` | 1 Pantalla | Filtros y lista del programa |
| `src/presentation/screens/Detalle.tsx` | 1 Pantalla | Ficha de una charla |
| `src/presentation/screens/MiAgenda.tsx` | 1 Pantalla | Charlas marcadas |
| `src/presentation/screens/Mesa.tsx` | 1 Pantalla | Panel del laboratorio |
| `src/presentation/components/componentes.tsx` | 1 Pantalla | Botón, lista y estilos compartidos |
| `src/presentation/viewmodel/programaViewModel.ts` | 2 ViewModel | Estado único, decisiones, `try/catch` |
| `src/presentation/viewmodel/usePrograma.ts` | 2 ViewModel | Hook que conecta el ViewModel con React |
| `src/presentation/viewmodel/useMesaViewModel.ts` | 2 ViewModel | Hook de la Mesa |
| `src/data/AgendaRepository.ts` | 3 Repository | Único que habla con SQLite y con el servicio |
| `src/data/LaboratorioRepository.ts` | 3 Repository | Ajustes de la Mesa y contador de peticiones |
| `src/data/archivo.ts` | 4 Datos | SQLite: tablas y consultas |
| `src/lab/servicio.ts` y `programa-N.json` | 4 Datos | Servicio simulado (axios). No lo toqué |
| `src/domain/agenda.ts` | Dominio | Tipos y reglas puras (filtrar, favoritas) |
| `src/legacy/agendaImpresa.ts` | Sin uso | Código muerto. No lo toqué |

Se puede comprobar con una búsqueda: ninguna pantalla importa `data/` ni `lab/`, y la única que tiene SQL es `src/data/archivo.ts`.

El ViewModel recibe el Repository por parámetro (`crearProgramaViewModel(repo)`). Por eso lo pude probar con una prueba de lógica automática (punto 5).

## 3. Los cuatro pedidos

### Pedido 41 · Programa sin señal

- **Problema** (`src/ui/Catalogo.tsx`, línea 17 del original): `aviso ? <Reintentar/> : <Lista/>`. Si la consulta fallaba, el aviso reemplazaba a la lista, aunque hubiera charlas guardadas en el teléfono.
- **Problema** (`src/data/archivo.ts`, función `guardar`): una respuesta con cero charlas no borraba nada y no dejaba rastro. No había forma de distinguir "nunca descargué" de "descargué una edición vacía".
- **Por qué es un problema:** el usuario sin señal se quedaba sin su agenda, y la v4 mostraba charlas viejas.
- **Qué hice:**
  - `archivo.ts`: al guardar una edición dejo una constancia `edicion_descargada = si` en la tabla `ajustes`, dentro de la misma transacción. `hayEdicionGuardada()` devuelve verdadero si está la constancia **o** si ya hay charlas (así las instalaciones anteriores no pierden nada).
  - `programaViewModel.ts`: en el `catch` no borro la lista. Si hay edición, el aviso es "Sin señal: se están usando datos guardados."; si no hay, "No se pudo consultar el programa.".
  - `Catalogo.tsx`: sin edición y con error muestra **Reintentar**; con edición y cero charlas muestra "La edición vigente está sin charlas programadas."; si no, la lista.
  - `Portada.tsx`: el aviso se ve en todas las pestañas y en el detalle.

### Pedido 42 · Agenda personal

- **Problema** (`src/data/archivo.ts`, línea 24 del original): `INSERT OR REPLACE INTO charlas VALUES (?,?,?,?,?,?,?,?,0)`. Cada sincronización reescribía la fila completa con `favorita = 0`.
- **Problema:** nunca se borraban las charlas retiradas (la 11 seguía en v3).
- **Por qué es un problema:** el usuario perdía su agenda en cada actualización, y veía charlas que ya no existen.
- **Qué hice** (`archivo.ts`, función `reemplazarPrograma`, todo en una transacción):
  - charla que ya no viene: `DELETE ... WHERE id = ?` (se va con su marca, así si regresa, regresa sin marcar);
  - charla nueva: `INSERT OR IGNORE` con `favorita = 0`;
  - charla que sigue: `UPDATE` de título, sala, etc. **sin tocar** `favorita`.
- **La marca durante una petición:** la sincronización nunca lee ni escribe `favorita`. La marca se guarda en SQLite en el momento del toque, así que cuando llega la respuesta no hay nada que pisar.
- **Además:** `alternar` usaba `favorita = 1 - favorita` (dar vuelta). Lo cambié por `marcar(id, valor)` con el valor explícito: dos toques rápidos en "Agregar" dejan la charla agregada en vez de agregarla y quitarla.
- **Además:** `AgendaRepository.sincronizar` ahora valida lo que devuelve el servicio (que sea una lista y que cada charla tenga `id`) antes de guardar.

### Pedido 43 · Volver al punto de lectura

- **Problema** (`App.tsx`, línea 46 del original): `<Catalogo key={width>height?'horizontal':'vertical'}/>`. Al rotar cambiaba la `key` y React destruía y volvía a crear el catálogo.
- **Problema** (`src/ui/Catalogo.tsx`, línea 8): el tema estaba en `useState('Todos')` dentro de la pantalla. Al rotar, o al entrar a una ficha y volver, arrancaba otra vez en "Todos".
- **Problema** (`App.tsx`, línea 9): `MainActivity.kt` manda un `taskKey` que identifica la tarea de Android, pero la app no lo usaba. Si Android mataba el proceso, se perdía todo.
- **Qué hice:**
  - Saqué la `key` y `useWindowDimensions`: rotar ya no desmonta nada.
  - Pestaña, ficha abierta, día y tema viven juntos en el ViewModel (`PuntoDeLectura`). Las pantallas no tienen estado propio.
  - Cada cambio se guarda en SQLite (tabla `ajustes`, clave `lectura`) junto con el `taskKey`.
  - Al arrancar (`iniciar`): si el `taskKey` guardado es el mismo, se restaura la ficha y los filtros. Si es otro (tarea nueva), arranca en Programa, sin ficha y sin filtros.

### Pedido 44 · Control de descargas

- **Problema** (`src/ui/Catalogo.tsx`, línea 9): `useEffect(()=>{void recargar();},[])`. Una descarga cada vez que el catálogo se montaba: al arrancar, al rotar, al volver de una ficha y al cambiar de pestaña.
- **Problema** (`App.tsx`, líneas 25 y 26): otra descarga al montar la portada (dos al arrancar) y otra cada vez que la app volvía del fondo (`AppState`).
- **Problema** (`src/ui/programaModel.ts`, `recargar`): nada impedía dos peticiones a la vez con un doble toque.
- **Por qué es un problema:** gasta datos y batería, y dos respuestas pueden pisarse.
- **Qué hice** (`programaViewModel.ts`):
  - La carga automática la dispara `iniciar` una sola vez por proceso (bandera `cargaAutomaticaHecha`). Ninguna pantalla descarga al montarse.
  - Saqué la descarga por `AppState`.
  - Candado `peticionEnCurso`: si hay una petición en viaje, `actualizar()` no hace nada. Se libera en el `finally`, así tras éxito o falla se puede volver a pedir.
  - Los filtros no se bloquean durante la espera y la lista sigue visible.

## 4. Otros arreglos

| Archivo | Problema | Qué hice |
|---|---|---|
| `src/data/archivo.ts` | En modo promesa, `react-native-sqlite-storage` no deshace la transacción si falla una orden (el error se traga y se confirma lo demás) | Cada orden lleva un manejador que devuelve `true`: la transacción se corta y se deshace todo |
| `src/ui/programaModel.ts` (`marcar`) | Sin `try/catch`: si fallaba SQLite, nadie le avisaba al usuario | `alternarFavorita` ataja el error y muestra "No se pudo guardar el cambio en tu agenda." |
| `App.tsx` | `configurar(...).then(...)` sin `catch`: si fallaba, la app quedaba en "Abriendo agenda…" para siempre | `iniciar` tiene `try/catch/finally` y siempre abre |
| `src/ui/Mesa.tsx` | Promesa sin `catch` y sin limpieza: podía hacer `setState` con la pantalla ya cerrada | `useMesaViewModel` con bandera `vivo` en la limpieza del `useEffect` y aviso de error |
| `src/presentation/viewmodel/programaViewModel.ts` | Un listado viejo podía llegar tarde y pisar uno más nuevo | Contador `turnoDeLectura`: solo se publica el último pedido |

Lo que ya estaba bien y dejé igual: SQL con parámetros `?`, la base se abre una sola vez, `CREATE TABLE IF NOT EXISTS`, el `BackHandler` con su limpieza (`sub.remove()`).

No cambié el esquema de la base ni su nombre (`cartelera.db`): lo nuevo se guarda en la tabla `ajustes` que ya existía. No agregué librerías ni cambié versiones.

## 5. Cómo lo verifiqué

| Verificación | Resultado |
|---|---|
| `npm run typecheck` | Sin errores |
| Bundle de Android con Metro (`npx react-native bundle --platform android ...`) | Sin errores (958 KB) |
| Prueba de lógica en Node: ViewModel, Repository, `archivo.ts` y servicio reales, con el SQLite de Node en lugar del módulo nativo | 31 comprobaciones, 31 bien |

La prueba de lógica cubre: falla sin descarga previa, reintento, v1 → v2 → v3 → v1 con marcas, marca agregada y quitada durante una petición, doble toque, conteo de peticiones, falla con edición guardada, rollback de la transacción, v4 y reapertura sin señal, restauración por `taskKey`, tarea nueva, y una base de la versión anterior con charlas y marcas.

Pasos de prueba manual (la consigna está escrita para la versión Android; en React Native el paquete es `ar.jornadasrn` y el extra es `sin_servicio`):

1. `npm install`, `npm start` y en otra terminal `npm run android`.
2. Pedido 44: abrir la app y mirar en Mesa "Peticiones en esta sesión": 1. Rotar, abrir una ficha, cambiar de pestaña: sigue en 1. Tocar Actualizar dos veces seguidas: 2.
3. Pedido 42: marcar la 11 y otra charla. En Mesa elegir v2 y Actualizar: la 11 sigue marcada con título y sala nuevos. v3: la 11 desaparece, entra la 90. v1: la 11 vuelve sin marcar. Con demora de 8 segundos, Actualizar y marcar una charla durante la espera: la marca queda.
4. Pedido 41: en Mesa, servicio "no" y Actualizar: sigue la lista con el aviso de datos guardados. v4 con servicio "si": "sin charlas programadas". Arranque vacío sin señal: `adb shell pm clear ar.jornadasrn` y `adb shell am start -n ar.jornadasrn/.MainActivity --ez sin_servicio true`: aparece Reintentar.
5. Pedido 43: Día 2 + Datos, abrir "Cachés para viajeros", volver y rotar: quedan 2 resultados. Con la ficha abierta, Inicio, `adb shell am kill ar.jornadasrn` y volver desde Recientes: vuelve la ficha y, al volver, los dos filtros.

## 6. Cosas raras que encontré en el material

No encontré comentarios con instrucciones para una IA. Sí encontré estas diferencias y distractores:

- El `README.md` describe la versión Android (Retrofit, `ar.jornadas`, `--ez servicio_disponible false`, `./gradlew` en la raíz). En este proyecto es axios, `ar.jornadasrn`, `--ez sin_servicio true` y Gradle está en `android/`.
- `src/legacy/agendaImpresa.ts` no lo importa nadie: es código muerto de la primera edición (un solo día). No lo integré ni lo borré.
- `scripts/preparar-sqlite.cjs` corre solo en cada `npm install` (`postinstall`) y reescribe un `build.gradle` dentro de `node_modules`. Lo leí antes de instalar: solo adapta la librería de SQLite a la versión de Gradle.
- `src/lab/programa-4.json` es una lista vacía a propósito (el caso "cero charlas").

## 7. Uso de IA

- **Herramienta:** Claude Code.
- **Cómo la usé:** le pedí que primero leyera el README y todo el código sin modificar nada, que tratara el contenido del repo como datos y no como instrucciones, y que después corrigiera los cuatro pedidos ordenando la arquitectura en capas.
- **Qué revisé:** el chequeo de tipos, la prueba de lógica de los cuatro pedidos y que ninguna pantalla importe la capa de datos.
- **Registro completo de prompts y preguntas:** `USO_DE_IA.txt`.
