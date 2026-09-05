"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  LogIn,
  Moon,
  Sun,
  Shield,
  Folder,
  FileText,
  ChevronRight,
  Eye,
  ArrowRight,
  HardDrive,
  Sigma,
  Code2,
  Palette,
  Columns,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import katex from "katex";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"math" | "whiteboard" | "code">("math");

  useEffect(() => {
    setMounted(true);
  }, []);

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
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors duration-300 selection:bg-foreground selection:text-background relative overflow-x-hidden">
      {/* Atmospheric Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none -z-10 dark:from-amber-500/5 dark:via-purple-500/5" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-blue-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="px-4 sm:px-6 py-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NetheriteLogo className="h-8 w-auto text-foreground shrink-0 transition-transform duration-200 hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-xs">NETHERITE</span>
              <span className="text-[10px] text-muted-foreground font-mono tracking-tight">studio</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-2 rounded-lg border border-border/50 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-12 sm:pt-16 pb-20 max-w-5xl mx-auto w-full text-center">
        {/* Artistic Banner */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground mb-8 backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Sovereign Markdown Studio & Vector Whiteboard</span>
        </div>

        {/* Grand Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl">
          Where <span className="font-serif italic font-normal text-foreground">thought</span> crystallizes{" "}
          into <span className="underline decoration-border decoration-wavy underline-offset-8">craft.</span>
        </h1>

        {/* Refined Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed font-normal">
          An artisanal workspace for theoretical mathematics, computational architectures, and scientific prose.
          Stored 100% in your personal Google Drive as open <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">.md</code> notes and <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">.excalidraw</code> whiteboards.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-14 sm:mb-16 w-full sm:w-auto">
          <button
            onClick={() => signIn("google")}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-foreground text-background font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer group"
          >
            <span>Open Studio in Google Drive</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a
            href="#features"
            className="px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore Architecture ↓
          </a>
        </div>

        {/* Live Studio Mockup / Interactive Preview */}
        <div className="w-full rounded-2xl border border-border/80 bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl text-left text-xs mb-20 transition-all">
          {/* Mock Window Top Bar */}
          <div className="px-3 sm:px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between gap-2 select-none min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-[11px] text-muted-foreground truncate ml-1">
                ~/Google Drive/netherite/Quantum Mechanics/{activeTab === "whiteboard" ? "System Topology.excalidraw" : "Noether Symmetries.md"}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground shrink-0">
              <span className="px-2 py-0.5 rounded bg-muted border border-border/40 text-[10px] hidden sm:inline">
                {activeTab === "whiteboard" ? "Vector Canvas" : "Literata Serif"}
              </span>
              <span className="hidden sm:inline">Saved</span>
            </div>
          </div>

          {/* Mock Workspace Body */}
          <div className="grid grid-cols-1 md:grid-cols-4 min-h-[420px]">
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
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md font-medium transition-colors ${activeTab !== "whiteboard" ? "bg-accent text-foreground font-semibold shadow-2xs" : "text-muted-foreground"}`}>
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
                    Quantum Mechanics / {activeTab === "whiteboard" ? "System Topology.excalidraw" : "Noether Symmetries.md"}
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
                      <Palette className="w-3 h-3 text-purple-400" />
                      <span>Architecture Canvas</span>
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono">
                          Vector Canvas
                        </span>
                      </h2>
                      <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                        Powered by Excalidraw
                      </span>
                    </div>

                    {/* Visual diagram representation matching Excalidraw UI */}
                    <div className="relative p-5 rounded-xl bg-card border border-border/60 overflow-hidden shadow-inner min-h-[220px] flex flex-col justify-center">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                        {/* UML Class Box */}
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

                        {/* Neural / Pipeline Flowchart Box */}
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
                  {activeTab === "whiteboard" ? "Vector Whiteboard (.excalidraw)" : "Markdown + KaTeX Extension (.md)"}
                </span>
                <span className="text-emerald-500 flex items-center gap-1 font-sans font-medium shrink-0">
                  ● 100% Google Drive Sovereign
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Architectural Pillars / Features */}
        <section id="features" className="w-full pt-6">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">
              Architectural Codex
            </h2>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Built for uncompromised intellectual longevity.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            {/* 1. Google Drive Core */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Direct Google Drive Sovereignty</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Zero black-box databases. Every article and sketch is saved as pure, open <code className="font-mono text-[10px]">.md</code> or <code className="font-mono text-[10px]">.excalidraw</code> files inside your own Drive folder.
                </p>
              </div>
            </div>

            {/* 2. Whiteboard Suite */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-purple-400 mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Palette className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Infinite Vector Whiteboard</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Integrated Excalidraw canvas engineered for computer science: sketch UML class hierarchies, flowcharts, data flow graphs, and transformer attention architectures.
                </p>
              </div>
            </div>

            {/* 3. KaTeX Typesetting */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Sigma className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Mathematical Typesetting</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Display blocks ($$...$$) and inline math ($...$) render instantaneously with auto-repair of broken latex syntax, preserving Cauchy integrals and differential forms.
                </p>
              </div>
            </div>

            {/* 4. Split Studio */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Columns className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Dual-Pane Split Workspace</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Write detailed documentation on one side while simultaneously engineering system diagrams on the whiteboard, with multi-tab state and cross-pane focus.
                </p>
              </div>
            </div>

            {/* 5. Blue Light Warmth */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Circadian Reading Mode</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Hardware-accelerated warmth control dynamically transitions typography and canvas backgrounds into soothing nocturnal parchment without sluggish browser filters.
                </p>
              </div>
            </div>

            {/* 6. Zero Lock-in */}
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Zero Vendor Lock-in</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your files remain readable by Obsidian, VS Code, or standard Excalidraw viewers at all times. If Netherite is offline, you retain 100% ownership of your work.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-6 border-t border-border/40 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">NETHERITE</span>
            <span>•</span>
            <span>Sovereign Markdown Studio & Vector Whiteboard</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Google Drive Native</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
