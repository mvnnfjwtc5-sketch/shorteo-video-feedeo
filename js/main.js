import { createSlidePool } from "./slide-pool.js";
import { createMediaLifecycle } from "./media-lifecycle.js";
import { createFeedController } from "./feed-controller.js";

const START_INDEX = 0;

const scroller = document.querySelector("[data-feed-scroller]");
const stage = document.querySelector("[data-feed-stage]");
const muteButton = document.querySelector("[data-action='mute']");
const playButton = document.querySelector("[data-action='play']");

if (!scroller || !stage || !muteButton || !playButton) {
  throw new Error("Feed shell markup is incomplete.");
}

const pool = createSlidePool({ scroller });

const media = createMediaLifecycle({
  slots: pool.slots,
  onStateChange: (slot, state) => {
    slot.element.dataset.mediaState = state;

    const failed = state === "error";
    const busy = state === "loading" || state === "buffering";

    slot.error.hidden = !failed;
    slot.status.hidden = failed || !busy;
    slot.status.textContent = busy ? "Loading…" : "";

    if (slot.virtualIndex === feed.getActiveIndex()) syncChrome();
  },
});

const feed = createFeedController({
  scroller,
  pool,
  media,
  onChange: syncChrome,
});

stage.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;

  if (!action) {
    if (event.target.closest(".feed-slide")) feed.togglePlayPause();
    return;
  }

  if (action === "play") feed.togglePlayPause();
  else if (action === "mute") media.toggleMuted();
  else if (action === "retry") feed.retryActive();

  syncChrome();
});

pool.start(START_INDEX);
feed.start(START_INDEX);

function syncChrome() {
  const muted = media.isMuted();
  muteButton.dataset.muted = String(muted);
  muteButton.setAttribute("aria-pressed", String(muted));

  const slot = media.getSlot(feed.getActiveIndex());
  const paused = !slot || slot.video.paused;
  playButton.dataset.playing = String(!paused);
  playButton.setAttribute("aria-label", paused ? "Play" : "Pause");
}
