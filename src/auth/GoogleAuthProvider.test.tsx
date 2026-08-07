import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GoogleAuthProvider } from "./GoogleAuthProvider";
import { useAuth } from "./GoogleAuthContext";

function TokenProbe({ name }: { name: string }) {
  const { getValidToken } = useAuth();
  return <span data-testid={name}>{getValidToken() ?? "no-token"}</span>;
}

function SignInButton() {
  const { signIn } = useAuth();
  return <button onClick={signIn}>구글 로그인</button>;
}

function installFakeGis() {
  let capturedCallback: ((resp: { code?: string; error?: string }) => void) | null = null;
  window.google = {
    accounts: {
      oauth2: {
        initCodeClient: (config) => {
          capturedCallback = config.callback;
          return {
            requestCode: () => {
              capturedCallback?.({ code: "auth-code-abc" });
            },
          };
        },
      },
    },
  };
}

function installFakeFetch(
  options: { exchangeOk?: boolean; refreshOk?: boolean; refreshToken?: string | null } = {}
) {
  const exchangeOk = options.exchangeOk ?? true;
  const refreshOk = options.refreshOk ?? true;
  const refreshToken = options.refreshToken === undefined ? "refresh-token-abc" : options.refreshToken;

  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      if (url === "/api/auth/exchange") {
        if (!exchangeOk) {
          return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "exchange_failed" }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: "token-abc", expires_in: 3600, refresh_token: refreshToken }),
        });
      }
      if (url === "/api/auth/refresh") {
        if (!refreshOk) {
          return Promise.resolve({ ok: false, status: 400, json: async () => ({ error: "refresh_failed" }) });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ access_token: "token-refreshed", expires_in: 3600 }),
        });
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`));
    })
  );
}

describe("GoogleAuthProvider", () => {
  beforeEach(() => {
    installFakeGis();
    installFakeFetch();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    delete window.google;
    vi.unstubAllGlobals();
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shares one token with every consumer across the tree", async () => {
    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
          <TokenProbe name="consumer-a" />
          <TokenProbe name="consumer-b" />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    // Before sign-in, nobody has a token.
    expect(screen.getByTestId("consumer-a")).toHaveTextContent("no-token");
    expect(screen.getByTestId("consumer-b")).toHaveTextContent("no-token");

    fireEvent.click(screen.getByText("구글 로그인"));

    // After signing in once, BOTH consumers see the same non-null token. This is
    // the regression test for per-screen useGoogleAuth() calls, where only the
    // screen holding the sign-in button ever had a token.
    await waitFor(() => expect(screen.getByTestId("consumer-a")).toHaveTextContent("token-abc"));
    expect(screen.getByTestId("consumer-b")).toHaveTextContent("token-abc");
  });

  it("reports isSignedIn to consumers only after a successful sign-in", async () => {
    function SignedInProbe() {
      const { isSignedIn } = useAuth();
      return <span data-testid="signed-in">{String(isSignedIn)}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
          <SignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("signed-in")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("구글 로그인"));
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("true"));
  });

  it("surfaces an error when the GIS script has not loaded yet", () => {
    delete window.google;

    function ErrorProbe() {
      const { error, isGoogleReady } = useAuth();
      return <span data-testid="error">{`${String(isGoogleReady)}:${error ?? "none"}`}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
          <ErrorProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("error")).toHaveTextContent("false:none");
    fireEvent.click(screen.getByText("구글 로그인"));
    expect(screen.getByTestId("error")).toHaveTextContent("로그인에 실패했어요");
  });

  it("surfaces an error when the token exchange call fails", async () => {
    installFakeFetch({ exchangeOk: false });

    function ErrorProbe() {
      const { error } = useAuth();
      return <span data-testid="error">{error ?? "none"}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
          <ErrorProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText("구글 로그인"));
    await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("로그인에 실패했어요"));
  });

  it("throws when useAuth is used outside the provider", () => {
    expect(() => render(<TokenProbe name="orphan" />)).toThrow(/GoogleAuthProvider/);
  });

  it("remembers a past sign-in across a full remount (e.g. a page reload)", async () => {
    function EverSignedInProbe() {
      const { hasEverSignedIn } = useAuth();
      return <span data-testid="ever-signed-in">{String(hasEverSignedIn)}</span>;
    }

    const { unmount } = render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
          <EverSignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    // Never signed in yet on this device: false.
    expect(screen.getByTestId("ever-signed-in")).toHaveTextContent("false");
    fireEvent.click(screen.getByText("구글 로그인"));
    await waitFor(() => expect(screen.getByTestId("ever-signed-in")).toHaveTextContent("true"));

    // A full page reload remounts the whole React tree, so the in-memory
    // token is gone — but hasEverSignedIn must survive via localStorage,
    // otherwise the app-level gate would wrongly show the full-screen
    // sign-in prompt again (blocking the offline cache) every time a token
    // expires or the page reloads offline.
    unmount();
    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <EverSignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("ever-signed-in")).toHaveTextContent("true");
  });

  it("keeps a still-valid access token across a remount (e.g. a page reload), without a click", async () => {
    function SignedInProbe() {
      const { isSignedIn } = useAuth();
      return <span data-testid="signed-in">{String(isSignedIn)}</span>;
    }

    const { unmount } = render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignInButton />
        </GoogleAuthProvider>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByText("구글 로그인"));
    await waitFor(() => expect(sessionStorage.getItem("travel-app:token")).toContain("token-abc"));
    unmount();

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("signed-in")).toHaveTextContent("true");
  });

  it("treats an actually-expired persisted access token as signed-out", () => {
    sessionStorage.setItem(
      "travel-app:token",
      JSON.stringify({ accessToken: "stale-token", expiresAtMs: Date.now() - 1000 })
    );

    function SignedInProbe() {
      const { isSignedIn } = useAuth();
      return <span data-testid="signed-in">{String(isSignedIn)}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("signed-in")).toHaveTextContent("false");
  });

  it("silently mints a fresh access token from a stored refresh token, with no click", async () => {
    localStorage.setItem("travel-app:refresh-token", "refresh-token-abc");

    function SignedInProbe() {
      const { isSignedIn } = useAuth();
      return <span data-testid="signed-in">{String(isSignedIn)}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("signed-in")).toHaveTextContent("false");
    await waitFor(() => expect(screen.getByTestId("signed-in")).toHaveTextContent("true"));
  });

  it("clears a dead refresh token instead of retrying it forever, without a visible error", async () => {
    localStorage.setItem("travel-app:refresh-token", "dead-refresh-token");
    installFakeFetch({ refreshOk: false });

    function AuthProbe() {
      const { isSignedIn, error } = useAuth();
      return <span data-testid="auth-probe">{`${String(isSignedIn)}:${error ?? "none"}`}</span>;
    }

    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <AuthProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(localStorage.getItem("travel-app:refresh-token")).toBeNull());
    expect(screen.getByTestId("auth-probe")).toHaveTextContent("false:none");
  });
});
