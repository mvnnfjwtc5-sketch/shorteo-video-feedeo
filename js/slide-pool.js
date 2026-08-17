import { CONFIG } from "./config.js";
import { feedIndexOf, itemAt, FEED_ITEMS } from "./feed-data.js";

export function createSlidePool({ scroller }) {
  const size = CONFIG.POOL_SIZE;
  const center = Math.floor(size / 2);
  const slots = [];
  const byElement = new Map();

  for (let i = 0; i < size; i += 1) {
    const slot = buildSlot();
    slots.push(slot);
    byElement.set(slot.element, slot);
    scroller.append(slot.element);
  }

  function pageHeight() {
    return scroller.clientHeight;
  }

  function assign(slot, virtualIndex) {
    if (slot.virtualIndex === virtualIndex) return;
    slot.virtualIndex = virtualIndex;

    const item = itemAt(virtualIndex);
    const position = feedIndexOf(virtualIndex) + 1;

    slot.element.dataset.virtualIndex = String(virtualIndex);
    slot.element.dataset.feedIndex = String(feedIndexOf(virtualIndex));
    slot.element.dataset.mediaState = "idle";
    slot.element.setAttribute(
      "aria-label",
      `${item.title} (${position} of ${FEED_ITEMS.length})`,
    );
    slot.title.textContent = item.title;
    slot.position.textContent = `${position} / ${FEED_ITEMS.length}`;
    slot.video.setAttribute("aria-label", item.title);
  }

  function start(virtualIndex) {
    slots.forEach((slot, i) => assign(slot, virtualIndex - center + i));
    scroller.scrollTo({ top: center * pageHeight(), behavior: "instant" });
  }

  function recenter(activeVirtualIndex) {
    const offset = activeVirtualIndex - slots[center].virtualIndex;
    if (offset === 0) return false;

    if (Math.abs(offset) >= size) {
      start(activeVirtualIndex);
      return true;
    }

    for (let i = 0; i < Math.abs(offset); i += 1) {
      if (offset > 0) {
        const slot = slots.shift();
        assign(slot, slots[slots.length - 1].virtualIndex + 1);
        scroller.append(slot.element);
        slots.push(slot);
      } else {
        const slot = slots.pop();
        assign(slot, slots[0].virtualIndex - 1);
        scroller.prepend(slot.element);
        slots.unshift(slot);
      }
    }

    scroller.scrollTo({ top: center * pageHeight(), behavior: "instant" });
    return true;
  }

  function getSlot(virtualIndex) {
    return slots.find((slot) => slot.virtualIndex === virtualIndex) ?? null;
  }

  return {
    slots,
    start,
    recenter,
    getSlot,
    getSlotByElement: (element) => byElement.get(element) ?? null,
  };
}

function buildSlot() {
  const element = document.createElement("article");
  element.className = "feed-slide";

  const media = document.createElement("div");
  media.className = "feed-media";

  const video = document.createElement("video");
  video.className = "feed-video";
  video.playsInline = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("webkit-playsinline", "");
  video.loop = CONFIG.LOOP;
  video.preload = "none";
  video.disableRemotePlayback = true;

  const status = document.createElement("div");
  status.className = "feed-status";
  status.hidden = true;

  const error = document.createElement("div");
  error.className = "feed-error";
  error.hidden = true;
  const errorText = document.createElement("p");
  errorText.textContent = "Video unavailable";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "retry-button";
  retry.dataset.action = "retry";
  retry.textContent = "Retry";
  error.append(errorText, retry);

  media.append(video, status, error);

  const meta = document.createElement("div");
  meta.className = "feed-meta";
  const title = document.createElement("p");
  title.className = "feed-title";
  const position = document.createElement("p");
  position.className = "feed-position";
  meta.append(title, position);

  element.append(media, meta);

  return { element, video, status, error, title, position, virtualIndex: null };
}
