/**
 * Production server for DRYCU-72H.
 *
 * Routing logic:
 * - Requests with `expo-platform: ios|android` header → serve OTA manifest (Expo Go)
 * - All other requests (browsers on desktop / mobile) → serve static web bundle
 *   with SPA fallback (index.html for unknown paths so React Navigation works)
 *
 * Zero external dependencies — uses only Node.js built-ins.
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const WEB_ROOT = path.join(STATIC_ROOT, "web");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
  ".webmanifest": "application/manifest+json",
};

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

// ── Expo Go manifest serving ────────────────────────────────────────────────

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

// ── Web bundle serving ──────────────────────────────────────────────────────

function serveFile(filePath, res) {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": mimeFor(filePath) });
  res.end(content);
}

function serveWebApp(pathname, res) {
  // Normalize: strip base path prefix
  let relPath = pathname;
  if (basePath && relPath.startsWith(basePath)) {
    relPath = relPath.slice(basePath.length) || "/";
  }

  // Try exact file match inside web root
  const candidate = path.join(WEB_ROOT, relPath);

  // Security: stay inside WEB_ROOT
  if (!candidate.startsWith(WEB_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    serveFile(candidate, res);
    return;
  }

  // SPA fallback — React Navigation handles routing client-side
  const indexPath = path.join(WEB_ROOT, "index.html");
  if (fs.existsSync(indexPath)) {
    serveFile(indexPath, res);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("Web build not found. Please redeploy the app.");
}

// ── Server ──────────────────────────────────────────────────────────────────

const webBuildExists = fs.existsSync(path.join(WEB_ROOT, "index.html"));
if (webBuildExists) {
  console.log("Web build found — serving web app to browsers");
} else {
  console.warn("WARNING: No web build found at static-build/web/index.html");
  console.warn("Browser visitors will see a 404. Redeploy to fix.");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Expo Go native manifest requests
  const platform = req.headers["expo-platform"];
  if (platform === "ios" || platform === "android") {
    return serveManifest(platform, res);
  }

  // Everything else → web app
  serveWebApp(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`DRYCU-72H serving on port ${port}`);
  console.log(`Web app: http://localhost:${port}`);
});
