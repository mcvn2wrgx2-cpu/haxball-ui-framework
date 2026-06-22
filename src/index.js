// src/index.js — public entry point for haxball-ui-framework npm package

export { default } from './core/HaxUI.js';
export {
  createWindow,
  getWindow,
  destroyWindow,
  destroyAll,
  diagnostics
} from './core/HaxUI.js';

// Sub-modules for advanced users
export * as config       from './constants/config.js';
export * as Sanitize     from './utils/sanitize.js';
export { StyleManager }  from './core/StyleManager.js';
export { EventGuard }    from './core/EventGuard.js';
export { DragManager }   from './core/DragManager.js';
export { ResizeManager } from './core/ResizeManager.js';
export { RootMount }     from './core/RootMount.js';
