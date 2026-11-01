import { textValue, listValue, localAsset, safeLink, projectCategories, filterProjects, fetchJSON } from "./content.js";
// TEMP articles:import — материалов пока нет. Вернуть вместе с articles:render и articles:load.
// import { doiLink } from "./content.js";
// TEMP pdf:import — статьи и резюме отключены до появления материалов. Вернуть при восстановлении любого из них.
// import { availablePDF } from "./content.js";
import { setupReveals } from "./motion.js";
import { setupPageScroll } from "./page-scroll.js";

const restorePageScroll = setupPageScroll();

const siteRoot = new URL("../", import.meta.url);
const $ = selector => document.querySelector(selector);
const iconPaths = {
  orbit: '<ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(35 12 12)"/><circle cx="12" cy="12" r="2"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8l10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8m-8 4h6"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z"/>',
  github: '<path d="M9 19c-4.3 1.3-4.3-2.2-6-2.7m12 5v-3.8a3.3 3.3 0 0 0-.9-2.6c3-.3 6.2-1.5 6.2-6.8a5.3 5.3 0 0 0-1.4-3.7 4.9 4.9 0 0 0-.1-3.7s-1.1-.4-3.8 1.4a13 13 0 0 0-6.8 0C5.5.3 4.4.7 4.4.7a4.9 4.9 0 0 0-.1 3.7 5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.2 6.5 6.2 6.8a3.3 3.3 0 0 0-.9 2.6v3.8"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>'
};

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function icon(name, className = "icon-slot") {
  const slot = element("span", className);
  slot.setAttribute("aria-hidden", "true");
  // Only these authored SVG paths are used; content is always inserted as text.
  slot.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round">${iconPaths[name] || iconPaths.arrow}</svg>`;
  return slot;
}

function badge(label = "Пример проекта") {
  return element("span", "example-badge", label);
}

function image(path, alt, className = "") {
  const img = element("img", className);
  img.src = localAsset(path, siteRoot) || new URL("assets/images/placeholder.svg", siteRoot).href;
  img.alt = textValue(alt);
  img.width = 1200;
  img.height = 900;
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => {
    img.src = new URL("assets/images/placeholder.svg", siteRoot).href;
  }, { once: true });
  return img;
}

function tags(items) {
  const list = element("ul", "tag-list");
  for (const item of listValue(items).filter(item => textValue(item))) list.append(element("li", "tag", item));
  return list;
}

function emptyState(target, title, description) {
  const box = element("div", "empty-state");
  box.append(element("h3", "", title), element("p", "", description));
  target.replaceChildren(box);
}

function contentError(target, filename, retry) {
  const box = element("div", "load-error");
  box.setAttribute("role", "status");
  box.append(element("h3", "", "Не удалось загрузить содержимое"), element("p", "", `Проверьте подключение и файл content/${filename}. Для локального просмотра запустите HTTP-сервер по инструкции в README.`));
  const button = element("button", "button button-secondary", "Повторить загрузку");
  button.type = "button";
  button.addEventListener("click", retry);
  box.append(button);
  target.replaceChildren(box);
  target.hidden = false;
}

function bindProfile(profile) {
  for (const node of document.querySelectorAll("[data-bind]")) {
    const value = node.dataset.bind.split(".").reduce((parent, key) => parent?.[key], profile);
    if (typeof value === "string") {
      node.textContent = value;
      if (node.tagName === "P") node.hidden = !textValue(value);
    }
  }
  document.title = textValue(profile.pageTitle, `${textValue(profile.name, "Портфолио")} — Искусственный интеллект`);
  if (profile.description) $('meta[name="description"]').content = profile.description;
  const overview = $("#overview");
  overview.replaceChildren();
  for (const item of listValue(profile.overview)) {
    const card = element("div", "overview-item");
    const copy = element("div");
    copy.append(element("small", "", textValue(item.label)), element("p", "", textValue(item.value)));
    card.append(icon(item.icon), copy);
    overview.append(card);
  }
  overview.hidden = overview.children.length === 0;
  const about = profile.about || {};
  const story = $("#about-story");
  story.replaceChildren();
  if (about.lead) story.append(element("h3", "", about.lead));
  for (const paragraph of listValue(about.paragraphs)) story.append(element("p", "", textValue(paragraph)));
  if (about.note) story.append(element("p", "story-note", about.note));
  const portrait = $("#portrait-panel");
  portrait.replaceChildren();
  if (localAsset(about.portrait, siteRoot)) {
    portrait.append(image(about.portrait, about.portraitAlt));
  } else {
    const placeholder = element("div", "portrait-placeholder");
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.append(icon("person", "portrait-outline"));
    portrait.append(placeholder);
  }
  if (about.portraitCaption) portrait.append(element("figcaption", "", about.portraitCaption));
  // TEMP resume:bind — PDF пока нет. Вернуть вместе с resume:render и блоками resume в index.html.
  // renderResume(profile.resume || {});
}

