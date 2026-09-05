"use client";

import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { Button } from "./ui/Button";

interface NavbarProps {
  session: any;
}

export function Navbar({ session }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-8 max-w-5xl mx-auto">
        <Link href="/" className="flex items-center space-x-2">
          <span className="font-bold text-lg tracking-tight">Netherite</span>
        </Link>
        <div className="flex items-center space-x-4">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden md:inline-block">
                {session.user?.email}
              </span>
              <Button variant="ghost" onClick={() => signOut()}>
                Log out
              </Button>
            </>
          ) : (
            <Button onClick={() => signIn("google")}>Log in</Button>
          )}
        </div>
      </div>
    </header>
  );
}
