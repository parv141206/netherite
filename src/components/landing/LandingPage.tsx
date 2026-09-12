"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  LogIn,
  Moon,
  Sun,
  Folder,
  FileText,
  ChevronRight,
  ArrowRight,
  HardDrive,
  Palette,
  Network,
  Cpu,
  Layers,
  Download,
  Smartphone,
  Monitor,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import katex from "katex";
import Lenis from "lenis";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { AppleFullPageLoader } from "~/components/ui/AppleFullPageLoader";

function GridCrosshair({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`font-mono text-[11px] text-blue-500/70 dark:text-blue-400/70 select-none pointer-events-none leading-none ${className}`}
    >
      +
    </span>
  );
}

export function LandingPage({ session }: { session?: any } = {}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"math" | "whiteboard" | "uml" | "code">("math");
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    setMounted(true);

    const lenis = new Lenis({
      autoRaf: true,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    return () => {
      lenis.destroy();
    };
  }, []);

  const handleCopyCmd = () => {
    navigator.clipboard.writeText("chmod +x Netherite.AppImage && ./Netherite.AppImage");
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  const renderedLatex = (() => {
    try {
      return katex.renderToString(
        "\\partial_\\mu J^\\mu = 0 \\quad\\implies\\quad Q = \\int_{\\Sigma} d^3x \\, J^0 = \\text{constant}",
        { displayMode: true, throwOnError: false }
      );
    } catch {
      return "\\partial_\\mu J^\\mu = 0";
    }
  })();

  const renderedInline = (() => {
    try {
      return katex.renderToString(
        "\\mathcal{L}_{\\text{gauge}} = -\\frac{1}{4} F_{\\mu\\nu}F^{\\mu\\nu}",
        {
          displayMode: false,
          throwOnError: false,
        }
      );
    } catch {
      return "L";
    }
  })();

  return (
    <div
      data-landing-page="true"
      className="min-h-dvh flex flex-col justify-between bg-white dark:bg-black text-black dark:text-white transition-colors duration-300 selection:bg-foreground selection:text-background relative overflow-x-clip"
    >
      {isNavigating && (
        <AppleFullPageLoader
          message="Opening sovereign workspace..."
          subMessage="Fetching your notes and whiteboards from Google Drive"
        />
      )}

      {/* Atmospheric Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none -z-10 dark:from-blue-500/10 dark:via-purple-500/5" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-blue-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-dotted border-blue-500/40 dark:border-blue-400/35 backdrop-blur-md sticky top-0 z-50 bg-white/90 dark:bg-black/90">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-x border-dotted border-blue-500/40 dark:border-blue-400/35 relative">
          <GridCrosshair className="absolute -bottom-2 -left-2 z-20 hidden lg:block" />
          <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />

          <div className="flex items-center gap-2.5 sm:gap-3">
            <NetheriteLogo className="h-7 sm:h-8 w-auto text-foreground shrink-0 transition-transform duration-200 hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-[11px] sm:text-xs">NETHERITE</span>
              <span className="text-[9px] sm:text-[10px] text-muted-foreground font-mono tracking-tight">studio</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <a
              href="#downloads"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-border/60 hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>

            <Link
              href="/privacy"
              className="hidden md:inline px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hidden md:inline px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms
            </Link>

            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 sm:p-2 rounded-lg border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </button>
            )}

            {session?.user ? (
              <Link
                href="/editor"
                onClick={() => setIsNavigating(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Open Editor</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setIsNavigating(true);
                  signIn("google", { callbackUrl: "/editor" });
                }}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full bg-white dark:bg-black">
        {/* ========================================================================= */}
        {/* HERO GRID SECTION (Strict 4-column PC Grid: Gutter | Hero Span | Gutter) */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                GRID // LATERAL_L
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Hero Main Content (Spans middle two columns) */}
            <div className="lg:col-span-2 px-4 sm:px-8 pt-12 sm:pt-16 pb-16 flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
              {/* Grand Headline */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl">
                Where <span className="font-serif italic font-normal text-foreground">thought</span> crystallizes{" "}
                into <span className="underline decoration-blue-500/50 decoration-wavy underline-offset-8">craft.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed font-normal">
                An artisanal workspace for theoretical mathematics, computational architectures, and scientific prose.
                Stored 100% in your personal Google Drive as open <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">.md</code> notes and <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">.excalidraw</code> whiteboards.
              </p>

              {/* Hero Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 mb-12 sm:mb-14 w-full sm:w-auto">
                {session?.user ? (
                  <Link
                    href="/editor"
                    onClick={() => setIsNavigating(true)}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-foreground text-background font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer group"
                  >
                    <span>Launch Studio Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                ) : (
                  <button
                    onClick={() => {
                      setIsNavigating(true);
                      signIn("google", { callbackUrl: "/editor" });
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-foreground text-background font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer group"
                  >
                    <span>Open Studio in Google Drive</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                )}
                <a
                  href="#downloads"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 border border-border/80 bg-card hover:bg-accent text-foreground text-xs font-medium rounded-xl transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Native Apps</span>
                </a>
                <a
                  href="#features"
                  className="px-4 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Core Architecture ↓
                </a>
              </div>

              {/* Live Studio Mockup / Interactive Preview */}
              <div className="w-full rounded-2xl border border-blue-500/30 bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl text-left text-xs transition-all">
                {/* Mock Window Top Bar */}
                <div className="px-3 sm:px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2 select-none min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground truncate ml-1">
                      ~/Google Drive/netherite/Quantum Mechanics/{activeTab === "whiteboard" ? "System Topology.excalidraw" : activeTab === "uml" ? "Architecture.apollon" : "Noether Symmetries.md"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/40 shrink-0">
                      {activeTab === "whiteboard" ? "Vector Canvas" : activeTab === "uml" ? "UML Studio" : "Literata Serif"}
                    </span>
                    <span className="hidden sm:inline text-emerald-500 font-mono text-[10px]">Saved</span>
                  </div>
                </div>

                {/* Mock Workspace Body */}
                <div className="grid grid-cols-1 md:grid-cols-4 min-h-[400px]">
                  {/* Sidebar Mock */}
                  <div className="border-r border-border/40 p-3.5 hidden md:flex flex-col justify-between bg-muted/20 font-sans select-none">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        <span>Explorer</span>
                      </div>

                      {/* Root folder */}
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 px-1.5 py-1 text-foreground font-medium rounded-md">
                          <ChevronRight className="w-3 h-3 rotate-90" />
                          <Folder className="w-3.5 h-3.5 text-blue-500" />
                          <span>netherite</span>
                        </div>

                        <div className="pl-4 border-l border-border/40 ml-2 space-y-1 mt-0.5">
                          {/* Pastel Folder */}
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/15 dark:bg-blue-500/25 text-foreground border border-blue-500/30 rounded-md font-medium">
                            <ChevronRight className="w-3 h-3 rotate-90 text-foreground/70" />
                            <Folder className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Quantum Mechanics</span>
                          </div>

                          <div className="pl-4 border-l border-border/40 ml-2 space-y-0.5">
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition-colors ${activeTab !== "whiteboard" && activeTab !== "uml" ? "bg-accent text-foreground font-semibold shadow-2xs" : "text-muted-foreground"}`}>
                              <FileText className="w-3.5 h-3.5" />
                              <span>Noether Symmetries</span>
                            </div>
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition-colors ${activeTab === "whiteboard" ? "bg-accent text-foreground font-semibold shadow-2xs" : "text-muted-foreground"}`}>
                              <Palette className="w-3.5 h-3.5 text-purple-400" />
                              <span>System Topology</span>
                            </div>
                          </div>

                          {/* Mint Folder */}
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/15 dark:bg-emerald-500/25 text-foreground border border-emerald-500/30 rounded-md font-medium">
                            <ChevronRight className="w-3 h-3 text-foreground/70" />
                            <Folder className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Differential Geometry</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-emerald-500" /> Synced to Drive
                      </span>
                      <span className="font-mono text-[10px]">0ms</span>
                    </div>
                  </div>

                  {/* Document / Canvas Mock */}
                  <div className="md:col-span-3 p-4 sm:p-7 flex flex-col justify-between bg-background min-w-0 overflow-hidden">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-border/30">
                        <span className="text-xs text-muted-foreground truncate">
                          Quantum Mechanics / {activeTab === "whiteboard" ? "System Topology.excalidraw" : activeTab === "uml" ? "Architecture.apollon" : "Noether Symmetries.md"}
                        </span>
                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 shrink-0 self-start sm:self-auto overflow-x-auto max-w-full">
                          <button
                            onClick={() => setActiveTab("math")}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                              activeTab === "math" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Theoretical Physics
                          </button>
                          <button
                            onClick={() => setActiveTab("whiteboard")}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                              activeTab === "whiteboard" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Palette className="w-3 h-3 text-indigo-400" />
                            <span>Architecture Canvas</span>
                          </button>
                          <button
                            onClick={() => setActiveTab("uml")}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                              activeTab === "uml" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <Network className="w-3 h-3 text-purple-400" />
                            <span>UML Studio</span>
                          </button>
                          <button
                            onClick={() => setActiveTab("code")}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                              activeTab === "code" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Algorithmic Rigor
                          </button>
                        </div>
                      </div>

                      {activeTab === "math" && (
                        <div className="space-y-4 font-serif text-sm leading-relaxed text-foreground/90">
                          <h2 className="text-xl sm:text-2xl font-serif font-bold text-foreground">
                            Continuous Symmetries & Conservation Invariants
                          </h2>
                          <p>
                            In Lagrangian field theory, each continuous global symmetry transformation parameter{" "}
                            <span
                              className="inline-block px-1.5 py-0.5 bg-muted/50 rounded font-sans text-xs"
                              dangerouslySetInnerHTML={{ __html: renderedInline }}
                            />{" "}
                            leaves the action integral invariant across all boundary hypersurfaces:
                          </p>

                          <div
                            className="my-4 p-4 rounded-xl bg-muted/30 border border-border/40 text-center overflow-x-auto"
                            dangerouslySetInnerHTML={{ __html: renderedLatex }}
                          />

                          <blockquote className="pl-4 border-l-2 border-foreground italic text-muted-foreground text-xs sm:text-sm">
                            “Symmetry dictates interactions; geometry determines conservation laws.”
                          </blockquote>
                        </div>
                      )}

                      {activeTab === "whiteboard" && (
                        <div className="space-y-4 font-sans">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                              <span>Computational System Topology</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                Vector Canvas
                              </span>
                            </h2>
                            <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                              Powered by Excalidraw
                            </span>
                          </div>

                          <div className="relative p-5 rounded-xl bg-card border border-border/60 overflow-hidden shadow-inner min-h-[200px] flex flex-col justify-center">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                              <div className="rounded-lg border border-border/80 bg-background/80 p-3.5 shadow-sm space-y-2">
                                <div className="border-b border-border/60 pb-1.5 flex items-center justify-between">
                                  <strong className="text-xs text-foreground font-mono">QuantumCauchySlice</strong>
                                  <span className="text-[9px] text-muted-foreground font-mono">«UML Class»</span>
                                </div>
                                <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                                  <div>+ metricTensor: Tensor&lt;4,4&gt;</div>
                                  <div>+ cauchyHorizon: BoundaryArea</div>
                                </div>
                                <div className="border-t border-border/40 pt-1.5 space-y-1 font-mono text-[10px] text-foreground/80">
                                  <div>+ computeCurvature(): RicciScalar</div>
                                  <div>+ integrateHypersurface(): Charge</div>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <div className="p-3 rounded-lg border border-border/80 bg-background/80 shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Cpu className="w-3.5 h-3.5 text-blue-400" />
                                    <span className="font-mono text-xs text-foreground">MultiHeadAttention</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-muted-foreground">d_model=512</span>
                                </div>

                                <div className="flex justify-center text-muted-foreground font-mono text-[10px]">
                                  ↓ forward pass tensor
                                </div>

                                <div className="p-3 rounded-lg border border-border/80 bg-background/80 shadow-sm flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="font-mono text-xs text-foreground">LayerNorm & Dropout</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-emerald-400">p=0.1</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "uml" && (
                        <div className="space-y-4 font-sans">
                          <div className="flex items-center justify-between">
                            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                              <span>Object & System Architecture</span>
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                                UML 2.5
                              </span>
                            </h2>
                            <a
                              href="https://github.com/ls1intum/Apollon"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-muted-foreground hover:text-foreground font-mono hidden sm:inline-flex items-center gap-1 transition-colors"
                            >
                              Powered by Apollon
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          </div>

                          <div className="relative p-5 rounded-xl bg-card border border-border/60 overflow-hidden shadow-inner min-h-[200px] flex flex-col justify-center">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                              <div className="rounded-lg border border-purple-500/30 bg-background/90 p-3.5 shadow-sm space-y-2">
                                <div className="border-b border-border/60 pb-1.5 flex items-center justify-between">
                                  <strong className="text-xs text-foreground font-mono">QuantumStateEngine</strong>
                                  <span className="text-[9px] text-purple-400 font-mono">«Interface»</span>
                                </div>
                                <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                                  <div>+ hilbertDim: Integer = 256</div>
                                  <div>+ stateVector: ComplexMatrix</div>
                                </div>
                                <div className="border-t border-border/40 pt-1.5 space-y-1 font-mono text-[10px] text-foreground/80">
                                  <div>+ evolveHamiltonian(dt: Float)</div>
                                  <div>+ measureObservable(O: Operator)</div>
                                </div>
                              </div>

                              <div className="rounded-lg border border-border/80 bg-background/80 p-3.5 shadow-sm space-y-2">
                                <div className="border-b border-border/60 pb-1.5 flex items-center justify-between">
                                  <strong className="text-xs text-foreground font-mono">DecoherenceObserver</strong>
                                  <span className="text-[9px] text-muted-foreground font-mono">«UML Class»</span>
                                </div>
                                <div className="space-y-1 font-mono text-[10px] text-muted-foreground">
                                  <div>- entropyThreshold: Float</div>
                                  <div>- bathCoupling: Tensor</div>
                                </div>
                                <div className="border-t border-border/40 pt-1.5 space-y-1 font-mono text-[10px] text-foreground/80">
                                  <div>+ onStateCollapse(event: CollapseEvent)</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "code" && (
                        <div className="space-y-4 font-sans text-xs sm:text-sm">
                          <h2 className="text-lg sm:text-xl font-bold text-foreground">
                            Algorithmic Proof Formulation
                          </h2>
                          <p className="text-muted-foreground text-xs leading-relaxed">
                            Pasting computational models retains 100% of tabs, indentation, and syntax clarity without format decay:
                          </p>
                          <pre className="p-4 rounded-xl bg-muted/50 border border-border/60 font-mono text-xs overflow-x-auto leading-relaxed text-foreground">
                            <code>{`// Conserved Noether invariant integration across spatial slice
pub struct CauchyState<T: Hypersurface> {
    pub metric: Tensor<4, 4>,
    pub slice: T,
}

impl<T: Hypersurface> CauchyState<T> {
    pub fn compute_noether_charge(&self, current: &FourCurrent) -> Charge {
        let j0 = current.timelike_projection();
        self.slice.integrate_surface(j0)
    }
}`}</code>
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="pt-5 mt-5 border-t border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-muted-foreground font-mono">
                      <span className="truncate">
                        {activeTab === "whiteboard"
                          ? "Vector Whiteboard (.excalidraw)"
                          : activeTab === "uml"
                          ? "Apollon UML Modeling Engine (.apollon)"
                          : "Markdown + KaTeX Extension (.md)"}
                      </span>
                      <span className="text-emerald-500 flex items-center gap-1 font-sans font-medium shrink-0">
                        ● 100% Google Drive Sovereign
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                GRID // LATERAL_R
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* 6 STRICT GRID SECTIONS: | SOME GAP | MIDDLE LEFT | MIDDLE RIGHT | SOME GAP | */}
        {/* ========================================================================= */}

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 1: Image Left | Text Right — Sovereign Markdown Notes */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 01
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/1_notes.svg"
                alt="The Sanctuary of Unbroken Thought — Sovereign Notes"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 01 • PROSE & MEMORY
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  The Sanctuary of Unbroken Thought
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  A tranquil expanse where raw intellect transmutes into sovereign prose. Free from cloud telemetry and ephemeral silos, every paragraph rests directly within your own Google Drive in immutable Markdown—enduring, distractionless, and forever your own.
                </p>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 01
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 2: Text Left | Image Right — Mathematical KaTeX */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 02
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 02 • MATHEMATICAL RIGOR
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  The Geometry of Pure Reason
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  From Cauchy slices to quantum invariants, express the fundamental symmetries of creation. Instantaneous KaTeX typesetting renders formal proofs with illuminated typographic dignity, forgiving broken syntax and keeping pace with the velocity of proof.
                </p>
              </div>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/2_math.svg"
                alt="The Geometry of Pure Reason — Mathematical Typesetting"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 02
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 3: Image Left | Text Right — Literature & Long-form */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 03
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/3_literature.svg"
                alt="Manuscripts Woven for Centuries — Literature & Prose"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 03 • SCHOLARSHIP & PROSE
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  Manuscripts Woven for the Centuries
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  An intimate scriptorium for exhaustive treatises, contemplative monographs, and timeless essays. Engineered with soothing circadian warmth, unhurried margins, and rhythmic typography tuned to nurture prolonged bouts of deep, undisturbed scholarship.
                </p>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 03
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 4: Text Left | Image Right — Excalidraw Spatial Canvas */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 04
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 04 • SPATIAL INTUITION
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  Cartography of the Unseen
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  Thoughts rarely wander in linear corridors. Unfold an infinite vector expanse powered by Excalidraw to delineate distributed topologies, speculative systems, and hand-drawn archetypes—bridging the chasm between raw text and spatial enlightenment.
                </p>
              </div>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/4_excalidraw.svg"
                alt="Cartography of the Unseen — Vector Whiteboard"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 04
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 5: Image Left | Text Right — Apollon UML Engine */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 05
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/5_uml.svg"
                alt="The Architectonic Blueprint — Apollon UML Suite"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 05 • STRUCTURAL SYNTHESIS
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  The Architectonic Blueprint
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  Orchestrate complex software architectures with the full Apollon UML 2.5 modeling engine. Model class hierarchies, package boundaries, and message pathways with absolute structural fidelity, turning abstract code into tangible structural art.
                </p>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 05
              </span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* SECTION 6: Text Left | Image Right — Mermaid Dialectic & Flow */}
        {/* ------------------------------------------------------------------------- */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SECTION // 06
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Feature Text (Title in serif italic blue + Description) */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <div className="flex flex-col justify-center max-w-xl">
                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">
                  CANON // 06 • DYNAMIC DIALECTIC
                </span>
                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-4 leading-tight">
                  Choreographies of State and Time
                </h3>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed font-serif italic">
                  Transmute living logic and state machines into vivid, responsive diagrams. Powered by an adaptive Mermaid engine with pinch-to-zoom fluidity, pan mobility, and vector sharpness, your algorithms transform into living tapestries of causality.
                </p>
              </div>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Image (Takes the whole square, pure white in light, pure black in dark) */}
            <div className="w-full aspect-square flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/6_mermaid.svg"
                alt="Choreographies of State and Time — Mermaid Diagrams"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-10 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // 06
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* NATIVE MULTI-PLATFORM DOWNLOADS SECTION (Framed in Grid) */}
        {/* ========================================================================= */}
        <section id="downloads" className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative scroll-mt-14 bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SYS // DOWNLOADS
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle 2 Columns for Download Cards */}
            <div className="lg:col-span-2 p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
              <div className="text-center mb-12">
                <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-3">
                  Download Netherite Studio
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Standalone desktop and mobile apps engineered with native frameless shells, hardware acceleration, and seamless Google Drive cloud synchronization.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* 1. Linux Desktop Card */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/80 backdrop-blur-md flex flex-col justify-between shadow-lg hover:border-blue-500/60 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/80 border border-border/60 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                        <Monitor className="w-5 h-5 text-emerald-500" />
                      </div>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                        Linux (x86_64)
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground mb-1">Linux Desktop</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      High-performance Tauri 2.x native shell with custom Mac traffic lights and WebKitGTK acceleration.
                    </p>

                    <div className="space-y-2 mb-6">
                      <a
                        href="/downloads/netherite-linux.AppImage"
                        download="Netherite.AppImage"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .AppImage (96 MB)</span>
                      </a>

                      <a
                        href="/downloads/netherite-linux.deb"
                        download="Netherite_1.0.0_amd64.deb"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-accent text-foreground text-xs font-medium rounded-xl border border-border/60 transition-all"
                      >
                        <Download className="w-3.5 h-3.5 opacity-70" />
                        <span>Download .deb (Debian/Ubuntu)</span>
                      </a>
                    </div>

                    {/* Quick Linux terminal hint */}
                    <div className="p-2.5 rounded-lg bg-muted/50 border border-border/40 font-mono text-[10px] text-muted-foreground flex items-center justify-between gap-2 mb-4">
                      <span className="truncate">chmod +x Netherite.AppImage</span>
                      <button
                        onClick={handleCopyCmd}
                        className="text-foreground hover:underline shrink-0 text-[10px] cursor-pointer"
                      >
                        {copiedCmd ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Android Mobile Card */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/80 backdrop-blur-md flex flex-col justify-between shadow-lg hover:border-blue-500/60 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/80 border border-border/60 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                        <Smartphone className="w-5 h-5 text-purple-400" />
                      </div>
                      <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-medium">
                        Android 8.0+
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground mb-1">Android Mobile</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Sleek Capacitor mobile application with AMOLED dark status bar and bottom Obsidian markdown ribbon.
                    </p>

                    <div className="space-y-2 mb-6">
                      <a
                        href="/downloads/netherite-android.apk"
                        download="Netherite.apk"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .apk (4.3 MB)</span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. Windows Desktop Card */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/80 backdrop-blur-md flex flex-col justify-between shadow-lg hover:border-blue-500/60 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/80 border border-border/60 flex items-center justify-center text-foreground group-hover:scale-105 transition-transform">
                        <Monitor className="w-5 h-5 text-blue-500" />
                      </div>
                      <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400 font-medium">
                        Windows 10 / 11
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground mb-1">Windows Desktop</h3>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      Fast native Windows desktop build powered by Tauri 2.x and Microsoft Edge WebView2 runtime.
                    </p>

                    <div className="space-y-2 mb-6">
                      <a
                        href="https://github.com/parv141206/netherite/releases"
                        target="_blank"
                        rel="noreferrer"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-foreground text-background font-semibold text-xs rounded-xl hover:opacity-90 transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .exe Installer</span>
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                SYS // LATERAL_R
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* ARCHITECTURE SECTION (Framed in Grid) */}
        {/* ========================================================================= */}
        <section id="features" className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                PILLARS // 01
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle 2 Columns for Architecture Cards */}
            <div className="lg:col-span-2 p-6 sm:p-10 lg:p-12 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
              <div className="text-center mb-12">
                <span className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-mono block mb-2">
                  FOUNDATIONS // ARCHITECTURE
                </span>
                <h2 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] mb-3 leading-tight">
                  The Pillars of Intellectual Custody
                </h2>
                <p className="text-base sm:text-lg text-muted-foreground font-serif italic max-w-2xl mx-auto leading-relaxed">
                  Forged not for transient trends, but as an enduring sanctuary for thought—grounded in absolute data sovereignty, mathematical purity, and the quiet dignity of the written word.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                {/* 1. Google Drive Core */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Sovereign Cloud Custody</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      Zero black-box vaults. Every manuscript and diagram commits as pure, open <code className="font-mono text-[10px]">.md</code> or <code className="font-mono text-[10px]">.excalidraw</code> artifacts directly into your personal Drive.
                    </p>
                  </div>
                </div>

                {/* 2. Whiteboard Suite */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Boundless Vector Canvas</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      An unconstrained Excalidraw studio engineered for spatial cognition: chart distributed topologies, conceptual hierarchies, and transformer architectures where intuition leads.
                    </p>
                  </div>
                </div>

                {/* 3. KaTeX Typesetting */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Typographic Rigor</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      Instantaneous KaTeX typesetting that honors the formal beauty of proof. Seamlessly resolves differential manifolds and contour integrals with unblemished aesthetic precision.
                    </p>
                  </div>
                </div>

                {/* 4. Split Studio */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Symbiotic Dual-Pane Workspace</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      Synthesize literature and spatial schematics in parallel harmony. Write comprehensive dissertations while simultaneously manipulating visual models without losing mental focus.
                    </p>
                  </div>
                </div>

                {/* 5. Blue Light Warmth */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Circadian Nocturnal Glow</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      Hardware-accelerated warmth control dynamically transitions your workspace into soothing nocturnal parchment at dusk, protecting vision across solitary late-night hours.
                    </p>
                  </div>
                </div>

                {/* 6. Zero Lock-in */}
                <div className="p-6 rounded-2xl border border-blue-500/30 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-blue-500/60 transition-colors">
                  <div>
                    <h3 className="font-serif italic text-base sm:text-lg text-foreground mb-1.5">Eternal Autonomy</h3>
                    <p className="text-xs text-muted-foreground font-serif leading-relaxed">
                      Your life&apos;s work remains unconditionally yours. Instantly open and modify every document in Obsidian, VS Code, or standard Unix terminal pipelines whenever you desire.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // PILLARS
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* SECTION 7 / FINALE: ICARUS — DARING THE SUN */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-dotted border-blue-500/40 dark:border-blue-400/35 relative bg-white dark:bg-black">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            {/* Left Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative select-none bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                FINIS // ICARUS
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            {/* Middle Left: Vertical Icarus Engraving */}
            <div className="w-full aspect-square lg:aspect-auto flex items-center justify-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 relative p-0 m-0 bg-white dark:bg-black overflow-hidden">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <img
                src="/images/icarus.png"
                alt="Icarus Ascendant — To Inscribe is to Defy Oblivion"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain select-none dark:invert dark:hue-rotate-180 block m-0 p-0 pointer-events-none"
              />
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Middle Right: Literature & Quote / Call to Action */}
            <div className="p-6 sm:p-10 lg:p-14 border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 flex flex-col justify-center relative bg-white dark:bg-black">
              <GridCrosshair className="absolute -top-2 -right-2 z-20 hidden lg:block" />
              <div className="flex flex-col justify-center max-w-xl space-y-6">
                <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                  <span>EPISTLE // FINALE</span>
                </div>

                <h3 className="font-serif italic font-normal text-3xl sm:text-4xl lg:text-5xl text-[#0600ff] dark:text-[#3b82f6] leading-tight">
                  To Inscribe is to Defy Oblivion
                </h3>

                <blockquote className="border-l-2 border-[#0600ff] dark:border-[#3b82f6] pl-4 py-1 italic font-serif text-lg sm:text-xl text-foreground/90 leading-snug">
                  &ldquo;They cautioned of the sun and the melting wax; they forgot that for one radiant breath, he touched the infinite.&rdquo;
                </blockquote>

                <div className="space-y-4 text-sm sm:text-base text-muted-foreground font-serif leading-relaxed">
                  <p>
                    History was never a passive stream—it was carved by the ink of those who dared to question the horizon. Every epochal divergence in human understanding, from the margin theorems of Fermat to the clandestine astronomical notebooks of Galileo, began when a solitary mind sat before an empty page and refused silence.
                  </p>
                  <p>
                    Netherite was forged not merely as an editor, but as an enduring sanctuary for that audacity. In an age of ephemeral clouds, rented intellect, and vanishing platforms, let your thoughts remain sovereign, unyielding, and forever your own.
                  </p>
                  <p className="font-semibold text-foreground/90 italic">
                    Dare the zenith. Inscribe your thoughts. Shift the trajectory of history.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <Link
                    href="/workspace"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0600ff] dark:bg-blue-600 text-white font-serif italic text-base hover:opacity-90 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                  >
                    <span>Enter Netherite Studio</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <a
                    href="#downloads"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-blue-500/30 hover:border-blue-500/60 font-mono text-xs text-foreground transition-all"
                  >
                    <span>Download Native Apps</span>
                  </a>
                </div>
              </div>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />
            </div>

            {/* Right Gutter */}
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 relative select-none bg-white dark:bg-black">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                LATERAL // FINIS
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full relative bg-white dark:bg-black">
        <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 dark:border-blue-400/35 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
          <div className="hidden lg:block border-r border-dotted border-blue-500/40 dark:border-blue-400/35 bg-white dark:bg-black" />
          <div className="lg:col-span-2 px-4 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 dark:border-blue-400/35 bg-white dark:bg-black">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">NETHERITE</span>
              <span>•</span>
              <span>Sovereign Markdown Studio & Vector Whiteboard</span>
            </div>

            <div className="flex items-center gap-4 text-xs font-normal">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
              <span>•</span>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <span>•</span>
              <a
                href="https://github.com/parv141206/netherite"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
          <div className="hidden lg:block bg-white dark:bg-black" />
        </div>
      </footer>
    </div>
  );
}
