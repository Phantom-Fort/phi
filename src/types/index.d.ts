// types/index.ts
export type InfoType = string; // or narrow if you prefer

export type FindingsByType = Record<InfoType, number>;

export interface UploadResponse {
  fileId: string;
  name?: string;
  view?: string;         // drive webViewLink
}

export interface ScanRequestBody {
  fileId: string;
}

export interface ScanResponse {
  findings: FindingsByType;
  chunks: number;
}

export type DeidentifyMethod = "mask" | "fpe";

export interface DeidentifyRequestBody {
  fileId: string;
  method: DeidentifyMethod;
}

export interface DeidentifyResponse {
  sanitizedFileId: string;
  name?: string;
  download?: string;     // drive webContentLink
}

export interface ApiError {
  error: string;
}
