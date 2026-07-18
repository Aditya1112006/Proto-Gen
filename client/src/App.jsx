import { Routes, Route, Navigate } from 'react-router-dom'
import { PrototypeProvider } from './context/PrototypeContext'
import { AuthProvider, useAuthContext } from './context/AuthContext'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout/Layout'
import LandingPage from './pages/LandingPage'
import PrototypeGenerator from './pages/PrototypeGenerator'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuthContext();
  if (loading) return <div className="min-h-screen bg-dark-950 flex items-center justify-center font-mono text-neon-green border border-neon-green">SYSTEM_LOADING...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  return (
    <AuthProvider>
      <PrototypeProvider>
        <Layout>
          <Toaster position="bottom-right" toastOptions={{ duration: 4000 }} />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/generator" element={<PrototypeGenerator />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Layout>
      </PrototypeProvider>
    </AuthProvider>
  )
}

export default App
