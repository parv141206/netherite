"use client";

import React, { useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

export function WindowControls() {
  const [isTauri, setIsTauri] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isHoveredGroup, setIsHoveredGroup] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkDesktop = () => {
        const isDesktopShell =
          "__TAURI__" in window ||
          "__TAURI_INTERNALS__" in window ||
          navigator.userAgent.includes("Tauri") ||
          navigator.userAgent.includes("NetheriteDesktop");

        if (isDesktopShell) {
          setIsTauri(true);

          import("@tauri-apps/api/window")
            .then(({ getCurrentWindow }) => {
              const appWindow = getCurrentWindow();
              appWindow.isMaximized().then(setIsMaximized).catch(() => {});
              appWindow.onResized(() => {
                appWindow.isMaximized().then(setIsMaximized).catch(() => {});
              });
            })
            .catch(() => {});
        }
      };

      checkDesktop();
      const t = setTimeout(checkDesktop, 300);
      return () => clearTimeout(t);
    }
  }, []);

  if (!isTauri) return null;

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch (_) {
      window.close();
    }
  };

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch (_) {}
  };

  const handleToggleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
      const maximized = await getCurrentWindow().isMaximized();
      setIsMaximized(maximized);
    } catch (_) {}
  };

  return (
    <div
      className="flex items-center gap-2 px-1.5 py-1 select-none shrink-0"
      data-tauri-no-drag
      onMouseEnter={() => setIsHoveredGroup(true)}
      onMouseLeave={() => setIsHoveredGroup(false)}
    >
      {/* Mac-Style Traffic Light Buttons */}
      {/* Close (Red) */}
      <button
        onClick={handleClose}
        className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center border border-[#e0443e] cursor-pointer shadow-xs group"
        title="Close"
      >
        {isHoveredGroup && <X className="w-2 h-2 text-[#4c0000] stroke-[2.5]" />}
      </button>

      {/* Minimize (Yellow) */}
      <button
        onClick={handleMinimize}
        className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center border border-[#dea123] cursor-pointer shadow-xs group"
        title="Minimize"
      >
        {isHoveredGroup && <Minus className="w-2 h-2 text-[#5c3e00] stroke-[2.5]" />}
      </button>

      {/* Maximize / Fullscreen (Green) */}
      <button
        onClick={handleToggleMaximize}
        className="w-3 h-3 rounded-full bg-[#27c93f] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center border border-[#1aab29] cursor-pointer shadow-xs group"
        title={isMaximized ? "Restore" : "Maximize"}
      >
        {isHoveredGroup && <Plus className="w-2 h-2 text-[#004d11] stroke-[2.5]" />}
      </button>
    </div>
  );
}
