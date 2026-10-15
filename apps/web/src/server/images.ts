import "server-only";
import { createHash } from "node:crypto";
import sharp, { type OutputInfo } from "sharp";
import { eq, schema } from "@shopfront/db";
import { appUrl } from "./env";
import { services } from "./services";

// Product photos: identity = sha256 of the uploaded bytes (also the vision cache key, D-029), stored resized
// in Postgres (Render free has no disk) and served at /img/{sha} with immutable caching.

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_PHOTOS_PER_UPLOAD = 12;
const MAX_EDGE = 1600;
const TARGET_BYTES = 200 * 1024;
const FORMATS = new Set(["jpeg", "png", "webp", "heif", "avif"]);

export class ImageRejected extends Error {}

export interface StoredImage {
  sha256: string;
  url: string;
  width: number;
  height: number;
}

export async function storeImage(input: Buffer): Promise<StoredImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejected("Photo is larger than 12 MB.");
  const sha256 = createHash("sha256").update(input).digest("hex");
  const { db } = services();
  const [existing] = await db
    .select({ width: schema.images.width, height: schema.images.height })
    .from(schema.images)
    .where(eq(schema.images.sha256, sha256));
  if (existing) return { sha256, url: imageUrl(sha256), ...existing };

  const meta = await sharp(input, { failOn: "error" })
    .metadata()
    .catch(() => null);
  if (!meta?.format || !FORMATS.has(meta.format)) throw new ImageRejected("Use a JPEG, PNG, WebP or HEIC photo.");

  // Rotate by EXIF, fit inside 1600 px, then step quality down until it is under ~200 KB.
  let out: { data: Buffer; info: OutputInfo } | null = null;
  for (const quality of [82, 74, 66, 58, 50]) {
    out = await sharp(input).rotate().resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
    if (out.data.byteLength <= TARGET_BYTES) break;
  }
  const { data, info } = out!;
  await db
    .insert(schema.images)
    .values({ sha256, mime: "image/webp", width: info.width, height: info.height, bytes: data })
    .onConflictDoNothing();
  return { sha256, url: imageUrl(sha256), width: info.width, height: info.height };
}

export async function loadImage(sha256: string) {
  const { db } = services();
  const [img] = await db.select().from(schema.images).where(eq(schema.images.sha256, sha256));
  return img ?? null;
}

export function imageUrl(sha256: string) {
  return appUrl(`/img/${sha256}`);
}
