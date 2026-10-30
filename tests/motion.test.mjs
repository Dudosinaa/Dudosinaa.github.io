import test from "node:test";
import assert from "node:assert/strict";
import { setupReveals } from "../scripts/motion.js";

function harness({ reduced = false, observer = true } = {}) {
  const nodes = [], observers = [], mutations = [], listeners = new Set();
  const root = { activeElement: null, querySelectorAll: () => nodes, querySelector: () => root };
  const media = { matches: reduced, addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) };
  class Intersection {
    constructor(callback, options) { this.callback = callback; this.options = options; this.nodes = new Set(); observers.push(this); }
    observe(node) { this.nodes.add(node); }
    unobserve(node) { this.nodes.delete(node); }
    disconnect() { this.nodes.clear(); }
    emit(node, isIntersecting) { if (this.nodes.has(node)) this.callback([{ target: node, isIntersecting }]); }
  }
  class Mutation {
    constructor(callback) { this.callback = callback; this.connected = true; mutations.push(this); }
    observe() {}
    disconnect() { this.connected = false; }
  }
  const view = { matchMedia: () => media, MutationObserver: Mutation };
  if (observer) view.IntersectionObserver = Intersection;
  function addNode() {
    const classes = new Set();
    const node = {
      starts: 0, isConnected: true, style: { setProperty() {} },
      parentElement: { children: nodes }, matches: () => true,
      contains: value => value === node,
      classList: { add(name) { if (!classes.has(name)) node.starts++; classes.add(name); }, remove: name => classes.delete(name), contains: name => classes.has(name) }
    };
    nodes.push(node);
    return node;
  }
  return {
    root, view, observers, addNode,
    mutate() { for (const item of mutations) if (item.connected) item.callback(); },
    reduce(value) { media.matches = value; for (const listener of listeners) listener(); }
  };
}

test("Появление повторяется только после полного выхода, мелкие пересечения не перезапускают его", () => {
  const h = harness(), node = h.addNode();
  setupReveals(h);
  const [enter, exit] = h.observers;
  assert.equal(node.classList.contains("reveal"), false);
  enter.emit(node, true);
  assert.equal(node.starts, 1);
  enter.emit(node, false);
  enter.emit(node, true);
  exit.emit(node, true);
  assert.equal(node.starts, 1);
  exit.emit(node, false);
  assert.equal(node.classList.contains("reveal"), false);
  enter.emit(node, true);
  assert.equal(node.starts, 2);
  // Re-entry is independent of scroll direction and of the percentage visible.
  assert.equal(enter.options.threshold, 0);
});

test("Новые карточки после загрузки/фильтрации наблюдаются, удалённые освобождаются", () => {
  const h = harness(), oldNode = h.addNode();
  setupReveals(h);
  const newNode = h.addNode();
  oldNode.isConnected = false;
  h.root.querySelectorAll = () => [newNode];
  h.mutate();
  const [enter, exit] = h.observers;
  assert.equal(enter.nodes.has(oldNode), false);
  assert.equal(exit.nodes.has(oldNode), false);
  enter.emit(newNode, true);
  assert.equal(newNode.starts, 1);
  exit.emit(newNode, false);
  enter.emit(newNode, true);
  assert.equal(newNode.starts, 2);
});

test("Карточка с клавиатурным фокусом не получает появление со смещением", () => {
  const h = harness(), node = h.addNode();
  h.root.activeElement = node;
  setupReveals(h);
  h.observers[0].emit(node, true);
  assert.equal(node.starts, 0);
  assert.equal(h.root.activeElement, node);
});

test("Reduced motion отключает появление сразу и при изменении настройки во время работы", () => {
  const h = harness({ reduced: true }), node = h.addNode();
  const controller = setupReveals(h);
  assert.equal(h.observers.length, 0);
  h.reduce(false);
  h.observers[0].emit(node, true);
  assert.equal(node.classList.contains("reveal"), true);
  h.reduce(true);
  assert.equal(node.classList.contains("reveal"), false);
  assert.equal(h.observers[0].nodes.size, 0);
  controller.destroy();
});

test("Без IntersectionObserver содержимое остаётся обычным видимым DOM", () => {
  const h = harness({ observer: false }), node = h.addNode();
  assert.doesNotThrow(() => setupReveals(h));
  assert.equal(node.starts, 0);
  assert.equal(node.classList.contains("reveal"), false);
});
