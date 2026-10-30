// Content is visible by default. These observers only add a temporary animation.
const selector = ".panel, .photo-card, .timeline-item, .empty-state, .load-error";

export function setupReveals({ root = document, view = window } = {}) {
  const media = view.matchMedia("(prefers-reduced-motion: reduce)");
  const tracked = new Map();
  let enterObserver;
  let exitObserver;
  let mutations;

  function stop() {
    enterObserver?.disconnect();
    exitObserver?.disconnect();
    mutations?.disconnect();
    for (const node of tracked.keys()) node.classList.remove("reveal");
    tracked.clear();
  }

  function refresh() {
    if (!enterObserver || media.matches) return;
    for (const node of tracked.keys()) if (!node.isConnected) {
      enterObserver.unobserve(node);
      exitObserver.unobserve(node);
      tracked.delete(node);
    }
    for (const node of root.querySelectorAll(selector)) {
      if (tracked.has(node)) continue;
      const siblings = [...node.parentElement.children].filter(sibling => sibling.matches(selector));
      node.style.setProperty("--reveal-order", String(Math.min(siblings.indexOf(node), 3)));
      tracked.set(node, "armed");
      enterObserver.observe(node);
      exitObserver.observe(node);
    }
  }

  function start() {
    stop();
    enterObserver = null;
    if (media.matches || typeof view.IntersectionObserver !== "function") return;
    // An inset entry zone works for cards taller than the viewport: no percentage
    // of the card is required. A larger exit zone absorbs tiny boundary scrolls
    // and the animated transform itself, so they cannot re-arm the animation.
    enterObserver = new view.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || tracked.get(entry.target) !== "armed") continue;
        tracked.set(entry.target, "shown");
        if (!entry.target.contains(root.activeElement)) entry.target.classList.add("reveal");
      }
    }, { threshold: 0, rootMargin: "-24px 0px" });
    exitObserver = new view.IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting || !tracked.has(entry.target)) continue;
        tracked.set(entry.target, "armed");
        entry.target.classList.remove("reveal");
      }
    }, { threshold: 0, rootMargin: "32px 0px" });
    if (view.MutationObserver) {
      mutations = new view.MutationObserver(refresh);
      mutations.observe(root.querySelector("main") || root, { childList: true, subtree: true });
    }
    refresh();
  }

  media.addEventListener?.("change", start);
  start();
  return {
    refresh,
    destroy() { stop(); media.removeEventListener?.("change", start); }
  };
}
