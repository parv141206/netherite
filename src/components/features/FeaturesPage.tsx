"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  ArrowRight,
  Download,
  LogIn,
  ExternalLink,
  Code2,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  GitCompare,
  Calendar,
  BookOpen,
  PenTool,
  Network,
  Maximize2,
  CheckCircle2,
  Boxes,
  Zap,
} from "lucide-react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { AppleFullPageLoader } from "~/components/ui/AppleFullPageLoader";

function GridCrosshair({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`font-mono text-[11px] text-blue-500/70 select-none pointer-events-none leading-none ${className}`}
    >
      +
    </span>
  );
}

interface FeatureSection {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  wittyTagline: string;
  description: string;
  highlights: string[];
  imageSrc: string;
  secondaryImageSrc?: string;
  secondaryImageLabel?: string;
  imageAlt: string;
}

const FEATURE_LIST: FeatureSection[] = [
  {
    id: "tikz",
    badge: "ENGINEERING & LATEX // TIKZ STUDIO",
    title: "TikZ LaTeX Vector Graphics Studio",
    subtitle: "Real standalone TeXLive compilation & sandboxed WASM vector graphics in your browser",
    wittyTagline: "Stop wrestling with Overleaf just to draw a finite state machine for your professor.",
    description:
      "Netherite comes equipped with a first-class TikZ LaTeX Studio. Write standard LaTeX TikZ code with standalone documents, custom macros, patterns, and 3D coordinate geometry (tikz-3dplot). Powered by an ultra-fast TeXLive cloud engine backed by an offline client-side WASM engine, you get vector-crisp SVGs, dark/light adaptive previews, interactive 300% zoom, and one-click SVG export.",
    highlights: [
      "Dual-Engine Compiler: TeXLive + sandboxed client WASM fallback",
      "Full standalone document support with custom packages & TikZ libraries",
      "Interactive zoom & pan up to 500% with zero pixelation",
      "1-Click Copy SVG and instant vector file downloads",
      "Adaptive dark & light diagram preview modes",
    ],
    imageSrc: "/images/TikZ.png",
    imageAlt: "TikZ LaTeX Studio rendering a compiler pipeline state machine in Netherite",
  },
  {
    id: "markdown",
    badge: "CORE WORKSPACE // DUAL-PANE MARKDOWN",
    title: "Sovereign Markdown & KaTeX Math Studio",
    subtitle: "Zero-knowledge Google Drive storage with live KaTeX mathematical typesetting",
    wittyTagline: "Your research notes live in your Google Drive, not in a proprietary cloud database selling your study guides.",
    description:
      "Write math-heavy lecture notes, research documentation, and technical specs with instant KaTeX formula rendering. With a seamless folder hierarchy mapped 100% to your personal Google Drive, floating highlight palettes, live word & character statistics, and an interactive Table of Contents outline, Netherite delivers the ultimate distraction-free writing environment.",
    highlights: [
      "100% Sovereign Storage: Directly reads & writes open .md files in your Google Drive",
      "Instant KaTeX math formula rendering with inline ($...$) and display block ($$...$$)",
      "Floating formatting bar with multi-color highlight markers & heading styles",
      "Real-time Table of Contents outline sidebar for rapid document navigation",
      "14 curated light and dark theme pairings (Obsidian, Nordic, Solarized, Pookie, Cyber)",
    ],
    imageSrc: "/images/main-light.png",
    secondaryImageSrc: "/images/main-dark.png",
    secondaryImageLabel: "Switch to Dark Mode View",
    imageAlt: "Dual-pane markdown workspace with Gaussian Mixture Models KaTeX math notes",
  },
  {
    id: "mermaid",
    badge: "ARCHITECTURE // SYSTEM FLOWS",
    title: "Interactive Mermaid Flowcharts & Pipelines",
    subtitle: "Turn ASCII text into interactive, scalable vector architecture diagrams",
    wittyTagline: "Because dragging boxes manually in Miro while your microservices burn is no way to live.",
    description:
      "Create CI/CD pipelines, sequence diagrams, cloud topologies, and state machines with clean Mermaid markup. Netherite provides an integrated editor with real-time syntax validation, instant rendering, high-contrast typography, interactive zoom/pan controls, and copyable SVG assets.",
    highlights: [
      "Real-time Mermaid compilation with live syntax error detection",
      "Support for Flowcharts, Sequence Diagrams, State Diagrams, Class Diagrams, and Gitgraphs",
      "Interactive SVG canvas with mouse wheel zoom up to 500% and pan navigation",
      "Direct embedding into your markdown notes or standalone .mmd file storage",
      "High-contrast color themes for maximum presentation readability",
    ],
    imageSrc: "/images/mermaid.png",
    imageAlt: "Mermaid flowchart editor with CI/CD deployment pipeline diagram in Netherite",
  },
  {
    id: "uml",
    badge: "SOFTWARE DESIGN // APOLLON MODELER",
    title: "Apollon UML Modeling & Class Design",
    subtitle: "Interactive visual UML diagramming with real-time structural inspectors",
    wittyTagline: "Drawing UML class hierarchies on notebook paper before a software engineering exam is a certified recipe for despair.",
    description:
      "Design rigorous software architectures with the full Apollon UML suite. Drag and drop classes, interfaces, packages, enumerations, and abstract classes. Customize attributes, methods, visibility modifiers, and inheritance arrows with an intuitive floating property inspector.",
    highlights: [
      "Visual palette: Classes, Interfaces, Abstract Classes, Packages, and Enums",
      "Interactive property inspector to add and reorder methods and fields on the fly",
      "Automatic relationship wiring: Inheritance, Realization, Association, Aggregation",
      "Stored as open JSON/SVG files directly in your Google Drive workspace",
      "High-fidelity export for engineering design documents and technical specs",
    ],
    imageSrc: "/images/uml.png",
    imageAlt: "Apollon UML class diagram designer with interface and property inspector in Netherite",
  },
  {
    id: "diagrams-suite",
    badge: "UNIVERSAL DIAGRAMMING // 13+ SUITES",
    title: "Comprehensive Architecture & UML Suite",
    subtitle: "13 structural, behavioral, and formal systems diagram engines in one click",
    wittyTagline: "One unified diagram studio to rule them all — no more switching between 5 different tools.",
    description:
      "Need a BPMN 2.0 business workflow? A hardware deployment topology? A use-case diagram or an object state snapshot? Netherite provides a built-in blueprint modal covering all 13 standard structural and behavioral diagram suites.",
    highlights: [
      "Structural: Class, Object, Component, Deployment, Package diagrams",
      "Behavioral: Activity, Use Case, Communication, Sequence, State Machine",
      "Business & Formal: BPMN 2.0 Process, Flowcharts, System Architecture",
      "Instant template bootstrapping with sensible software engineering defaults",
      "Unified project tree alongside your markdown lecture notes and sketches",
    ],
    imageSrc: "/images/diagraming.png",
    imageAlt: "Diagram creation modal featuring 13 structural and behavioral diagram types",
  },
  {
    id: "excalidraw",
    badge: "CREATIVE BRAINSTORM // WHITEBOARD",
    title: "Excalidraw Infinite Whiteboard",
    subtitle: "Hand-drawn sketch canvas embedded natively inside your note hierarchy",
    wittyTagline: "When markdown bullet points fail and you just need to scribble a quick brainstorm or diagram.",
    description:
      "Sometimes you need the freedom of an infinite canvas. Netherite embeds full Excalidraw capabilities natively into your workspace. Sketch system architectures, annotate wireframes, draw freehand diagrams, and use delightful hand-drawn sketch fonts.",
    highlights: [
      "Full Excalidraw vector drawing suite: shapes, arrows, freehand pencil, text",
      "Infinite 2D canvas with smooth pan, zoom, and touch gesture support",
      "Curated architectural sketch fonts (Excalifont & Crafty Girls)",
      "Saved directly as .excalidraw files inside your personal Google Drive",
      "Zero latency offline sketching with automatic cloud synchronization",
    ],
    imageSrc: "/images/excalidraw.png",
    imageAlt: "Excalidraw whiteboard canvas with hand-drawn shapes and arrows in Netherite",
  },
  {
    id: "diff",
    badge: "CHANGE MANAGEMENT // SOVEREIGN VCS",
    title: "Git-Style Diff Inspector & Version Control",
    subtitle: "Line-by-line visual delta tracking against your Google Drive cloud baseline",
    wittyTagline: "Ever accidentally nuked half your lecture notes and panicked? Review diffs before you sync.",
    description:
      "Netherite brings developer-grade change management to your personal notes. Every keystroke is compared against the sovereign Google Drive baseline. Open the Diff Inspector to view colored side-by-side or unified diffs (+/- changes), review local draft history, or revert accidental changes with a single click.",
    highlights: [
      "Visual unified and side-by-side diff views with line-level change highlighting",
      "Real-time addition (+N) and deletion (-N) counters in the document tab bar",
      "Folded unchanged regions for clean, compact difference inspection",
      "One-click 'Save Changes to Drive (Ctrl+S)' or 'Discard Local Draft & Revert'",
      "Complete changelog audit trail for peace of mind while editing offline",
    ],
    imageSrc: "/images/diff.png",
    secondaryImageSrc: "/images/change-management-diff.png",
    secondaryImageLabel: "View Modal Diff View",
    imageAlt: "Git-style diff inspector showing line additions and modifications in Netherite",
  },
  {
    id: "google-calendar",
    badge: "TIME & SCHEDULE // GOOGLE CALENDAR",
    title: "Integrated Google Calendar Studio",
    subtitle: "View monthly schedule, organize agendas, and launch 1-click meeting notes",
    wittyTagline: "Stop alt-tabbing between Google Calendar and your editor while the meeting is already in progress.",
    description:
      "Netherite links directly with your Google Calendar. View your month at a glance, inspect event agendas, create new calendar events with meeting links and attendees, and immediately generate linked markdown meeting notes right in your workspace.",
    highlights: [
      "Direct Google Calendar API integration with zero third-party intermediaries",
      "Month and Agenda schedule views right inside the notes workspace tab bar",
      "1-Click event creation with title, start/end timestamps, location, and guest lists",
      "Instant meeting notes generation attached to specific calendar events",
      "Syncs bi-directionally across your phone, tablet, and desktop",
    ],
    imageSrc: "/images/google_cal.png",
    imageAlt: "Integrated Google Calendar studio with month view and event creation dialog",
  },
  {
    id: "icarus",
    badge: "DEEP FOCUS // LECTURE & LITERATURE",
    title: "Icarus Focus & Literature Mode",
    subtitle: "Distraction-free, centered editorial typography for deep study and paper reading",
    wittyTagline: "For when you actually have to read a 40-page research paper without 50 browser tabs screaming.",
    description:
      "When it is time for deep reading and conceptual digestion, toggle into Icarus Focus Mode. Netherite transforms into an elegant, distraction-free reading sanctuary with classic editorial typography (Literata Serif and Lora), perfect margins, and zero UI clutter.",
    highlights: [
      "Editorial serif typography crafted specifically for long-form reading comfort",
      "Minimalist distraction-free layout hiding sidebar chrome for deep concentration",
      "Optimized line lengths and vertical rhythm based on classic book design",
      "Seamless keyboard navigation and reading progress indicator",
      "Perfect for reviewing research papers, literature notes, and thesis chapters",
    ],
    imageSrc: "/images/icarus.png",
    imageAlt: "Icarus deep focus reading mode with classical editorial serif typography",
  },
];

