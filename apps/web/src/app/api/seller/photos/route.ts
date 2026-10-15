import { errorResponse } from "@/server/http";
import { ImageRejected, MAX_PHOTOS_PER_UPLOAD, storeImage } from "@/server/images";
import { requireSeller } from "@/server/seller-session";

export const dynamic = "force-dynamic";

// Upload product photos (multipart field "photos"). Each is hashed, resized and stored; drafts come next.
export async function POST(req: Request) {
  try {
    await requireSeller();
    const form = await req.formData();
    const files = form.getAll("photos").filter((f): f is File => typeof f !== "string");
    if (files.length === 0 || files.length > MAX_PHOTOS_PER_UPLOAD)
      return Response.json({ error: { code: "VALIDATION_ERROR", message: `Choose 1 to ${MAX_PHOTOS_PER_UPLOAD} photos.` } }, { status: 400 });
    const photos = await Promise.all(
      files.map(async (f) => {
        try {
          return { name: f.name, ...(await storeImage(Buffer.from(await f.arrayBuffer()))) };
        } catch (e) {
          if (e instanceof ImageRejected) return { name: f.name, error: e.message };
          throw e;
        }
      }),
    );
    return Response.json({ photos });
  } catch (e) {
    return errorResponse(e);
  }
}
