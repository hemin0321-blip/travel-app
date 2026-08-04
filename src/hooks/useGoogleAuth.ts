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
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export function useGoogleAuth(clientId: string) {
  const [token, setToken] = useState<TokenState>({ accessToken: null, expiresAtMs: null });
  const tokenClientRef = useRef<{ requestAccessToken: () => void } | null>(null);

  const ensureTokenClient = useCallback(() => {
    if (!tokenClientRef.current && window.google) {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          setToken({ accessToken: resp.access_token, expiresAtMs: Date.now() + resp.expires_in * 1000 });
        },
      });
    }
    return tokenClientRef.current;
  }, [clientId]);

  const signIn = useCallback(() => {
    ensureTokenClient()?.requestAccessToken();
  }, [ensureTokenClient]);

  const getValidToken = useCallback((): string | null => {
    if (!token.accessToken || !token.expiresAtMs) return null;
    if (isTokenExpired(token.expiresAtMs, Date.now())) return null;
    return token.accessToken;
  }, [token]);

  return { signIn, getValidToken, isSignedIn: getValidToken() !== null };
}
