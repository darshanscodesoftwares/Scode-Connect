import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { postgresStore } from "./backend/postgres.js";
import { api } from "./backend/api.js";

const store = process.env.DATABASE_URL
  ? postgresStore(
      process.env.DATABASE_URL,
      process.env.SCODECONNECT_WORKSPACE || "demo",
    )
  : null;
const root = fileURLToPath(new URL("./app/", import.meta.url));
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};
const port = Number(process.env.PORT || 5173);
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname.startsWith("/api/"))
        return await api(req, res, pathname, store);
      const file = resolve(
        root,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (!file.startsWith(resolve(root) + sep)) throw Error();
      const body = await readFile(file);
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(
      "ScodeConnect at http://" + (process.env.HOST || "127.0.0.1") + ":" + port,
    ),
  );
