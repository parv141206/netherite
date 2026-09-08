"use client";

import React, { useState, useEffect } from "react";
import { NetheriteLogo } from "~/components/icons/NetheriteLogo";

const DEV_QUOTES = [
  {
    quote: "Talk is cheap. Show me the code.",
    author: "Linus Torvalds",
  },
  {
    quote: "UNIX is basically a simple operating system, but you have to be a genius to understand the simplicity.",
    author: "Dennis Ritchie",
  },
  {
    quote: "There are only two hard things in Computer Science: cache invalidation and naming things.",
    author: "Phil Karlton",
  },
  {
    quote: "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.",
    author: "Brian W. Kernighan",
  },
  {
    quote: "The most dangerous phrase in the language is: 'We've always done it this way.'",
    author: "Grace Hopper",
  },
  {
    quote: "Simple things should be simple, complex things should be possible.",
    author: "Alan Kay",
  },
  {
    quote: "First, solve the problem. Then, write the code.",
    author: "John Johnson",
  },
  {
    quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    author: "Martin Fowler",
  },
  {
    quote: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
  },
  {
    quote: "Theory is when you know something, but it doesn't work. Practice is when something works, but you don't know why. Programmers combine theory and practice: Nothing works and they have no idea why.",
    author: "Programming Lore",
  },
];

interface AppleFullPageLoaderProps {
  message?: string;
  subMessage?: string;
}

export function AppleFullPageLoader({
  message = "Syncing sovereign workspace with Google Drive...",
  subMessage,
}: AppleFullPageLoaderProps) {
  const [quoteIndex, setQuoteIndex] = useState(() =>
    Math.floor(Math.random() * DEV_QUOTES.length)
  );
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIndex((prev) => (prev + 1) % DEV_QUOTES.length);
        setFade(true);
      }, 300);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const activeQuote = DEV_QUOTES[quoteIndex] || DEV_QUOTES[0]!;

  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-2xl px-6 select-none animate-in fade-in duration-300">
      <div className="w-full max-w-md flex flex-col items-center text-center space-y-7">
        {/* Minimalist Netherite Brand Emblem */}
        <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-border/80 flex items-center justify-center shadow-xs">
          <NetheriteLogo size={28} className="text-foreground" />
        </div>

        {/* Straight Line Progress Bar (Minimal Apple System Style) */}
        <div className="w-56 sm:w-64 flex flex-col items-center gap-2.5">
          <div className="w-full h-1 bg-muted/70 rounded-full overflow-hidden relative">
            <div
              className="absolute inset-y-0 rounded-full bg-foreground/90 shadow-2xs"
              style={{
                width: "35%",
                animation: "straightProgressSweep 1.6s ease-in-out infinite",
              }}
            />
          </div>
          <p className="text-[11px] font-mono text-muted-foreground/80 tracking-wide">
            {message}
          </p>
          {subMessage && (
            <p className="text-[10px] text-muted-foreground/60 -mt-1 font-mono">
              {subMessage}
            </p>
          )}
        </div>

        {/* Developer Wisdom Box */}
        <div className="pt-3 max-w-sm min-h-[5rem] flex flex-col items-center justify-center">
          <p
            className={`text-xs sm:text-sm font-sans font-normal text-muted-foreground leading-relaxed italic transition-opacity duration-300 ${
              fade ? "opacity-100" : "opacity-0"
            }`}
          >
            “{activeQuote.quote}”
          </p>
          <span
            className={`text-[11px] font-mono text-muted-foreground/60 mt-2 tracking-wider transition-opacity duration-300 ${
              fade ? "opacity-100" : "opacity-0"
            }`}
          >
            — {activeQuote.author}
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes straightProgressSweep {
          0% {
            left: -35%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}
