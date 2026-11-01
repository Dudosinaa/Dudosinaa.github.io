// The URL determines the starting position, rather than the browser's last scroll.
export function setupPageScroll({ view = window, root = document } = {}) {
  if ("scrollRestoration" in view.history) view.history.scrollRestoration = "manual";

  function restore(behavior = "instant") {
    let target;
    try {
      const id = decodeURIComponent(view.location.hash.slice(1));
      if (id) target = root.getElementById(id);
    } catch {
      // An invalid fragment should open the first screen, not interrupt the app.
    }
    if (target) target.scrollIntoView({ behavior, block: "start" });
    else view.scrollTo({ top: 0, left: 0, behavior });
  }

  // Covers Back/Forward between section links and the URL without a fragment.
  // "auto" preserves the site's CSS smooth scrolling and reduced-motion rules.
  view.addEventListener("hashchange", () => restore("auto"));
  view.addEventListener("pageshow", event => {
    if (event.persisted) restore();
  });

  return async function restoreAfterContent() {
    // Font loading can still change section positions after the JSON is rendered.
    await root.fonts?.ready;
    restore();
  };
}
