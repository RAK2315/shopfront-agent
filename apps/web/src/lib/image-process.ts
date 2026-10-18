import { createHash } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";

// Shared by the upload route (server/images.ts) and the seed script: identity = sha256 of the original bytes (also
// the vision cache key, D-029); stored as WebP, EXIF-rotated, inside 1600 px, stepped down to about 200 KB.

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_EDGE = 1600;
const TARGET_BYTES = 200 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export class ImageRejected extends Error {}

export const photoSha256 = (input: Buffer) => createHash("sha256").update(input).digest("hex");

export async function processPhoto(input: Buffer): Promise<{ data: Buffer; info: OutputInfo }> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejected("Photo is larger than 12 MB.");
  const meta = await sharp(input, { failOn: "error" })
    .metadata()
    .catch(() => null);
  if (!meta?.format || !FORMATS.has(meta.format)) throw new ImageRejected("Use a JPEG, PNG, WebP or HEIC photo.");
  let out: { data: Buffer; info: OutputInfo } | null = null;
  for (const quality of [82, 74, 66, 58, 50]) {
    out = await sharp(input).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
    if (out.data.byteLength <= TARGET_BYTES) break;
  }
  return out!;
}
