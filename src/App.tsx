import { useGoogleAuth } from "./hooks/useGoogleAuth";

function App() {
  const { signIn, isSignedIn } = useGoogleAuth(import.meta.env.VITE_GOOGLE_CLIENT_ID);
  return (
    <div>
      <button onClick={signIn}>구글 로그인</button>
      <p>{isSignedIn ? "로그인됨" : "로그인 안 됨"}</p>
    </div>
  );
}

export default App;
