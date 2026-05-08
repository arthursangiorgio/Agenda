import React, { useState, useEffect } from 'react';
import { fetchAllTenants, deleteTenant } from '../api';
import { Building2, Users, Calendar, Trash2, ExternalLink, ShieldCheck, Search, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: {
    patients: number;
    appointments: number;
    users: number;
  };
  users: { name: string; email: string }[];
}

export default function SuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await fetchAllTenants();
      if (Array.isArray(data)) {
        setTenants(data);
      }
    } catch (err) {
      showToast('Erro ao carregar clínicas', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a clínica "${name}"? TODOS os dados dela serão apagados permanentemente.`)) {
      return;
    }

    try {
      await deleteTenant(id);
      showToast('Clínica excluída com sucesso', 'success');
      loadTenants();
    } catch (err) {
      showToast('Erro ao excluir clínica', 'error');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary-color)" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Painel Geral do Sistema</h1>
          <p style={{ color: '#64748b' }}>Gerencie todas as clínicas e acessos cadastrados no seu SaaS</p>
        </div>
        <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.5rem 1rem', borderRadius: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 700 }}>
          <ShieldCheck size={18} /> Modo Super Admin Ativo
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Total de Clínicas</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{tenants.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Pacientes Totais</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{tenants.reduce((acc, t) => acc + t._count.patients, 0)}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Agendamentos</div>
          <div style={{ fontSize: '2rem', fontWeight: 800 }}>{tenants.reduce((acc, t) => acc + t._count.appointments, 0)}</div>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
        <input
          type="text"
          placeholder="Buscar por nome ou slug da clínica..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '0.75rem 1rem 0.75rem 2.5rem', 
            borderRadius: '0.75rem', 
            border: '1px solid #e2e8f0', 
            outline: 'none',
            fontSize: '1rem'
          }}
        />
      </div>

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Clínica</th>
              <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Admin</th>
              <th style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Dados</th>
              <th style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Criação</th>
              <th style={{ textAlign: 'right', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{tenant.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>slug: {tenant.slug}</div>
                </td>
                <td style={{ padding: '1rem' }}>
                  {tenant.users[0] ? (
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{tenant.users[0].name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Mail size={12} /> {tenant.users[0].email}
                      </div>
                    </div>
                  ) : '-'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <span title="Pacientes" style={{ background: '#eef2ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {tenant._count.patients}P
                    </span>
                    <span title="Agendamentos" style={{ background: '#ecfdf5', color: '#059669', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {tenant._count.appointments}A
                    </span>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                  {new Date(tenant.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button 
                    onClick={() => handleDelete(tenant.id, tenant.name)}
                    style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                    title="Excluir Clínica"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTenants.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
            <p>Nenhuma clínica encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
