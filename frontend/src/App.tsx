import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Calendar, Users, User, Stethoscope, LayoutDashboard, DollarSign, Settings as SettingsIcon, LogOut, ShieldCheck, FileText } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Patients from './pages/Patients';
import PatientRecord from './pages/PatientRecord';
import Treatments from './pages/Treatments';
import Agenda from './pages/Agenda';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import Financeiro from './pages/Financeiro';
import Dentists from './pages/Dentists';
import Settings from './pages/Settings';
import SuperAdmin from './pages/SuperAdmin';
import Budgets from './pages/Budgets';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import './index.css';

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppLayout() {
  const { logout, user } = useAuth();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <nav className="sidebar glass-panel" style={{ 
        width: '260px', 
        height: '100vh', 
        position: 'fixed', 
        left: 0, 
        top: 0, 
        borderRadius: 0, 
        borderTop: 0, 
        borderBottom: 0, 
        borderLeft: 0,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100
      }}>
        <div style={{ padding: '1.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'var(--primary-color)', width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <Stethoscope size={22} />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#1e293b' }}>AgendaPro</h1>
            <p style={{ fontSize: '0.7rem', color: '#64748b', margin: 0, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.companyName}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, padding: '0 1rem', overflowY: 'auto' }}>
          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink to="/agenda" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Calendar size={20} /> Agenda
          </NavLink>
          <NavLink to="/patients" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Users size={20} /> Pacientes
          </NavLink>
          <NavLink to="/treatments" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Stethoscope size={20} /> Tratamentos
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h7" /></svg>
            Catálogo
          </NavLink>
          <NavLink to="/financeiro" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <DollarSign size={20} /> Financeiro
          </NavLink>
          <NavLink to="/budgets" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <FileText size={20} /> CRM Orçamentos
          </NavLink>
          <NavLink to="/dentists" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <User size={20} /> Dentistas
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <SettingsIcon size={20} /> Configurações
          </NavLink>

          {user?.role === 'SUPER_ADMIN' && (
            <NavLink to="/super-admin" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`} style={{ marginTop: '1rem', background: '#f0fdf4', color: '#16a34a' }}>
              <ShieldCheck size={20} /> Painel Geral
            </NavLink>
          )}
        </div>

        <div style={{ padding: '1rem', borderTop: '1px solid #f1f5f9' }}>
          <button 
            onClick={logout}
            style={{ 
              width: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1rem', 
              borderRadius: '0.75rem', 
              color: '#ef4444', 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
            className="logout-btn"
          >
            <LogOut size={20} /> Sair
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main style={{ 
        flex: 1, 
        marginLeft: '260px', 
        padding: '2rem', 
        width: 'calc(100% - 260px)',
        minHeight: '100vh'
      }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/patients/:id/record" element={<PatientRecord />} />
          <Route path="/treatments" element={<Treatments />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/financeiro" element={<Financeiro />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/dentists" element={<Dentists />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              } />
            </Routes>
          </AuthProvider>
        </Router>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
