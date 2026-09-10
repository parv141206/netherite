import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "katex/dist/katex.min.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/next";

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
  verification: {
    google: "pMUgEbPbSSePs2qGhNyOmo2p602NabQvNyhEf8fEPW0",
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
        <meta name="google-site-verification" content="pMUgEbPbSSePs2qGhNyOmo2p602NabQvNyhEf8fEPW0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Cursive, Script & Handwriting Fonts */}
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Crafty+Girls&family=Dancing+Script:wght@400;700&family=Gloria+Hallelujah&family=Great+Vibes&family=Indie+Flower&family=Kalam:wght@400;700&family=Pacifico&family=Patrick+Hand&family=Sacramento&family=Satisfy&family=Schoolbell&family=Shadows+Into+Light&display=swap"
          rel="stylesheet"
        />
        {/* Modern Sans, Editorial Serif & Developer Monospace */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Fira+Code:wght@400;500;600&family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Literata:ital,opsz,wght@0,7..72,200..900;1,7..72,200..900&family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground transition-colors duration-300 min-h-screen flex flex-col font-sans">
        <TRPCReactProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </TRPCReactProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={1400}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnHover={false}
          pauseOnFocusLoss={false}
          theme="dark"
          toastClassName="netherite-toast"
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

