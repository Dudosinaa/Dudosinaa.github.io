import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { once } from "node:events";
import { textValue, listValue, localAsset, safeLink, doiLink, projectCategories, filterProjects, fetchJSON, availablePDF } from "../scripts/content.js";
import { createPreviewServer } from "../scripts/serve.mjs";

const root = new URL("../", import.meta.url);
const json = async filename => JSON.parse(await readFile(new URL(`content/${filename}.json`, root), "utf8"));
// Якоря и порядок проверяются в активном HTML, без временно отключённых блоков.
const activeHTML = async () => (await readFile(new URL("index.html", root), "utf8")).replace(/<!--[\s\S]*?-->/g, "");

test("Все файлы контента читаются и содержат ожидаемые поля", async () => {
  const profile = await json("profile");
  assert.equal(typeof profile.isExample, "boolean");
  assert.ok(textValue(profile.name));
  if (profile.name === "Ваше имя") assert.equal(profile.isExample, true);
  if (profile.resume.path) {
    assert.ok(localAsset(profile.resume.path, "https://example.com/repository/"));
    await access(new URL(profile.resume.path, root));
  }
  for (const name of ["skills", "projects", "experience", "forums", "articles", "photos"]) assert.ok(Array.isArray(await json(name)));
  assert.ok(Array.isArray((await json("contacts")).items));
});

test("Демонстрационные записи помечены; реальные сведения можно добавлять без изменения тестов", async () => {
  for (const file of ["skills", "projects", "experience", "forums", "articles"]) {
    for (const entry of await json(file)) {
      assert.equal(typeof entry.isExample, "boolean", `${file}: ${entry.title}`);
      if (/^Пример|Здесь можно|Замените инструменты|Укажите свой реальный/.test(entry.description)) assert.equal(entry.isExample, true, `${file}: ${entry.title}`);
    }
  }
  for (const photo of await json("photos")) {
    assert.equal(typeof photo.isPlaceholder, "boolean");
    if (photo.alt.startsWith("Графическая заглушка:")) assert.equal(photo.isPlaceholder, true);
  }
  for (const contact of (await json("contacts")).items) {
    if (contact.url) assert.ok(safeLink(contact.url, { email: true }));
  }
});

test("Все обложки и фотографии существуют и имеют alt", async () => {
  for (const project of await json("projects")) {
    assert.ok(project.title && project.description && project.contribution);
    assert.ok(project.coverAlt);
    assert.ok(project.technologies.length);
    await access(new URL(project.cover, root));
  }
  for (const photo of await json("photos")) {
    assert.ok(photo.alt);
    await access(new URL(photo.src, root));
  }
  await access(new URL("assets/images/orbit.webp", root));
});

test("Корневой адрес и адрес репозитория сохраняются в путях медиа", () => {
  for (const base of ["https://name.github.io/", "https://name.github.io/repository/"]) {
    assert.equal(localAsset("assets/resume/моё резюме.pdf", base), new URL("assets/resume/моё резюме.pdf", base).href);
    assert.equal(localAsset("./assets/images/orbit.svg", base), `${base}assets/images/orbit.svg`);
  }
});

test("Пустые, внешние и выходящие за каталог пути не становятся медиа или PDF", () => {
  const base = "https://name.github.io/repository/";
  for (const path of [null, "", "/resume.pdf", "../resume.pdf", "//other.com/p.pdf", "javascript:alert(1)", "https://other.com/a.pdf", "%2e%2e/a.pdf", "..%5ca.pdf"]) assert.equal(localAsset(path, base), null, String(path));
});

test("Допускаются только безопасные контакты и ссылки", () => {
  assert.equal(safeLink("https://github.com/example/project"), "https://github.com/example/project");
  assert.equal(safeLink("mailto:person@example.com", { email: true }), "mailto:person@example.com");
  for (const value of [null, "", "#", "javascript:alert(1)", "data:text/html,x", "http://example.com", "https://user:pass@example.com"]) assert.equal(safeLink(value), null);
  assert.equal(safeLink("mailto:person@example.com"), null);
  assert.equal(safeLink("mailto:not-an-email", { email: true }), null);
});

test("Фильтры сохраняют порядок данных и не теряют проекты без категории", () => {
  const projects = [{ title: "A", category: "LLM" }, { title: "B", category: "NLP" }, { title: "C", category: "LLM" }, { title: "D" }];
  assert.deepEqual(projectCategories(projects), ["LLM", "NLP"]);
  assert.deepEqual(filterProjects(projects, "LLM").map(p => p.title), ["A", "C"]);
  assert.deepEqual(filterProjects(projects).map(p => p.title), ["A", "B", "C", "D"]);
  assert.deepEqual(filterProjects([], "LLM"), []);
});

