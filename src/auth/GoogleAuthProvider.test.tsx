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
  });

  afterEach(() => {
    delete window.google;
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
});
