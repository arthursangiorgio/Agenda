import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { Calendar, Users, Stethoscope, LayoutDashboard } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Patients from './pages/Patients';
import PatientRecord from './pages/PatientRecord';
import Treatments from './pages/Treatments';
import Agenda from './pages/Agenda';
import Catalog from './pages/Catalog';
import Dashboard from './pages/Dashboard';
import './index.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app-container">
          {/* Sidebar */}
          <nav className="sidebar glass-panel" style={{borderRadius: 0, borderTop: 0, borderBottom: 0, borderLeft: 0}}>
            <div style={{marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <div style={{background: 'var(--primary-color)', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'}}>
                <Stethoscope size={20} />
              </div>
              <h1 style={{fontSize: '1.25rem', fontWeight: 700}}>AgendaPro</h1>
            </div>
            
            <NavLink to="/" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              Dashboard
            </NavLink>
            <NavLink to="/agenda" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Calendar size={20} />
              Agenda
            </NavLink>
            <NavLink to="/patients" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Users size={20} />
              Pacientes
            </NavLink>
            <NavLink to="/treatments" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <Stethoscope size={20} />
              Tratamentos
            </NavLink>
            <NavLink to="/catalog" className={({isActive}) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h7"/></svg>
              Catálogo
            </NavLink>
          </nav>

          {/* Main Content */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agenda" element={<Agenda />} />
              <Route path="/patients" element={<Patients />} />
              <Route path="/patients/:id/record" element={<PatientRecord />} />
              <Route path="/treatments" element={<Treatments />} />
              <Route path="/catalog" element={<Catalog />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
