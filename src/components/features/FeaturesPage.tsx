"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import {
  ArrowRight,
  Download,
  LogIn,
  ExternalLink,
  HardDrive,
  Sparkles,
  Maximize2,
  CheckCircle2,
  Zap,
  Moon,
  Sun,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { AppleFullPageLoader } from "~/components/ui/AppleFullPageLoader";

interface FeatureItem {
  id: string;
  num: string;
  badge: string;
  title: string;
  subtitle: string;
  wittyTagline: string;
  description: string;
  highlights: string[];
  imageSrc: string;
  secondaryImageSrc?: string;
  primaryImageLabel?: string;
  secondaryImageLabel?: string;
  imageAlt: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: "workspace",
    num: "01",
    badge: "CORE WORKSPACE // SOVEREIGN CLOUD",
    title: "Dual-Pane Sovereign Markdown Studio",
    subtitle: "100% Google Drive zero-knowledge storage with live KaTeX math",
    wittyTagline: "Your research notes live in your own Google Drive, not in a proprietary cloud database selling your study guides.",
    description:
      "Write math-heavy lecture notes, research documentation, and technical specs with instant KaTeX formula rendering. With a seamless folder hierarchy mapped directly to your Google Drive, floating highlight palettes, and an interactive Table of Contents outline.",
    highlights: [
      "100% Sovereign Storage: Reads & writes open standard .md files directly in Google Drive",
      "Instant KaTeX math formula rendering for inline ($...$) and display block ($$...$$) equations",
      "Floating formatting bar with multi-color highlight markers and heading levels",
      "Real-time Table of Contents outline sidebar for rapid document navigation",
    ],
    imageSrc: "/images/main-light.png",
    secondaryImageSrc: "/images/main-dark.png",
    primaryImageLabel: "Light Mode",
    secondaryImageLabel: "Dark Mode",
    imageAlt: "Dual-pane markdown workspace with Gaussian Mixture Models KaTeX math notes",
  },
  {
    id: "tikz",
    num: "02",
    badge: "VECTOR GRAPHICS // TIKZ STUDIO",
    title: "TikZ LaTeX Vector Graphics Studio",
    subtitle: "Standalone TeXLive compilation & sandboxed WASM graphics in your browser",
    wittyTagline: "Stop wrestling with Overleaf just to draw a finite state machine for your CS professor.",
    description:
      "A first-class TikZ LaTeX Studio right in your workspace. Write standard LaTeX TikZ code with standalone documents, custom macros, patterns, and 3D coordinate geometry (tikz-3dplot). Powered by an ultra-fast TeXLive cloud engine with offline WASM fallback.",
    highlights: [
      "Dual-Engine Compiler: TeXLive cloud execution + sandboxed client-side WASM fallback",
      "Full standalone document support with custom packages, macros, and TikZ libraries",
      "Interactive zoom & pan up to 500% with infinite vector resolution",
      "1-Click Copy SVG and instant vector file downloads",
    ],
    imageSrc: "/images/TikZ.png",
    imageAlt: "TikZ LaTeX Studio rendering a compiler pipeline state machine in Netherite",
  },
  {
    id: "mermaid",
    num: "03",
    badge: "ARCHITECTURE // SYSTEM FLOWS",
    title: "Interactive Mermaid Flowcharts & Pipelines",
    subtitle: "Turn ASCII text into interactive, scalable vector architecture diagrams",
    wittyTagline: "Because dragging boxes manually in Miro while your microservices burn is no way to live.",
    description:
      "Create CI/CD pipelines, sequence diagrams, cloud topologies, and state machines with clean Mermaid markup. Integrated editor with real-time syntax validation, instant rendering, high-contrast typography, and copyable SVG assets.",
    highlights: [
      "Real-time Mermaid compilation with live syntax error detection",
      "Support for Flowcharts, Sequence Diagrams, State Diagrams, and Gitgraphs",
      "Interactive SVG canvas with mouse wheel zoom up to 500% and pan navigation",
      "Direct embedding into notes or standalone .mmd file storage in Drive",
    ],
    imageSrc: "/images/mermaid.png",
    imageAlt: "Mermaid flowchart editor with CI/CD deployment pipeline diagram in Netherite",
  },
  {
    id: "uml",
    num: "04",
    badge: "SOFTWARE DESIGN // APOLLON MODELER",
    title: "Apollon UML Modeling & Class Design",
    subtitle: "Interactive visual UML diagramming with real-time structural inspectors",
    wittyTagline: "Drawing UML class hierarchies on notebook paper before a software engineering exam is a certified recipe for despair.",
    description:
      "Design rigorous software architectures with the full Apollon UML suite. Drag and drop classes, interfaces, packages, enumerations, and abstract classes. Customize attributes, methods, visibility modifiers, and inheritance arrows dynamically.",
    highlights: [
      "Visual palette: Classes, Interfaces, Abstract Classes, Packages, and Enums",
      "Interactive property inspector to add and reorder methods and fields on the fly",
      "Automatic relationship wiring: Inheritance, Realization, Association, Aggregation",
      "Stored as open JSON/SVG files directly in your Google Drive workspace",
    ],
    imageSrc: "/images/uml.png",
    imageAlt: "Apollon UML class diagram designer with interface and property inspector in Netherite",
  },
  {
    id: "diagrams-suite",
    num: "05",
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
    ],
    imageSrc: "/images/diagraming.png",
    imageAlt: "Diagram creation modal featuring 13 structural and behavioral diagram types",
  },
  {
    id: "excalidraw",
    num: "06",
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
    ],
    imageSrc: "/images/excalidraw.png",
    imageAlt: "Excalidraw whiteboard canvas with hand-drawn shapes and arrows in Netherite",
  },
  {
    id: "diff",
    num: "07",
    badge: "CHANGE MANAGEMENT // SOVEREIGN VCS",
    title: "Git-Style Diff Inspector & Version Control",
    subtitle: "Line-by-line visual delta tracking against your Google Drive cloud baseline",
    wittyTagline: "Ever accidentally nuked half your lecture notes and panicked? Review diffs before you sync.",
    description:
      "Developer-grade change management for your personal notes. Every keystroke is compared against the sovereign Google Drive baseline. Open the Diff Inspector to view colored side-by-side or unified diffs (+/- changes), review draft history, or revert changes.",
    highlights: [
      "Visual unified and side-by-side diff views with line-level change highlighting",
      "Real-time addition (+N) and deletion (-N) counters in the document tab bar",
      "Folded unchanged regions for clean, compact difference inspection",
      "One-click 'Save Changes to Drive (Ctrl+S)' or 'Discard Local Draft & Revert'",
    ],
    imageSrc: "/images/diff.png",
    secondaryImageSrc: "/images/change-management-diff.png",
    primaryImageLabel: "Inline Diff Inspector",
    secondaryImageLabel: "Modal Diff View",
    imageAlt: "Git-style diff inspector showing line additions and modifications in Netherite",
  },
  {
    id: "google-calendar",
    num: "08",
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
    ],
    imageSrc: "/images/google_cal.png",
    imageAlt: "Integrated Google Calendar studio with month view and event creation dialog",
  },
  {
    id: "icarus",
    num: "09",
    badge: "DEEP FOCUS // LECTURE & LITERATURE",
    title: "Icarus Focus & Literature Mode",
    subtitle: "Distraction-free, centered editorial typography for deep study and paper reading",
    wittyTagline: "For when you actually have to read a 40-page research paper without 50 browser tabs screaming.",
    description:
      "When it is time for deep reading and conceptual digestion, toggle into Icarus Focus Mode. Netherite transforms into an elegant reading sanctuary with classic editorial typography (Literata Serif and Lora), perfect margins, and zero UI clutter.",
    highlights: [
      "Editorial serif typography crafted specifically for long-form reading comfort",
      "Minimalist distraction-free layout hiding sidebar chrome for deep concentration",
      "Optimized line lengths and vertical rhythm based on classic book design",
      "Perfect for reviewing research papers, literature notes, and thesis chapters",
    ],
    imageSrc: "/images/icarus.png",
    imageAlt: "Icarus deep focus reading mode with classical editorial serif typography",
  },
];

