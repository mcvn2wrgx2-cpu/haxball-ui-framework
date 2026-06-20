<p align="center">
  <img src="assets/banner.png" alt="HaxBall UI Framework Banner" width="100%" />
</p>

# haxball-ui-framework

<p align="center">
  <a href="README.md">🇺🇸 English</a> | 🇪🇸 Español
</p>

<p align="center">
<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-000000.svg?style=flat-square" alt="License">
</a>
<a href="#arquitectura">
  <img src="https://img.shields.io/badge/Architecture-DOM--based-7b2cbf.svg?style=flat-square" alt="Architecture">
</a>
<a href="#estructura-del-proyecto">
  <img src="https://img.shields.io/badge/vanilla-JavaScript-f7df1e.svg?style=flat-square&logo=javascript&logoColor=black" alt="Vanilla JS">
</a>
<a href="#hoja-de-ruta">
  <img src="https://img.shields.io/badge/version-v1-2ecc71.svg?style=flat-square" alt="Version v1">
</a>
<a href="#estructura-del-proyecto">
  <img src="https://img.shields.io/badge/contributions-welcome-000000.svg?style=flat-square&logo=git&logoColor=white" alt="Contributions Welcome">
</a>
</p>

**HaxBall UI Framework es una capa UI mínima y estable para construir ventanas overlay sobre el cliente de HaxBall.**

No es un framework completo tipo React. No es un engine de juego.
Es un **núcleo UI pequeño y bien diseñado** que te da control total del DOM sin pelear con HaxBall.

---

## 🧠 Idea Central

HaxBall UI Framework introduce una **capa de overlay liviana** sobre el DOM de HaxBall que permite:

- crear y gestionar ventanas
- actualizar contenido dinámicamente
- destrucción limpia con ciclo de vida completo
- aislamiento total de CSS via Shadow DOM
- manejo seguro de eventos que no se filtran al juego
- drag & resize, botones con estilo nativo, y un tema que replica la UI de HaxBall

Todo está construido alrededor de un principio:

> Una API. Un namespace. Control total.

---

## ⚙️ Arquitectura

El framework se divide en capas, cada una con una sola responsabilidad:

| Capa | Módulo | Responsabilidad |
| :--- | :--- | :--- |
| **Bootstrap** | `RootMount` | Detecta el contexto de ejecución, ancla `#haxui-root` a `document.body`, re-ancla si HaxBall limpia el DOM |
| **Registro** | `WindowManager` | Registro de ventanas, ciclo de vida, y stack de z-index |
| **Instancia** | `Window` | Construye el árbol DOM de una ventana, dueña de su Shadow Root |
| **Seguridad** | `EventGuard` | Política por tipo de evento para que los eventos de ventana nunca se filtren al juego |
| **Seguridad** | `EventRegistry` | Rastrea cada listener para que `destroy()` limpie sin memory leaks |
| **Estilo** | `StyleManager` | Inyecta estilos base por tema en cada Shadow Root |
| **Contenido** | `Sanitize` | Sanitización basada en DOMParser — los strings nunca llegan crudos a `innerHTML` |
| **Interacción** | `DragManager` | Arrastra ventanas desde el header, limitado al viewport |
| **Interacción** | `ResizeManager` | Redimensiona desde cualquiera de las 4 esquinas, con tamaño mínimo |
| **Integración** | `ButtonInjector` | Inyecta botones con estilo nativo en la barra de botones de HaxBall |
| **API pública** | `HaxUI` | `window.HaxUI` — el único nombre global expuesto |
| **Handle** | `WindowHandle` | Objeto liviano retornado por ventana — no expone internals |

---

## 📦 Estructura del Proyecto

