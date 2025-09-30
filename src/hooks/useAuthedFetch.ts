// hooks/useAuthedFetch.ts
"use client";

import { useCallback } from "react";
import { useFirebaseAuth } from "./useFirebaseAuth";

export function useAuthedFetch() {
  const { idToken, refreshIdToken, googleAccessToken, ensureGoogleAccessToken } = useFirebaseAuth();

  return useCallback(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers || {});

    // API auth
    const apiToken = idToken ?? (await refreshIdToken());
    if (apiToken) headers.set("Authorization", `Bearer ${apiToken}`);

    // Drive auth
    const driveToken = googleAccessToken ?? (await ensureGoogleAccessToken());
    if (!driveToken) {
      throw new Error("Google Drive access not granted. Please sign in and allow Drive access.");
    }
    headers.set("x-google-access-token", driveToken);

    headers.set("Accept", "application/json");
    return fetch(input, { ...init, headers });
  }, [idToken, refreshIdToken, googleAccessToken, ensureGoogleAccessToken]);
}
