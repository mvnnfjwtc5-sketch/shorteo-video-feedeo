import { CONFIG } from "./config.js";

const INTERACTIVE_SELECTOR = "button, a, input, textarea, select, [contenteditable]";

export function createFeedController({ scroller, pool, media, onChange }) {
  const ratios = new Map();
  let activeVirtualIndex = null;
  let userPaused = false;
  let pausedByHiding = false;
  let settleTimer = 0;

  const observer = new IntersectionObserver(onIntersect, {
    root: scroller,
    threshold: [0, CONFIG.ACTIVE_INTERSECTION_RATIO],
  });

  function onIntersect(entries) {
    for (const entry of entries) {
      ratios.set(entry.target, entry.intersectionRatio);
    }

    let bestSlot = null;
    let bestRatio = CONFIG.ACTIVE_INTERSECTION_RATIO;

    for (const [element, ratio] of ratios) {
      if (ratio < bestRatio) continue;
      const slot = pool.getSlotByElement(element);
      if (!slot) continue;
      bestRatio = ratio;
      bestSlot = slot;
    }

    if (!bestSlot || bestSlot.virtualIndex === activeVirtualIndex) return;
    setActive(bestSlot.virtualIndex);
  }

  function setActive(virtualIndex, { resume = true } = {}) {
    activeVirtualIndex = virtualIndex;

    for (const slot of pool.slots) {
      const isActive = slot.virtualIndex === virtualIndex;
      slot.element.classList.toggle("is-active", isActive);
      slot.element.setAttribute("aria-current", isActive ? "true" : "false");
    }

    media.applyWindow(virtualIndex);
    media.pauseAllExcept(virtualIndex);
    onChange?.();

    if (document.hidden) {
      pausedByHiding = true;
      media.pauseActive(virtualIndex);
      return;
    }

    if (!resume || userPaused) {
      media.pauseActive(virtualIndex);
      return;
    }

    void media.playActive(virtualIndex).then(onChange);
  }

  function onSettle() {
    if (activeVirtualIndex === null) return;
    if (!pool.recenter(activeVirtualIndex)) return;

    for (const slot of pool.slots) {
      ratios.set(slot.element, slot.virtualIndex === activeVirtualIndex ? 1 : 0);
    }

    media.applyWindow(activeVirtualIndex);
  }

  function onScroll() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, CONFIG.SCROLL_SETTLE_MS);
  }

  const supportsScrollEnd = "onscrollend" in window;

  function togglePlayPause() {
    const slot = media.getSlot(activeVirtualIndex);
    if (!slot) return;

    if (slot.video.paused) {
      userPaused = false;
      void media.playActive(activeVirtualIndex, { userInitiated: true }).then(onChange);
    } else {
      userPaused = true;
      media.pauseActive(activeVirtualIndex);
      onChange?.();
    }
  }

  function step(delta) {
    const slot = pool.getSlot(activeVirtualIndex + delta);
    slot?.element.scrollIntoView({ block: "start", behavior: "auto" });
  }

  function onVisibilityChange() {
    if (document.hidden) {
      pausedByHiding = !media.getSlot(activeVirtualIndex)?.video.paused;
      media.pauseActive(activeVirtualIndex);
      onChange?.();
      return;
    }

    if (pausedByHiding && !userPaused) {
      pausedByHiding = false;
      void media.playActive(activeVirtualIndex).then(onChange);
    }
  }

  function onKeyDown(event) {
    if (event.target.closest(INTERACTIVE_SELECTOR)) return;

    switch (event.key) {
      case " ":
        event.preventDefault();
        togglePlayPause();
        break;
      case "m":
      case "M":
        event.preventDefault();
        media.toggleMuted();
        onChange?.();
        break;
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      default:
        break;
    }
  }

  function start(virtualIndex) {
    for (const slot of pool.slots) observer.observe(slot.element);

    if (supportsScrollEnd) {
      scroller.addEventListener("scrollend", onSettle);
    } else {
      scroller.addEventListener("scroll", onScroll, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    scroller.addEventListener("keydown", onKeyDown);

    setActive(virtualIndex);
  }

  function dispose() {
    observer.disconnect();
    clearTimeout(settleTimer);
    scroller.removeEventListener("scrollend", onSettle);
    scroller.removeEventListener("scroll", onScroll);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    scroller.removeEventListener("keydown", onKeyDown);
    media.dispose();
  }

  return {
    start,
    dispose,
    togglePlayPause,
    getActiveIndex: () => activeVirtualIndex,
    retryActive: () => media.retry(activeVirtualIndex),
  };
}
