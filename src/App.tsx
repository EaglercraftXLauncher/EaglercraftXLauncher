import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import BrowserPage from "./pages/BrowserPage";
import ProfilePage from "./pages/ProfilePage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AuthPage from "./pages/AuthPage";

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="page">
        <Topbar />
        <div className="page-content">
          <Routes>
            <Route path="/" element={<Navigate to="/clients" replace />} />
            <Route path="/clients" element={<BrowserPage type="client" />} />
            <Route path="/mods"    element={<BrowserPage type="mod" />} />
            <Route path="/skins"   element={<BrowserPage type="skin" />} />
            <Route path="/profile/:uid" element={<ProfilePage />} />
            <Route path="/login"        element={<AuthPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/error"    element={<AuthErrorPage />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
