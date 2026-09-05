"use client";

import React, { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  Sparkles,
  LogIn,
  Moon,
  Sun,
  Shield,
  Zap,
  Folder,
  FileText,
  ChevronRight,
  Eye,
  ArrowRight,
  HardDrive,
  Sigma,
  Code2,
  Lock,
} from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";
import katex from "katex";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"math" | "code">("math");

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
      return katex.renderToString("\\mathcal{L}_{\\text{gauge}} = -\\frac{1}{4} F_{\\mu\\nu}F^{\\mu\\nu}", {
        displayMode: false,
        throwOnError: false,
      });
    } catch {
      return "L";
    }
  })();

  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground transition-colors duration-300 selection:bg-foreground selection:text-background relative overflow-hidden">
      {/* Subtle Atmospheric Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent blur-3xl pointer-events-none -z-10 dark:from-amber-500/5 dark:via-purple-500/5" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-blue-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="px-6 py-4 border-b border-border/40 backdrop-blur-md sticky top-0 z-50 bg-background/80">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-foreground text-background flex items-center justify-center p-1.5 shadow-md">
              <NetheriteLogo size={18} className="text-background" />
            </div>
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
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => signIn("google")}
              className="flex items-center gap-2 px-4 py-2 bg-foreground text-background font-medium text-xs rounded-xl hover:opacity-90 transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center px-4 sm:px-6 pt-16 pb-20 max-w-5xl mx-auto w-full text-center">
        {/* Artistic Category Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border/60 bg-muted/60 text-muted-foreground text-xs mb-8 shadow-2xs backdrop-blur-xs">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="font-mono text-[11px] tracking-wide">
            ZERO DATABASE • GOOGLE DRIVE SOVEREIGNTY • KATEX MATH
          </span>
        </div>

        {/* Grand Headline with Editorial Serif Flourish */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1] max-w-4xl">
          Where <span className="font-serif italic font-normal text-foreground">thought</span> crystallizes{" "}
          into <span className="underline decoration-border decoration-wavy underline-offset-8">craft.</span>
        </h1>

        {/* Refined Subtitle */}
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mb-10 leading-relaxed font-normal">
          An artisanal, distraction-free markdown studio for mathematics, scientific prose, and deep research.
          Stored directly in your personal Google Drive as pure, open <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-muted text-foreground">.md</code> files.
        </p>

        {/* Hero Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3 mb-16">
          <button
            onClick={() => signIn("google")}
            className="flex items-center gap-2.5 px-6 py-3 bg-foreground text-background font-semibold text-sm rounded-xl hover:opacity-90 transition-all shadow-xl hover:shadow-2xl active:scale-95 cursor-pointer group"
          >
            <span>Open Studio in Google Drive</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
          <a
            href="#features"
            className="px-5 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Explore Philosophy ↓
          </a>
        </div>

        {/* Live Studio Mockup / Interactive Preview */}
        <div className="w-full rounded-2xl border border-border/80 bg-card/90 shadow-2xl overflow-hidden backdrop-blur-xl text-left text-xs mb-20 transition-all">
          {/* Mock Window Top Bar */}
          <div className="px-4 py-3 border-b border-border/60 bg-muted/30 flex items-center justify-between select-none">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                ~/Google Drive/netherite/Quantum Mechanics/Noether Symmetries.md
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
              <span className="px-2 py-0.5 rounded bg-muted border border-border/40 text-[10px]">Literata Serif</span>
              <span>2 min read</span>
            </div>
          </div>

          {/* Mock Workspace Body */}
          <div className="grid grid-cols-1 md:grid-cols-4 min-h-[380px]">
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
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-accent text-foreground font-semibold rounded-md shadow-2xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Noether Symmetries</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 text-muted-foreground rounded-md">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground/60" />
                        <span>Gauge Theory</span>
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

            {/* Document Editor Mock */}
            <div className="md:col-span-3 p-6 sm:p-8 flex flex-col justify-between bg-background">
              <div>
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/30">
                  <span className="text-xs text-muted-foreground">Quantum Mechanics /</span>
                  <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                    <button
                      onClick={() => setActiveTab("math")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        activeTab === "math" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      }`}
                    >
                      KaTeX Typesetting
                    </button>
                    <button
                      onClick={() => setActiveTab("code")}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                        activeTab === "code" ? "bg-background text-foreground shadow-2xs" : "text-muted-foreground"
                      }`}
                    >
                      Code Block Indentation
                    </button>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mb-4">
                  Continuous Symmetries & Invariants
                </h2>

                {activeTab === "math" ? (
                  <div className="space-y-4 font-serif text-sm leading-relaxed text-foreground/90">
                    <p>
                      In Lagrangian field theory, each continuous global symmetry transformation parameter{" "}
                      <span
                        className="inline-block px-1 py-0.5 bg-muted/50 rounded"
                        dangerouslySetInnerHTML={{ __html: renderedInline }}
                      />{" "}
                      leaves the action integral invariant up to boundary terms:
                    </p>

                    <div
                      className="my-4 p-4 rounded-xl bg-muted/30 border border-border/40 text-center overflow-x-auto"
                      dangerouslySetInnerHTML={{ __html: renderedLatex }}
                    />

                    <blockquote className="pl-4 border-l-2 border-foreground italic text-muted-foreground text-xs sm:text-sm">
                      “Symmetry dictates interactions; geometry determines conservation laws.”
                    </blockquote>
                  </div>
                ) : (
                  <div className="space-y-4 font-sans text-xs sm:text-sm">
                    <p className="text-muted-foreground">
                      Pasting source code preserves 100% of indentation spaces, tabs, and syntax highlighting:
                    </p>
                    <pre className="p-4 rounded-xl bg-muted/60 border border-border/60 font-mono text-xs overflow-x-auto leading-relaxed text-foreground">
                      <code>{`// Conserved Noether charge across spatial Cauchy slice
public class NoetherInvariant {
    public static double integrateCurrent(FieldState state) {
        // Preserves exact 4-space tab indentation
        double charge = state.hypersurface().integrate(state.getJ0());
        return charge;
    }
}`}</code>
                    </pre>
                  </div>
                )}
              </div>

              <div className="pt-6 mt-6 border-t border-border/30 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                <span>Markdown + MathJax/KaTeX Extension</span>
                <span className="text-emerald-500 flex items-center gap-1 font-sans font-medium">
                  ● Auto-saved to Google Drive
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Architectural Pillars / Features */}
        <section id="features" className="w-full pt-6">
          <div className="text-center mb-12">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-2">
              Architectural Sovereignty
            </h2>
            <p className="text-2xl sm:text-3xl font-serif font-bold text-foreground">
              Designed for longevity, clarity, and control.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <HardDrive className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Direct Google Drive Storage</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Zero proprietary databases. Your notes are pure <code className="font-mono text-[10px]">.md</code> files
                  stored directly inside your personal Google Drive account.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Sigma className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">KaTeX Mathematical Typesetting</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Display blocks ($$...$$) and inline math ($...$) render with zero lag, complete with auto-repair of broken symbols.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Warm Blue Light Reading Mode</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Interactive warmth slider dynamically shifts core Tailwind variables into soothing parchment amber without sluggish screen overlays.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">0ms Optimistic Operations</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Creating files, moving folders, and renaming happen instantaneously in memory while background synchronization verifies with Google Drive.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Code2 className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Precision Code Indentation</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Lowlight syntax highlighting for 100+ languages. Paste Java, Rust, or Python code with every space and Tab key indented faithfully.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xs flex flex-col justify-between hover:border-foreground/30 transition-colors group">
              <div>
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4 border border-border/50 group-hover:scale-105 transition-transform">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1.5">Zero Vendor Lock-in</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  If Netherite disappears tomorrow, your notes remain completely intact in your Google Drive, readable by Obsidian, VS Code, or any text editor.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-border/40 text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">NETHERITE</span>
            <span>•</span>
            <span>Artisanal Sovereign Markdown Studio</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Google Drive Native</span>
            <span>•</span>
            <span>Next.js 15 App Router</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