export function FeaturesPage({ session }: { session?: any } = {}) {
  const [activeImageTab, setActiveImageTab] = useState<Record<string, "primary" | "secondary">>({});
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleImage = (featureId: string) => {
    setActiveImageTab((prev) => ({
      ...prev,
      [featureId]: prev[featureId] === "secondary" ? "primary" : "secondary",
    }));
  };

  return (
    <div
      data-features-page="true"
      className="min-h-dvh flex flex-col justify-between bg-white text-zinc-900 selection:bg-blue-500 selection:text-white relative overflow-x-clip font-sans"
    >
      {isNavigating && (
        <AppleFullPageLoader
          message="Opening sovereign workspace..."
          subMessage="Fetching your notes and whiteboards from Google Drive"
        />
      )}

      {/* Atmospheric Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-blue-600/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-blue-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-dotted border-blue-500/40 backdrop-blur-md sticky top-0 z-50 bg-white/95">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between border-x border-dotted border-blue-500/40 relative">
          <GridCrosshair className="absolute -bottom-2 -left-2 z-20 hidden lg:block" />
          <GridCrosshair className="absolute -bottom-2 -right-2 z-20 hidden lg:block" />

          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group">
            <NetheriteLogo className="h-7 sm:h-8 w-auto text-zinc-900 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-[11px] sm:text-xs text-zinc-900">NETHERITE</span>
              <span className="text-[9px] sm:text-[10px] text-zinc-500 font-mono tracking-tight">studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link
              href="/features"
              className="px-2.5 sm:px-3 py-1.5 rounded-lg border border-blue-600 bg-blue-50 text-blue-700 text-xs font-bold transition-colors"
            >
              Features
            </Link>

            <Link
              href="/#downloads"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Link>

            <Link
              href="/privacy"
              className="hidden md:inline px-2.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hidden md:inline px-2.5 py-1.5 text-xs text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Terms
            </Link>

            {session?.user ? (
              <Link
                href="/editor"
                onClick={() => setIsNavigating(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900 text-white font-medium text-xs rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
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
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900 text-white font-medium text-xs rounded-xl hover:bg-zinc-800 transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full bg-white">
        {/* ========================================================================= */}
        {/* HERO SECTION */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-dotted border-blue-500/40 relative bg-white">
          <div className="max-w-[1440px] mx-auto border-x border-dotted border-blue-500/40 grid grid-cols-1 lg:grid-cols-[minmax(48px,1fr)_minmax(320px,580px)_minmax(320px,580px)_minmax(48px,1fr)] relative">
            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 border-r border-dotted border-blue-500/40 select-none bg-white">
              <GridCrosshair className="absolute -top-2 -right-2 z-20" />
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest rotate-90 my-auto">
                SPECS // ARCHITECTURE
              </span>
              <GridCrosshair className="absolute -bottom-2 -right-2 z-20" />
            </div>

            <div className="lg:col-span-2 px-4 sm:px-8 pt-12 sm:pt-16 pb-14 flex flex-col items-center text-center border-b lg:border-b-0 lg:border-r border-dotted border-blue-500/40 bg-white">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-50/70 text-blue-700 text-xs font-mono mb-6">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>STUDIO CAPABILITIES & ARCHITECTURE</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight mb-5 leading-tight max-w-3xl text-zinc-900">
                Crafted for people who take <span className="font-serif italic font-normal text-blue-600">serious notes</span> and write <span className="underline decoration-blue-500/50 decoration-wavy underline-offset-8">real math</span>.
              </h1>

              <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mb-8 leading-relaxed">
                Everything in Netherite is engineered to eliminate friction. Zero proprietary formats, zero mysterious cloud servers, and 100% sovereign Google Drive storage. Explore each native feature in action below.
              </p>

              {/* Quick Jump Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl">
                {FEATURE_LIST.map((feat) => (
                  <a
                    key={feat.id}
                    href={`#${feat.id}`}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-blue-50 hover:border-blue-300 text-[11px] font-medium text-zinc-700 hover:text-blue-700 transition-all shadow-xs"
                  >
                    {feat.title.split(" ")[0]} {feat.title.split(" ")[1]}
                  </a>
                ))}
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center justify-between py-12 px-2 select-none bg-white">
              <span className="font-mono text-[9px] text-blue-500/50 uppercase tracking-widest -rotate-90 my-auto">
                GRID // LATERAL_R
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================================= */}
        {/* DETAILED FEATURE SHOWCASE CARDS */}
        {/* ========================================================================= */}
        <div className="w-full">
          {FEATURE_LIST.map((feat, index) => {
            const currentImg =
              feat.secondaryImageSrc && activeImageTab[feat.id] === "secondary"
                ? feat.secondaryImageSrc
                : feat.imageSrc;

            return (
              <section
                key={feat.id}
                id={feat.id}
                className="w-full border-b border-dotted border-blue-500/40 relative bg-white py-12 sm:py-16 scroll-mt-20"
              >
                <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
                  {/* Card Container */}
                  <div className="border border-zinc-200/90 rounded-2xl bg-zinc-50/40 p-5 sm:p-8 lg:p-10 shadow-xs relative overflow-hidden">
                    {/* Top Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-zinc-200/80">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-blue-500/30 bg-blue-50 text-[11px] font-mono text-blue-700 font-semibold uppercase tracking-wider">
                        <Zap className="w-3 h-3 text-blue-600" />
                        <span>{feat.badge}</span>
                      </div>

                      {feat.secondaryImageSrc && (
                        <button
                          onClick={() => toggleImage(feat.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-100 text-xs font-medium text-zinc-800 transition-colors shadow-xs cursor-pointer"
                        >
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>
                            {activeImageTab[feat.id] === "secondary"
                              ? "Show Default Light View"
                              : feat.secondaryImageLabel || "Toggle Alternative View"}
                          </span>
                        </button>
                      )}
                    </div>

                    {/* Title & Witty Tagline */}
                    <div className="max-w-3xl mb-6">
                      <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 mb-2">
                        {feat.title}
                      </h2>
                      <p className="text-sm sm:text-base font-serif italic text-blue-700 mb-3">
                        &ldquo;{feat.wittyTagline}&rdquo;
                      </p>
                      <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                        {feat.description}
                      </p>
                    </div>

                    {/* Key Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-8">
                      {feat.highlights.map((highlight, hIdx) => (
                        <div
                          key={hIdx}
                          className="flex items-start gap-2 p-2.5 rounded-lg border border-zinc-200/70 bg-white text-xs text-zinc-700 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                          <span className="leading-snug">{highlight}</span>
                        </div>
                      ))}
                    </div>

                    {/* Full-Resolution Landscape Screenshot Container */}
                    <div className="relative rounded-xl border border-zinc-300/80 bg-zinc-900 shadow-xl overflow-hidden group">
                      {/* Browser Mockup Chrome Bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 select-none">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                          <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                          <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
                          <span className="ml-2 font-mono text-[11px] text-zinc-400 hidden sm:inline">
                            craftnetherite.vercel.app/editor
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                            1896 × 980 NATIVE LANDSCAPE
                          </span>
                        </div>
                      </div>

                      {/* Image Viewer Area - Responsive Landscape without Downsizing */}
                      <div className="w-full overflow-x-auto bg-zinc-950 flex justify-center items-center">
                        <div className="min-w-[680px] sm:min-w-[860px] md:min-w-full w-full">
                          <img
                            src={currentImg}
                            alt={feat.imageAlt}
                            loading="lazy"
                            className="w-full h-auto object-contain block select-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM CALL TO ACTION */}
        {/* ========================================================================= */}
        <section className="w-full border-b border-dotted border-blue-500/40 relative bg-white py-16 sm:py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-50 text-blue-700 text-xs font-mono mb-6">
              <HardDrive className="w-3.5 h-3.5 text-blue-600" />
              <span>SOVEREIGN DIGITAL FREEDOM</span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4">
              Ready to take notes on your own terms?
            </h2>

            <p className="text-sm sm:text-base text-zinc-600 max-w-xl mx-auto mb-8 leading-relaxed">
              No subscriptions, no vendor lock-in, and zero proprietary silos. Log in with your Google account and experience sovereign note-taking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              {session?.user ? (
                <Link
                  href="/editor"
                  onClick={() => setIsNavigating(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                >
                  <span>Launch Studio Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  onClick={() => {
                    setIsNavigating(true);
                    signIn("google", { callbackUrl: "/editor" });
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In with Google</span>
                </button>
              )}

              <Link
                href="/#downloads"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-zinc-800 font-medium text-xs transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download Desktop Apps</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-white border-t border-zinc-200">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-900">NETHERITE</span>
            <span>•</span>
            <span>Sovereign Markdown Studio & Vector Whiteboard</span>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-zinc-900 transition-colors">
              Home
            </Link>
            <span>•</span>
            <Link href="/features" className="hover:text-zinc-900 transition-colors font-semibold text-zinc-900">
              Features
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <a
              href="https://github.com/parv141206/netherite"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-900 transition-colors inline-flex items-center gap-1"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
