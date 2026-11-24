import { httpError } from "./postgres.js";
async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 26 * 1024 * 1024)
      throw httpError(413, "The request is too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw httpError(400, "Invalid JSON.");
  }
}
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(value));
}
export async function api(req, res, path, store) {
  try {
    if (path === "/api/config" && req.method === "GET")
      return json(
        res,
        200,
        store ? await store.config() : { mode: "browser", workspace: "demo" },
      );
    if (!store) throw httpError(404, "No PostgreSQL workspace configured.");
    if (path === "/api/workspace" && req.method === "GET")
      return json(res, 200, await store.read());
    if (path === "/api/workspace" && req.method === "PUT") {
      if (
        req.headers.origin &&
        new URL(req.headers.origin).host !== req.headers.host
      )
        throw httpError(403, "Cross-origin writes are unavailable.");
      if (!req.headers["content-type"]?.startsWith("application/json"))
        throw httpError(415, "Use a JSON request.");
      const { instance, state, audio } = await readBody(req);
      return json(res, 200, await store.save(instance, state, audio));
    }
    if (path.startsWith("/api/audio/") && req.method === "GET") {
      const row = await store.audio(path.slice(11));
      res.writeHead(200, {
        "Content-Type": /^audio\/[\w.+-]+(?:;[\w=; -]+)?$/.test(row.mime)
          ? row.mime
          : "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      return res.end(row.audio);
    }
    throw httpError(404, "Route unavailable.");
  } catch (err) {
    if (!err.status)
      console.error("PostgreSQL request failed", err.code || err.name);
    json(res, err.status || 503, {
      error: err.status
        ? err.message
        : "PostgreSQL is unavailable. Check the server connection and database permissions.",
    });
  }
}
