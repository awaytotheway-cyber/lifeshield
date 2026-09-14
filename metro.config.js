// NativeWind v5 Metro wrapper (no second { input } argument — that was v4).
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");
const fs = require("fs");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = withNativewind(getDefaultConfig(__dirname));

const PUBLIC_DIR = path.join(__dirname, "public");
const PUBLIC_FILES = {
  "/prescope-privacy.html": {
    file: "prescope-privacy.html",
    type: "text/html; charset=utf-8",
  },
  "/prescope-logo.png": { file: "prescope-logo.png", type: "image/png" },
  "/favicon-32.png": { file: "favicon-32.png", type: "image/png" },
  "/favicon-192.png": { file: "favicon-192.png", type: "image/png" },
  "/favicon-512.png": { file: "favicon-512.png", type: "image/png" },
  "/apple-touch-icon.png": { file: "apple-touch-icon.png", type: "image/png" },
};

function servePublicFiles(middleware) {
  return (req, res, next) => {
    const urlPath = String(req.url ?? "").split("?")[0];
    const match = PUBLIC_FILES[urlPath];
    if (!match) {
      return middleware(req, res, next);
    }
    const filePath = path.join(PUBLIC_DIR, match.file);
    if (!fs.existsSync(filePath)) {
      return middleware(req, res, next);
    }
    res.statusCode = 200;
    res.setHeader("Content-Type", match.type);
    fs.createReadStream(filePath).pipe(res);
  };
}

const previousEnhance = config.server?.enhanceMiddleware;
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware, server) => {
    const inner = previousEnhance
      ? previousEnhance(middleware, server)
      : middleware;
    return servePublicFiles(inner);
  },
};

module.exports = config;
