"use client";

import { useRef, useState } from "react";
import { useAuthedFetch } from "@/hooks/useAuthedFetch";
import { ALLOWED_MIME, MAX_UPLOAD_BYTES } from "@/utils/constants";
import { detectMime, formatBytes, isAllowedFile } from "@/utils/contentType";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

type UploadResult = { fileId: string; name: string; view?: string };

export default function UploadCard({
  onUploaded,
}: {
  onUploaded: (res: UploadResult) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const authedFetch = useAuthedFetch();
  const inputRef = useRef<HTMLInputElement>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const mime = detectMime(f.name, f.type);
    if (!isAllowedFile(f.name, f.type)) {
      setError(`Unsupported file type: ${mime}. Allowed: ${[...ALLOWED_MIME].join(", ")}`);
      setFile(null);
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError(`File too large: ${formatBytes(f.size)} (limit ${formatBytes(MAX_UPLOAD_BYTES)})`);
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function onUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch("/api/upload", {
        method: "POST",
        headers: {
          "x-filename": file.name,
          "content-type": detectMime(file.name, file.type),
        },
        body: await file.arrayBuffer(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Upload failed");
      onUploaded(json as UploadResult);
      // reset input
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
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
          <FileText className="h-5 w-5" />
          <CardTitle className="text-lg">Upload Source File</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,.json,text/plain,text/csv,application/json"
          onChange={onPick}
          className="mb-3"
        />
        {file && (
          <p className="mb-3 text-sm text-muted-foreground">
            Selected: <span className="font-medium">{file.name}</span> • {formatBytes(file.size)}
          </p>
        )}
        {error && (
          <Alert variant="destructive" className="mb-3">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button
          disabled={!file || busy}
          onClick={onUpload}
          className="inline-flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          {busy ? "Uploading…" : "Upload to Drive"}
        </Button>
        <p className="ml-4 text-xs text-muted-foreground">
          Allowed: .txt, .csv, .json • Max {formatBytes(MAX_UPLOAD_BYTES)}
        </p>
      </CardFooter>
    </Card>
  );
}