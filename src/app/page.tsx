import { auth } from "~/server/auth";
import { LandingPage } from "~/components/landing/LandingPage";

export default async function HomePage() {
  let session: any = null;
  try {
    session = await auth();
  } catch (error) {
    console.error("Stale session cookie detected in HomePage:", error);
  }

  return <LandingPage session={session} />;
}
