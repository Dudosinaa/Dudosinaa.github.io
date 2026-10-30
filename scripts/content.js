// Pure helpers shared by the browser and Node's built-in tests.
export function textValue(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function listValue(value) {
  return Array.isArray(value) ? value : [];
}

export function localAsset(path, baseURL) {
  if (typeof path !== "string" || !path.trim()) return null;
  const clean = path.trim();
  // Local content stays inside this site's directory, including on project Pages.
  if (/^(?:[a-z][a-z\d+.-]*:|[\\/])/i.test(clean)) return null;
  try {
    const base = new URL("./", baseURL);
    const url = new URL(clean, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
    if (decodeURIComponent(url.pathname).split("/").some(part => part === ".." || part.includes("\\"))) return null;
    return url.href;
  } catch {
    return null;
  }
}

export function safeLink(value, { email = false } = {}) {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = value.trim();
  if (email && /^mailto:[^\s@?]+@[^\s@?]+\.[^\s@?]+(?:\?[^\r\n]*)?$/i.test(input)) return input;
  try {
    const url = new URL(input);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export function projectCategories(projects) {
  return [...new Set(listValue(projects).map(project => textValue(project?.category)).filter(Boolean))];
}

export function doiLink(value) {
  let doi = textValue(value);
  if (!doi) return null;
  if (/^https:\/\/(?:dx\.)?doi\.org\//i.test(doi)) {
    try { doi = decodeURIComponent(new URL(doi).pathname.slice(1)); } catch { return null; }
  }
  if (!/^10\.\d{4,9}\/[^\s<>"\u0000-\u001f]+$/i.test(doi)) return null;
  return `https://doi.org/${doi.split("/").map(encodeURIComponent).join("/")}`;
}

export function filterProjects(projects, category = "") {
  return listValue(projects).filter(project => project && (!category || project.category === category));
}

export async function fetchJSON(url, fetcher = fetch) {
  const response = await fetcher(url, { cache: "no-cache" });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export async function availablePDF(url, fetcher = fetch) {
  if (!url) return false;
  try {
    // A real signature check also catches hosts which return index.html with 200.
    const response = await fetcher(url, { headers: { Range: "bytes=0-4" }, cache: "no-cache" });
    if (!response.ok || !response.body) return false;
    const reader = response.body.getReader();
    const bytes = [];
    try {
      while (bytes.length < 5) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes.push(...value.slice(0, 5 - bytes.length));
      }
    } finally {
      await reader.cancel();
    }
    return String.fromCharCode(...bytes) === "%PDF-";
  } catch {
    return false;
  }
}
