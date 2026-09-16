/** One interruptible exit/entry pair, without remounting drafts or live streams. */
type Fade = { animation: Animation; finish: () => void; timer?: ReturnType<typeof setTimeout> };
const active = new Map<HTMLElement, Fade>();
let media: MediaQueryList | undefined;
const preference = () => media ??= matchMedia("(prefers-reduced-motion: reduce)");
const still = () => preference().matches || document.hidden;
let listening = false;

function release(node: HTMLElement) {
  const fade = active.get(node);
  if (!fade) return;
  clearTimeout(fade.timer);
  fade.animation.cancel();
  active.delete(node);
  if (!active.size && listening) {
    preference().removeEventListener("change", settle);
    document.removeEventListener("visibilitychange", settle);
    listening = false;
  }
}
function settle() {
  if (!still()) return;
  for (const [node, fade] of [...active]) { release(node); fade.finish(); }
}
function track(node: HTMLElement, fade: Fade) {
  active.set(node, fade);
  if (!listening) {
    preference().addEventListener("change", settle);
    document.addEventListener("visibilitychange", settle);
    listening = true;
  }
}

export function arriveView(node: HTMLElement, id = "workspace-transition") {
  release(node);
  if (still() || !node.isConnected) return;
  const animation = node.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 160, easing: "cubic-bezier(.2,0,0,1)",
  });
  animation.id = id;
  track(node, { animation, finish: () => {} });
  void animation.finished.then(() => { if (active.get(node)?.animation === animation) release(node); }, () => {});
}

export function changeView(update: () => void, node = document.getElementById("main-content"), waitForRoute = false) {
  const opacity = node ? getComputedStyle(node).opacity : "1";
  if (node) release(node);
  if (!node || !node.isConnected || still()) { update(); return; }
  const animation = node.animate([{ opacity }, { opacity: 0 }], {
    duration: 90, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards",
  });
  animation.id = "view-departure";
  let updated = false;
  const finish = () => { if (!updated) { updated = true; update(); } };
  const fade: Fade = { animation, finish };
  track(node, fade);
  void animation.finished.then(() => {
    if (active.get(node) !== fade) return;
    finish();
    // Route commits call arriveView themselves. A failed/slow navigation must
    // never leave the current workspace invisible or block interaction.
    if (active.get(node) !== fade) return;
    if (waitForRoute) fade.timer = setTimeout(() => { if (active.get(node) === fade) arriveView(node); }, 800);
    else requestAnimationFrame(() => { if (active.get(node) === fade) arriveView(node, "context-arrival"); });
  }, () => {});
}

export function cancelViewFade(node = document.getElementById("main-content")) { if (node) release(node); }

export function viewIdentity(url: URL) {
  return JSON.stringify([url.pathname, ...["tab", "view", "state", "run", "status", "kind", "days"].map(key => url.searchParams.get(key))]);
}
