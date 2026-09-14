import { auth } from "~/server/auth";
import { FeaturesPage } from "~/components/features/FeaturesPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Features & Architecture — Netherite",
  description:
    "Explore every feature of Netherite: Sovereign Google Drive sync, TikZ LaTeX Studio, Mermaid visualizer, Apollon UML modeling, Excalidraw whiteboards, and Git diff inspector.",
};

export default async function Page() {
  let session: any = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Stale session cookie detected in FeaturesPage:", error);
  }

  return <FeaturesPage session={session} />;
}
