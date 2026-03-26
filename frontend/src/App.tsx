import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useSyncStore } from './store/syncStore';
import { Wifi, WifiOff, LogOut } from 'lucide-react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserHome from './pages/UserHome';
import SurveyForm from './pages/SurveyForm';
import SyncStatus from './pages/SyncStatus';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: 'admin' | 'field_worker' }) => {
  const user = useAuthStore(state => state.user);
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) {
    return <Navigate to="/" />;
  }
  return children;
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuthStore();
  const { isOnline, pendingCount } = useSyncStore();

  return (
    <div className="app-container animate-fade-in">
      {user && (
        <nav className="navbar">
          <div className="navbar-content">
            <Link to="/" className="navbar-brand">
              <span style={{color: 'var(--primary)', fontSize: '1.5rem'}}>◆</span>
              SurveyApp
            </Link>
            
            <div className="navbar-links">
              {user.role === 'admin' ? (
                <>
                  <Link to="/" className="nav-link">Dashboard</Link>
                  <Link to="/sync" className="nav-link">Status</Link>
                </>
              ) : (
                <>
                  <Link to="/" className="nav-link">Forms</Link>
                  <Link to="/sync" className="nav-link">Sync</Link>
                </>
              )}
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isOnline ? (
                  <Wifi size={18} color="var(--accent-success)" />
                ) : (
                  <WifiOff size={18} color="var(--accent-danger)" />
                )}
                {!isOnline && pendingCount > 0 && (
                  <span className="badge badge-warning">{pendingCount} Pending</span>
                )}
              </div>
              
              <button 
                onClick={logout}
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem' }}
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          </div>
        </nav>
      )}
      
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default function App() {
  const setOnlineStatus = useSyncStore(state => state.setOnlineStatus);
  const user = useAuthStore(state => state.user);

  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnlineStatus]);

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={
            <ProtectedRoute>
              {user?.role === 'admin' ? <AdminDashboard /> : <UserHome />}
            </ProtectedRoute>
          } />
          <Route path="/form/:id" element={
            <ProtectedRoute role="field_worker">
              <SurveyForm />
            </ProtectedRoute>
          } />
          <Route path="/sync" element={
            <ProtectedRoute>
              <SyncStatus />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
