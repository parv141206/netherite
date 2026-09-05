// place here categories that you want to track. We want to track just a

import { isDevEnv } from "@excalidraw/common";

// small subset of categories at a given time.
const ALLOWED_CATEGORIES_TO_TRACK = new Set(["command_palette", "export"]);

export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number,
) => {
  try {
    if (
      typeof window === "undefined" ||
      process.env.NEXT_PUBLIC_EXCALIDRAW_WORKER_ID ||
      process.env.NEXT_PUBLIC_EXCALIDRAW_ENABLE_TRACKING !== "true"
    ) {
      return;
    }

    if (!ALLOWED_CATEGORIES_TO_TRACK.has(category)) {
      return;
    }

    if (isDevEnv()) {
      // comment out to debug in dev
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      console.info("trackEvent", { category, action, label, value });
    }

    if (window.sa_event) {
      window.sa_event(action, {
        category,
        label,
        value,
      });
    }
  } catch (error) {
    console.error("error during analytics", error);
  }
};