test("Необязательные значения имеют безопасные значения по умолчанию", () => {
  assert.equal(textValue(null), "");
  assert.equal(textValue("  ", "Проект"), "Проект");
  assert.deepEqual(listValue(null), []);
  assert.deepEqual(projectCategories(null), []);
  assert.deepEqual(filterProjects([null, { title: "A" }]), [{ title: "A" }]);
});

test("Ошибки HTTP и повреждённый JSON не маскируются", async () => {
  await assert.rejects(fetchJSON("/data.json", async () => new Response("missing", { status: 404 })), /404/);
  await assert.rejects(fetchJSON("/data.json", async () => new Response("{")), SyntaxError);
  assert.deepEqual(await fetchJSON("/data.json", async () => new Response('{"ok":true}')), { ok: true });
});

test("Скачивание разрешается только для доступного PDF с настоящей сигнатурой", async () => {
  assert.equal(await availablePDF(null), false);
  assert.equal(await availablePDF("/resume.pdf", async () => new Response("Not found", { status: 404 })), false);
  assert.equal(await availablePDF("/resume.pdf", async () => new Response("<!doctype html>")), false);
  assert.equal(await availablePDF("/resume.pdf", async () => { throw new Error("offline"); }), false);
  assert.equal(await availablePDF("/resume.pdf", async () => new Response("%PDF-1.7\ncontent")), true);
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("%P")); controller.enqueue(new TextEncoder().encode("DF-1.7")); controller.close(); } });
  assert.equal(await availablePDF("/resume.pdf", async () => new Response(stream)), true);
});

test("Все якоря существуют, HTML-ресурсы используют относительные пути", async () => {
  const html = await activeHTML();
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, anchor] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor), anchor);
  for (const [, path] of html.matchAll(/(?:href|src)="(\.\/[^"#]+)"/g)) await access(new URL(path, root));
  assert.ok(!/(?:href|src)="\//.test(html));
  assert.ok(html.includes('lang="ru"'));
});

test("Разделы без материалов отсутствуют в интерфейсе, включая меню, CTA и диалог", async () => {
  const html = await activeHTML();
  for (const id of ["articles", "photos", "resume"]) {
    assert.ok(!new RegExp(`(?:id|href)="(?:#)?${id}(?:-[^"]*)?"`).test(html), id);
    assert.ok(!html.includes(`data-bind="sections.${id}.`), id);
  }
  assert.ok(!/data-bind="(?:resume\.|hero\.secondaryAction)/.test(html));
  assert.ok(!/<dialog\b|\bdownload(?:\s|=|>)/.test(html));
  assert.ok(!/статьи|фотограф|резюме/i.test(html));
  assert.deepEqual([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]), ["home", "about", "skills", "projects", "experience", "forums", "contacts"]);
  const nav = html.match(/<nav\b[^>]*id="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  assert.deepEqual([...nav.matchAll(/href="#([^"]+)"/g)].map(match => match[1]), ["about", "skills", "projects", "experience", "forums", "contacts"]);
});

test("HTTP-просмотр: сайт, JSON и изображения работают в корне и подпапке", async () => {
  for (const basePath of ["/", "/repository/"]) {
    const server = createPreviewServer({ basePath });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const base = `http://127.0.0.1:${server.address().port}${basePath}`;
      for (const path of ["", "styles/main.css", "styles/theme-tf2.css", "scripts/app.js", "scripts/content.js", "scripts/motion.js", "content/profile.json", "content/projects.json", "content/forums.json", "content/articles.json", "assets/images/tf2/industrial-yard.webp", "assets/images/tf2/engineer-cutout.webp", "assets/textures/workshop-grain.svg", "assets/fonts/RobotoCondensed-Variable.ttf", "assets/images/orbit.webp", "assets/images/projects/knowledge.svg", "assets/images/photos/landscape.svg"]) {
        const response = await fetch(base + path);
        assert.equal(response.status, 200, base + path);
        await response.arrayBuffer();
      }
      const missing = await fetch(base + "assets/resume/missing.pdf");
      assert.equal(missing.status, 404);
      const hidden = await fetch(base + ".git/config");
      assert.equal(hidden.status, 403);
      const head = await fetch(base, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), "");
      const post = await fetch(base, { method: "POST" });
      assert.equal(post.status, 405);
    } finally {
      server.closeAllConnections();
      await new Promise(resolve => server.close(resolve));
    }
  }
});

