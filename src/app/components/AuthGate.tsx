"use client";

import { PropsWithChildren, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";

export default function AuthGate({ children }: PropsWithChildren) {
  const { user, loading } = useFirebaseAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Checking session…
      </div>
    );
  }

  if (!user) return null; // redirected
  return <>{children}</>;
}