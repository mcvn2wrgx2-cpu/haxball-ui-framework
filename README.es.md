<p align="center">
  <img src="banner.png" alt="HaxBall UI Framework Banner" width="100%" />
</p>

# haxball-ui-framework en Español

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

Todo está construido alrededor de un principio:

> Una API. Un namespace. Control total.

---

## ⚙️ Arquitectura

El framework se divide en 4 capas:

| Capa | Responsabilidad |
| :--- | :--- |
| **RootMount** | Detecta el contexto de ejecución, ancla `#haxui-root` a `document.body`, re-ancla si HaxBall limpia el DOM |
| **Core** | `WindowManager`, `Window`, `EventGuard`, `StyleManager`, `EventRegistry` |
| **API pública** | `window.HaxUI` — el único nombre global expuesto |
| **WindowHandle** | Objeto liviano retornado por ventana — no expone internals |

---

## 📦 Estructura del Proyecto

```txt
haxball-ui-framework/
│
├── core/
│   ├── HaxUI.js            # Punto de entrada de la API pública
│   ├── WindowManager.js    # Registro y ciclo de vida de ventanas
│   ├── Window.js           # Ventana individual con Shadow DOM
│   ├── RootMount.js        # Nodo raíz, detección de contexto, re-anclaje
│   ├── EventGuard.js       # Política por tipo de evento para aislar el juego
│   ├── StyleManager.js     # Estilos base inyectados en cada Shadow Root
│   └── EventRegistry.js    # Registro de listeners para destroy() limpio
│
├── constants/
│   └── config.js           # BASE_Z_INDEX, namespace, modos de operación
│
├── utils/
│   └── sanitize.js         # Wrapper de DOMParser para setContent() seguro
│
├── dev/
│   └── playground.js       # Pruebas manuales y ejemplos en consola
│
├── build.js                # Concatena los módulos en un bundle IIFE único
├── package.json
└── haxball-ui.bundle.js    # Output generado — esto es lo que se inyecta en HaxBall
```

---

## 🚀 Inicio Rápido

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/haxball-ui-framework
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
  content: '<p>Cargando...</p>'
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

### Mostrar / ocultar

```js
win.show();
win.hide();
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

---

## 🗺️ Hoja de Ruta

- [x] **v0 — Core**
  - [x] Creación y destrucción de ventanas
  - [x] Actualización dinámica de contenido
  - [x] Aislamiento con Shadow DOM y fallback CSS
  - [x] Aislamiento de eventos del juego
  - [x] Re-anclaje del DOM en transiciones de HaxBall
- [ ] **v1 — Interacción**
  - [ ] Ventanas arrastrables (drag & drop)
  - [ ] Redimensionar desde los bordes
- [ ] **v2 — Componentes**
  - [ ] Sistema de componentes para `setContent()`
  - [ ] Componentes base: texto, tabla, lista, botón
- [ ] **v3 — Plugins**
  - [ ] Registro de plugins con `HaxUI.use(plugin)`
  - [ ] Hooks del ciclo de vida de ventanas para plugins

---

## ⚠️ Estado

> **Estado del proyecto:** v0 — arquitectura core estable, las APIs pueden seguir evolucionando.

---

## 🧠 Filosofía de Diseño

- superficie mínima de API, máximo control
- un nombre global, ningún internal expuesto
- cada decisión trazable a un riesgo real del entorno HaxBall
- extensible a v1–v3 sin romper el contrato de API del v0

---

## 📄 Licencia

MIT

---

<p align="center">
  <img src="https://c.tenor.com/lfDATg4Bhc0AAAAC/tenor.gif" alt="HappyCat" width="30"><br>
  <sub>hecho con mucho amor :)</sub>
</p>
