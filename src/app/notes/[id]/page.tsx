import { auth } from "~/server/auth";
import { listNotes, getNoteContent } from "~/server/googleDrive";
import { WorkspaceLayout } from "~/components/workspace/WorkspaceLayout";
import { redirect } from "next/navigation";

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  let session: any = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Stale session cookie detected:", error);
  }

  if (!session?.user || !session?.accessToken) {
    redirect("/");
  }

  const { id } = await params;
  let notes: any[] = [];
  let initialContent = "";

  try {
    notes = await listNotes(session);
    initialContent = await getNoteContent(session, id);
  } catch (error) {
    console.error("Failed to load note page:", error);
  }

  return (
    <WorkspaceLayout
      session={session}
      initialNotes={notes}
      initialNoteId={id}
      initialContent={initialContent}
    />
  );
}
