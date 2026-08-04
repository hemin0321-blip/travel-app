import { Outlet } from "react-router-dom";
import { BottomNav } from "./components/BottomNav";

function App() {
  return (
    <div className="app-shell">
      <Outlet />
      <BottomNav />
    </div>
  );
}

export default App;
