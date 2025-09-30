"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, ShieldCheck, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "@/hooks/useFirebaseAuth";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signInWithGoogle } = useFirebaseAuth();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  async function onSignIn() {
    setBusy(true);
    try {
      await signInWithGoogle();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-lg gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle className="text-lg">Sign in to PHI Scanner</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6 text-sm text-muted-foreground">
            Authenticate with your Google account to securely upload files, run PHI scans, and download de-identified results.
          </p>
          <Button
            onClick={onSignIn}
            disabled={busy || loading}
            className="w-full inline-flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            {busy ? "Signing in…" : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          <p>
            After signing in, you will be redirected to the dashboard to upload a file (≤ 20&nbsp;MB), run a DLP scan, and apply de-identification (Mask or FPE).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}