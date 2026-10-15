import { loadImage } from "@/server/images";

export const dynamic = "force-dynamic";

// Product photos by content hash. Immutable: the URL changes whenever the bytes do.
export async function GET(req: Request, ctx: RouteContext<"/img/[sha]">) {
  const { sha } = await ctx.params;
  if (!/^[a-f0-9]{64}$/.test(sha)) return new Response("Not found", { status: 404 });
  if (req.headers.get("if-none-match") === `"${sha}"`) return new Response(null, { status: 304 });
  const img = await loadImage(sha);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "content-type": img.mime,
      "cache-control": "public, max-age=31536000, immutable",
      etag: `"${sha}"`,
    },
  });
}