```txt
haxball-ui-framework/
│
├── core/
│   ├── HaxUI.js            # Punto de entrada de la API pública
│   ├── WindowManager.js    # Registro de ventanas, ciclo de vida, z-index
│   ├── Window.js           # Ventana individual con Shadow DOM
│   ├── RootMount.js        # Nodo raíz, detección de contexto, re-anclaje
│   ├── EventGuard.js       # Política por tipo de evento para aislar el juego
│   ├── EventRegistry.js    # Registro de listeners para destroy() limpio
│   ├── StyleManager.js     # Estilos por tema inyectados en cada Shadow Root
│   ├── DragManager.js      # Drag desde el header, limitado al viewport (v1)
│   ├── ResizeManager.js    # Handles de resize en las esquinas (v1)
│   └── ButtonInjector.js   # Inyección de botones con estilo nativo de HaxBall (v1)
│
├── constants/
│   └── config.js           # BASE_Z_INDEX, temas, namespace, modos de operación
│
├── utils/
│   └── sanitize.js         # Wrapper de DOMParser para setContent() seguro
│
├── dev/
│   ├── playground.js       # 13 grupos de tests, 70+ assertions
│   └── examples.js         # 5 ejemplos trabajados (scoreboard, roster, chat, admin panel, dashboard)
│
├── build.js                # Concatena los módulos en un bundle IIFE único
├── package.json
└── haxball-ui.bundle.js    # Output generado — esto es lo que se inyecta en HaxBall
```

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/mcvn2wrgx2-cpu/haxball-ui-framework
cd haxball-ui-framework
```

### 2. Generar el bundle

Sin dependencias. Solo Node.js.

```bash
node build.js
# → haxball-ui.bundle.js
```

### 3. Inyectar en HaxBall

**Opción A — Consola de DevTools** (desarrollo):
Pegar el contenido de `haxball-ui.bundle.js` directamente en la consola del browser con HaxBall abierto.

**Opción B — Tampermonkey** (recomendado):
Crear un userscript con `@require file:///ruta/absoluta/a/haxball-ui.bundle.js` y activar el acceso a archivos locales en la configuración de Tampermonkey.

### 4. Verificar que cargó

```js
HaxUI.diagnostics();
// { initialized: false, mode: null, rootPresent: false, windowCount: 0, baseZ: 9000, version: 'v0' }
```

---

## 🧩 API Pública

### Inicializar

```js
// Opcional — se llama automáticamente en el primer createWindow() si se omite
HaxUI.init({ baseZ: 9000 });
```

### Crear una ventana

```js
const win = HaxUI.createWindow({
  id: 'stats',
  title: 'Estadísticas',
  width: 260,
  height: 180,
  x: 16,
  y: 16,
  content: '<p>Cargando...</p>',

  // v1
  theme: 'default',     // 'default' | 'haxball'
  draggable: true,      // arrastrable desde el header
  resizable: true,      // redimensionable desde cualquier esquina
  titleVisible: true    // mostrar/ocultar el header al crearla
});
```

### Actualizar contenido

```js
// Seguro: pasar un Node, no un string con datos externos
const node = document.createElement('div');
node.textContent = 'Goles: ' + data.goals;
win.setContent(node);

// También válido para markup estático
win.setContent('<p>Partida terminada</p>');
```

### Mostrar / ocultar / título (v1)

```js
win.show();
win.hide();

win.hideTitle();   // colapsa el header, el contenido ocupa toda la ventana
win.showTitle();
```

### Destruir

```js
win.destroy();

// O por ID
HaxUI.destroyWindow('stats');

// O todo de una vez (usar al descargar el script)
HaxUI.destroyAll();
```

### Obtener una ventana existente

```js
const existing = HaxUI.getWindow('stats');
if (existing) {
  existing.setContent('<p>Reiniciando...</p>');
}
// getWindow() retorna null si no existe — nunca lanza
```

### Botones con estilo nativo (v1)

```js
const btn = HaxUI.createButton({
  id: 'stats-btn',
  label: '📊 Stats',
  onClick: () => win.show()
});

btn.destroy();
// o
HaxUI.destroyButton('stats-btn');
```

`createButton()` inyecta directamente dentro del contenedor `.header-btns` de
HaxBall, apareciendo en línea junto a los botones nativos Rec / Link / Leave.
Si ese contenedor todavía no está montado, el botón usa un overlay fijo como
fallback y un `MutationObserver` lo reinyecta en el momento en que la UI de
HaxBall esté disponible.

---

## 🎨 El tema `haxball`

`theme: 'haxball'` replica el estilo nativo del `.dialog` de HaxBall usando
valores extraídos directamente del DOM en vivo (fondo, border-radius, línea
de acento del header, fuente, colores de botones) — para que una ventana de
HaxUI pueda verse indistinguible de uno de los diálogos propios de HaxBall:

```js
HaxUI.createWindow({
  id: 'confirm',
  title: '¿Salir de la sala?',
  theme: 'haxball',
  width: 300,
  height: 150,
  x: 100,
  y: 100,
  content: '<p>¿Estás seguro de que quieres salir de la sala?</p><button>Salir</button>'
});
```

---

## 🔒 Decisiones de Diseño

Cada decisión responde a un riesgo concreto del entorno HaxBall.

