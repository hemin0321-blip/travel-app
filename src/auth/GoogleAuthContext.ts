import { createContext, useContext } from "react";

export interface GoogleAuthContextValue {
  /** Opens the Google consent popup. No-op until the GIS script has loaded. */
  signIn: () => void;
  /** Returns the current access token, or null when missing/expired. */
  getValidToken: () => string | null;
  isSignedIn: boolean;
  /** Human-readable sign-in failure message, or null. */
  error: string | null;
  /** False until the async GIS script tag has finished loading. */
  isGoogleReady: boolean;
}

export const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

export function useAuth(): GoogleAuthContextValue {
  const value = useContext(GoogleAuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside a <GoogleAuthProvider>");
  }
  return value;
}
