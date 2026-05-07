import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, createPatient, updatePatient, deletePatient, sendWhatsAppMessage } from '../api';
import { Plus, Search, User, Trash, MessageSquare } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Patients() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { data: patients = [], isLoading } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({ 
    name: '', phone: '', email: '', 
    dentalPlan: '', planNumber: '',
    document: '', birthDate: '', gender: '', maritalStatus: '',
    address: '', city: '', state: '', zipCode: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPatients = patients.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.phone && p.phone.includes(searchTerm)) ||
    (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const mutation = useMutation({
    mutationFn: createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsModalOpen(false);
      setFormData({ 
        name: '', phone: '', email: '', 
        dentalPlan: '', planNumber: '',
        document: '', birthDate: '', gender: '', maritalStatus: '',
        address: '', city: '', state: '', zipCode: ''
      });
      showToast('Paciente cadastrado!');
    },
    onError: () => showToast('Erro ao cadastrar.', 'error')
  });

  const deleteMutation = useMutation({
    mutationFn: deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ 
        name: '', phone: '', email: '', 
        dentalPlan: '', planNumber: '',
        document: '', birthDate: '', gender: '', maritalStatus: '',
        address: '', city: '', state: '', zipCode: ''
      });
      showToast('Dados atualizados!');
    },
    onError: () => showToast('Erro ao atualizar.', 'error')
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) => sendWhatsAppMessage(phone, message),
    onSuccess: () => showToast('Mensagem enviada!'),
    onError: (error: any) => showToast(error.message || 'Erro ao enviar. O WhatsApp está conectado?', 'error')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      mutation.mutate(formData);
    }
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
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, border: 'none', boxShadow: 'none' }} 
        />
      </div>

      {isLoading ? (
        <p>Carregando pacientes...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {filteredPatients.map((patient: any) => (
            <div key={patient.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-color)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{patient.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>CPF/RG: {patient.document || 'Não informado'}</p>
                </div>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <p style={{ margin: 0 }}><strong>Telefone:</strong> {patient.phone || 'N/A'}</p>
                <p style={{ margin: 0 }}><strong>Email:</strong> {patient.email || 'N/A'}</p>
                {patient.dentalPlan && (
                  <p style={{ margin: 0, color: 'var(--primary-color)', fontWeight: 600 }}>
                    <strong>Plano:</strong> {patient.dentalPlan} {patient.planNumber ? `(${patient.planNumber})` : ''}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => navigate(`/patients/${patient.id}/record`)}
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  Ver Prontuário
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ color: 'var(--primary-color)' }}
                  onClick={() => {
                    setEditingId(patient.id);
                    setFormData({
                      name: patient.name || '',
                      phone: patient.phone || '',
                      email: patient.email || '',
                      dentalPlan: patient.dentalPlan || '',
                      planNumber: patient.planNumber || '',
                      document: patient.document || '',
                      birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
                      gender: patient.gender || '',
                      maritalStatus: patient.maritalStatus || '',
                      address: patient.address || '',
                      city: patient.city || '',
                      state: patient.state || '',
                      zipCode: patient.zipCode || ''
                    });
                    setIsModalOpen(true);
                  }}
                >
                  Editar
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.2)' }}
                  onClick={() => {
                    if (!patient.phone) return showToast('Paciente sem telefone!', 'error');
                    const cleanPhone = patient.phone.replace(/\D/g, '');
                    sendWhatsAppMutation.mutate({ phone: cleanPhone, message: `Olá ${patient.name}!` });
                  }}
                  disabled={sendWhatsAppMutation.isPending}
                  title={sendWhatsAppMutation.isPending ? 'Enviando...' : 'Enviar Mensagem'}
                >
                  <MessageSquare size={18} />
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  onClick={() => { if(window.confirm('Excluir paciente e todo o seu histórico?')) deleteMutation.mutate(patient.id); }}
                >
                  <Trash size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '2rem', margin: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {editingId ? 'Editar Paciente' : 'Cadastrar Novo Paciente'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nome Completo</label>
                  <input required type="text" className="input-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>CPF / RG</label>
                  <input type="text" className="input-control" value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Data de Nascimento</label>
                  <input type="date" className="input-control" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Sexo</label>
                  <select className="input-control" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Estado Civil</label>
                  <select className="input-control" value={formData.maritalStatus} onChange={e => setFormData({...formData, maritalStatus: e.target.value})}>
                    <option value="">Selecione</option>
                    <option value="Solteiro">Solteiro(a)</option>
                    <option value="Casado">Casado(a)</option>
                    <option value="Divorciado">Divorciado(a)</option>
                    <option value="Viúvo">Viúvo(a)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Telefone</label>
                  <input type="text" className="input-control" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>

              <div className="input-group">
                <label>E-mail</label>
                <input type="email" className="input-control" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div style={{ borderTop: '1px solid #eee', marginTop: '1rem', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Endereço</h4>
                <div className="input-group">
                  <label>Rua, Número, Bairro</label>
                  <input type="text" className="input-control" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
                  <div className="input-group">
                    <label>Cidade</label>
                    <input type="text" className="input-control" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>Estado</label>
                    <input type="text" className="input-control" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} maxLength={2} placeholder="UF" />
                  </div>
                  <div className="input-group">
                    <label>CEP</label>
                    <input type="text" className="input-control" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #eee', marginTop: '1rem', paddingTop: '1rem' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Convênio</h4>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Plano / Convênio</label>
                    <select className="input-control" value={formData.dentalPlan} onChange={e => setFormData({...formData, dentalPlan: e.target.value})}>
                      <option value="">Particular</option>
                      <option value="UNIMED">UNIMED</option>
                      <option value="OdontoPrev">OdontoPrev</option>
                      <option value="Amil Dental">Amil Dental</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Número da Carteirinha</label>
                    <input type="text" className="input-control" value={formData.planNumber} onChange={e => setFormData({...formData, planNumber: e.target.value})} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending || updateMutation.isPending}>
                  {editingId ? (updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações') : (mutation.isPending ? 'Cadastrando...' : 'Cadastrar Paciente')}
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
