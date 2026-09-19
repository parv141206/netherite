import { auth } from "~/server/auth";
import { listNotes, getWorkspaceMetadata } from "~/server/googleDrive";
import { WorkspaceLayout } from "~/components/workspace/WorkspaceLayout";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor — Netherite",
  description: "Sovereign Markdown Studio & Vector Whiteboard",
};

export default async function EditorPage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Stale session cookie detected in EditorPage:", error);
  }

  if (!session?.user || !session?.accessToken) {
    // If not authenticated, redirect to home page with login CTA
    redirect("/");
  }

  let notes: any[] = [];
  let initialNoteId = "";
  let initialMetadata: any = { folderColors: {} };

  try {
    const fetchPromises = Promise.all([
      listNotes(session).catch((err) => {
        console.error("Server listNotes error:", err?.message || err);
        return [];
      }),
      getWorkspaceMetadata(session).catch(() => ({ version: 1, folderColors: {}, files: {} })),
    ]);

    const timeoutPromise = new Promise<[any[], any]>((resolve) =>
      setTimeout(() => resolve([[], { version: 1, folderColors: {}, files: {} }]), 3500)
    );

    const [fetchedNotes, meta] = await Promise.race([fetchPromises, timeoutPromise]);
    notes = fetchedNotes || [];
    initialMetadata = meta || { folderColors: {} };

    const firstFile = notes.find(
      (n) => n.mimeType !== "application/vnd.google-apps.folder" && Boolean(n.id)
    );
    if (firstFile?.id) {
      initialNoteId = firstFile.id;
    }
  } catch (error) {
    console.error("Error fetching notes in EditorPage:", error);
  }

  return (
    <WorkspaceLayout
      session={session}
      initialNotes={notes}
      initialNoteId={initialNoteId}
      initialContent=""
      initialMetadata={initialMetadata}
    />
  );
}
