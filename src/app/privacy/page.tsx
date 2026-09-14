"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Shield, CheckCircle2, Lock, HardDrive, FileText, ExternalLink } from "lucide-react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";

export default function PrivacyPage() {
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col selection:bg-blue-500 selection:text-white font-sans">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Netherite</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/features" className="text-xs text-zinc-600 hover:text-zinc-900 transition-colors font-medium">
              Features
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <NetheriteLogo className="w-4 h-4 text-zinc-900" />
              <span className="font-bold text-sm tracking-tight">Netherite</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="space-y-4 mb-12 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>Zero-Knowledge Sovereign Storage</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: September 8, 2026 • Last updated: September 8, 2026
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-sm sm:text-base leading-relaxed text-muted-foreground">
          {/* Executive Summary Box */}
          <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 text-foreground space-y-3">
            <h3 className="text-base font-semibold flex items-center gap-2 text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
              Core Privacy Commitment
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0">
              <strong>Netherite does not operate a proprietary server database for your documents.</strong> All your markdown notes, mathematical equations, Excalidraw whiteboards, and images are stored <strong>100% inside your personal Google Drive</strong> and locally in your browser. We never read, sell, analyze, or train AI models on your private data.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Introduction</h2>
            <p>
              Netherite (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;the Application&rdquo;) is an open-source, distraction-free markdown studio and vector canvas application designed for researchers, engineers, and students. This Privacy Policy explains how information is accessed, used, and protected when you use Netherite.
            </p>
            <p>
              By using Netherite and authenticating with Google OAuth, you consent to the practices described in this Privacy Policy.
            </p>
          </section>

          {/* Section 2 - Google API Services Limited Use */}
          <section className="space-y-4 p-6 rounded-2xl border border-border/60 bg-card/60">
            <div className="flex items-center gap-2 text-foreground font-semibold text-base">
              <Lock className="w-4 h-4 text-primary" />
              <h2>2. Google API Services User Data Policy & Limited Use Disclosure</h2>
            </div>
            <p>
              Netherite adheres strictly to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                Google API Services User Data Policy
                <ExternalLink className="w-3 h-3" />
              </a>
              , including the <strong>Limited Use</strong> requirements:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li>
                <strong>Single Purpose:</strong> Netherite requests access to Google Drive strictly to provide user-facing note-taking, canvas rendering, and synchronization functionality requested directly by the user.
              </li>
              <li>
                <strong>No Transfer to Third Parties:</strong> We do not transfer, sell, or disclose your Google user data to any external parties or data brokers.
              </li>
              <li>
                <strong>No Advertising:</strong> Your Google Drive data is never used or transferred for serving advertisements, retargeting, or market research.
              </li>
              <li>
                <strong>No AI/ML Model Training:</strong> Netherite does not use Google user data to train, retrain, or improve generalized artificial intelligence (AI) or machine learning (ML) models.
              </li>
              <li>
                <strong>Human Access Restricted:</strong> No human beings ever read or review your notes or files, unless required by applicable law or with your explicit, affirmative consent for troubleshooting.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. Google OAuth Scopes Requested</h2>
            <p>
              When you authenticate with Google, Netherite requests only the minimum necessary permissions required to operate your workspace:
            </p>
            <div className="grid gap-3 sm:grid-cols-2 pt-2">
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="font-mono text-xs font-bold text-foreground mb-1">openid / email / profile</div>
                <p className="text-xs text-muted-foreground m-0">
                  Used solely to identify your account session, display your profile name and avatar in the user interface, and maintain your login state.
                </p>
              </div>
              <div className="p-4 rounded-xl border border-border/50 bg-muted/20">
                <div className="font-mono text-xs font-bold text-foreground mb-1">drive.file & drive</div>
                <p className="text-xs text-muted-foreground m-0">
                  Used to read, save, create, and organize your markdown notes (<code className="font-mono text-[11px]">.md</code>), whiteboards (<code className="font-mono text-[11px]">.excalidraw</code>), and uploaded images inside your personal Google Drive hierarchy.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. How Your Data Is Stored (Zero Proprietary Database)</h2>
            <p>
              Traditional note-taking services store your notes on centralized proprietary servers. Netherite is built on a <strong>sovereign personal storage architecture</strong>:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Your notes and whiteboards reside directly in your personal Google Drive account under your full control.</li>
              <li>When you edit a document, temporary drafts are cached locally in your browser&apos;s <code className="font-mono text-xs px-1 py-0.5 rounded bg-muted">localStorage</code> on your own device for instant offline responsiveness.</li>
              <li>When you click Save or commit changes, updates are sent directly to Google Drive via official Google APIs over encrypted TLS channels.</li>
              <li>We do not host or operate a proprietary cloud database that stores your document bodies.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Data Retention & Account Deletion</h2>
            <p>
              Because your documents are stored in your own Google Drive rather than on our servers:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Complete Ownership:</strong> You can view, export, backup, or delete your files at any time directly through Google Drive or local editors like Obsidian and VS Code.</li>
              <li><strong>Instant Revocation:</strong> You can revoke Netherite&apos;s access to your Google account at any time by visiting{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
                >
                  Google Account Security Permissions
                </a>. Once revoked, Netherite cannot read or write to your Google Drive.
              </li>
              <li><strong>Local Cache Clearing:</strong> You can clear all offline draft caches on your device simply by clearing your browser cache or clicking Sign Out.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Cookies & Tracking Technologies</h2>
            <p>
              Netherite uses minimal, privacy-focused cookies strictly necessary for application functionality:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li><strong>Authentication Session Cookies:</strong> Encrypted HTTP-only cookies to keep you signed in securely across requests.</li>
              <li><strong>No Third-Party Ad Trackers:</strong> We do not use third-party advertising cookies, cross-site trackers, or data-broker surveillance pixels.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Security of Your Information</h2>
            <p>
              All network communications with Google APIs and application endpoints are transmitted over industry-standard Transport Layer Security (TLS 1.3/HTTPS). OAuth access and refresh tokens are securely encrypted using standard cryptographic primitives.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 border-t border-border/40 pt-8">
            <h2 className="text-xl font-bold text-foreground">8. Contact & Inquiries</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy or your data, please contact the developer via our official GitHub repository:
            </p>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-xs font-mono">
              GitHub: <a href="https://github.com/parv141206/netherite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">github.com/parv141206/netherite</a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 py-6 px-4 sm:px-8 text-xs text-zinc-500 bg-white">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-900">Netherite</span>
            <span>•</span>
            <span>Privacy Policy</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-zinc-900 transition-colors">Home</Link>
            <Link href="/features" className="hover:text-zinc-900 transition-colors font-medium">Features</Link>
            <Link href="/terms" className="hover:text-zinc-900 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
