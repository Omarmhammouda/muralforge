/**
 * Client-side wall-photo optimizer — lets visitors pick photos of any size.
 *
 * Big camera/phone photos get downscaled in the browser (longest edge capped,
 * re-encoded as JPEG) before upload, so the request stays small enough for the
 * server, Vercel's ~4.5 MB body limit, and Gemini's 20 MB inline-image cap.
 * A mural mockup never needs more than ~2K of wall photo anyway.
 */

const MAX_DIMENSION = 2048;
const SKIP_BELOW_BYTES = 3 * 1024 * 1024;
const JPEG_QUALITY = 0.85;

export async function optimizeWallPhoto(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Browser can't decode this format (e.g. HEIC outside Safari) — send as-is
    // and let the server's size cap answer.
    return { file, resized: false };
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SKIP_BELOW_BYTES) {
    bitmap.close();
    return { file, resized: false };
  }

  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob || blob.size >= file.size) return { file, resized: false };

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return {
    file: new File([blob], name, { type: "image/jpeg" }),
    resized: true,
    originalBytes: file.size,
    optimizedBytes: blob.size,
  };
}

export function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
