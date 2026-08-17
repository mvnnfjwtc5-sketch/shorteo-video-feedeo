export const FEED_ITEMS = Object.freeze([
  { id: "01", src: "./assets/videos/video-01.mp4", title: "Video 1" },
  { id: "02", src: "./assets/videos/video-02.mp4", title: "Video 2" },
  { id: "03", src: "./assets/videos/video-03.mp4", title: "Video 3" },
  { id: "04", src: "./assets/videos/video-04.mp4", title: "Video 4" },
  { id: "05", src: "./assets/videos/video-05.mp4", title: "Video 5" },
  { id: "06", src: "./assets/videos/video-06.mp4", title: "Video 6" },
  { id: "07", src: "./assets/videos/video-07.mp4", title: "Video 7" },
  { id: "08", src: "./assets/videos/video-08.mp4", title: "Video 8" },
  { id: "09", src: "./assets/videos/video-09.mp4", title: "Video 9" },
  { id: "10", src: "./assets/videos/video-10.mp4", title: "Video 10" },
  { id: "11", src: "./assets/videos/video-11.mp4", title: "Video 11" },
]);

export function itemAt(virtualIndex) {
  return FEED_ITEMS[feedIndexOf(virtualIndex)];
}

export function feedIndexOf(virtualIndex) {
  const length = FEED_ITEMS.length;
  return ((virtualIndex % length) + length) % length;
}
