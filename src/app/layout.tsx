import "~/styles/globals.css";

import { type Metadata } from "next";
import { Geist, Geist_Mono, Literata } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "Netherite | Sophisticated Monochromatic Notes",
  description: "Sophisticated note-taking app backed by your Google Drive",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
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
      </body>
    </html>
  );
}

