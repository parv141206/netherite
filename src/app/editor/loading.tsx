import { AppleFullPageLoader } from "~/components/ui/AppleFullPageLoader";

export default function EditorLoading() {
  return (
    <AppleFullPageLoader
      message="Fetching your notes and whiteboards from Google Drive..."
      subMessage="Zero database. Sovereign storage."
    />
  );
}
