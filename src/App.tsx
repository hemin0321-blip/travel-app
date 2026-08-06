import { Outlet } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";
import { ErrorBanner } from "./components/ErrorBanner";
import { GoogleAuthProvider } from "./auth/GoogleAuthProvider";
import { useAuth } from "./auth/GoogleAuthContext";

/**
 * First-run sign-in gate. Only shown before this device has ever completed a
 * sign-in. Once signed in at least once, we never block the whole app behind
 * this again — a later missing/expired token (offline, or the hourly token
 * expiring) is handled per-screen instead, so the offline itinerary cache and
 * an in-progress form stay visible instead of vanishing behind a login screen
 * the user may not even be able to submit (e.g. while offline).
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
  const { isSignedIn, hasEverSignedIn } = useAuth();

  if (!isSignedIn && !hasEverSignedIn) return <SignInGate />;

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
