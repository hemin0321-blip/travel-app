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
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SIGN_IN_ERROR = "로그인에 실패했어요, 다시 시도해주세요";
const STORAGE_KEY = "travel-app:token";

/**
 * GIS keeps the token in memory only, so a page reload always wiped it and
 * forced a fresh popup even minutes into an hour-long token's life. The
 * token itself is safe to persist client-side for its own short lifetime —
 * unlike a refresh token, it can't be used to mint new grants — so caching
 * it in sessionStorage lets a reload (or reopening the same restored tab)
 * skip that popup instead of one being required, without needing a backend.
 */
function readStoredToken(): TokenState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { accessToken: null, expiresAtMs: null };
    const parsed = JSON.parse(raw) as TokenState;
    if (!parsed.accessToken || !parsed.expiresAtMs || isTokenExpired(parsed.expiresAtMs, Date.now())) {
      return { accessToken: null, expiresAtMs: null };
    }
    return parsed;
  } catch (err) {
    console.error("Failed to read stored token:", err);
    return { accessToken: null, expiresAtMs: null };
  }
}

function writeStoredToken(token: TokenState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(token));
  } catch (err) {
    console.error("Failed to persist token:", err);
  }
}

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<TokenState>(readStoredToken);
  const [error, setError] = useState<string | null>(null);
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  const ensureTokenClient = useCallback(() => {
    if (!tokenClientRef.current && window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          setError(null);
          const next = { accessToken: resp.access_token, expiresAtMs: Date.now() + resp.expires_in * 1000 };
          setToken(next);
          writeStoredToken(next);
        },
        // Fires when Google rejects the request — popup closed, or the account
        // is not on the OAuth consent screen's test-user allowlist.
        error_callback: () => {
          setError(SIGN_IN_ERROR);
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
    setError(null);
    client.requestAccessToken();
  }, [ensureTokenClient]);

  const getValidToken = useCallback((): string | null => {
    if (!token.accessToken || !token.expiresAtMs) return null;
    if (isTokenExpired(token.expiresAtMs, Date.now())) return null;
    return token.accessToken;
  }, [token]);

  return { signIn, getValidToken, isSignedIn: getValidToken() !== null, error };
}
