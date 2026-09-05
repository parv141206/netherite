"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isDark, setIsDark] = useState<boolean>(true);

  useEffect(() => {
    const savedTheme = (localStorage.getItem("netherite-theme") as Theme) || "dark";
    setThemeState(savedTheme);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("netherite-theme", theme);

    let effectiveDark = true;
    if (theme === "system") {
      effectiveDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } else if (theme === "dark") {
      effectiveDark = true;
    } else {
      effectiveDark = false;
    }

    setIsDark(effectiveDark);
    if (effectiveDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Dynamically update mobile status bar on Android
    if (typeof window !== "undefined") {
      import("@capacitor/status-bar")
        .then(({ StatusBar, Style }) => {
          if (effectiveDark) {
            StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
            StatusBar.setBackgroundColor({ color: "#09090b" }).catch(() => {});
          } else {
            StatusBar.setStyle({ style: Style.Light }).catch(() => {});
            StatusBar.setBackgroundColor({ color: "#fcfcfc" }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [theme]);

  // Global prevention of full-page webview zooming across desktop / Tauri / WebKit
  useEffect(() => {
    if (typeof window === "undefined") return;

    const preventPageZoomWheel = (e: WheelEvent) => {
      // Prevent browser default UI zoom on Ctrl + Wheel / Pinch outside of handled elements
      if (e.ctrlKey || e.metaKey) {
        // If the target is not inside an editor that handles its own font scaling, prevent zoom
        const isInsideEditor = (e.target as HTMLElement | null)?.closest?.("[data-editor-container]");
        if (!isInsideEditor) {
          e.preventDefault();
        }
      }
    };

    const preventGesture = (e: Event) => {
      e.preventDefault();
    };

    const preventZoomKeys = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "=" || e.key === "+" || e.key === "-" || e.key === "_" || e.key === "0")
      ) {
        const isInsideEditor = (e.target as HTMLElement | null)?.closest?.("[data-editor-container]");
        if (!isInsideEditor) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("wheel", preventPageZoomWheel, { passive: false, capture: true });
    document.addEventListener("wheel", preventPageZoomWheel, { passive: false, capture: true });
    window.addEventListener("gesturestart", preventGesture, { passive: false, capture: true });
    window.addEventListener("gesturechange", preventGesture, { passive: false, capture: true });
    window.addEventListener("gestureend", preventGesture, { passive: false, capture: true });
    window.addEventListener("keydown", preventZoomKeys, { capture: true });

    return () => {
      window.removeEventListener("wheel", preventPageZoomWheel, { capture: true });
      document.removeEventListener("wheel", preventPageZoomWheel, { capture: true });
      window.removeEventListener("gesturestart", preventGesture, { capture: true });
      window.removeEventListener("gesturechange", preventGesture, { capture: true });
      window.removeEventListener("gestureend", preventGesture, { capture: true });
      window.removeEventListener("keydown", preventZoomKeys, { capture: true });
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
