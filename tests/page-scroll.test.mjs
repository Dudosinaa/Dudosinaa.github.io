import test from "node:test";
import assert from "node:assert/strict";
import { setupPageScroll } from "../scripts/page-scroll.js";

function harness(hash = "") {
  const calls = [], listeners = new Map(), targets = new Map();
  const view = {
    history: { scrollRestoration: "auto" }, location: { hash },
    scrollTo: options => calls.push({ top: options }),
    addEventListener: (name, listener) => listeners.set(name, listener)
  };
  const root = { getElementById: id => targets.get(id) };
  const addTarget = id => targets.set(id, { scrollIntoView: options => calls.push({ id, options }) });
  return { view, root, calls, listeners, addTarget };
}

test("Восстановление браузера отключается до загрузки контента; адрес без якоря открывается сверху", async () => {
  const h = harness();
  const restore = setupPageScroll(h);
  assert.equal(h.view.history.scrollRestoration, "manual");
  assert.deepEqual(h.calls, []);
  await restore();
  assert.deepEqual(h.calls, [{ top: { top: 0, left: 0, behavior: "instant" } }]);
});

test("Прямая ссылка открывает указанный раздел после готовности шрифтов", async () => {
  const h = harness("#projects");
  let finishFonts;
  h.root.fonts = { ready: new Promise(resolve => { finishFonts = resolve; }) };
  const restore = setupPageScroll(h);
  const pending = restore();
  await Promise.resolve();
  assert.deepEqual(h.calls, []);
  h.addTarget("projects");
  finishFonts();
  await pending;
  assert.deepEqual(h.calls, [{ id: "projects", options: { behavior: "instant", block: "start" } }]);
});

test("Выбранный во время загрузки раздел сохраняется; закодированные якоря поддерживаются", async () => {
  const h = harness();
  const restore = setupPageScroll(h);
  h.addTarget("мой опыт");
  h.view.location.hash = `#${encodeURIComponent("мой опыт")}`;
  await restore();
  assert.equal(h.calls[0].id, "мой опыт");
});

test("Неизвестный, пустой и повреждённый якорь безопасно открывают первый экран", async () => {
  for (const hash of ["#missing", "#", "#%E0%A4%A"]) {
    const h = harness(hash);
    await setupPageScroll(h)();
    assert.equal(h.calls[0].top.top, 0);
  }
});

test("Возврат из кеша страницы применяет URL; обычный pageshow не сбрасывает прокрутку", async () => {
  const h = harness();
  const restore = setupPageScroll(h);
  await restore();
  h.calls.length = 0;
  h.listeners.get("pageshow")({ persisted: false });
  assert.deepEqual(h.calls, []);
  h.addTarget("experience");
  h.view.location.hash = "#experience";
  h.listeners.get("pageshow")({ persisted: true });
  assert.equal(h.calls[0].id, "experience");
  h.view.location.hash = "";
  h.listeners.get("pageshow")({ persisted: true });
  assert.equal(h.calls[1].top.top, 0);
});

test("Назад и Вперёд между якорем и корнем применяют адрес, сохраняя CSS-режим прокрутки", () => {
  const h = harness();
  setupPageScroll(h);
  h.addTarget("projects");
  h.view.location.hash = "#projects";
  h.listeners.get("hashchange")();
  assert.deepEqual(h.calls[0], { id: "projects", options: { behavior: "auto", block: "start" } });
  h.view.location.hash = "";
  h.listeners.get("hashchange")();
  assert.deepEqual(h.calls[1], { top: { top: 0, left: 0, behavior: "auto" } });
});
