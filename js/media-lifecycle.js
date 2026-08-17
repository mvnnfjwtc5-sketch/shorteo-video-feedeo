import { CONFIG } from "./config.js";
import { itemAt } from "./feed-data.js";

export function createMediaLifecycle({ slots, onStateChange }) {
  let muted = CONFIG.START_MUTED;
  let playGeneration = 0;
  let activeVirtualIndex = null;

  for (const slot of slots) {
    bindSlot(slot);
  }

  function emit(slot, state) {
    onStateChange?.(slot, state);
  }

  function bindSlot(slot) {
    const { video } = slot;

    video.addEventListener("waiting", () => emit(slot, "buffering"));
    video.addEventListener("playing", () => emit(slot, "playing"));
    video.addEventListener("pause", () => {
      if (!video.ended && !video.error) emit(slot, "paused");
    });
    video.addEventListener("error", () => {
      emit(slot, "error");
      if (slot.virtualIndex === activeVirtualIndex) applyWindow(activeVirtualIndex);
    });
    video.addEventListener("canplay", () => {
      emit(slot, "ready");
      if (slot.virtualIndex === activeVirtualIndex) applyWindow(activeVirtualIndex);
    });
  }

  function applyWindow(virtualIndex) {
    activeVirtualIndex = virtualIndex;
    const currentSlot = getSlot(virtualIndex);
    const currentSettled = Boolean(
      currentSlot &&
        (currentSlot.video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ||
          currentSlot.video.error),
    );

    for (const slot of slots) {
      const distance = Math.abs(slot.virtualIndex - virtualIndex);

      if (distance === 0) {
        attach(slot);
      } else if (distance <= CONFIG.MEDIA_WINDOW_RADIUS) {
        if (currentSettled || slot.video.dataset.src) attach(slot);
      } else {
        release(slot);
      }
    }
  }

  function attach(slot) {
    const item = itemAt(slot.virtualIndex);
    const { video } = slot;

    if (video.dataset.src === item.src) {
      video.muted = muted;
      return;
    }

    video.dataset.src = item.src;
    video.preload = "auto";
    video.src = item.src;
    video.load();
    video.muted = muted;
    emit(slot, "loading");
  }

  function release(slot) {
    const { video } = slot;
    if (!video.dataset.src) return;

    video.pause();
    delete video.dataset.src;
    video.removeAttribute("src");
    video.load();
    emit(slot, "idle");
  }

  function getSlot(virtualIndex) {
    return slots.find((slot) => slot.virtualIndex === virtualIndex) ?? null;
  }

  function pauseAllExcept(virtualIndex) {
    for (const slot of slots) {
      if (slot.virtualIndex !== virtualIndex && !slot.video.paused) {
        slot.video.pause();
      }
    }
  }

  async function playActive(virtualIndex, { userInitiated = false } = {}) {
    pauseAllExcept(virtualIndex);
    const slot = getSlot(virtualIndex);
    if (!slot || !slot.video.dataset.src) return { ok: false, reason: "missing" };

    const generation = ++playGeneration;
    const { video } = slot;
    video.muted = muted;

    try {
      await video.play();
      if (generation !== playGeneration) {
        video.pause();
        return { ok: false, reason: "stale" };
      }
      return { ok: true };
    } catch {
      if (generation !== playGeneration) return { ok: false, reason: "stale" };
      if (video.error) return { ok: false, reason: "error" };
      emit(slot, "paused");
      return { ok: false, reason: "autoplay", userInitiated };
    }
  }

  function pauseActive(virtualIndex) {
    playGeneration += 1;
    const slot = getSlot(virtualIndex);
    if (slot && !slot.video.paused) slot.video.pause();
  }

  function retry(virtualIndex) {
    const slot = getSlot(virtualIndex);
    if (!slot) return;
    release(slot);
    applyWindow(virtualIndex);
    void playActive(virtualIndex, { userInitiated: true });
  }

  function setMuted(nextMuted) {
    muted = Boolean(nextMuted);
    for (const slot of slots) {
      slot.video.muted = muted;
    }
  }

  function dispose() {
    playGeneration += 1;
    for (const slot of slots) release(slot);
  }

  return {
    applyWindow,
    playActive,
    pauseActive,
    pauseAllExcept,
    retry,
    getSlot,
    setMuted,
    toggleMuted: () => {
      setMuted(!muted);
      return muted;
    },
    isMuted: () => muted,
    dispose,
  };
}
