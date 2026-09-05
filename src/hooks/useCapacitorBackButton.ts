"use client";

import { useEffect, useRef } from "react";

interface BackButtonHandlers {
  closeModals?: () => boolean;
  closeSidebar?: () => boolean;
}

export function useCapacitorBackButton({
  closeModals,
  closeSidebar,
}: BackButtonHandlers = {}) {
  const handlersRef = useRef({ closeModals, closeSidebar });
  handlersRef.current = { closeModals, closeSidebar };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) return;

        const { App } = await import("@capacitor/app");
        const listener = await App.addListener("backButton", ({ canGoBack }) => {
          // 1. First priority: Close any active modal, popover, or overlay
          if (handlersRef.current.closeModals && handlersRef.current.closeModals()) {
            return;
          }

          // 2. Second priority: Close mobile sidebar drawer if expanded
          if (handlersRef.current.closeSidebar && handlersRef.current.closeSidebar()) {
            return;
          }

          // 3. Third priority: Navigate browser history if possible
          if (canGoBack || (typeof window !== "undefined" && window.history.length > 1)) {
            window.history.back();
          } else {
            // 4. Root page: exit the native app
            App.exitApp();
          }
        });

        unlisten = () => {
          listener.remove();
        };
      } catch (err) {
        // Not in Capacitor environment or import failed
      }
    };

    setupListener();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);
}
