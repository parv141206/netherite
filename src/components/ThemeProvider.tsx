"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light" | "system";

export type MdThemeId =
  | "netherite"
  | "pookie"
  | "nord"
  | "dracula"
  | "solarized"
  | "forest"
  | "cyber";

export interface MdThemeInfo {
  id: MdThemeId;
  name: string;
  tagline: string;
  previewColor: string;
  previewBg: { light: string; dark: string };
  defaultFont?: GlobalFontId;
}

export const MD_THEMES: MdThemeInfo[] = [
  {
    id: "netherite",
    name: "Netherite",
    tagline: "Minimalist Obsidian & Linear focus",
    previewColor: "#3b82f6",
    previewBg: { light: "#fcfcfc", dark: "#09090b" },
    defaultFont: "system",
  },
  {
    id: "pookie",
    name: "Pookie Mode",
    tagline: "Pastel lavender, mint, butter & peach harmony",
    previewColor: "#c4b5fd",
    previewBg: { light: "#faf9fe", dark: "#151322" },
    defaultFont: "crafty-girls",
  },
  {
    id: "nord",
    name: "Nordic Frost",
    tagline: "Arctic polar night & snow storm",
    previewColor: "#88c0d0",
    previewBg: { light: "#eceff4", dark: "#242933" },
    defaultFont: "inter",
  },
  {
    id: "dracula",
    name: "Vampire Gothic",
    tagline: "Neon magenta, royal purple & gothic slate",
    previewColor: "#bd93f9",
    previewBg: { light: "#faf5ff", dark: "#1e1a29" },
    defaultFont: "fira",
  },
  {
    id: "solarized",
    name: "Amber Parchment",
    tagline: "Warm literary library & classical brass",
    previewColor: "#b58900",
    previewBg: { light: "#fdf6e3", dark: "#002b36" },
    defaultFont: "literata",
  },
  {
    id: "forest",
    name: "Botanical Sage",
    tagline: "Serene matcha, eucalyptus & evergreen moss",
    previewColor: "#22c55e",
    previewBg: { light: "#f0fdf4", dark: "#0b1f14" },
    defaultFont: "lora",
  },
  {
    id: "cyber",
    name: "Cyber Neon",
    tagline: "High-contrast matrix cyan & hot vaporwave",
    previewColor: "#00f5d4",
    previewBg: { light: "#f0f9ff", dark: "#040914" },
    defaultFont: "jetbrains",
  },
];

export type GlobalFontId =
  | "system"
  | "inter"
  | "outfit"
  | "jakarta"
  | "dm-sans"
  // Cursive & Handwritten Fonts (Girly & Excalifont)
  | "crafty-girls"
  | "excalifont"
  // Serif Fonts
  | "literata"
  | "playfair"
  | "lora"
  | "merriweather"
  // Monospace Fonts
  | "jetbrains"
  | "fira"
  | "space-mono";

export interface GlobalFontInfo {
  id: GlobalFontId;
  name: string;
  category: "sans" | "serif" | "cursive" | "mono";
  fontFamily: string;
  sampleText?: string;
}

