import React from "react";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, Shield, Scale, ExternalLink } from "lucide-react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Netherite",
  description: "Terms of Service and Usage Agreement for Netherite Sovereign Markdown Studio.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-foreground selection:text-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md px-4 sm:px-8 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Netherite</span>
          </Link>

          <Link href="/" className="flex items-center gap-2">
            <NetheriteLogo className="w-4 h-4 text-foreground" />
            <span className="font-bold text-sm tracking-tight">Netherite</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="space-y-4 mb-12 border-b border-border/40 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/60 bg-muted/30 text-xs font-mono text-muted-foreground">
            <Scale className="w-3.5 h-3.5 text-primary" />
            <span>Usage Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">
            Effective Date: September 8, 2026 • Last updated: September 8, 2026
          </p>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-10 text-sm sm:text-base leading-relaxed text-muted-foreground">
          {/* Executive Summary Box */}
          <div className="p-6 rounded-2xl border border-primary/20 bg-primary/5 text-foreground space-y-2">
            <h3 className="text-base font-semibold flex items-center gap-2 text-primary">
              <CheckCircle2 className="w-4 h-4" />
              Sovereign Storage Summary
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed m-0">
              Netherite is provided to give you complete digital sovereignty over your personal notes and technical whiteboards. You retain 100% ownership and copyright of all your documents, and you access your own Google Drive storage directly.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using Netherite (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to these Terms, please do not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">2. Description of the Service</h2>
            <p>
              Netherite provides a client-side Markdown, LaTeX mathematical typesetting, vector drawing (Excalidraw), and image viewing application. The Service connects directly to your Google Account via Google OAuth to create, read, and synchronize files stored in your personal Google Drive storage.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">3. User Content & Intellectual Property</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm">
              <li>
                <strong>Your Content Belongs to You:</strong> We claim no intellectual property rights over the notes, diagrams, images, mathematical formulas, or files you create or view using Netherite. All your content remains strictly your property.
              </li>
              <li>
                <strong>No Cloud Database Storage:</strong> Netherite does not store your notes in a proprietary cloud database. All files reside in your personal Google Drive account and local device browser cache.
              </li>
              <li>
                <strong>Open Formats:</strong> Netherite writes files in standard open specifications (<code className="font-mono text-[11px]">.md</code> for Markdown, <code className="font-mono text-[11px]">.excalidraw</code> for vector drawings, standard image formats). You are free to open, copy, export, or edit them with any third-party tool at any time without vendor lock-in.
              </li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">4. Acceptable Use</h2>
            <p>When using Netherite, you agree that you will not:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
              <li>Use the Service for any illegal, unauthorized, or fraudulent purpose.</li>
              <li>Attempt to reverse-engineer, disrupt, or compromise the integrity of the Service or its API integrations.</li>
              <li>Violate the terms of service of Google Cloud or Google Drive APIs.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">5. Third-Party Services (Google Drive)</h2>
            <p>
              Netherite interacts with Google Drive APIs. Your use of Google services is subject to Google&apos;s own Terms of Service and Google Privacy Policies. Netherite is not responsible for outages, rate limits, account terminations, or data loss occurring within Google&apos;s infrastructure.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">6. Disclaimer of Warranties</h2>
            <p className="text-xs sm:text-sm uppercase tracking-wide font-mono">
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE THAT THE SERVICE WILL ALWAYS BE UNINTERRUPTED, ERROR-FREE, OR SECURE.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">7. Limitation of Liability</h2>
            <p className="text-xs sm:text-sm uppercase tracking-wide font-mono">
              IN NO EVENT SHALL THE CREATORS, DEVELOPERS, OR CONTRIBUTORS OF NETHERITE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, REVENUE, OR USE, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 border-t border-border/40 pt-8">
            <h2 className="text-xl font-bold text-foreground">8. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. We will post updated versions of these Terms on this page with an updated effective date. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">9. Contact & Inquiries</h2>
            <p>
              For questions regarding these Terms of Service, please visit our official repository:
            </p>
            <div className="p-4 rounded-xl border border-border/50 bg-muted/20 text-xs font-mono">
              GitHub: <a href="https://github.com/parv141206/netherite" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">github.com/parv141206/netherite</a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 px-4 sm:px-8 text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">Netherite</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
