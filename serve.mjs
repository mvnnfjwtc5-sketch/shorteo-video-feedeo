#!/usr/bin/env node
import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)));
const PORT = Number(process.argv[2]) || 8000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
};

function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const relative = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const target = join(ROOT, relative === "/" ? "index.html" : relative);
  return target.startsWith(ROOT + sep) || target === ROOT ? target : null;
}

function parseRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;

  const [, rawStart, rawEnd] = match;
  let start;
  let end;

  if (rawStart === "") {
    const length = Number(rawEnd);
    if (!length) return null;
    start = Math.max(0, size - length);
    end = size - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd === "" ? size - 1 : Math.min(Number(rawEnd), size - 1);
  }

  return start > end || start >= size ? null : { start, end };
}

const server = createServer(async (request, response) => {
  try {
    const filePath = resolvePath(request.url);
    if (!filePath) throw new Error("Forbidden path");

    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");

    const type = MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream";
    const range = parseRange(request.headers.range, info.size);

    if (range) {
      response.writeHead(206, {
        "Content-Type": type,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${range.start}-${range.end}/${info.size}`,
        "Content-Length": range.end - range.start + 1,
      });
      createReadStream(filePath, range).pipe(response);
      return;
    }

    response.writeHead(200, {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Content-Length": info.size,
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${PORT}`);
});
