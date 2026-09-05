import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "katex/dist/katex.min.css";
import { Analytics } from "@vercel/analytics/next"

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://craftnetherite.vercel.app"
  ),
  title: "Netherite — Sovereign Markdown Studio",
  description:
    "A sovereign, distraction-free markdown studio for mathematics, scientific prose, and thought. Stored 100% in your Google Drive.",
  keywords: [
    "markdown",
    "katex",
    "latex",
    "math editor",
    "google drive notes",
    "sovereign notes",
    "scientific writing",
  ],
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Netherite — Sovereign Markdown Studio",
    description:
      "A sovereign, distraction-free markdown studio for mathematics, scientific prose, and thought. Backed 100% by your Google Drive.",
    url: "https://craftnetherite.vercel.app",
    siteName: "Netherite",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Netherite Studio",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Netherite — Sovereign Markdown Studio",
    description:
      "A sovereign, distraction-free markdown studio backed 100% by your Google Drive with native KaTeX.",
    images: ["/og-image.png"],
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${geistMono.variable} ${literata.variable} antialiased selection:bg-foreground selection:text-background dark`}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground transition-colors duration-300 min-h-screen flex flex-col font-sans">
        <TRPCReactProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TRPCReactProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

