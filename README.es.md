<p align="center">
  <img src="banner.png" alt="HaxBall Refluxed Banner" width="100%" />
</p>

# haxball-refluxed en Español

<p align="center">
  🇪🇸 Español | <a href="README.md">🇺🇸 English</a>
</p>

<p align="center">
<a href="LICENSE">
  <img src="https://img.shields.io/badge/license-MIT-000000.svg?style=flat-square" alt="License">
</a>
<a href="https://www.typescriptlang.org/">
  <img src="https://img.shields.io/badge/TypeScript-Strict-007acc.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
</a>
<a href="#architecture">
  <img src="https://img.shields.io/badge/Architecture-Plugin--Based-7b2cbf.svg?style=flat-square" alt="Architecture">
</a>
<a href="#project-structure">
  <img src="https://img.shields.io/badge/Monorepo-pnpm--workspaces-f69220.svg?style=flat-square&logo=pnpm&logoColor=white" alt="Monorepo">
</a>
<a href="#project-structure">
  <img src="https://img.shields.io/badge/contributions-welcome-000000.svg?style=flat-square&logo=git&logoColor=white" alt="Contributions Welcome">
</a>
</p>


**HaxBall Refluxed es un framework de TypeScript para crear extensiones modulares, sistemas de interfaz de usuario, superposiciones y herramientas de ejecución para HaxBall.**

No es un cliente ni una extensión de navegador.

Es una **capa de framework que se puede integrar en múltiples entornos** (cargador de navegador, Electron o herramientas externas).

---

# 🧠 Idea principal

Refluxed introduce una **capa de abstracción en tiempo de ejecución** sobre HaxBall que permite:

* Extensibilidad mediante plugins
* Arquitectura basada en eventos
* Sistema de composición de interfaz de usuario y HUD
* Tiempo de ejecución con estado compartido
* Ejecución independiente del entorno

Todo se basa en un principio fundamental:

> El núcleo permanece inmutable; todo lo demás es un plugin.

---

# ⚙️ Arquitectura

Refluxed se divide en 4 capas:

| Capa | Responsabilidad |
| :--- | :--- |
| **Capa de carga** | Inyección del navegador / Arranque del entorno Electron |
| **Entorno de ejecución principal** | Orquestación de EventBus, estado compartido y ciclo de vida de los plugins |
| **Capa de interfaz de usuario** | Renderizado de HUD, superposiciones responsivas y temas personalizados |
| **Capa de plugins** | Extensiones personalizadas definidas por el usuario y hooks de tiempo de ejecución |

---

# 📦 Estructura del proyecto

```txt
haxball-refluxed/
│
├── packages/
│ ├── core/ # Núcleo de ejecución (sistema de eventos, plugins)
│ ├── ui/ # HUD + superposiciones + temas
│ ├── loader-browser/ # Cargador de inyección del navegador
│ ├── plugins/ # Plugins de ejemplo
│
├── examples/
│ └── basic/ # Ejemplo mínimo funcional
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vite.config.ts
└── package.json
```

---

# 🚀 Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/mcvn2wrgx2-cpu/haxball-refluxed
cd haxball-refluxed
```

---

## 2. Instalar dependencias

```bash
pnpm install
```

---

## 3. Compilar todos los paquetes

```bash
pnpm build
```

---

## 4. Ejecutar el ejemplo

```bash
pnpm --filter basic dev
```
---

# 🧩 API principal

## Crear entorno de ejecución

```ts
import { createRefluxed } from "@refluxed/core";

const app = createRefluxed();

```

---

## Sistema de eventos

```ts
app.events.on("playerJoin", (player) => {
console.log(player.name);
});

app.events.emit("toast", {
message: "Hola mundo"
});

```

---

## Acceso al estado

```ts
app.state.score = 10;
console.log(app.state.score);

