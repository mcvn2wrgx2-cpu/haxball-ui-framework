<p align="center">
  <img src="banner.png" alt="HaxBall Refluxed Banner" width="100%" />
</p>

# haxball-refluxed

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)
[![Architecture](https://img.shields.io/badge/architecture-plugin--based-purple)](#architecture)
[![Monorepo](https://img.shields.io/badge/monorepo-pnpm--workspaces-orange)](#project-structure)

**HaxBall Refluxed is a TypeScript framework for building modular extensions, UI systems, overlays, and runtime tools for HaxBall.**

It is not a client and not a browser extension.
It is a **framework layer that can be embedded into multiple environments** (browser loader, Electron, or external tooling).

---

# 🧠 Core Idea

Refluxed introduces a **runtime abstraction layer** over HaxBall that enables:

* plugin-based extensibility
* event-driven architecture
* UI + HUD composition system
* shared state runtime
* environment-agnostic execution

Everything is built around a single principle:

> The core never changes — everything else is a plugin.

---

# ⚙️ Architecture

Refluxed is divided into 4 layers:

```
Loader Layer (Browser / Electron)
        ↓
Core Runtime (EventBus + State + Plugins)
        ↓
UI Layer (HUD / Overlays / Themes)
        ↓
Plugin Layer (User-defined extensions)
```

---

# 📦 Project Structure

```txt
haxball-refluxed/
│
├── packages/
│   ├── core/               # Runtime core (event system, plugins)
│   ├── ui/                 # HUD + overlays + themes
│   ├── loader-browser/     # Browser injection loader
│   ├── plugins/            # Example plugins
│
├── examples/
│   └── basic/              # Minimal working example
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── vite.config.ts
└── package.json
```

---

# 🚀 Installation

## 1. Clone repository

```bash
git clone https://github.com/mcvn2wrgx2-cpu/haxball-refluxed
cd haxball-refluxed
```

---

## 2. Install dependencies

```bash
pnpm install
```

---

## 3. Build all packages

```bash
pnpm build
```

---

## 4. Run example

```bash
pnpm --filter basic dev
```

---

# 🧩 Core API

## Create runtime

```ts
import { createRefluxed } from "@refluxed/core";

const app = createRefluxed();
```

---

## Event system

```ts
app.events.on("playerJoin", (player) => {
  console.log(player.name);
});

app.events.emit("toast", {
  message: "Hello world"
});
```

---

## State access

```ts
app.state.score = 10;
console.log(app.state.score);
```

---

# 🔌 Plugin System

Plugins are isolated modules that extend the runtime.

## Plugin structure

```ts
export const MyPlugin = {
  name: "my-plugin",

  onLoad(ctx) {
    ctx.events.on("playerJoin", (player) => {
      ctx.events.emit("toast", {
        message: `${player.name} joined`
      });
    });
  },

  onUnload(ctx) {
    // cleanup logic
  }
};
```

---

## Register plugin

```ts
app.use(MyPlugin);
```

---

## Plugin context

Each plugin receives:

* event bus
* shared state
* runtime hooks

```ts
type PluginContext = {
  events: EventBus;
  state: Record<string, any>;
};
```

---

# 🎨 UI System

The UI layer provides lightweight overlays and HUD components.

## HUD example

```ts
import { HUD } from "@refluxed/ui";

const hud = new HUD();

hud.show("Match started");
```

---

## Behavior

* auto-removes after timeout
* DOM-based overlay system
* minimal performance impact

---

# 🔌 Browser Loader

The browser loader injects the runtime into a HaxBall session.

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

# 🧪 Example Usage

```ts
import { createRefluxed } from "@refluxed/core";
import { ExamplePlugin } from "@refluxed/plugins";

const app = createRefluxed();

app.use(ExamplePlugin);

app.events.emit("playerJoin", {
  name: "Nicolas"
});
```

---

# 🧱 Core Modules

## Event System

* strongly typed event bus
* pub/sub architecture
* zero coupling between modules

---

## Plugin System

* lifecycle hooks (`onLoad`, `onUnload`)
* isolated execution context
* runtime registration/unregistration

---

## State System

* shared mutable runtime state
* plugin-accessible
* minimal global overhead

---

## UI System

* overlay rendering layer
* HUD abstraction
* theme-ready structure (WIP)

---

# 🧪 Build System

Powered by **Vite (library mode)** + TypeScript strict mode.

```bash
pnpm build
```

Outputs:

* ESM build
* type declarations
* tree-shakeable modules

---

# 🗺️ Roadmap

## Phase 1

* core runtime stabilization
* plugin lifecycle finalization

## Phase 2

* hot-reload plugins
* devtools overlay
* event inspector

## Phase 3

* Electron runtime wrapper
* plugin marketplace system
* persistent state layer

---

# ⚠️ Status

This project is in early architectural stage.

* APIs may change
* modules are experimental
* structure is actively evolving

---

# 🧠 Design Philosophy

* framework-first, not client-first
* composition over modification
* plugins over patching
* deterministic runtime behavior
* environment-agnostic design

---

# 📄 License

MIT