test("Форумы и статьи: метаданные, пометки примеров и необязательные ссылки", async () => {
  for (const forum of await json("forums")) {
    for (const key of ["title", "period", "location", "role", "description"]) assert.ok(textValue(forum[key]), key);
    if (forum.link) assert.ok(safeLink(forum.link));
  }
  for (const article of await json("articles")) {
    assert.ok(textValue(article.title));
    assert.ok(Array.isArray(article.authors));
    assert.ok(article.authors.every(author => textValue(author)));
    assert.ok(article.year && textValue(article.venue) && textValue(article.description));
    if (article.link) assert.ok(safeLink(article.link));
    if (article.doi) assert.ok(doiLink(article.doi));
    if (article.pdf) {
      assert.ok(localAsset(article.pdf, "https://example.com/repository/"));
      await access(new URL(article.pdf, root));
    }
  }
  const html = await activeHTML();
  const order = ["experience", "forums", "contacts"].map(id => html.indexOf(`id="${id}"`));
  assert.ok(order.every((position, i) => position > 0 && (i === 0 || position > order[i - 1])));
});

test("DOI поддерживает идентификатор и официальный HTTPS-адрес, отклоняет небезопасные значения", () => {
  assert.equal(doiLink("10.1234/test-paper"), "https://doi.org/10.1234/test-paper");
  assert.equal(doiLink("https://doi.org/10.1234/test-paper"), "https://doi.org/10.1234/test-paper");
  assert.equal(doiLink("10.1234/paper#part"), "https://doi.org/10.1234/paper%23part");
  for (const value of [null, "", "javascript:alert(1)", "https://other.com/10.1234/a", "10.12/short", "10.1234/has space", "10.1234/<script>", "10.1234/has\nnewline"]) {
    assert.equal(doiLink(value), null, String(value));
  }
});

test("Семантическая палитра обеспечивает контраст текста и кнопок", async () => {
  const css = await readFile(new URL("styles/main.css", root), "utf8");
  const color = name => css.match(new RegExp(`--${name}: (#[a-f0-9]{6})`))[1];
  const luminance = hex => {
    const [r, g, b] = hex.slice(1).match(/../g).map(value => {
      const n = parseInt(value, 16) / 255;
      return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4;
    });
    return r * .2126 + g * .7152 + b * .0722;
  };
  const contrast = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return (light + .05) / (dark + .05);
  };
  assert.equal(color("background"), "#2b2724");
  assert.equal(color("surface"), "#39332e");
  assert.equal(color("accent"), "#9e3d2c");
  assert.equal(color("text"), "#f0e4cc");
  for (const foreground of ["text", "text-muted", "text-subtle", "link"]) {
    for (const background of ["background", "surface", "surface-raised"]) assert.ok(contrast(color(foreground), color(background)) >= 4.5, `${foreground} / ${background}`);
  }
  for (const foreground of ["paper-ink", "paper-muted", "paper-subtle", "accent"]) assert.ok(contrast(color(foreground), color("paper")) >= 4.5, `${foreground} / paper`);
  for (const background of ["accent", "accent-hover"]) assert.ok(contrast(color("button-text"), color(background)) >= 4.5, `button-text / ${background}`);
  assert.ok(!/#(?:002626|0e4749|95c623|a8d942)/i.test(css));
});

test("Первый экран использует два отдельных ресурса; персонаж имеет альфа-канал", async () => {
  const html = await activeHTML();
  const backdrop = html.match(/<img class="hero-backdrop"[^>]+src="([^"]+)"[^>]+>/)?.[1];
  const engineer = html.match(/<img class="hero-engineer"[^>]+src="([^"]+)"[^>]+>/)?.[1];
  assert.ok(backdrop && engineer);
  assert.notEqual(backdrop, engineer);
  assert.ok(!html.includes('class="hero-computer"'));
  await access(new URL(backdrop, root));
  const buffer = await readFile(new URL(engineer, root));
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  assert.equal(buffer.toString("ascii", 12, 16), "VP8X");
  assert.ok(buffer[20] & 0x10, "WebP содержит настоящий alpha channel");
  const theme = await readFile(new URL("styles/theme-tf2.css", root), "utf8");
  assert.ok(theme.includes("--hero-background-position"));
  assert.ok(theme.includes("--engineer-width"));
  for (const [, path] of theme.matchAll(/url\("([^"#]+)"\)/g)) await access(new URL(path, new URL("styles/", root)));
});
