import { seed } from "./seed.js";
let db;
let fallbackWorkspace = {};
const fallbackAudio = new Map();
const fallbackKey = "scode-connect-demo-fallback-v1";

function enableFallback() {
  try {
    fallbackWorkspace = JSON.parse(localStorage.getItem(fallbackKey) || "{}") || {};
  } catch {
    fallbackWorkspace = {};
  }
}

function persistFallback() {
  try {
    localStorage.setItem(fallbackKey, JSON.stringify(fallbackWorkspace));
  } catch {
    // The app remains usable for this browser session when storage is full.
  }
}

export async function openDatabase() {
  if (!globalThis.indexedDB) {
    enableFallback();
    return;
  }
  await new Promise((resolve) => {
    let req;
    let settled = false;
    const finish = (useFallback = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (useFallback) enableFallback();
      resolve();
    };
    const timer = setTimeout(() => finish(true), 1800);
    try {
      req = indexedDB.open("scode-connect-demo-v1", 1);
    } catch {
      finish(true);
      return;
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains("workspace")) {
        req.result.createObjectStore("workspace");
      }
      if (!req.result.objectStoreNames.contains("audio")) {
        req.result.createObjectStore("audio");
      }
    };
    req.onsuccess = () => {
      db = req.result;
      db.onversionchange = () => db.close();
      finish();
    };
    req.onerror = () => {
      finish(true);
    };
    req.onblocked = () => {
      finish(true);
    };
  });
}
export function openDemo() {
  if (!db) {
    if (!fallbackWorkspace.demo) {
      fallbackWorkspace.demo = seed();
      persistFallback();
    }
    return Promise.resolve(fallbackWorkspace.demo);
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction("workspace", "readwrite");
    const store = tx.objectStore("workspace");
    let value;
    const req = store.get("demo");
    req.onsuccess = () => {
      value = req.result;
      if (!value) {
        value = seed();
        store.add(value, "demo");
      }
    };
    tx.oncomplete = () => resolve(value);
    tx.onabort = () => reject(tx.error);
  });
}
export function readState(key = "demo") {
  if (!db) return Promise.resolve(fallbackWorkspace[key]);
  return new Promise((resolve, reject) => {
    const req = db.transaction("workspace").objectStore("workspace").get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export function saveState(next, audio, removed = []) {
  if (!db) {
    const current = fallbackWorkspace.demo;
    if (current?.revision !== next.revision) {
      return Promise.reject(
        Error("The workspace changed in another tab. Reload to review the latest records."),
      );
    }
    next.revision++;
    fallbackWorkspace.demo = next;
    if (audio) fallbackAudio.set(audio.id, audio.blob);
    for (const id of removed) fallbackAudio.delete(id);
    persistFallback();
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["workspace", "audio"], "readwrite");
    const store = tx.objectStore("workspace");
    const req = store.get("demo");
    let conflict = false;
    req.onsuccess = () => {
      if (req.result.revision !== next.revision) {
        conflict = true;
        tx.abort();
        return;
      }
      next.revision++;
      store.put(next, "demo");
      if (audio) tx.objectStore("audio").put(audio.blob, audio.id);
      for (const id of removed) tx.objectStore("audio").delete(id);
    };
    tx.oncomplete = resolve;
    tx.onabort = () =>
      reject(
        Error(
          conflict
            ? "The workspace changed in another tab. Reload to review the latest records."
            : "Unable to save. Check available browser storage and try again.",
        ),
      );
  });
}
export function readAudio(id) {
  if (!db) return Promise.resolve(fallbackAudio.get(id));
  return new Promise((resolve, reject) => {
    const req = db.transaction("audio").objectStore("audio").get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function cacheValue(key, value, store = "workspace") {
  if (!db) {
    if (store === "audio") fallbackAudio.set(key, value);
    else {
      fallbackWorkspace[key] = value;
      persistFallback();
    }
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value, key);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
}
export function removeAudio(id) {
  if (!db) {
    fallbackAudio.delete(id);
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction("audio", "readwrite");
    tx.objectStore("audio").delete(id);
    tx.oncomplete = resolve;
    tx.onabort = () => reject(tx.error);
  });
}
