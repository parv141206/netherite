import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getImageAsset } from "~/server/googleDrive";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return new NextResponse("Missing image file id", { status: 400 });
    }

    const asset = await getImageAsset(session, id);
    if (!asset?.buffer) {
      return new NextResponse("Image not found", { status: 404 });
    }

    return new Response(asset.buffer, {
      status: 200,
      headers: {
        "Content-Type": asset.mimeType || "image/png",
        "Cache-Control": "private, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load image";
    console.error("Error serving note image:", err);
    return new NextResponse(message, { status: 500 });
  }
}
