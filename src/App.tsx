import { Outlet } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { ErrorBanner } from "./components/ErrorBanner";
import { GoogleAuthProvider } from "./auth/GoogleAuthProvider";
import { useAuth } from "./auth/GoogleAuthContext";

/**
 * App-level signed-out gate. It runs for every route, so reloading directly on a
 * deep route (e.g. /trips/abc123/today) offers a way back in instead of showing
 * an empty screen.
 */
function SignInGate() {
  const { signIn, isGoogleReady, error } = useAuth();
  return (
    <div className="signin-gate">
      {error && <ErrorBanner message={error} />}
      <button type="button" onClick={signIn} disabled={!isGoogleReady}>
        {isGoogleReady ? "구글 로그인" : "로딩 중..."}
      </button>
    </div>
  );
}

function AppShell() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) return <SignInGate />;

  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  );
}

function App() {
  return (
    <GoogleAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AppShell />
    </GoogleAuthProvider>
  );
}

export default App;