| Decisión | Riesgo mitigado |
| :--- | :--- |
| Shadow DOM por ventana (con fallback a CSS namespace) | Los estilos globales de HaxBall se filtran a los elementos del overlay |
| Namespace único `window.HaxUI` | Colisiones con los globals de HaxBall u otros scripts |
| `EventGuard` con política por tipo de evento | Eventos de teclado/mouse que se filtran al juego |
| `BASE_Z = 9000`, configurable | Ventanas que quedan detrás de los menús propios de HaxBall |
| `MutationObserver` en `RootMount` | HaxBall limpia el DOM en transiciones de sala |
| `DOMParser` en `setContent()` | XSS al renderizar strings externos (nombres de jugadores, chat) |
| Flag `WindowHandle._destroyed` | Llamadas seguras post-destroy — sin errores dentro de callbacks del juego |
| Detección de contexto en `RootMount.init()` | Script inyectado en el frame equivocado (entornos con iframe) |
| Listeners de drag adjuntados/removidos por ciclo, fuera de `EventRegistry` | Los listeners del registro persisten durante toda la vida de la ventana — usarlos para el drag hacía que el cursor nunca se soltara |
| `ButtonInjector` apunta a `.header-btns` con fallback de `MutationObserver` | La barra de botones nativa todavía no está montada cuando corre el script |
| `buttonBorder: '0'` en el tema haxball | Los botones nativos de HaxBall no tienen borde — verificado con `getComputedStyle()` sobre el DOM en vivo, no asumido |

---

## 🎯 Ejemplo: Overlay de Estadísticas en Vivo

```js
HaxUI.init();

const stats = HaxUI.createWindow({
  id: 'haxui-stats',
  title: 'Estadísticas',
  width: 260,
  height: 180,
  x: 16,
  y: 16
});

function onGameData(data) {
  const node = document.createElement('div');
  node.innerHTML = [
    '<div>Equipo 1: ' + data.score[0] + '</div>',
    '<div>Equipo 2: ' + data.score[1] + '</div>',
    '<div>Posesión: ' + data.possession + '%</div>',
    '<div>Tiempo: ' + data.time + '</div>'
  ].join('');
  stats.setContent(node);
}

function onLeaveRoom() {
  HaxUI.destroyAll();
}
```

Más ejemplos trabajados — scoreboard en vivo, roster de jugadores, chat log,
panel de administración, y un dashboard completo con múltiples ventanas —
están en [`dev/examples.js`](dev/examples.js).

---

## 🗺️ Hoja de Ruta

- [x] **v0 — Core**
  - [x] Creación y destrucción de ventanas
  - [x] Actualización dinámica de contenido
  - [x] Aislamiento con Shadow DOM y fallback CSS
  - [x] Aislamiento de eventos del juego
  - [x] Re-anclaje del DOM en transiciones de HaxBall
- [x] **v1 — Interacción**
  - [x] Ventanas arrastrables (drag & drop)
  - [x] Redimensionado desde las cuatro esquinas
  - [x] Botones con estilo nativo de HaxBall (`createButton`)
  - [x] Tema `haxball` que replica el `.dialog` nativo
  - [x] `hideTitle()` / `showTitle()`
- [ ] **v2 — Componentes**
  - [ ] Sistema de componentes para `setContent()`
  - [ ] Componentes base: texto, tabla, lista, botón
- [ ] **v3 — Plugins**
  - [ ] Registro de plugins con `HaxUI.use(plugin)`
  - [ ] Hooks del ciclo de vida de ventanas para plugins
  - [ ] Cocinar un Pastel

---

## ⚠️ Estado

> **Estado del proyecto:** v1 — drag, resize, botones nativos, y el tema HaxBall son estables. La API pública puede seguir creciendo hacia v2, pero el contrato de v0 está congelado y no se rompe.

---

## 🧠 Filosofía de Diseño

- superficie mínima de API, máximo control
- un nombre global, ningún internal expuesto
- cada decisión trazable a un riesgo real del entorno HaxBall, verificado contra el DOM en vivo
- extensible a v2–v3 sin romper el contrato de API de v0/v1

---

## 📄 Licencia

MIT

---

<p align="center">
  ❤️ <a href=".gitignore">DEVLOG</a>
</p>

<p align="center">
  <img src="https://c.tenor.com/lfDATg4Bhc0AAAAC/tenor.gif" alt="HappyCat" width="30"><br>
  <sub>hecho con mucho amor :)</sub>
</p>
