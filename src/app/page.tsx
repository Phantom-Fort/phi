"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

export default function HomePage() {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Redirecting…</span>
      </div>
    </div>
  );
}
