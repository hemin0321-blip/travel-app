import { useCallback, useEffect, useRef, useState } from "react";
import { isTokenExpired } from "../lib/tokenExpiry";

interface TokenState {
  accessToken: string | null;
  expiresAtMs: number | null;
}

interface CodeResponse {
  code?: string;
  error?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initCodeClient: (config: {
            client_id: string;
            scope: string;
            ux_mode: "popup";
            callback: (resp: CodeResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestCode: () => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const SIGN_IN_ERROR = "로그인에 실패했어요, 다시 시도해주세요";
const ACCESS_TOKEN_KEY = "travel-app:token";
// Unlike the access token, this survives a full browser close — it's what
// lets a returning user skip the popup entirely, for as long as Google
// honors it (indefinitely for a published app; ~7 days while the OAuth
// consent screen is still in "Testing" status).
const REFRESH_TOKEN_KEY = "travel-app:refresh-token";

function readStoredAccessToken(): TokenState {
  try {
    const raw = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!raw) return { accessToken: null, expiresAtMs: null };
    const parsed = JSON.parse(raw) as TokenState;
    if (!parsed.accessToken || !parsed.expiresAtMs || isTokenExpired(parsed.expiresAtMs, Date.now())) {
      return { accessToken: null, expiresAtMs: null };
    }
    return parsed;
  } catch (err) {
    console.error("Failed to read stored access token:", err);
    return { accessToken: null, expiresAtMs: null };
  }
}

function writeStoredAccessToken(token: TokenState): void {
  try {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, JSON.stringify(token));
  } catch (err) {
    console.error("Failed to persist access token:", err);
  }
}

function readRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.error("Failed to read refresh token:", err);
    return null;
  }
}

function writeRefreshToken(refreshToken: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch (err) {
    console.error("Failed to persist refresh token:", err);
  }
}

function clearRefreshToken(): void {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch (err) {
    console.error("Failed to clear refresh token:", err);
  }
}

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<TokenState>(readStoredAccessToken);
  const [error, setError] = useState<string | null>(null);
  const codeClientRef = useRef<{ requestCode: () => void } | null>(null);
  // Guards against firing a second /api/auth/refresh call while one is
  // already in flight (e.g. two screens both noticing the token is gone).
  const refreshingRef = useRef(false);

  const getValidToken = useCallback((): string | null => {
    if (!token.accessToken || !token.expiresAtMs) return null;
    if (isTokenExpired(token.expiresAtMs, Date.now())) return null;
    return token.accessToken;
  }, [token]);

  const isSignedIn = getValidToken() !== null;

  // A plain fetch to our own origin — not a Google popup — so unlike
  // requestAccessToken() this needs no user gesture and is safe to fire
  // automatically (on mount, or whenever the access token lapses) as long
  // as a refresh token is on file.
  useEffect(() => {
    if (isSignedIn || refreshingRef.current) return;
    const refreshToken = readRefreshToken();
    if (!refreshToken) return;
    refreshingRef.current = true;
    fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Dead refresh token (revoked, or the 7-day testing-app cap) —
          // stop retrying it and fall back to a normal interactive sign-in.
          clearRefreshToken();
          return;
        }
        const data = (await res.json()) as { access_token: string; expires_in: number };
        const next = { accessToken: data.access_token, expiresAtMs: Date.now() + data.expires_in * 1000 };
        setToken(next);
        writeStoredAccessToken(next);
      })
      .catch((err) => {
        console.error("Silent token refresh failed:", err);
      })
      .finally(() => {
        refreshingRef.current = false;
      });
  }, [isSignedIn]);

  const ensureCodeClient = useCallback(() => {
    if (!codeClientRef.current && window.google) {
      codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
        client_id: clientId,
        scope: SCOPE,
        ux_mode: "popup",
        callback: (resp) => {
          if (resp.error || !resp.code) {
            setError(SIGN_IN_ERROR);
            return;
          }
          fetch("/api/auth/exchange", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: resp.code, redirectUri: window.location.origin }),
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(`exchange failed: ${res.status}`);
              const data = (await res.json()) as {
                access_token: string;
                expires_in: number;
                refresh_token: string | null;
              };
              setError(null);
              const next = { accessToken: data.access_token, expiresAtMs: Date.now() + data.expires_in * 1000 };
              setToken(next);
              writeStoredAccessToken(next);
              if (data.refresh_token) writeRefreshToken(data.refresh_token);
            })
            .catch((err) => {
              console.error("Token exchange failed:", err);
              setError(SIGN_IN_ERROR);
            });
        },
        // Fires when Google rejects the request — popup closed, or the account
        // is not on the OAuth consent screen's test-user allowlist.
        error_callback: () => {
          setError(SIGN_IN_ERROR);
        },
      });
    }
    return codeClientRef.current;
  }, [clientId]);

  const signIn = useCallback(() => {
    const client = ensureCodeClient();
    if (!client) {
      // GIS script has not loaded yet — surface it instead of no-oping silently.
      setError(SIGN_IN_ERROR);
      return;
    }
    setError(null);
    client.requestCode();
  }, [ensureCodeClient]);

  return { signIn, getValidToken, isSignedIn, error };
}
