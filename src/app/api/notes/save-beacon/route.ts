import { NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { saveNote } from "~/server/googleDrive";

interface SaveBeaconPayload {
  id?: unknown;
  content?: unknown;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as SaveBeaconPayload;
    const id = typeof body.id === "string" ? body.id : null;
    const content = typeof body.content === "string" ? body.content : null;

    if (!id || content === null) {
      return NextResponse.json(
        { error: "Invalid payload: id and string content are required" },
        { status: 400 },
      );
    }

    await saveNote(session, id, content);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("Save beacon error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
