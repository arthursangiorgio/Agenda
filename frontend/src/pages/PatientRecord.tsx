import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  fetchPatients, fetchPatientRecord, updatePatientRecord, 
  fetchClinicalNotes, createClinicalNote, deleteClinicalNote, 
  fetchTreatments, fetchPeriodontalCharts, createPeriodontalChart,
  fetchAttachments, createAttachment, deleteAttachment
} from '../api';
import { useToast } from '../context/ToastContext';
import { 
  ArrowLeft, AlertTriangle, FileText, Activity, Clock, Trash, 
  Save, User, Plus, Stethoscope, Printer, Paperclip, ClipboardList, Camera
} from 'lucide-react';

export default function PatientRecord() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'anamnesis' | 'evolution' | 'documents' | 'perio' | 'attachments'>('anamnesis');
  const [printingDoc, setPrintingDoc] = useState<any>(null);

  // Periodontal State
  const [perioData, setPerioData] = useState<any>({});

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

  const { data: perioCharts = [] } = useQuery({
    queryKey: ['perio', id],
    queryFn: () => fetchPeriodontalCharts(id!),
    enabled: !!id
  });

  const { data: attachments = [] } = useQuery({
    queryKey: ['attachments', id],
    queryFn: () => fetchAttachments(id!),
    enabled: !!id
  });

  // Mutations
  const createPerioMutation = useMutation({
    mutationFn: (data: any) => createPeriodontalChart(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['perio', id] });
      showToast('Ficha periodontal salva!');
    }
  });

  const uploadAttachmentMutation = useMutation({
    mutationFn: (data: any) => createAttachment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', id] });
      showToast('Anexo enviado com sucesso!');
    }
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: deleteAttachment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', id] });
      showToast('Anexo removido');
    }
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
      showToast('Anamnese salva com sucesso!');
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

  if (!patient) return (
    <div className="glass-panel" style={{ padding: '4rem', textAlign: 'center' }}>
      <p>Carregando dados do paciente...</p>
    </div>
  );

  return (
    <div className="animate-in" style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              <div><strong>CPF/RG:</strong> {patient.document || 'N/A'}</div>
              <div><strong>Nascimento:</strong> {patient.birthDate ? format(parseISO(patient.birthDate), 'dd/MM/yyyy') : 'N/A'}</div>
              <div><strong>Sexo:</strong> {patient.gender || 'N/A'}</div>
              <div><strong>Estado Civil:</strong> {patient.maritalStatus || 'N/A'}</div>
              <div style={{ gridColumn: '1 / -1' }}><strong>Endereço:</strong> {patient.address ? `${patient.address}, ${patient.city || ''} - ${patient.state || ''}` : 'Não informado'}</div>
            </div>
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
        <button 
          onClick={() => setActiveTab('documents')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
            backgroundColor: activeTab === 'documents' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'documents' ? 'white' : 'var(--text-main)',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={18} /> Documentos
        </button>
        <button 
          onClick={() => setActiveTab('perio')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
            backgroundColor: activeTab === 'perio' ? 'var(--secondary-color)' : 'transparent',
            color: activeTab === 'perio' ? 'white' : 'var(--text-main)',
            transition: 'all 0.2s'
          }}
        >
          <ClipboardList size={18} /> Periodontia
        </button>
        <button 
          onClick={() => setActiveTab('attachments')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', 
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontWeight: 600,
            backgroundColor: activeTab === 'attachments' ? 'var(--primary-color)' : 'transparent',
            color: activeTab === 'attachments' ? 'white' : 'var(--text-main)',
            transition: 'all 0.2s'
          }}
        >
          <Paperclip size={18} /> Radiografias/Fotos
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
              <button type="submit" className="btn btn-primary" disabled={updateRecordMutation.isPending}>
                <Save size={18} /> {updateRecordMutation.isPending ? 'Salvando...' : 'Salvar Anamnese'}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Nome do Dentista / Responsável</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      value={newNote.dentistName} 
                      onChange={e => setNewNote({...newNote, dentistName: e.target.value})} 
                    />
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Data</label>
                    <input type="text" className="input-control" value={new Date().toLocaleDateString()} disabled />
                  </div>
                </div>
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
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--secondary-color)' }} disabled={createNoteMutation.isPending}>
                  <Plus size={18} /> {createNoteMutation.isPending ? 'Salvando...' : 'Registrar Evolução'}
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

      {activeTab === 'documents' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Gerar Documento Digital</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setPrintingDoc({ type: 'Receita', content: 'PRESCRICAO:\n\n1. __________________\n2. __________________' })}>
                Nova Receita
              </button>
              <button className="btn btn-secondary" onClick={() => setPrintingDoc({ type: 'Atestado', content: `ATESTADO\n\nAtesto para os devidos fins que o(a) Sr(a) ${patient.name} esteve em atendimento odontológico nesta data.` })}>
                Novo Atestado
              </button>
            </div>
          </div>

          {printingDoc ? (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '2rem', backgroundColor: 'white' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <h4 style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary-color)' }}>{printingDoc.type} Digital</h4>
                <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setPrintingDoc(null)}>Fechar</button>
              </div>
              <textarea 
                className="input-control" 
                rows={12} 
                style={{ fontFamily: 'monospace', fontSize: '1rem', backgroundColor: '#fcfcfc', borderStyle: 'dashed' }}
                value={printingDoc.content}
                onChange={e => setPrintingDoc({...printingDoc, content: e.target.value})}
              />
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={18} /> Imprimir / Gerar PDF
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Escolha um modelo acima para começar a escrever.</p>
            </div>
          )}

          {/* Hidden Print Layout */}
          <div className="print-only-document">
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24pt', margin: 0 }}>AGENDA PRO - CLÍNICA ODONTOLÓGICA</h2>
              <p style={{ margin: '0.5rem 0' }}>Rua da Saúde, 123 - Centro | Tel: (11) 9999-9999</p>
            </div>
            <div style={{ marginBottom: '3rem' }}>
              <p style={{ textAlign: 'right' }}>{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              <h1 style={{ textAlign: 'center', fontSize: '20pt', textDecoration: 'underline', marginBottom: '2rem' }}>{printingDoc?.type.toUpperCase()}</h1>
              <p style={{ fontSize: '14pt', fontWeight: 700, marginBottom: '2rem' }}>PACIENTE: {patient.name}</p>
              <div style={{ whiteSpace: 'pre-wrap', fontSize: '12pt', lineHeight: 1.8, minHeight: '400px' }}>
                {printingDoc?.content}
              </div>
            </div>
            <div style={{ marginTop: '5rem', textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #000', width: '300px', margin: '0 auto', paddingTop: '0.5rem' }}>
                <p style={{ margin: 0 }}>Assinatura do Profissional</p>
                <p style={{ fontSize: '10pt', color: '#666' }}>CRO: _________</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'perio' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {perioCharts === undefined ? (
            <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
              <p>Ocorreu um erro ao carregar os dados de periodontia no servidor.</p>
            </div>
          ) : (
            <>
              <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Nova Sondagem Periodontal</h3>
              <button 
                className="btn btn-primary" 
                onClick={() => createPerioMutation.mutate(perioData)}
                disabled={createPerioMutation.isPending}
              >
                Salvar Medição
              </button>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
                    <th style={{ padding: '0.5rem', border: '1px solid white' }}>Dente</th>
                    {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(d => <th key={d} style={{ padding: '0.5rem', border: '1px solid white' }}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.05)' }}>PS (mm)</td>
                    {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(d => (
                      <td key={d} style={{ padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                        <input 
                          type="text" 
                          style={{ width: '30px', textAlign: 'center', border: 'none', background: 'transparent' }} 
                          placeholder="0"
                          onChange={e => setPerioData({...perioData, [d]: {...(perioData[d] || {}), ps: e.target.value}})}
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{ padding: '0.5rem', fontWeight: 700, backgroundColor: 'rgba(0,0,0,0.05)' }}>Sang.</td>
                    {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(d => (
                      <td key={d} style={{ padding: '0.25rem', border: '1px solid var(--border-color)' }}>
                        <input 
                          type="checkbox" 
                          onChange={e => setPerioData({...perioData, [d]: {...(perioData[d] || {}), ss: e.target.checked}})}
                        />
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>PS = Profundidade de Sondagem | Sang. = Sangramento à sondagem</p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Histórico de Sondagens</h3>
            {perioCharts.length === 0 ? <p>Nenhuma medição anterior.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {perioCharts.map((chart: any) => (
                  <div key={chart.id} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Exame realizado em: {new Date(chart.date).toLocaleDateString()}</span>
                    <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>Ver Detalhes</button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>
          )}
        </div>
      )}

      {activeTab === 'attachments' && (
        <div className="glass-panel" style={{ padding: '2rem' }}>
          {attachments === undefined ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p>Ocorreu um erro ao carregar os anexos no servidor.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>Radiografias e Fotos</h3>
            <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
              <Plus size={18} /> Adicionar Imagem
              <input 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      uploadAttachmentMutation.mutate({
                        fileName: file.name,
                        fileType: file.type,
                        url: reader.result, // Base64
                        category: 'Foto'
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          {attachments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Nenhuma imagem ou radiografia anexada ainda.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {attachments.map((file: any) => (
                <div key={file.id} className="glass-panel" style={{ padding: '0.5rem', position: 'relative' }}>
                  <img 
                    src={file.url} 
                    alt={file.fileName} 
                    style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px' }} 
                    onClick={() => window.open(file.url, '_blank')}
                  />
                  <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{file.fileName.substring(0, 15)}...</span>
                    <button 
                      onClick={() => { if(window.confirm('Excluir este anexo?')) deleteAttachmentMutation.mutate(file.id); }}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
