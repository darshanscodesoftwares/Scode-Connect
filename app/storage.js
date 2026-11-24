import * as local from "./local-store.js";
let config = { mode: "browser", workspace: "demo" },
  available = true;
export const storageInfo = () => ({ ...config, available });
const snapshotKey = () => "postgres:" + config.instance;
async function api(path, options = {}) {
  // Keep shared data outside the service worker's shell cache.
  const res = await fetch("./api/" + path, {
    cache: "no-store",
    signal: AbortSignal.timeout(options.method ? 45000 : 7000),
    ...options,
  });
  if (!res.ok) {
    const details = await res.json().catch(() => ({}));
    throw Object.assign(Error(details.error || "Workspace request failed."), {
      status: res.status,
    });
  }
  return res;
}
async function cacheSnapshot(value) {
  // A database commit is still successful if a device runs out of offline storage.
  try {
    await local.cacheValue(snapshotKey(), value);
  } catch {
    console.warn("Unable to cache the shared workspace on this device.");
  }
}
async function sharedState() {
  try {
    const value = await (await api("workspace")).json();
    available = true;
    await cacheSnapshot(value);
    return value;
  } catch (err) {
    available = false;
    const cached = await local.readState(snapshotKey());
    if (cached && (!err.status || err.status === 503)) return cached;
    throw err;
  }
}
export async function openWorkspace() {
  await local.openDatabase();
  const last = await local.readState("connection");
  try {
    const res = await api("config");
    // Static hosting can serve index.html for unrecognised routes.
    config = res.headers.get("Content-Type")?.includes("application/json")
      ? await res.json()
      : { mode: "browser", workspace: "demo" };
  } catch (err) {
    if (err.status === 404) config = { mode: "browser", workspace: "demo" };
    else if (last?.mode === "postgres" || (!err.status && last)) config = last;
    else throw err;
  }
  await local.cacheValue("connection", config);
  return config.mode === "postgres" ? sharedState() : local.openDemo();
}
export function readState() {
  return config.mode === "postgres" ? sharedState() : local.readState();
}
function encode(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
export async function saveState(state, audio, removed = []) {
  if (config.mode !== "postgres") return local.saveState(state, audio, removed);
  if (audio?.blob.size > 16 * 1024 * 1024)
    throw Error("Shared voice notes can be up to 16 MB.");
  const recording = audio
    ? { id: audio.id, mime: audio.blob.type, base64: await encode(audio.blob) }
    : null;
  const data = { state, instance: config.instance, audio: recording };
  let result;
  try {
    result = await (
      await api("workspace", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
    ).json();
  } catch (err) {
    if (err.status && err.status !== 503) throw err;
    available = false;
    throw Error(
      "Shared changes need a database connection. Keep the form open and retry when connected.",
    );
  }
  state.revision = result.revision;
  available = true;
  await cacheSnapshot(state);
  if (audio)
    await local
      .cacheValue(snapshotKey() + ":" + audio.id, audio.blob, "audio")
      .catch(() => {});
  for (const id of removed)
    await local.removeAudio(snapshotKey() + ":" + id).catch(() => {});
}
export async function readAudio(id) {
  if (config.mode !== "postgres") return local.readAudio(id);
  const key = snapshotKey() + ":" + id;
  const cached = await local.readAudio(key);
  if (cached) return cached;
  const blob = await (await api("audio/" + encodeURIComponent(id))).blob();
  await local.cacheValue(key, blob, "audio").catch(() => {});
  return blob;
}
