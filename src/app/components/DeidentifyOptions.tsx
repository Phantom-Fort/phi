"use client";

import { useState } from "react";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { Sparkles, Download, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function DeidentifyOptions({
  fileId,
  onDone,
}: {
  fileId: string | null;
  onDone: (out: { sanitizedFileId: string; download?: string; name?: string }) => void;
}) {
  const [method, setMethod] = useState<"mask" | "fpe">("mask");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<string | null>(null);
  const authedFetch = useAuthedFetch();

  async function run() {
    if (!fileId) return;
    setBusy(true);
    setError(null);
    setDownload(null);
    try {
      const res = await authedFetch("/api/deidentify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId, method }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "De-identification failed");
      onDone(json);
      setDownload(json.download ?? null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          <CardTitle className="text-lg">De-identify</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <RadioGroup
          name="method"
          value={method}
          onValueChange={(value: "mask" | "fpe") => setMethod(value)}
          className="flex items-center gap-4 mb-3"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="mask" id="mask" />
            <Label htmlFor="mask">Mask (irreversible)</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="fpe" id="fpe" />
            <Label htmlFor="fpe">FPE (reversible with KMS key)</Label>
          </div>
        </RadioGroup>
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          disabled={!fileId || busy}
          onClick={run}
          className="inline-flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          {busy ? "Processing…" : "Run De-identification"}
        </Button>
        {download && (
          <Button asChild variant="link" className="ml-4">
            <a href={download} className="inline-flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Sanitized File
            </a>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}