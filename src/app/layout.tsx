import "~/styles/globals.css";

import { type Metadata, type Viewport } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "katex/dist/katex.min.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { Analytics } from "@vercel/analytics/next";

const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "https://craftnetherite.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Netherite — Sovereign Markdown Studio & Google Productivity Hub",
    template: "%s | Netherite",
  },
  description:
    "A sovereign, distraction-free markdown studio, infinite whiteboard, and Google Calendar hub backed 100% by your Google Drive with native KaTeX, Mermaid, and Apollon UML.",
  keywords: [
    "markdown studio",
    "katex math editor",
    "google drive notes",
    "google calendar meeting notes",
    "excalidraw whiteboard",
    "mermaid diagram zoom",
    "apollon uml modeling",
    "sovereign private notes",
    "latex scientific editor",
    "offline markdown editor",
    "pdf export with themes",
  ],
  authors: [{ name: "Netherite Team", url: baseUrl }],
  creator: "Netherite",
  publisher: "Netherite",
  alternates: {
    canonical: baseUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Netherite — Sovereign Markdown Studio & Google Productivity Hub",
    description:
      "A sovereign, distraction-free markdown studio, whiteboard, and Google Calendar hub backed 100% by your Google Drive. Live KaTeX, Mermaid, and Apollon UML.",
    url: baseUrl,
    siteName: "Netherite",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Netherite Studio Workspace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Netherite — Sovereign Markdown Studio & Google Hub",
    description:
      "A sovereign markdown studio and Google Calendar hub backed 100% by your personal Google Drive with KaTeX, Excalidraw, and Mermaid.",
    images: ["/og-image.png"],
  },
  verification: {
    google: "pMUgEbPbSSePs2qGhNyOmo2p602NabQvNyhEf8fEPW0",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "@id": `${baseUrl}/#webapp`,
      name: "Netherite",
      url: baseUrl,
      description:
        "A sovereign, distraction-free markdown studio, whiteboard, and Google Calendar hub backed 100% by personal Google Drive.",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript. Requires HTML5.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      featureList: [
        "100% Sovereign storage in personal Google Drive",
        "Google Calendar Studio with 1-click meeting notes",
        "Live KaTeX formula typesetting",
        "Interactive Mermaid diagrams with zoom and visual editing",
        "Full Excalidraw canvas integration",
        "Apollon UML diagrams",
        "High-fidelity PDF exporter with typography matching",
        "14 light/dark theme pairings with curated fonts",
      ],
    },
    {
      "@type": "Organization",
      "@id": `${baseUrl}/#organization`,
      name: "Netherite",
      url: baseUrl,
      logo: `${baseUrl}/icon.png`,
    },
  ],
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
      className={`${geist.variable} ${geistMono.variable} ${literata.variable} antialiased selection:bg-blue-500 selection:text-white`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google-site-verification" content="pMUgEbPbSSePs2qGhNyOmo2p602NabQvNyhEf8fEPW0" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Girly Font (Crafty Girls) */}
        <link
          href="https://fonts.googleapis.com/css2?family=Crafty+Girls&display=swap"
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

