import "server-only";
import { eq, schema } from "@shopfront/db";
import { ImageRejected, MAX_UPLOAD_BYTES, photoSha256, processPhoto } from "@/lib/image-process";
import { ByteLru } from "@/lib/byte-lru";
import { appUrl } from "./env";
import { services } from "./services";

// Product photos: identity = sha256 of the uploaded bytes (also the vision cache key, D-029), stored resized
// in Postgres (Render free has no disk) and served at /img/{sha} with immutable caching.

export { ImageRejected, MAX_UPLOAD_BYTES };
export const MAX_PHOTOS_PER_UPLOAD = 12;

export interface StoredImage {
  sha256: string;
  url: string;
  width: number;
  height: number;
}

export async function storeImage(input: Buffer): Promise<StoredImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejected("Photo is larger than 12 MB.");
  const sha256 = photoSha256(input);
  const { db } = services();
  const [existing] = await db
    .select({ width: schema.images.width, height: schema.images.height })
    .from(schema.images)
    .where(eq(schema.images.sha256, sha256));
  if (existing) return { sha256, url: imageUrl(sha256), ...existing };
  const { data, info } = await processPhoto(input);
  await db
    .insert(schema.images)
    .values({ sha256, mime: "image/webp", width: info.width, height: info.height, bytes: data })
    .onConflictDoNothing();
  return { sha256, url: imageUrl(sha256), width: info.width, height: info.height };
}
// Photos are immutable by hash, so after the first read they are served from memory: a page of product cards no
// longer needs one database read per photo (an occasional slow Neon connection left a /shop card blank, D-106).
const memory = new ByteLru<typeof schema.images.$inferSelect>(32 * 1024 * 1024);

export async function loadImage(sha256: string) {
  const hit = memory.get(sha256);
  if (hit) return hit;
  const { db } = services();
  const [img] = await db.select().from(schema.images).where(eq(schema.images.sha256, sha256));
  if (img) memory.set(sha256, img);
  return img ?? null;
}

export function imageUrl(sha256: string) {
  return appUrl(`/img/${sha256}`);
}
