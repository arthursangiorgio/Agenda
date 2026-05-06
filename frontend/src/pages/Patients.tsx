import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, createPatient, deletePatient } from '../api';
import { Plus, Search, User, Trash } from 'lucide-react';

export default function Patients() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: patients = [], isLoading } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsModalOpen(false);
      setFormData({ name: '', phone: '', email: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Pacientes</h2>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Novo Paciente
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Search size={20} color="var(--text-muted)" />
        <input 
          type="text" 
          placeholder="Buscar paciente por nome..." 
          className="input-control" 
          style={{ flex: 1, border: 'none', boxShadow: 'none' }} 
        />
      </div>

      {isLoading ? (
        <p>Carregando pacientes...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {patients.map((patient: any) => (
            <div key={patient.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--border-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={24} color="var(--text-muted)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{patient.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Cadastrado em: {new Date(patient.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
                <p><strong>Telefone:</strong> {patient.phone || 'Não informado'}</p>
                <p><strong>Email:</strong> {patient.email || 'Não informado'}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => navigate(`/patients/${patient.id}/record`)}
                >
                  Ver Prontuário
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ padding: '0.5rem', color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => setPatientToDelete(patient.id)}
                  title="Excluir Paciente"
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Cadastrar Novo Paciente</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nome Completo</label>
                <input required type="text" className="input-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Telefone</label>
                <input type="text" className="input-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="input-group">
                <label>E-mail</label>
                <input type="email" className="input-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
                  {mutation.isLoading ? 'Salvando...' : 'Salvar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {patientToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash size={48} color="#ef4444" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Excluir Paciente</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Tem certeza que deseja apagar este paciente? <strong>Todos os tratamentos, agendamentos e prontuários vinculados a ele serão apagados permanentemente.</strong>
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setPatientToDelete(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" style={{ backgroundColor: '#ef4444', border: 'none' }} onClick={() => {
                deleteMutation.mutate(patientToDelete);
                setPatientToDelete(null);
              }}>
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
