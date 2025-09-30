// hooks/useFirebaseAuth.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  reauthenticateWithPopup,
  User,
} from "firebase/auth";

function initFirebase() {
  if (!getApps().length) {
    initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    });
  }
  const auth = getAuth();
  setPersistence(auth, indexedDBLocalPersistence).catch(async () => {
    try { await setPersistence(auth, browserLocalPersistence); }
    catch { await setPersistence(auth, browserSessionPersistence); }
  });
  return auth;
}

async function retry<T>(fn: () => Promise<T>, times = 3, base = 300) {
  let err: any;
  for (let i = 0; i < times; i++) {
    try { return await fn(); } catch (e) {
      err = e;
      const msg = String((e as any)?.message || e);
      if (!/network|timeout|offline|failed/i.test(msg) && i > 0) break;
      await new Promise(r => setTimeout(r, base * Math.pow(2, i)));
    }
  }
  throw err;
}

// helper: extract Google access token from various Firebase result shapes
function extractAccessToken(res: any): string | null {
  // Preferred
  const credTok = (GoogleAuthProvider.credentialFromResult(res) as any)?.accessToken;
  if (credTok) return credTok;
  // Fallbacks observed in the wild
  const tokenResp = res?._tokenResponse;
  const t1 = tokenResp?.oauthAccessToken || tokenResp?.oauthIdToken; // some SDKs mislabel
  return t1 ?? null;
}

export function useFirebaseAuth() {
  const auth = useMemo(initFirebase, []);
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const unsub = onIdTokenChanged(auth, async (u) => {
      setUser(u ?? null);
      if (!u) {
        setIdToken(null);
        setGoogleAccessToken(null);
        setLoading(false);
        return;
      }
      try {
        const t = await retry(() => u.getIdToken(), 3, 300);
        if (mounted.current) setIdToken(t);
      } catch {
        if (mounted.current) setIdToken(null);
      } finally {
        if (mounted.current) setLoading(false);
      }
    });
    return () => { mounted.current = false; unsub(); };
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    provider.setCustomParameters({ prompt: "consent", include_granted_scopes: "true" });
    const res = await signInWithPopup(auth, provider);
    setGoogleAccessToken(extractAccessToken(res));
  }, [auth]);

  /** Ensure a current Drive access token; re-prompts if needed */
  const ensureGoogleAccessToken = useCallback(async () => {
    if (googleAccessToken) return googleAccessToken;
    if (!auth.currentUser) return null;
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/drive.file");
    try {
      const res = await reauthenticateWithPopup(auth.currentUser, provider);
      const tok = extractAccessToken(res);
      setGoogleAccessToken(tok);
      return tok;
    } catch {
      return null;
    }
  }, [auth, googleAccessToken]);

  const refreshIdToken = useCallback(async () => {
    if (!auth.currentUser) return null;
    try {
      const t = await retry(() => auth.currentUser!.getIdToken(true), 3, 300);
      setIdToken(t);
      return t;
    } catch { return null; }
  }, [auth]);

  const signOut = useCallback(async () => { await fbSignOut(auth); }, [auth]);

  // compatibility alias if any code still calls it
  const refreshGoogleAccessToken = ensureGoogleAccessToken;

  return {
    user, idToken, googleAccessToken, loading,
    signInWithGoogle, signOut, refreshIdToken,
    ensureGoogleAccessToken, refreshGoogleAccessToken,
  };
}
