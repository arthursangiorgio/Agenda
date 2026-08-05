import React, { useState, useEffect } from 'react';
import { fetchAllTenants, deleteTenant, fetchSystemSettings, updateSystemSettings, updateTenantLicense, fetchAdminPayments } from '../api';
import { Trash2, ShieldCheck, Search, Mail, AlertCircle, Loader2, DollarSign, Clock, Settings, Calendar, Edit2, Check, X, TrendingUp, Receipt } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface ProcessedPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  amount: number;
  createdAt: string;
}


interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  licenseExpiresAt: string;
  _count: {
    patients: number;
    appointments: number;
    users: number;
  };
  users: { name: string; email: string }[];
}


export default function SuperAdmin() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [payments, setPayments] = useState<ProcessedPayment[]>([]);
  const [activeTab, setActiveTab] = useState<'clinics' | 'financial'>('clinics');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState({ subscriptionPrice: 99.90, subscriptionDays: 30, adminNotificationEmail: 'arthursangiorgio@gmail.com', adminNotificationPhone: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const { showToast } = useToast();

  const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string>('');
  const [savingLicense, setSavingLicense] = useState(false);

  const handleStartEditLicense = (tenant: Tenant) => {
    setEditingTenantId(tenant.id);
    const dateObj = new Date(tenant.licenseExpiresAt);
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
    const dd = String(dateObj.getDate()).padStart(2, '0');
    setEditingDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleSaveLicense = async (tenantId: string) => {
    setSavingLicense(true);
    try {
      const isoDateString = new Date(`${editingDate}T23:59:59`).toISOString();
      const res = await updateTenantLicense(tenantId, isoDateString);
      if (res && res.success) {
        showToast('Licença da clínica atualizada com sucesso!', 'success');
        setTenants(prev => prev.map(t => {
          if (t.id === tenantId) {
            return { ...t, licenseExpiresAt: isoDateString };
          }
          return t;
        }));
        setEditingTenantId(null);
      } else {
        showToast('Erro ao atualizar licença.', 'error');
      }
    } catch (err) {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setSavingLicense(false);
    }
  };


  useEffect(() => {
    loadTenants();
    loadSettings();
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      const data = await fetchAdminPayments();
      if (Array.isArray(data)) {
        setPayments(data);
      }
    } catch (err) {
      console.error('Erro ao carregar pagamentos:', err);
    }
  };


  const loadSettings = async () => {
    try {
      const data = await fetchSystemSettings();
      if (data && !data.error) {
        setSettings({
          subscriptionPrice: data.subscriptionPrice,
          subscriptionDays: data.subscriptionDays,
          adminNotificationEmail: data.adminNotificationEmail || 'arthursangiorgio@gmail.com',
          adminNotificationPhone: data.adminNotificationPhone || ''
        });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await updateSystemSettings(settings);
      if (res && res.success) {
        showToast('Configurações salvas com sucesso!', 'success');
      } else {
        showToast('Erro ao salvar configurações.', 'error');
      }
    } catch (err) {
      showToast('Falha ao se conectar com o servidor.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

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

  const filteredPayments = payments.filter(p =>
    p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
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

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem', 
        borderBottom: '1px solid #e2e8f0', 
        paddingBottom: '0.5rem' 
      }}>
        <button
          onClick={() => { setActiveTab('clinics'); setSearchTerm(''); }}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'clinics' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'clinics' ? 'var(--primary-color)' : '#64748b',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Settings size={18} />
          Gerenciamento de Clínicas
        </button>
        <button
          onClick={() => { setActiveTab('financial'); setSearchTerm(''); }}
          style={{
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'financial' ? '3px solid var(--primary-color)' : '3px solid transparent',
            color: activeTab === 'financial' ? 'var(--primary-color)' : '#64748b',
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <TrendingUp size={18} />
          Histórico Financeiro
        </button>
      </div>

      {activeTab === 'clinics' ? (
        <>
          {/* General Stats */}
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

          {/* Dynamic Billing Settings Card */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <Settings size={22} color="var(--primary-color)" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>Parâmetros de Cobrança e Licenciamento</h2>
            </div>
            <form onSubmit={handleSaveSettings} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <DollarSign size={16} /> Valor da Mensalidade (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={settings.subscriptionPrice}
                  onChange={(e) => setSettings({ ...settings, subscriptionPrice: parseFloat(e.target.value) || 0 })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={16} /> Validade do Acesso (dias)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={settings.subscriptionDays}
                  onChange={(e) => setSettings({ ...settings, subscriptionDays: parseInt(e.target.value, 10) || 0 })}
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Mail size={16} /> E-mail de Notificação
                </label>
                <input
                  type="email"
                  value={settings.adminNotificationEmail}
                  onChange={(e) => setSettings({ ...settings, adminNotificationEmail: e.target.value })}
                  placeholder="Seu e-mail para avisos"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <AlertCircle size={16} /> WhatsApp p/ Avisos (Apenas números)
                </label>
                <input
                  type="text"
                  value={settings.adminNotificationPhone}
                  onChange={(e) => setSettings({ ...settings, adminNotificationPhone: e.target.value })}
                  placeholder="Ex: 5511999999999"
                  style={{
                    padding: '0.75rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #e2e8f0',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: '#0f172a'
                  }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    height: '46px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: '0.95rem'
                  }}
                >
                  {savingSettings ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    'Salvar Configurações Master'
                  )}
                </button>
              </div>
            </form>
          </div>
        </>
      ) : (
        <>
          {/* Financial Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#ecfdf5', color: '#059669', padding: '0.75rem', borderRadius: '12px' }}>
                <DollarSign size={24} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Faturamento Total</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>
                  R$ {payments.reduce((acc, p) => acc + p.amount, 0).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.75rem', borderRadius: '12px' }}>
                <Receipt size={24} />
              </div>
              <div>
                <div style={{ color: '#64748b', fontSize: '0.875rem', fontWeight: 600 }}>Licenças Pagas</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                  {payments.length}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Search Bar (Shared) */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
        <input
          type="text"
          placeholder={activeTab === 'clinics' ? "Buscar por nome ou slug da clínica..." : "Buscar por nome da clínica ou ID da transação..."}
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

      {/* Data Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        {activeTab === 'clinics' ? (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Clínica</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Admin</th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Dados</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Licença</th>
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
                    <td style={{ padding: '1rem' }}>
                      {editingTenantId === tenant.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input 
                            type="date" 
                            value={editingDate} 
                            onChange={(e) => setEditingDate(e.target.value)}
                            style={{
                              padding: '0.35rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.875rem',
                              outline: 'none',
                              backgroundColor: '#ffffff',
                              color: '#0f172a'
                            }}
                          />
                          <button 
                            onClick={() => handleSaveLicense(tenant.id)}
                            disabled={savingLicense}
                            style={{ background: '#22c55e', border: 'none', color: 'white', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Salvar"
                          >
                            {savingLicense ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />}
                          </button>
                          <button 
                            onClick={() => setEditingTenantId(null)}
                            disabled={savingLicense}
                            style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', padding: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            title="Cancelar"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        (() => {
                          const isExpired = new Date(tenant.licenseExpiresAt) < new Date();
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ 
                                  background: isExpired ? '#fef2f2' : '#f0fdf4', 
                                  color: isExpired ? '#ef4444' : '#16a34a', 
                                  padding: '2px 8px', 
                                  borderRadius: '9999px', 
                                  fontSize: '0.75rem', 
                                  fontWeight: 700 
                                }}>
                                  {isExpired ? 'Expirada' : 'Ativa'}
                                </span>
                                <button 
                                  onClick={() => handleStartEditLicense(tenant)}
                                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                  title="Editar Vencimento"
                                >
                                  <Edit2 size={14} />
                                </button>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '2px' }}>
                                <Calendar size={12} />
                                {new Date(tenant.licenseExpiresAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                          );
                        })()
                      )}
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
          </>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Data do Pagamento</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Clínica</th>
                  <th style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontWeight: 600 }}>Valor Pago</th>
                  <th style={{ textAlign: 'left', padding: '1rem', color: '#64748b', fontWeight: 600 }}>ID da Transação (Asaas)</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={14} style={{ color: '#94a3b8' }} />
                        {new Date(payment.createdAt).toLocaleString('pt-BR')}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      {payment.tenantName}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 800, color: '#10b981' }}>
                      R$ {payment.amount.toFixed(2).replace('.', ',')}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                      <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#475569' }}>
                        {payment.id}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPayments.length === 0 && (
              <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
                <AlertCircle size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                <p>Nenhum pagamento registrado.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

