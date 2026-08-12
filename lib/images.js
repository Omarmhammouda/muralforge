"use client";

/**
 * Full-resolution mockup images live in IndexedDB (localStorage is too small
 * for data URLs). Records store only ids + small thumbnails.
 */

const DB_NAME = "muralforge-images";
const STORE = "images";

function open() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(result.result ?? result);
    tx.onerror = () => reject(tx.error);
  });
}

export function putImage(id, dataUrl) {
  return withStore("readwrite", (store) => store.put(dataUrl, id));
}

export async function getImage(id) {
  const value = await withStore("readonly", (store) => store.get(id));
  return typeof value === "string" ? value : null;
}

export function deleteImage(id) {
  return withStore("readwrite", (store) => store.delete(id));
}

/** Downscale a data URL to a small card thumbnail (fits in localStorage). */
export async function makeThumb(dataUrl, maxEdge = 360) {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.75);
}
