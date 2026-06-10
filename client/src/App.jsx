import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavBar from './components/NavBar';
import Scanner from './pages/Scanner';
import Collection from './pages/Collection';
import Agent from './pages/Agent';
import Auth from './pages/Auth';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { session } = useAuth();

  // Still checking for an existing session — show blank to avoid flash
  if (session === undefined) {
    return <div style={{ backgroundColor: '#0f0d0a', height: '100vh' }} />;
  }

  // Not logged in — show the auth page for any URL
  if (!session) {
    return <Auth />;
  }

  // Logged in — show the full app
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Scanner />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
