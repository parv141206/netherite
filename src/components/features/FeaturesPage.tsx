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
  Moon,
  Sun,
  X,
  Maximize2,
} from "lucide-react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import { AppleFullPageLoader } from "~/components/ui/AppleFullPageLoader";

interface FeatureSlide {
  id: string;
  num: string;
  badge: string;
  title: string;
  wittyTagline: string;
  description: string;
  imageSrc: string;
  secondaryImageSrc?: string;
  primaryImageLabel?: string;
  secondaryImageLabel?: string;
  imageAlt: string;
}

const FEATURES: FeatureSlide[] = [
  {
    id: "workspace",
    num: "01",
    badge: "SOVEREIGN WORKSPACE",
    title: "Dual-Pane Markdown & KaTeX Studio",
    wittyTagline: "Your research notes live in your Google Drive, not in a proprietary cloud database selling your study guides.",
    description:
      "100% sovereign zero-knowledge notes with instant KaTeX math equations ($...$ & $$...$$), floating highlight tools, and live Google Drive synchronization.",
    imageSrc: "/images/main-light.png",
    secondaryImageSrc: "/images/main-dark.png",
    primaryImageLabel: "Light Mode",
    secondaryImageLabel: "Dark Mode",
    imageAlt: "Dual-pane markdown workspace with Gaussian Mixture Models KaTeX math notes",
  },
  {
    id: "tikz",
    num: "02",
    badge: "TIKZ LATEX STUDIO",
    title: "TikZ LaTeX Vector Graphics Engine",
    wittyTagline: "Stop wrestling with Overleaf just to draw a finite state machine for your CS professor.",
    description:
      "Write standalone LaTeX TikZ documents with 3D coordinate geometry, custom packages, and circuit macros. Dual-engine TeXLive + sandboxed WASM compiler with 500% vector zoom and SVG export.",
    imageSrc: "/images/TikZ.png",
    imageAlt: "TikZ LaTeX Studio rendering a compiler pipeline state machine in Netherite",
  },
  {
    id: "mermaid",
    num: "03",
    badge: "ARCHITECTURE FLOWS",
    title: "Interactive Mermaid Diagrams & Pipelines",
    wittyTagline: "Because dragging boxes manually in Miro while your microservices burn is no way to live.",
    description:
      "Turn ASCII text into high-contrast CI/CD pipelines, sequence diagrams, and cloud topologies with live syntax validation and interactive zoom/pan canvas.",
    imageSrc: "/images/mermaid.png",
    imageAlt: "Mermaid flowchart editor with CI/CD deployment pipeline diagram in Netherite",
  },
  {
    id: "uml",
    num: "04",
    badge: "APOLLON UML MODELER",
    title: "Apollon UML Modeling & Class Design",
    wittyTagline: "Drawing UML class hierarchies on notebook paper before a software engineering exam is a certified recipe for despair.",
    description:
      "Visual UML software design engine. Drag classes, interfaces, enumerations, and abstract classes with dynamic property inspectors and auto-wiring relationships.",
    imageSrc: "/images/uml.png",
    imageAlt: "Apollon UML class diagram designer with interface and property inspector in Netherite",
  },
  {
    id: "diagrams-suite",
    num: "05",
    badge: "13+ DIAGRAM SUITES",
    title: "Comprehensive Architecture & Systems Suite",
    wittyTagline: "One unified diagram studio to rule them all — no more switching between 5 different tools.",
    description:
      "One-click blueprints across 13 structural, behavioral, and formal suites: BPMN 2.0 processes, deployment topologies, activity flows, and state machines.",
    imageSrc: "/images/diagraming.png",
    imageAlt: "Diagram creation modal featuring 13 structural and behavioral diagram types",
  },
  {
    id: "excalidraw",
    num: "06",
    badge: "INFINITE WHITEBOARD",
    title: "Excalidraw Hand-Drawn Sketch Canvas",
    wittyTagline: "When markdown bullet points fail and you just need to scribble a quick brainstorm or diagram.",
    description:
      "Embedded infinite vector canvas with shapes, arrows, freehand pencil, and architectural sketch fonts, saved directly as open .excalidraw files in your Google Drive.",
    imageSrc: "/images/excalidraw.png",
    imageAlt: "Excalidraw whiteboard canvas with hand-drawn shapes and arrows in Netherite",
  },
  {
    id: "diff",
    num: "07",
    badge: "SOVEREIGN CHANGE MANAGEMENT",
    title: "Git-Style Diff Inspector & Version Control",
    wittyTagline: "Ever accidentally nuked half your lecture notes and panicked? Review diffs before you sync.",
    description:
      "Real-time visual comparison of your local drafts against the Google Drive cloud baseline. Unified and side-by-side delta views with 1-click revert and Ctrl+S commit.",
    imageSrc: "/images/diff.png",
    secondaryImageSrc: "/images/change-management-diff.png",
    primaryImageLabel: "Inline Inspector",
    secondaryImageLabel: "Modal Compare",
    imageAlt: "Git-style diff inspector showing line additions and modifications in Netherite",
  },
  {
    id: "google-calendar",
    num: "08",
    badge: "GOOGLE CALENDAR STUDIO",
    title: "Integrated Calendar & 1-Click Meeting Notes",
    wittyTagline: "Stop alt-tabbing between Google Calendar and your editor while the meeting is already in progress.",
    description:
      "Month and Agenda schedule views integrated into your notes workspace. Create calendar events with Google Meet links and generate linked markdown meeting notes instantly.",
    imageSrc: "/images/google_cal.png",
    imageAlt: "Integrated Google Calendar studio with month view and event creation dialog",
  },
  {
    id: "icarus",
    num: "09",
    badge: "EDITORIAL FOCUS",
    title: "Icarus Deep Reading & Literature Sanctuary",
    wittyTagline: "For when you actually have to read a 40-page research paper without 50 browser tabs screaming.",
    description:
      "Distraction-free editorial reading mode with classic Literata Serif and Lora typography, warm blue-light filtration, and zero UI clutter.",
    imageSrc: "/images/icarus.png",
    imageAlt: "Icarus deep focus reading mode with classical editorial serif typography",
  },
];

