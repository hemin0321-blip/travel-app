import { useCallback, useRef, useState } from "react";
import { isTokenExpired } from "../lib/tokenExpiry";

interface TokenState {
  accessToken: string | null;
  expiresAtMs: number | null;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token: string; expires_in: number }) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (overrideConfig?: { prompt?: string }) => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SIGN_IN_ERROR = "로그인에 실패했어요, 다시 시도해주세요";

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<TokenState>({ accessToken: null, expiresAtMs: null });
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<{ requestAccessToken: (overrideConfig?: { prompt?: string }) => void } | null>(
    null
  );
  // A silent (no-popup) reauth attempt that fails just means the browser has
  // no active Google session — that's a normal, expected outcome, not an
  // error worth interrupting the user with. Only surface error_callback as a
  // visible message for interactive attempts.
  const isSilentAttemptRef = useRef(false);

  const ensureTokenClient = useCallback(() => {
    if (!tokenClientRef.current && window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          isSilentAttemptRef.current = false;
          setError(null);
          setToken({ accessToken: resp.access_token, expiresAtMs: Date.now() + resp.expires_in * 1000 });
        },
        // Fires when Google rejects the request — popup closed, or the account
        // is not on the OAuth consent screen's test-user allowlist.
        error_callback: () => {
          const wasSilent = isSilentAttemptRef.current;
          isSilentAttemptRef.current = false;
          if (!wasSilent) setError(SIGN_IN_ERROR);
        },
      });
    }
    return tokenClientRef.current;
  }, [clientId]);

  const signIn = useCallback(() => {
    const client = ensureTokenClient();
    if (!client) {
      // GIS script has not loaded yet — surface it instead of no-oping silently.
      setError(SIGN_IN_ERROR);
      return;
    }
    isSilentAttemptRef.current = false;
    setError(null);
    client.requestAccessToken();
  }, [ensureTokenClient]);

  // Tries to reacquire a token without a popup, using the browser's existing
  // Google session — lets a returning user skip the manual "다시 로그인"
  // click after a reload, closer to how M365 apps stay signed in silently.
  const trySilentSignIn = useCallback(() => {
    const client = ensureTokenClient();
    if (!client) return;
    isSilentAttemptRef.current = true;
    client.requestAccessToken({ prompt: "" });
  }, [ensureTokenClient]);

  const getValidToken = useCallback((): string | null => {
    if (!token.accessToken || !token.expiresAtMs) return null;
    if (isTokenExpired(token.expiresAtMs, Date.now())) return null;
    return token.accessToken;
  }, [token]);

  return { signIn, trySilentSignIn, getValidToken, isSignedIn: getValidToken() !== null, error };
}
