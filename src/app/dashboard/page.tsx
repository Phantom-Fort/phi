"use client";

import { useState } from "react";
import AuthGate from "@/app/components/AuthGate";
import UploadCard from "@/app/components/UploadCard";
import FindingsTable, { type Findings } from "@/app/components/FindingsTable";
import DeidentifyOptions from "@/app/components/DeidentifyOptions";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import {
  AlertTriangle,
  PlayCircle,
  CheckCircle2,
  FileDown,
  Workflow as WorkflowIcon,
  Shield,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadResult = { fileId: string; name?: string; view?: string };
type DeidResult = { sanitizedFileId: string; download?: string; name?: string };

export default function DashboardPage() {
  return (
    <AuthGate>
      <DashboardInner />
    </AuthGate>
  );
}

function DashboardInner() {
  const authedFetch = useAuthedFetch();

  const [upload, setUpload] = useState<UploadResult | null>(null);
  const [findings, setFindings] = useState<Findings | null>(null);
  const [scanBusy, setScanBusy] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [deid, setDeid] = useState<DeidResult | null>(null);

  async function runScan() {
    if (!upload?.fileId) return;
    setScanBusy(true);
    setScanError(null);
    setFindings(null);
    try {
      const res = await authedFetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: upload.fileId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Scan failed");
      setFindings(json.findings || {});
    } catch (e) {
      setScanError((e as Error).message);
    } finally {
      setScanBusy(false);
    }
  }

  return (
    // Page shell: centered, readable width, consistent spacing
    <div className="mx-auto max-w-5xl px-4 md:px-6 py-6 md:py-8 space-y-8">
      {/* Top intro card */}
      <Card className="bg-card text-card-foreground">
        <CardHeader className="flex flex-row items-center gap-3">
          <WorkflowIcon className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="mt-1 list-decimal list-inside space-y-1 text-sm text-muted-foreground">
            <li>Upload a CSV/JSON/TXT (≤ 20&nbsp;MB) to Google Drive.</li>
            <li>Run DLP Scan to summarize sensitive data findings.</li>
            <li>Choose Mask to de-identify and download the sanitized file.</li>
          </ol>
        </CardContent>
      </Card>

      {/* Responsive two-column workspace */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left column: Upload + Scan */}
        <div className="space-y-6">
          {/* Upload */}
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg">Upload Source File</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <UploadCard
                onUploaded={(res) => {
                  setUpload(res);
                  setFindings(null);
                  setDeid(null);
                }}
              />
            </CardContent>
          </Card>

          {/* Scan */}
          <Card className="bg-card text-card-foreground">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">DLP Scan</CardTitle>
              </div>
              <Button
                disabled={!upload?.fileId || scanBusy}
                onClick={runScan}
                className="inline-flex items-center gap-2"
              >
                <PlayCircle className="h-4 w-4" />
                {scanBusy ? "Scanning…" : "Run Scan"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {!upload?.fileId && (
                <p className="text-sm italic text-muted-foreground">
                  Upload a file first to enable scanning.
                </p>
              )}

              {scanError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              )}

              <FindingsTable findings={findings} />
            </CardContent>
          </Card>
        </div>

        {/* Right column: De-identify + Result */}
        <div className="space-y-6">
          <Card className="bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg">De-identify</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DeidentifyOptions fileId={upload?.fileId ?? null} onDone={(out) => setDeid(out)} />
            </CardContent>
          </Card>

          {deid && (
            <Card className="bg-card text-card-foreground">
              <CardHeader className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-lg">De-identification Complete</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {deid.name ? `Saved as ${deid.name}.` : "Sanitized file is ready."}
                </p>
              </CardContent>
              {deid.download && (
                <CardFooter>
                  <Button asChild variant="link" className="px-0">
                    <a href={deid.download} className="inline-flex items-center gap-2">
                      <FileDown className="h-5 w-5" />
                      Download Sanitized File
                    </a>
                  </Button>
                </CardFooter>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
