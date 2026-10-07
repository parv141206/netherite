import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { getPdfStream } from "~/server/googleDrive";
import { Readable } from "node:stream";

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
      return new NextResponse("Missing PDF file id", { status: 400 });
    }

    const download = searchParams.get("download") === "1";
    const rangeHeader = req.headers.get("range");

    const asset = await getPdfStream(session, id, rangeHeader);
    if (!asset?.stream) {
      return new NextResponse("PDF not found", { status: 404 });
    }

    const headers = new Headers();
    headers.set("Content-Type", asset.mimeType || "application/pdf");

    const disposition = download ? "attachment" : "inline";
    const safeAsciiName = asset.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const utf8EncodedName = encodeURIComponent(asset.name);
    headers.set(
      "Content-Disposition",
      `${disposition}; filename="${safeAsciiName}"; filename*=UTF-8''${utf8EncodedName}`,
    );

    headers.set("Cache-Control", "private, max-age=86400, stale-while-revalidate=604800");
    headers.set("Accept-Ranges", "bytes");
    headers.set("X-Frame-Options", "SAMEORIGIN");

    if (asset.contentRange) {
      headers.set("Content-Range", asset.contentRange);
    }

    if (asset.contentLength) {
      headers.set("Content-Length", asset.contentLength);
    } else if (asset.size && !asset.contentRange) {
      headers.set("Content-Length", String(asset.size));
    }

    const webStream = Readable.toWeb(asset.stream) as unknown as ReadableStream;

    return new Response(webStream, {
      status: asset.status === 206 ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    const errorObj = err as any;
    if (errorObj?.code === 416 || errorObj?.status === 416) {
      return new NextResponse("Requested Range Not Satisfiable", { status: 416 });
    }
    const message = err instanceof Error ? err.message : "Failed to load PDF";
    console.error("Error serving note PDF:", err);
    return new NextResponse(message, { status: 500 });
  }
}