function renderSkills(data) {
  const target = $("#skills-list");
  target.replaceChildren();
  for (const skill of listValue(data).filter(Boolean)) {
    const card = element("article", "panel skill-card");
    const top = element("div", "skill-top");
    top.append(icon(skill.icon, "skill-icon"));
    card.append(top, element("h3", "", textValue(skill.title, "Группа навыков")));
    if (skill.description) card.append(element("p", "", skill.description));
    if (listValue(skill.items).length) card.append(tags(skill.items));
    target.append(card);
  }
  if (!target.children.length) emptyState(target, "Навыки скоро появятся", "Список навыков пока не заполнен.");
}

function projectCard(project, index) {
  const card = element("article", `panel project-card${project.featured ? " featured" : ""}`);
  const cover = element("div", "project-cover");
  cover.append(image(project.cover, project.coverAlt), element("span", "project-cover-label", `ПРОЕКТ / ${String(index + 1).padStart(2, "0")}`));
  const body = element("div", "project-body");
  const meta = element("div", "project-meta");
  if (project.category) meta.append(element("span", "project-category", project.category));
  if (meta.children.length) body.append(meta);
  body.append(element("h3", "", textValue(project.title, "Проект")));
  if (project.description) body.append(element("p", "project-description", project.description));
  const details = element("dl", "project-details");
  for (const [label, value] of [["Мой вклад", project.contribution], ["Результат", project.result]]) {
    if (!textValue(value)) continue;
    const row = element("div");
    row.append(element("dt", "", label), element("dd", "", value));
    details.append(row);
  }
  if (details.children.length) body.append(details);
  if (listValue(project.technologies).length) body.append(tags(project.technologies));
  const links = element("div", "project-links");
  for (const [value, label, iconName] of [[project.repository, "Репозиторий", "github"], [project.demo, "Демонстрация", "arrow"]]) {
    const url = safeLink(value);
    if (!url) continue;
    const link = element("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${label}: ${textValue(project.title, "проект")} (новая вкладка)`);
    link.append(icon(iconName), element("span", "", label));
    links.append(link);
  }
  if (links.children.length) body.append(links);
  card.append(cover, body);
  return card;
}

function renderProjects(data) {
  const projects = listValue(data).filter(project => project && textValue(project.title));
  const target = $("#projects-list");
  const filters = $("#project-filters");
  filters.replaceChildren();
  function display(category = "") {
    target.replaceChildren();
    const visible = filterProjects(projects, category);
    for (const project of visible) target.append(projectCard(project, projects.indexOf(project)));
    $("#project-count").textContent = `Показано проектов: ${visible.length} из ${projects.length}`;
    for (const button of filters.children) button.setAttribute("aria-pressed", String(button.dataset.category === category));
    if (!visible.length) emptyState(target, "Проекты скоро появятся", "Список работ пока не заполнен.");
  }
  for (const category of ["", ...projectCategories(projects)]) {
    const button = element("button", "filter");
    button.type = "button";
    button.dataset.category = category;
    button.setAttribute("aria-pressed", String(!category));
    button.append(element("span", "", category || "Все проекты"), element("span", "filter-count", String(filterProjects(projects, category).length).padStart(2, "0")));
    button.addEventListener("click", () => display(category));
    filters.append(button);
  }
  filters.hidden = projectCategories(projects).length < 2;
  display();
}

function renderExperience(data) {
  const target = $("#experience-list");
  target.replaceChildren();
  for (const entry of listValue(data).filter(Boolean)) {
    const article = element("article", "timeline-item");
    const meta = element("div", "timeline-meta");
    if (entry.period) meta.append(element("span", "", entry.period));
    if (!entry.isExample && entry.type) meta.append(element("span", "project-category", entry.type));
    if (meta.children.length) article.append(meta);
    article.append(element("h3", "", textValue(entry.title, "Этап опыта")));
    if (entry.organization) article.append(element("p", "timeline-organization", entry.organization));
    if (entry.description) article.append(element("p", "", entry.description));
    if (listValue(entry.highlights).length) {
      const list = element("ul");
      for (const highlight of entry.highlights) if (textValue(highlight)) list.append(element("li", "", highlight));
      if (list.children.length) article.append(list);
    }
    target.append(article);
  }
  if (!target.children.length) emptyState(target, "История пока не заполнена", "Информация об опыте появится здесь.");
}

function recordTop(iconName, exampleLabel, isExample) {
  const top = element("div", "record-top");
  top.append(icon(iconName, "record-icon"));
  return top;
}

function externalLink(url, label, title) {
  if (!url) return null;
  const link = element("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", `${label}: ${title} (новая вкладка)`);
  link.append(element("span", "", label), icon("arrow"));
  return link;
}

function renderForums(data) {
  const target = $("#forums-list");
  target.replaceChildren();
  for (const forum of listValue(data).filter(entry => entry && textValue(entry.title))) {
    const card = element("article", "panel forum-card");
    card.append(recordTop("message", "Пример участия", forum.isExample));
    const meta = element("div", "record-meta");
    if (textValue(forum.period)) meta.append(element("span", "", forum.period));
    if (textValue(forum.location)) meta.append(element("span", "", forum.location));
    if (meta.children.length) card.append(meta);
    card.append(element("h3", "", forum.title));
    if (textValue(forum.role)) card.append(element("p", "record-role", forum.role));
    if (textValue(forum.description)) card.append(element("p", "record-description", forum.description));
    const link = externalLink(safeLink(forum.link), "Материалы мероприятия", forum.title);
    if (link) {
      const links = element("div", "record-links");
      links.append(link);
      card.append(links);
    }
    target.append(card);
  }
  if (!target.children.length) emptyState(target, "Мероприятия скоро появятся", "Информация об участии в форумах пока не добавлена.");
}

/* TEMP articles:render — материалов пока нет. Вернуть вместе с articles:import, pdf:import, articles:load и блоками articles в index.html.
async function renderArticles(data) {
  const cards = await Promise.all(listValue(data).filter(entry => entry && textValue(entry.title)).map(async article => {
    const card = element("article", "panel article-card");
    const body = element("div", "article-body");
    body.append(recordTop("file", "Пример научной работы", article.isExample));
    const meta = element("div", "record-meta");
    if (["string", "number"].includes(typeof article.year)) meta.append(element("span", "", String(article.year)));
    if (textValue(article.venue)) meta.append(element("span", "", article.venue));
    if (textValue(article.status)) meta.append(element("span", "record-status", article.status));
    if (meta.children.length) body.append(meta);
    body.append(element("h3", "", article.title));
    const authors = listValue(article.authors).map(value => textValue(value)).filter(Boolean);
    if (authors.length) body.append(element("p", "article-authors", authors.join(", ")));
    if (textValue(article.description)) body.append(element("p", "record-description", article.description));
    card.append(body);
    const links = element("div", "record-links");
    for (const [url, label] of [[doiLink(article.doi), "DOI"], [safeLink(article.link), "Читать на площадке"]]) {
      const link = externalLink(url, label, article.title);
      if (link) links.append(link);
    }
    const pdf = localAsset(article.pdf, siteRoot);
    if (pdf && await availablePDF(pdf)) {
      const link = element("a");
      link.href = pdf;
      link.download = "";
      link.setAttribute("aria-label", `Скачать PDF: ${article.title}`);
      link.append(icon("file"), element("span", "", "Скачать PDF"));
      links.append(link);
    }
    if (links.children.length) card.append(links);
    return card;
  }));
  const target = $("#articles-list");
  target.replaceChildren(...cards);
  if (!cards.length) emptyState(target, "Статьи скоро появятся", "Список научных работ пока не заполнен.");
}
*/

/* TEMP photos:viewer — материалов пока нет. Отключены состояние, DOM, отрисовка и все обработчики галереи. Вернуть вместе с photos:load и блоками photos в index.html.
let photos = [];
let photoIndex = 0;
let photoTrigger = null;
const dialog = $("#photo-dialog");

function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const photo = photos[photoIndex];
  $("#dialog-image").src = localAsset(photo.src, siteRoot) || new URL("assets/images/placeholder.svg", siteRoot).href;
  $("#dialog-image").alt = textValue(photo.alt);
  $("#dialog-caption").textContent = textValue(photo.caption, "Фотография");
  $("#dialog-counter").textContent = `${String(photoIndex + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}${photo.isPlaceholder ? " · ЗАГЛУШКА" : ""}`;
}

function renderPhotos(data) {
  photos = listValue(data).filter(photo => photo && localAsset(photo.src, siteRoot));
  const target = $("#photos-list");
  target.replaceChildren();
  photos.forEach((photo, index) => {
    const figure = element("figure", "photo-card");
    const button = element("button", "photo-button");
    button.type = "button";
    button.setAttribute("aria-label", `Открыть фото: ${textValue(photo.caption, photo.alt)}${photo.isPlaceholder ? " (заглушка)" : ""}`);
    button.setAttribute("aria-haspopup", "dialog");
    button.append(image(photo.src, photo.alt));
    if (photo.isPlaceholder) button.append(element("span", "photo-placeholder-label", "Место для вашей фотографии"));
    const expand = element("span", "photo-expand", "↗");
    expand.setAttribute("aria-hidden", "true");
    button.append(expand);
    button.addEventListener("click", () => {
      photoTrigger = button;
      showPhoto(index);
      dialog.showModal();
      $("#close-photo").focus();
    });
    const caption = element("figcaption");
    caption.append(element("span", "", textValue(photo.caption)), element("span", "", String(index + 1).padStart(2, "0")));
    figure.append(button, caption);
    target.append(figure);
  });
  $("#previous-photo").hidden = photos.length < 2;
  $("#next-photo").hidden = photos.length < 2;
  if (!photos.length) emptyState(target, "Фотографии скоро появятся", "Здесь будут ваши снимки.");
}

$("#close-photo").addEventListener("click", () => dialog.close());
$("#previous-photo").addEventListener("click", () => showPhoto(photoIndex - 1));
$("#next-photo").addEventListener("click", () => showPhoto(photoIndex + 1));
dialog.addEventListener("keydown", event => {
  if (event.key === "ArrowLeft") { event.preventDefault(); showPhoto(photoIndex - 1); }
  if (event.key === "ArrowRight") { event.preventDefault(); showPhoto(photoIndex + 1); }
});
dialog.addEventListener("click", event => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
dialog.addEventListener("close", () => photoTrigger?.focus({ preventScroll: true }));
$("#dialog-image").addEventListener("error", event => {
  const fallback = new URL("assets/images/placeholder.svg", siteRoot).href;
  if (event.target.src !== fallback) event.target.src = fallback;
});
*/

/* TEMP resume:render — PDF пока нет. Отключены скачивание, подписи и заглушки. Вернуть вместе с pdf:import, resume:bind и блоками resume в index.html.
async function renderResume(resume) {
  const target = $("#resume-file");
  const url = localAsset(resume.path, siteRoot);
  const ready = url ? await availablePDF(url) : false;
  target.replaceChildren();
  const heading = element("div", "file-heading");
  const copy = element("div");
  copy.append(element("h3", "", ready ? textValue(resume.label, "Резюме") : textValue(resume.emptyTitle, "Резюме скоро появится")), element("small", "", ready ? "PDF / ДОКУМЕНТ" : "PDF / ПОКА НЕ ДОБАВЛЕН"));
  heading.append(icon("file", "file-icon"), copy);
  target.append(heading, element("p", "", ready ? textValue(resume.readyText) : textValue(resume.emptyText, "Файл пока не добавлен.")));
  if (ready) {
    const link = element("a", "button button-primary");
    link.href = url;
    link.download = textValue(resume.filename, "resume.pdf");
    link.append(element("span", "", textValue(resume.buttonLabel, "Скачать резюме")), element("span", "", "↓"));
    target.append(link);
  } else {
    target.append(element("div", "file-status", "Скачивание будет доступно после добавления PDF"));
  }
}
*/

function renderContacts(data) {
  const target = $("#contacts-list");
  target.replaceChildren();
  for (const contact of listValue(data?.items).filter(Boolean)) {
    const url = safeLink(contact.url, { email: true });
    if (!url) continue;
    const link = element("a", "contact-link");
    link.href = url;
    if (!url.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `${textValue(contact.label)} (новая вкладка)`);
    }
    const copy = element("span");
    copy.append(element("small", "", textValue(contact.label)), element("strong", "", textValue(contact.value, contact.label)));
    link.append(icon(contact.icon), copy, element("span", "", "↗"));
    target.append(link);
  }
  if (!target.children.length) {
    const box = element("div", "contacts-empty");
    const copy = element("div");
    copy.append(element("h3", "", textValue(data?.emptyTitle, "Контакты скоро появятся")), element("p", "", textValue(data?.emptyText, "Способы связи пока не указаны.")));
    box.append(icon("message"), copy);
    target.append(box);
  }
}