```

---

# 🔌 Sistema de complementos

Los plugins son módulos aislados que extienden el entorno de ejecución.

## Estructura del plugin

```ts
export const MyPlugin = {
name: "my-plugin",

onLoad(ctx) {
ctx.events.on("playerJoin", (player) => {
ctx.events.emit("toast", {
message: `${player.name} se ha unido`

});
});

},

onUnload(ctx) {

// lógica de limpieza

}
};

```

---

## Registrar plugin

```ts
app.use(MyPlugin);

```

---

## Contexto del plugin

Cada plugin recibe:

* bus de eventos
* estado compartido
* ganchos de ejecución

```ts
type PluginContext = {

events: EventBus;

state: Record<string, any>; };
```

---

# 🎨 Sistema de interfaz de usuario

La capa de interfaz de usuario proporciona superposiciones ligeras y componentes HUD.

## Ejemplo de HUD

```ts
import { HUD } from "@refluxed/ui";

const hud = new HUD();

hud.show("Combate iniciado");

```

---

## Comportamiento

* Se elimina automáticamente tras un tiempo de espera
* Sistema de superposición basado en DOM
* Mínimo impacto en el rendimiento

---

# 🔌 Cargador del navegador

El cargador del navegador inyecta el entorno de ejecución en una sesión de HaxBall.

```ts
import { createRefluxed } from "@refluxed/core";

import { HUD } from "@refluxed/ui";

const app = createRefluxed();

const hud = new HUD();

app.events.on("toast", (p) => {
hud.show(p.message);
});

(window as any).refluxed = app;

```

---

# 🧪 Ejemplo de uso

```ts
import { createRefluxed } from "@refluxed/core";

import { ExamplePlugin } from "@refluxed/plugins";

const app = createRefluxed();

app.use(ExamplePlugin);

app.events.emit("playerJoin", {
name: "mcvn"
});
```

---

# 🧱 Módulos principales

## Sistema de eventos

* Bus de eventos fuertemente tipado
* Arquitectura de publicación/suscripción
* Acoplamiento nulo entre módulos

---

## Sistema de plugins

* Ganchos del ciclo de vida (`onLoad`, `onUnload`)
* Contexto de ejecución aislado
* Registro/cancelación de registro en tiempo de ejecución

---

## Sistema de estado

* Estado compartido y mutable en tiempo de ejecución
* Accesible mediante plugins
* Mínima sobrecarga global

---

## Sistema de interfaz de usuario

* Capa de renderizado superpuesta
* Abstracción de HUD
* Estructura lista para temas (en desarrollo)
---

# 🧪 Sistema de compilación

Con tecnología **Vite (modo librería)** + TypeScript en modo estricto.

```bash
pnpm build
```

Salida:

* Compilación ESM
* Declaraciones de tipo
* Módulos optimizados para eliminación de código muerto

---

# 🗺️ Hoja de ruta

- [x] **Fase 1: Fundamentos**
  - [x] Estabilización del entorno de ejecución principal
  - [x] Finalización del ciclo de vida de los plugins
- [ ] **Fase 2: Experiencia del desarrollador**
  - [ ] Plugins de recarga en caliente
  - [ ] Superposición de herramientas de desarrollo e inspector de eventos
- [ ] **Fase 3: Ecosistema**
  - [ ] Envoltorio de tiempo de ejecución de Electron
  - [ ] Sistema de mercado de plugins y capa de estado persistente
  - [ ] Cocinar un pastel
 
---

# ⚠️ Estado

> **Estado del proyecto:** Este proyecto se encuentra en una fase arquitectónica temprana. Las API pueden cambiar con frecuencia, los módulos son altamente experimentales y la estructura está en constante evolución.

---

# 🧠 Filosofía de diseño

* Prioridad al framework, no al cliente
* Composición sobre modificación
* Plugins sobre parches
* Comportamiento determinista en tiempo de ejecución
* Diseño independiente del entorno

---

# 📄 Licencia

MIT

---

<p align="center">
  <img src="https://c.tenor.com/lfDATg4Bhc0AAAAC/tenor.gif" alt="HappyCat" width="30"><br>
  <sub>hecho con mucho amor :)</sub>
</p>
