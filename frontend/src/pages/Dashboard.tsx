import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPatients, fetchAppointments, fetchAllTreatments } from '../api';
import { Users, Calendar, DollarSign, Activity, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { format, isToday, parseISO } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function Dashboard() {
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });
  const { data: treatments = [] } = useQuery({ queryKey: ['all-treatments'], queryFn: fetchAllTreatments });

  // Today's stats
  const todayAppointments = appointments.filter((app: any) => isToday(parseISO(app.startTime)));
  const completedToday = todayAppointments.filter((app: any) => app.status === 'COMPLETED');
  
  // Financial stats
  const allProcedures = treatments.flatMap((t: any) => t.procedures || []);
  const totalRevenue = allProcedures
    .filter((p: any) => p.isCompleted)
    .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);
    
  const pendingRevenue = allProcedures
    .filter((p: any) => !p.isCompleted)
    .reduce((acc: number, curr: any) => acc + (curr.price || 0), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const stats = [
    { label: 'Total de Pacientes', value: patients.length, icon: Users, color: '#4F46E5' },
    { label: 'Consultas Hoje', value: todayAppointments.length, icon: Calendar, color: '#10B981' },
    { label: 'Faturamento Total', value: formatCurrency(totalRevenue), icon: TrendingUp, color: '#8B5CF6' },
    { label: 'Valores Pendentes', value: formatCurrency(pendingRevenue), icon: DollarSign, color: '#F59E0B' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Painel de Controle</h2>
        <p style={{ color: 'var(--text-muted)' }}>{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ backgroundColor: `${stat.color}15`, color: stat.color, padding: '0.75rem', borderRadius: '12px' }}>
              <stat.icon size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
        {/* Today's Schedule */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} color="var(--primary-color)" /> Agenda de Hoje
            </h3>
            <span style={{ fontSize: '0.75rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
              {todayAppointments.length} horários
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {todayAppointments.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>Nenhum agendamento para hoje.</p>
            ) : (
              todayAppointments.map((app: any) => (
                <div key={app.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-color)', minWidth: '50px' }}>
                    {format(parseISO(app.startTime), 'HH:mm')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>{app.patient?.name}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{app.procedure?.name}</p>
                  </div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontWeight: 600,
                    backgroundColor: app.status === 'COMPLETED' ? '#ECFDF5' : app.status === 'CANCELLED' ? '#FEF2F2' : '#EEF2FF',
                    color: app.status === 'COMPLETED' ? '#10B981' : app.status === 'CANCELLED' ? '#EF4444' : '#4F46E5',
                  }}>
                    {app.status === 'COMPLETED' ? 'Concluído' : app.status === 'CANCELLED' ? 'Faltou' : 'Agendado'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Summary / Performance */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="var(--secondary-color)" /> Desempenho
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                <span>Conclusão de Consultas Hoje</span>
                <span style={{ fontWeight: 600 }}>{completedToday.length} / {todayAppointments.length}</span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${todayAppointments.length > 0 ? (completedToday.length / todayAppointments.length) * 100 : 0}%`, 
                  height: '100%', 
                  backgroundColor: '#10B981', 
                  transition: 'width 0.5s ease-out' 
                }}></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1.25rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle size={20} color="#10B981" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.75rem', color: '#065F46', marginBottom: '0.25rem' }}>Recebido (Total)</p>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#065F46' }}>{formatCurrency(totalRevenue)}</h4>
              </div>
              <div style={{ padding: '1.25rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
                <Clock size={20} color="#F59E0B" style={{ marginBottom: '0.5rem' }} />
                <p style={{ fontSize: '0.75rem', color: '#92400E', marginBottom: '0.25rem' }}>A Receber (Planos)</p>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 700, margin: 0, color: '#92400E' }}>{formatCurrency(pendingRevenue)}</h4>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', backgroundColor: 'rgba(79, 70, 229, 0.05)', border: '1px solid rgba(79, 70, 229, 0.1)' }}>
              <p style={{ fontSize: '0.875rem', margin: 0, color: 'var(--primary-color)', fontWeight: 500 }}>
                Total Geral em Carteira: <span style={{ fontWeight: 700, marginLeft: '0.5rem' }}>{formatCurrency(totalRevenue + pendingRevenue)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
