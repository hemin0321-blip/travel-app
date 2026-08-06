import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  let capturedCallback: ((resp: { access_token: string; expires_in: number }) => void) | null = null;
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          capturedCallback = config.callback;
          return {
            requestAccessToken: () => {
              capturedCallback?.({ access_token: "token-abc", expires_in: 3600 });
            },
          };
        },
      },
    },
  };
}

describe("GoogleAuthProvider", () => {
  beforeEach(() => {
    installFakeGis();
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    delete window.google;
    localStorage.clear();
    sessionStorage.clear();
  });

  it("shares one token with every consumer across the tree", () => {
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
    expect(screen.getByTestId("consumer-a")).toHaveTextContent("token-abc");
    expect(screen.getByTestId("consumer-b")).toHaveTextContent("token-abc");
  });

  it("reports isSignedIn to consumers only after a successful sign-in", () => {
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
    expect(screen.getByTestId("signed-in")).toHaveTextContent("true");
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

  it("throws when useAuth is used outside the provider", () => {
    expect(() => render(<TokenProbe name="orphan" />)).toThrow(/GoogleAuthProvider/);
  });

  it("remembers a past sign-in across a full remount (e.g. a page reload)", () => {
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
    expect(screen.getByTestId("ever-signed-in")).toHaveTextContent("true");

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

  it("keeps a still-valid token across a remount (e.g. a page reload), without a click", () => {
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
    unmount();

    // A reload remounts the whole tree and wipes in-memory state, but the
    // token (not just the "ever signed in" flag) should survive via
    // sessionStorage since it's still within its own lifetime — no popup
    // needed just because the page reloaded.
    render(
      <MemoryRouter>
        <GoogleAuthProvider clientId="test-client-id">
          <SignedInProbe />
        </GoogleAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("signed-in")).toHaveTextContent("true");
  });

  it("treats an actually-expired persisted token as signed-out", () => {
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
});