export function FeaturesPage({ session }: { session?: any } = {}) {
  const [activeImageTab, setActiveImageTab] = useState<Record<string, "primary" | "secondary">>({});
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string; title: string } | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });

  const totalSlides = FEATURES.length;
  const x = useTransform(smoothProgress, [0, 1], ["0%", `-${(totalSlides - 1) * 100}vw`]);

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
      className="min-h-dvh flex flex-col justify-between bg-white text-zinc-900 selection:bg-blue-500 selection:text-white relative font-sans overflow-x-clip"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
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
            className="max-w-6xl max-h-[85vh] overflow-auto rounded-2xl shadow-2xl bg-white"
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
      <header className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-md sticky top-0 z-40">
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
              className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold"
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

      {/* Cinematic Intro Header */}
      <section className="w-full bg-white pt-14 pb-8 text-center px-4">
        <div className="max-w-3xl mx-auto">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-400 block mb-2">
            CINEMATIC FEATURE TOUR
          </span>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 mb-3 leading-tight">
            Crafted for <span className="font-serif italic font-normal text-blue-600">serious notes</span> and <span className="underline decoration-blue-500 decoration-wavy underline-offset-8">real math</span>.
          </h1>
          <p className="text-sm sm:text-base text-zinc-500 max-w-xl mx-auto mb-4 leading-relaxed">
            Scroll down to glide through every capability seamlessly.
          </p>
          <span className="text-xs font-mono text-zinc-400">
            ↓ Scroll to begin
          </span>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SEAMLESS CINEMATIC HORIZONTAL PINNED GALLERY (Title -> Description -> Image) */}
      {/* ========================================================================= */}
      <div ref={containerRef} className="relative h-[600vh] bg-white">
        <div className="sticky top-0 h-screen w-full flex flex-col justify-between overflow-hidden bg-white z-20">
          {/* Top Subtle Progress Header */}
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pt-4 pb-2 flex items-center justify-between text-xs z-30 select-none">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-extrabold text-blue-600">
                {FEATURES[activeSlideIndex]?.num}
              </span>
              <span className="text-zinc-300">/</span>
              <span className="font-mono text-xs text-zinc-400">09</span>
              <span className="text-zinc-700 font-semibold ml-2 hidden sm:inline">
                {FEATURES[activeSlideIndex]?.title}
              </span>
            </div>

            {/* Quick jump dot bar */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {FEATURES.map((f, i) => (
                <button
                  key={f.id}
                  onClick={() => scrollToSlide(i)}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    activeSlideIndex === i ? "w-6 bg-blue-600" : "w-1.5 bg-zinc-300 hover:bg-zinc-400"
                  }`}
                  title={f.title}
                  aria-label={`Go to slide ${f.num}`}
                />
              ))}
            </div>
          </div>

          {/* Seamless Horizontal Glide Track */}
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
                    className="w-screen min-w-[100vw] h-full flex flex-col items-center justify-center px-4 sm:px-8 lg:px-12 py-2 shrink-0 select-none"
                  >
                    {/* Seamless Slide Container (No box frames!) */}
                    <div className="max-w-5xl w-full flex flex-col items-center text-center">
                      {/* 1. Title Area */}
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="font-mono text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                          {feat.badge}
                        </span>

                        {feat.secondaryImageSrc && (
                          <div className="inline-flex items-center gap-1 p-0.5 border border-zinc-200 rounded-lg ml-2">
                            <button
                              onClick={() => toggleImage(feat.id, "primary")}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                !isDarkSelected
                                  ? "bg-zinc-900 text-white"
                                  : "text-zinc-500 hover:text-zinc-900"
                              }`}
                            >
                              <Sun className="w-2.5 h-2.5 text-amber-400" />
                              <span>{feat.primaryImageLabel || "Light"}</span>
                            </button>
                            <button
                              onClick={() => toggleImage(feat.id, "secondary")}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                isDarkSelected
                                  ? "bg-zinc-900 text-white"
                                  : "text-zinc-500 hover:text-zinc-900"
                              }`}
                            >
                              <Moon className="w-2.5 h-2.5 text-blue-400" />
                              <span>{feat.secondaryImageLabel || "Dark"}</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-zinc-900 mb-1.5">
                        {feat.title}
                      </h2>

                      {/* 2. Description & Witty Tagline */}
                      <p className="text-xs sm:text-sm font-serif italic text-blue-600 mb-1 max-w-2xl">
                        &ldquo;{feat.wittyTagline}&rdquo;
                      </p>
                      <p className="text-xs text-zinc-500 max-w-2xl mb-4 leading-relaxed line-clamp-2 sm:line-clamp-none">
                        {feat.description}
                      </p>

                      {/* 3. Seamless Image Rendered Directly (No outer frames, no dark bg) */}
                      <div
                        onClick={() =>
                          setLightboxImage({
                            src: currentImg,
                            alt: feat.imageAlt,
                            title: `${feat.title} (${isDarkSelected ? "Dark View" : "Light View"})`,
                          })
                        }
                        className="w-full max-w-4xl max-h-[50vh] sm:max-h-[54vh] md:max-h-[58vh] flex items-center justify-center cursor-zoom-in transition-transform duration-300 hover:scale-[1.01] group"
                      >
                        <img
                          src={currentImg}
                          alt={feat.imageAlt}
                          className="max-h-[50vh] sm:max-h-[54vh] md:max-h-[58vh] w-auto max-w-full object-contain block rounded-xl shadow-2xl border border-zinc-200/90"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Bottom Minimal Hint */}
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-8 pb-4 pt-2 flex items-center justify-between text-xs text-zinc-400 z-30 select-none">
            <span className="font-mono text-[11px]">
              Scroll down to transition • Click image to zoom
            </span>
            <span className="font-mono text-[11px] hidden sm:inline">
              100% Google Drive Sovereign
            </span>
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
