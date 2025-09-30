"use client";

import { ShieldCheck, LogOut, UserCircle2 } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { user, signOut } = useFirebaseAuth();

  return (
    <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          <span className="font-semibold">PHI Scanner</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm">
            <UserCircle2 className="h-5 w-5" />
            <span className="truncate max-w-[160px]">{user?.email}</span>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            className="inline-flex items-center gap-2"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}