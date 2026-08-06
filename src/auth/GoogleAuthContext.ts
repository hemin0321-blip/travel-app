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
  /**
   * True once this device has completed a successful sign-in at least once,
   * persisted across reloads. Lets the app tell "never signed in yet" (show
   * the blocking sign-in gate) apart from "signed in before, token just
   * isn't valid right now" (offline, or the hourly token expired) — the
   * latter should render the app normally and let each screen fall back to
   * its own cache/offline-banner instead of the whole app disappearing
   * behind a login screen it can't even submit while offline.
   */
  hasEverSignedIn: boolean;
}

export const GoogleAuthContext = createContext<GoogleAuthContextValue | null>(null);

export function useAuth(): GoogleAuthContextValue {
  const value = useContext(GoogleAuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside a <GoogleAuthProvider>");
  }
  return value;
}