function setupNavigation() {
  const toggle = $(".menu-toggle");
  const nav = $("#main-nav");
  toggle.hidden = false;
  document.body.classList.add("menu-ready");
  function closeMenu(returnFocus = false) {
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Открыть меню");
    if (returnFocus) toggle.focus();
  }
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    nav.classList.toggle("is-open", open);
  });
  nav.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") closeMenu(true);
  });
  document.addEventListener("click", event => { if (!event.target.closest(".site-header")) closeMenu(); });
  window.matchMedia("(min-width: 1200px)").addEventListener("change", () => closeMenu());
  if (typeof window.IntersectionObserver !== "function") return;
  const sectionObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      nav.querySelectorAll("a").forEach(link => {
        if (link.hash === `#${entry.target.id}`) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
  }, { rootMargin: "-15% 0px -65% 0px" });
  document.querySelectorAll("main section[id]").forEach(section => sectionObserver.observe(section));
}

async function loadContent(filename, target, render) {
  const retry = () => loadContent(filename, target, render);
  try {
    const data = await fetchJSON(new URL(`content/${filename}`, siteRoot));
    const needsArray = filename !== "profile.json" && filename !== "contacts.json";
    if (needsArray ? !Array.isArray(data) : !data || typeof data !== "object" || Array.isArray(data)) throw new Error("Неверный формат JSON");
    await render(data);
    if (filename === "profile.json") target.hidden = true;
  } catch (error) {
    console.warn(`Контент ${filename}: ${error.message}`);
    contentError(target, filename, retry);
  }
}

$("#current-year").textContent = String(new Date().getFullYear());
document.querySelectorAll("[data-icon]").forEach(slot => slot.replaceWith(icon(slot.dataset.icon, slot.className)));
setupNavigation();
setupReveals();
await Promise.allSettled([
  loadContent("profile.json", $("#profile-error"), bindProfile),
  loadContent("skills.json", $("#skills-list"), renderSkills),
  loadContent("projects.json", $("#projects-list"), renderProjects),
  loadContent("experience.json", $("#experience-list"), renderExperience),
  loadContent("forums.json", $("#forums-list"), renderForums),
  // TEMP articles:load — материалов пока нет; не загружать JSON/PDF без DOM. Вернуть вместе с articles:render, импортами и HTML-блоками articles.
  // loadContent("articles.json", $("#articles-list"), renderArticles),
  // TEMP photos:load — материалов пока нет; не загружать JSON без DOM. Вернуть вместе с photos:viewer и HTML-блоками photos.
  // loadContent("photos.json", $("#photos-list"), renderPhotos),
  loadContent("contacts.json", $("#contacts-list"), renderContacts)
]);
// Apply the URL's starting position once JSON and fonts establish the layout.
await restorePageScroll();