export const GLOBAL_FONTS: GlobalFontInfo[] = [
  // Cursive & Handwritten Fonts (Girly & Excalifont)
  {
    id: "crafty-girls",
    name: "Girly",
    category: "cursive",
    fontFamily: "'Crafty Girls', cursive, sans-serif",
    sampleText: "Playful handwritten style",
  },
  {
    id: "excalifont",
    name: "Excalifont",
    category: "cursive",
    fontFamily: "'Excalifont', cursive, sans-serif",
    sampleText: "Architectural sketch handwriting",
  },
  // Clean Sans-Serif Fonts
  {
    id: "system",
    name: "Geist / Clean Sans",
    category: "sans",
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  },
  {
    id: "inter",
    name: "Inter",
    category: "sans",
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: "outfit",
    name: "Outfit",
    category: "sans",
    fontFamily: "'Outfit', sans-serif",
  },
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    category: "sans",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    category: "sans",
    fontFamily: "'DM Sans', sans-serif",
  },
  // Editorial Serif Fonts
  {
    id: "literata",
    name: "Literata Serif",
    category: "serif",
    fontFamily: "var(--font-literata), 'Literata', Georgia, serif",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    category: "serif",
    fontFamily: "'Playfair Display', Georgia, serif",
  },
  {
    id: "lora",
    name: "Lora",
    category: "serif",
    fontFamily: "'Lora', serif",
  },
  {
    id: "merriweather",
    name: "Merriweather",
    category: "serif",
    fontFamily: "'Merriweather', serif",
  },
  // Developer Monospace Fonts
  {
    id: "jetbrains",
    name: "JetBrains Mono",
    category: "mono",
    fontFamily: "'JetBrains Mono', monospace",
  },
  {
    id: "fira",
    name: "Fira Code",
    category: "mono",
    fontFamily: "'Fira Code', monospace",
  },
  {
    id: "space-mono",
    name: "Space Mono",
    category: "mono",
    fontFamily: "'Space Mono', monospace",
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  mdTheme: MdThemeId;
  setMdTheme: (mdTheme: MdThemeId) => void;
  globalFont: GlobalFontId;
  setGlobalFont: (font: GlobalFontId) => void;
  textOnlyClipboard: boolean;
  setTextOnlyClipboard: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [isDark, setIsDark] = useState<boolean>(true);
  const [mdTheme, setMdThemeState] = useState<MdThemeId>("netherite");
  const [globalFont, setGlobalFontState] = useState<GlobalFontId>("system");
  const [textOnlyClipboard, setTextOnlyClipboardState] = useState<boolean>(false);

  // Load saved preferences on client mount
  useEffect(() => {
    try {
      const savedTheme = (localStorage.getItem("netherite-theme") as Theme) || "dark";
      setThemeState(savedTheme);

      const savedMdTheme = (localStorage.getItem("netherite_md_theme") as MdThemeId) || "netherite";
      setMdThemeState(savedMdTheme);

      const savedGlobalFont = (localStorage.getItem("netherite_global_font") as GlobalFontId) || "system";
      setGlobalFontState(savedGlobalFont);

      const savedTextOnly = localStorage.getItem("netherite_text_only_clipboard") === "true";
      setTextOnlyClipboardState(savedTextOnly);
    } catch {}
  }, []);

  // Update root element classes & attributes when theme/font changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    localStorage.setItem("netherite-theme", theme);
    localStorage.setItem("netherite_md_theme", mdTheme);
    localStorage.setItem("netherite_global_font", globalFont);

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

    root.setAttribute("data-md-theme", mdTheme);
    root.setAttribute("data-global-font", globalFont);

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
  }, [theme, mdTheme, globalFont]);

  // Global prevention of full-page webview zooming across desktop / Tauri / WebKit
  useEffect(() => {
    if (typeof window === "undefined") return;

    const preventPageZoomWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const target = e.target as HTMLElement | null;
        // Don't prevent zoom if inside a component that handles its own zoom (like Mermaid diagrams or editor font scaler)
        const isInsideMermaid = target?.closest?.("[data-mermaid-container]");
        if (isInsideMermaid) return;

        const isInsideEditor = target?.closest?.("[data-editor-container]");
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

  const setMdTheme = (newMdTheme: MdThemeId) => {
    setMdThemeState(newMdTheme);
    const info = MD_THEMES.find((t) => t.id === newMdTheme);
    if (info?.defaultFont) {
      setGlobalFontState(info.defaultFont);
    }
  };

  const setGlobalFont = (newFont: GlobalFontId) => {
    setGlobalFontState(newFont);
  };

  const setTextOnlyClipboard = (enabled: boolean) => {
    setTextOnlyClipboardState(enabled);
    try {
      localStorage.setItem("netherite_text_only_clipboard", String(enabled));
    } catch {}
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        isDark,
        mdTheme,
        setMdTheme,
        globalFont,
        setGlobalFont,
        textOnlyClipboard,
        setTextOnlyClipboard,
      }}
    >
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
