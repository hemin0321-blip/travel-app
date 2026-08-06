import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useGoogleAuth } from "../hooks/useGoogleAuth";
import { GoogleAuthContext } from "./GoogleAuthContext";

/**
 * The GIS script in index.html is loaded `async defer`, so `window.google` may
 * not exist yet when the app first renders. Poll until it shows up so the
 * sign-in button can disable itself instead of silently doing nothing.
 */
function useGoogleScriptReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => Boolean(window.google));

  useEffect(() => {
    if (ready) return;
    const timer = window.setInterval(() => {
      if (window.google) setReady(true);
    }, 200);
    return () => window.clearInterval(timer);
  }, [ready]);

  return ready;
}

const EVER_SIGNED_IN_KEY = "travel-app:ever-signed-in";

/**
 * Owns the single `useGoogleAuth` call for the whole app. Every screen reads the
 * same token through `useAuth()`; calling `useGoogleAuth` per screen would give
 * each screen its own isolated (and permanently signed-out) token state.
 */
export function GoogleAuthProvider({ clientId, children }: { clientId: string; children: ReactNode }) {
  const { signIn, getValidToken, isSignedIn, error } = useGoogleAuth(clientId);
  const isGoogleReady = useGoogleScriptReady();
  const [hasEverSignedIn, setHasEverSignedIn] = useState<boolean>(
    () => localStorage.getItem(EVER_SIGNED_IN_KEY) === "true"
  );

  useEffect(() => {
    if (isSignedIn && !hasEverSignedIn) {
      localStorage.setItem(EVER_SIGNED_IN_KEY, "true");
      setHasEverSignedIn(true);
    }
  }, [isSignedIn, hasEverSignedIn]);

  const value = useMemo(
    () => ({ signIn, getValidToken, isSignedIn, error, isGoogleReady, hasEverSignedIn }),
    [signIn, getValidToken, isSignedIn, error, isGoogleReady, hasEverSignedIn]
  );

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
}
