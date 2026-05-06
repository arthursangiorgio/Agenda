import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, fetchPatientRecord, updatePatientRecord, fetchClinicalNotes, createClinicalNote, deleteClinicalNote, fetchTreatments } from '../api';
import { ArrowLeft, AlertTriangle, FileText, Activity, Clock, Trash, Save, User, Plus, Stethoscope } from 'lucide-react';

export default function PatientRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'anamnesis' | 'evolution'>('anamnesis');

  // Queries
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const patient = patients.find((p: any) => p.id === id);

  const { data: record, isLoading: loadingRecord } = useQuery({
    queryKey: ['patientRecord', id],
    queryFn: () => fetchPatientRecord(id!),
    enabled: !!id
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['clinicalNotes', id],
    queryFn: () => fetchClinicalNotes(id!),
    enabled: !!id
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments', id],
    queryFn: () => fetchTreatments(id!),
    enabled: !!id
  });

  // State for Anamnesis Form
  const [recordForm, setRecordForm] = useState({
    medicalAlerts: '',
    healthHistory: '',
    allergies: '',
    medications: ''
  });

  // Effect to populate form when record loads
  React.useEffect(() => {
    if (record) {
      setRecordForm({
        medicalAlerts: record.medicalAlerts || '',
        healthHistory: record.healthHistory || '',
        allergies: record.allergies || '',
        medications: record.medications || ''
      });
    }
  }, [record]);

  // State for New Clinical Note
  const [newNote, setNewNote] = useState({ description: '', dentistName: 'Dr. Admin' });

  // Mutations
  const updateRecordMutation = useMutation({
    mutationFn: (data: any) => updatePatientRecord(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientRecord', id] });
      alert('Anamnese salva com sucesso!');
    }
  });

  const createNoteMutation = useMutation({
    mutationFn: (data: any) => createClinicalNote(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicalNotes', id] });
      setNewNote({ ...newNote, description: '' });
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteClinicalNote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicalNotes', id] });
    }
  });

  if (!patient) return <div className="page-container"><p>Carregando paciente...</p></div>;

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header Profile */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button onClick={() => navigate('/patients')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
          <ArrowLeft size={16} /> Voltar para Pacientes
        </button>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
          <div style={{ background: 'var(--primary-color)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
            <User size={40} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: 0 }}>{patient.name}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
              Telefone: {patient.phone || 'N/A'} | Email: {patient.email || 'N/A'} | Cadastrado em: {new Date(patient.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {record?.medicalAlerts && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fef2f2', borderLeft: '4px solid #ef4444', borderRadius: '0 0.5rem 0.5rem 0', display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <AlertTriangle color="#ef4444" size={24} />
            <div>
              <h4 style={{ color: '#ef4444', fontWeight: 700, margin: 0 }}>ALERTA MÉDICO</h4>
              <p style={{ color: '#b91c1c', margin: 0, marginTop: '0.25rem', fontWeight: 500 }}>{record.medicalAlerts}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
        <button 
          onClick={() => setActiveTab('anamnesis')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
            backgroundColor: activeTab === 'anamnesis' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'anamnesis' ? 'white' : 'var(--text-main)',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} /> Anamnese
        </button>
        <button 
          onClick={() => setActiveTab('evolution')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
            backgroundColor: activeTab === 'evolution' ? 'var(--secondary-color)' : 'transparent',
            color: activeTab === 'evolution' ? 'white' : 'var(--text-main)',
            transition: 'all 0.2s'
          }}
        >
          <Activity size={18} /> Evolução Clínica
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'anamnesis' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={20} className="text-primary" /> Questionário de Saúde
          </h3>
          
          <form onSubmit={(e) => { e.preventDefault(); updateRecordMutation.mutate(recordForm); }}>
            <div className="input-group">
              <label style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ Alertas Médicos Críticos (Aparecerá em destaque)</label>
              <input 
                type="text" 
                className="input-control" 
                placeholder="Ex: Alergia a Penicilina, Diabético, Hipertenso..." 
                value={recordForm.medicalAlerts} 
                onChange={e => setRecordForm({...recordForm, medicalAlerts: e.target.value})} 
                style={{ borderColor: recordForm.medicalAlerts ? '#ef4444' : 'var(--border-color)' }}
              />
            </div>
            
            <div className="input-group">
              <label>Alergias Conhecidas</label>
              <textarea className="input-control" rows={2} value={recordForm.allergies} onChange={e => setRecordForm({...recordForm, allergies: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Medicações em Uso Contínuo</label>
              <textarea className="input-control" rows={2} value={recordForm.medications} onChange={e => setRecordForm({...recordForm, medications: e.target.value})} />
            </div>

            <div className="input-group">
              <label>Histórico Médico Adicional (Doenças preexistentes, cirurgias, etc)</label>
              <textarea className="input-control" rows={4} value={recordForm.healthHistory} onChange={e => setRecordForm({...recordForm, healthHistory: e.target.value})} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button type="submit" className="btn btn-primary" disabled={updateRecordMutation.isLoading}>
                <Save size={18} /> {updateRecordMutation.isLoading ? 'Salvando...' : 'Salvar Anamnese'}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'evolution' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Nova Evolução */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Adicionar Nova Evolução</h3>
              <form onSubmit={(e) => { e.preventDefault(); createNoteMutation.mutate(newNote); }}>
                <div className="input-group">
                  <label>Descrição do Procedimento / Anotação Clínica</label>
                  <textarea 
                    required 
                    className="input-control" 
                    rows={4} 
                    placeholder="Descreva o que foi realizado hoje..." 
                    value={newNote.description} 
                    onChange={e => setNewNote({...newNote, description: e.target.value})} 
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--secondary-color)' }} disabled={createNoteMutation.isLoading}>
                    <Plus size={18} /> {createNoteMutation.isLoading ? 'Salvando...' : 'Registrar Evolução'}
                  </button>
                </div>
              </form>
            </div>

            {/* Linha do Tempo */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} className="text-secondary" /> Histórico Clínico
              </h3>

              {loadingNotes ? (
                <p>Carregando histórico...</p>
              ) : notes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>Nenhuma evolução registrada para este paciente ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '15px', top: 0, bottom: 0, width: '2px', backgroundColor: 'var(--border-color)', zIndex: 0 }}></div>
                  
                  {notes.map((note: any) => (
                    <div key={note.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', zIndex: 1 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '4px solid white' }}>
                        <Activity size={14} color="white" />
                      </div>
                      <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.5)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                          <div>
                            <p style={{ fontWeight: 600, margin: 0 }}>{new Date(note.date).toLocaleDateString()} às {new Date(note.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, marginTop: '0.25rem' }}>Dentista: {note.dentistName || 'Não especificado'}</p>
                          </div>
                          <button 
                            onClick={() => { if(window.confirm('Excluir esta anotação?')) deleteNoteMutation.mutate(note.id); }} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem' }}
                          >
                            <Trash size={16} />
                          </button>
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-main)' }}>
                          {note.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar: Plano de Tratamento */}
          <div className="glass-panel" style={{ padding: '1.5rem', position: 'sticky', top: '2rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Stethoscope size={18} className="text-primary" /> Tratamento Atual
            </h3>
            
            {treatments.length === 0 ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nenhum plano de tratamento ativo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {treatments.map((t: any) => (
                  <div key={t.id}>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem' }}>
                      {t.name}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {t.procedures?.map((p: any) => (
                        <div key={p.id} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem', backgroundColor: p.isCompleted ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0,0,0,0.02)', borderRadius: '4px' }}>
                          <div style={{ 
                            marginTop: '2px', width: '12px', height: '12px', borderRadius: '50%', 
                            backgroundColor: p.isCompleted ? '#10B981' : 'transparent',
                            border: p.isCompleted ? 'none' : '1px solid var(--border-color)',
                            flexShrink: 0
                          }}></div>
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontWeight: 600, color: p.isCompleted ? '#065F46' : 'var(--text-main)' }}>{p.name}</p>
                            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.7rem' }}>{p.tooth ? `Região: ${p.tooth}` : 'Geral'}</p>
                            {p.isCompleted && (
                              <button 
                                onClick={() => {
                                  const text = `Realizado: ${p.name}${p.tooth ? ` no dente/região ${p.tooth}` : ''}.`;
                                  setNewNote(prev => ({ ...prev, description: prev.description ? prev.description + '\n' + text : text }));
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', padding: 0, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem', textDecoration: 'underline' }}
                              >
                                Adicionar à nota
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
