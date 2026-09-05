import { auth } from "~/server/auth";
import { listNotes, getNoteContent, getWorkspaceMetadata } from "~/server/googleDrive";
import { WorkspaceLayout } from "~/components/workspace/WorkspaceLayout";

export default async function HomePage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Stale session cookie detected:", error);
  }

  if (!session?.user || !session?.accessToken) {
    return <WorkspaceLayout session={null} />;
  }

  let notes: any[] = [];
  let initialContent = "";
  let initialNoteId = "";
  let initialMetadata = { folderColors: {} };

  try {
    notes = await listNotes(session);
    initialMetadata = await getWorkspaceMetadata(session);
    const firstFile = notes.find(
      (n) => n.mimeType !== "application/vnd.google-apps.folder" && Boolean(n.id)
    );
    if (firstFile?.id) {
      initialNoteId = firstFile.id;
      initialContent = await getNoteContent(session, initialNoteId);
    }
  } catch (error) {
    console.error("Error fetching notes in HomePage:", error);
  }

  return (
    <WorkspaceLayout
      session={session}
      initialNotes={notes}
      initialNoteId={initialNoteId}
      initialContent={initialContent}
      initialMetadata={initialMetadata}
    />
  );
}