export function FeaturesPage({ session }: { session?: any } = {}) {
  const [activeImageTab, setActiveImageTab] = useState<Record<string, "primary" | "secondary">>({});
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; title: string } | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [isNavigating, setIsNavigating] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 24,
    restDelta: 0.001,
  });

  // Calculate total translation percentage: (N - 1) * 100%
  const totalSlides = FEATURES.length;
  const x = useTransform(smoothProgress, [0, 1], ["0%", `-${(totalSlides - 1) * 100}%`]);

  // Update active slide indicator as user scrolls
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (val) => {
      const idx = Math.min(totalSlides - 1, Math.max(0, Math.round(val * (totalSlides - 1))));
      setActiveSlideIndex(idx);
    });
    return () => unsubscribe();
  }, [scrollYProgress, totalSlides]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleImage = (featureId: string, mode: "primary" | "secondary") => {
    setActiveImageTab((prev) => ({
      ...prev,
      [featureId]: mode,
    }));
  };

  const scrollToSlide = (index: number) => {
    if (!containerRef.current) return;
    const containerTop = containerRef.current.offsetTop;
    const containerHeight = containerRef.current.offsetHeight - window.innerHeight;
    const targetScroll = containerTop + (index / (totalSlides - 1)) * containerHeight;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  };

  return (
    <div
      data-features-page="true"
      className="min-h-dvh flex flex-col justify-between bg-white text-zinc-900 selection:bg-blue-500 selection:text-white relative font-sans"
    >
      {isNavigating && (
        <AppleFullPageLoader
          message="Opening sovereign workspace..."
          subMessage="Fetching your notes and whiteboards from Google Drive"
        />
      )}

      {/* Lightbox Modal for Full-Resolution Image Inspection */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
        >
          <div className="max-w-6xl w-full flex items-center justify-between text-white mb-3 select-none">
            <span className="font-semibold text-sm sm:text-base">{lightboxImage.title}</span>
            <button
              onClick={() => setLightboxImage(null)}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-6xl max-h-[85vh] overflow-auto rounded-2xl shadow-2xl border border-zinc-700 bg-white"
          >
            <img
              src={lightboxImage.src}
              alt={lightboxImage.alt}
              className="w-full h-auto object-contain block"
            />
          </div>
          <p className="text-zinc-400 text-xs mt-3 select-none font-mono">
            Press ESC or click anywhere outside to close • 1896×980 Native High-DPI Resolution
          </p>
        </div>
      )}

      {/* Navigation Header */}
      <header className="border-b border-zinc-200 bg-white/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <NetheriteLogo className="h-7 w-auto text-zinc-900 shrink-0 transition-transform duration-200 group-hover:scale-105" />
            <div className="flex flex-col">
              <span className="font-extrabold tracking-widest text-xs text-zinc-900">NETHERITE</span>
              <span className="text-[9px] text-zinc-500 font-mono tracking-tight">studio</span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/features"
              className="px-3 py-1.5 rounded-lg border border-zinc-900 bg-zinc-900 text-white text-xs font-semibold"
            >
              Features
            </Link>

            <Link
              href="/#downloads"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors"
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
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
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Intro Hero Section */}
      <section className="w-full bg-white border-b border-zinc-200 py-12 sm:py-16 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 text-zinc-600 text-xs font-mono mb-4">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>INTERACTIVE STUDIO TOUR</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 mb-4 leading-tight">
            Crafted for <span className="font-serif italic font-normal text-blue-600">serious notes</span> and <span className="underline decoration-blue-500 decoration-wavy underline-offset-8">real math</span>.
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 leading-relaxed max-w-2xl mx-auto mb-6">
            Scroll down to glide horizontally through every tool in Netherite. Zero proprietary lock-in, zero cloud databases, and 100% sovereign Google Drive storage.
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span>↓ Scroll down to start the interactive gallery</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* HORIZONTAL SCROLL-PINNED SHOWCASE (motion.dev scroll tracking) */}
      {/* ========================================================================= */}
      <div ref={containerRef} className="relative h-[650vh] bg-white">
        <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden bg-white">
          {/* Top Slide Control Strip */}
          <div className="w-full border-b border-zinc-200 bg-white/90 backdrop-blur-md px-4 sm:px-8 py-3 flex items-center justify-between z-20">
            {/* Active Slide Counter & Title */}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-extrabold px-2 py-0.5 rounded-md bg-zinc-900 text-white">
                {FEATURES[activeSlideIndex]?.num} / 09
              </span>
              <span className="text-xs font-semibold text-zinc-800 hidden sm:inline">
                {FEATURES[activeSlideIndex]?.title}
              </span>
            </div>

            {/* Slide Quick-Jump Dot Strip */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => scrollToSlide(i)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeSlideIndex === i ? "w-6 bg-blue-600" : "w-2 bg-zinc-300 hover:bg-zinc-400"
                  }`}
                  title={f.title}
                  aria-label={`Jump to feature ${f.num}`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => scrollToSlide(Math.max(0, activeSlideIndex - 1))}
                disabled={activeSlideIndex === 0}
                className="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-700 cursor-pointer"
                aria-label="Previous feature"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollToSlide(Math.min(totalSlides - 1, activeSlideIndex + 1))}
                disabled={activeSlideIndex === totalSlides - 1}
                className="p-1 rounded-lg border border-zinc-200 hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-zinc-700 cursor-pointer"
                aria-label="Next feature"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Track of Feature Slides */}
          <div className="flex-1 w-full flex items-center overflow-hidden">
            <motion.div style={{ x }} className="flex h-full w-full flex-nowrap items-center will-change-transform">
              {FEATURES.map((feat) => {
                const isDarkSelected = activeImageTab[feat.id] === "secondary";
                const currentImg =
                  feat.secondaryImageSrc && isDarkSelected
                    ? feat.secondaryImageSrc
                    : feat.imageSrc;

                return (
                  <div
                    key={feat.id}
                    className="min-w-full w-full h-full flex items-center justify-center p-4 sm:p-6 lg:p-10 shrink-0 select-none"
                  >
                    {/* Slide Content Card */}
                    <div className="max-w-[1400px] w-full max-h-[82vh] h-full rounded-3xl border border-zinc-200 bg-white shadow-xl flex flex-col lg:flex-row items-stretch overflow-hidden">
                      {/* Left Column: Description & Highlights (40% width) */}
                      <div className="lg:w-[42%] p-5 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 bg-zinc-50/50 overflow-y-auto">
                        <div>
                          {/* Badge & Mode Toggle */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <span className="font-mono text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-wider">
                              {feat.badge}
                            </span>

                            {feat.secondaryImageSrc && (
                              <div className="flex items-center gap-1 p-0.5 bg-zinc-200/70 rounded-lg border border-zinc-300/80">
                                <button
                                  onClick={() => toggleImage(feat.id, "primary")}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                    !isDarkSelected
                                      ? "bg-white text-zinc-900 shadow-xs"
                                      : "text-zinc-600 hover:text-zinc-900"
                                  }`}
                                >
                                  <Sun className="w-3 h-3 text-amber-500" />
                                  <span>{feat.primaryImageLabel || "Light"}</span>
                                </button>
                                <button
                                  onClick={() => toggleImage(feat.id, "secondary")}
                                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                    isDarkSelected
                                      ? "bg-zinc-900 text-white shadow-xs"
                                      : "text-zinc-600 hover:text-zinc-900"
                                  }`}
                                >
                                  <Moon className="w-3 h-3 text-blue-400" />
                                  <span>{feat.secondaryImageLabel || "Dark"}</span>
                                </button>
                              </div>
                            )}
                          </div>

                          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-zinc-900 mb-2">
                            {feat.title}
                          </h2>

                          <p className="text-xs sm:text-sm font-serif italic text-blue-700 mb-3 leading-snug">
                            &ldquo;{feat.wittyTagline}&rdquo;
                          </p>

                          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed mb-5">
                            {feat.description}
                          </p>

                          {/* Highlights List */}
                          <div className="space-y-2">
                            {feat.highlights.map((h, hIdx) => (
                              <div key={hIdx} className="flex items-start gap-2 text-xs text-zinc-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                <span className="leading-snug">{h}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Bottom Action Strip */}
                        <div className="pt-4 mt-4 border-t border-zinc-200/80 flex items-center justify-between">
                          <button
                            onClick={() =>
                              setLightboxImage({
                                src: currentImg,
                                alt: feat.imageAlt,
                                title: `${feat.title} (${isDarkSelected ? "Dark View" : "Light View"})`,
                              })
                            }
                            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium cursor-pointer transition-colors"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
                            <span>Inspect Full Resolution (1896×980)</span>
                          </button>

                          <span className="font-mono text-[10px] text-zinc-400">
                            SLIDE {feat.num} / 09
                          </span>
                        </div>
                      </div>

                      {/* Right Column: Crisp Direct Screenshot View (NO Dark BG) */}
                      <div className="lg:w-[58%] p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-white overflow-hidden relative">
                        <div
                          onClick={() =>
                            setLightboxImage({
                              src: currentImg,
                              alt: feat.imageAlt,
                              title: `${feat.title} (${isDarkSelected ? "Dark View" : "Light View"})`,
                            })
                          }
                          className="w-full h-full flex items-center justify-center rounded-2xl border border-zinc-200/90 shadow-md hover:shadow-lg transition-all cursor-zoom-in overflow-hidden bg-white"
                        >
                          <img
                            src={currentImg}
                            alt={feat.imageAlt}
                            className="w-full h-full object-contain block select-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Bottom Progress Bar & Scroll Indicator */}
          <div className="w-full border-t border-zinc-200 bg-white/95 px-4 sm:px-8 py-2.5 flex items-center justify-between z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-mono text-[11px] text-zinc-500 hidden sm:inline">
                Scroll down to glide horizontally through features
              </span>
              <span className="font-mono text-[11px] text-zinc-500 sm:hidden">
                Scroll to slide
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/editor"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                <span>Try Studio Live</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Call to Action Section */}
      <section className="w-full bg-white border-t border-zinc-200 py-16 sm:py-20 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 text-zinc-600 text-xs font-mono mb-4">
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
