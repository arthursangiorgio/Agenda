import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, fetchTreatments, createTreatment, updateTreatment, deleteTreatment, fetchCatalog, deleteAllAppointments } from '../api';
import { Plus, ChevronDown, Stethoscope, Activity, Trash, DollarSign, Clock, Edit, BookOpen, Printer } from 'lucide-react';
import { Tooth, FaceType, getToothRegionName } from '../components/Tooth';

interface ProcedureData {
  name: string;
  tooth: string;
  price: number;
  duration: number;
  color?: string;
}

const UPPER_TEETH = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_TEETH = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

export default function Treatments() {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [treatmentToDelete, setTreatmentToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (printingId) {
      document.body.classList.add('printing-mode');
      // Set a small timeout to allow CSS classes to apply before rendering print dialog
      const timer = setTimeout(() => {
        window.print();
      }, 100);
      return () => clearTimeout(timer);
    }
    
    const handleAfterPrint = () => {
      setPrintingId(null);
      document.body.classList.remove('printing-mode');
    };
    
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, [printingId]);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [procedures, setProcedures] = useState<ProcedureData[]>([
    { name: '', tooth: '', price: 0, duration: 30 }
  ]);

  const clearAppointmentsMutation = useMutation({
    mutationFn: deleteAllAppointments,
    onSuccess: (data) => {
      console.log('All appointments deleted', data);
      alert('Agenda limpa com sucesso!');
    },
    onError: (error) => {
      console.error('Failed to delete appointments', error);
      alert('Erro ao limpar a agenda');
    }
  });

  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({ 
    queryKey: ['patients'], 
    queryFn: fetchPatients 
  });

  const { data: treatments = [], isLoading: isLoadingTreatments } = useQuery({ 
    queryKey: ['treatments', selectedPatient], 
    queryFn: () => fetchTreatments(selectedPatient),
    enabled: !!selectedPatient
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog
  });

  const mutation = useMutation({
    mutationFn: createTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', selectedPatient] });
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      setProcedures([]);
      setSelectedTooth(null);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateTreatment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', selectedPatient] });
      setEditingTreatment(null);
    }
  });

  const deleteTreatmentMutation = useMutation({
    mutationFn: deleteTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments', selectedPatient] });
    }
  });

  const handleAddProcedure = () => setProcedures([...procedures, { name: '', tooth: '', price: 0, duration: 30 }]);
  
  const handleRemoveProcedure = (index: number) => {
    const newProcs = [...procedures];
    newProcs.splice(index, 1);
    setProcedures(newProcs);
  };

  const handleProcedureChange = (index: number, field: keyof ProcedureData, value: any) => {
    const newProcs = [...procedures];
    newProcs[index] = { ...newProcs[index], [field]: value };
    setProcedures(newProcs);
  };

  const handleAddToothProcedure = (catalogId: string) => {
    if (!catalogId || !selectedTooth) return;
    const item = catalog.find((c: any) => c.id === catalogId);
    if (item) {
      setProcedures([...procedures, { 
        name: item.name, 
        tooth: selectedTooth, 
        price: item.price, 
        duration: item.duration,
        color: item.color || '#3b82f6'
      }]);
      setSelectedTooth(null);
    }
  };

  const handleFaceClick = (num: number, face: FaceType) => {
    const id = `${num}-${face}`;
    setSelectedTooth(selectedTooth === id ? null : id);
  };

  const handleToothClick = (num: number) => {
    const id = num.toString();
    setSelectedTooth(selectedTooth === id ? null : id);
  };

  const renderTooth = (num: number) => {
    const numStr = num.toString();
    
    // Check if there's a general procedure for this tooth
    const generalProcs = procedures.filter(p => p.tooth === numStr);
    const hasGeneral = generalProcs.length > 0;
    const generalColor = hasGeneral && generalProcs[generalProcs.length - 1].color 
      ? generalProcs[generalProcs.length - 1].color 
      : undefined;

    // Calculate colors for faces
    const faces: FaceType[] = ['T', 'B', 'L', 'R', 'C'];
    const faceColors: Record<string, string> = {} as any;
    
    faces.forEach(face => {
      const faceId = `${num}-${face}`;
      const faceProcs = procedures.filter(p => p.tooth === faceId);
      if (faceProcs.length > 0 && faceProcs[faceProcs.length - 1].color) {
        faceColors[face] = faceProcs[faceProcs.length - 1].color as string;
      }
    });

    const activeFace = selectedTooth?.startsWith(`${num}-`) ? (selectedTooth.split('-')[1] as FaceType) : null;

    return (
      <Tooth
        key={num}
        number={num}
        faceColors={faceColors as Record<FaceType, string>}
        selectedFace={activeFace}
        onFaceClick={(face) => handleFaceClick(num, face)}
        hasGeneralProcedure={hasGeneral}
        generalColor={generalColor}
        isSelected={selectedTooth === numStr}
        onToothClick={() => handleToothClick(num)}
      />
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    mutation.mutate({
      name: formData.name,
      description: formData.description,
      patientId: selectedPatient,
      procedures: procedures.filter(p => p.name.trim() !== '')
    });
  };

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Planos de Tratamento</h2>
        {selectedPatient && (
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Novo Orçamento / Plano
          </button>
        )}
      </div>
      
      <button
        className="btn btn-secondary"
        style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}
        onClick={() => {
          if (window.confirm('Tem certeza que deseja apagar TODOS os agendamentos?')) {
            clearAppointmentsMutation.mutate();
          }
        }}
      >
        Limpar Agenda
      </button>

      <div className="glass-panel patient-selector" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div className="input-group" style={{ margin: 0 }}>
          <label>Selecione um Paciente para visualizar os tratamentos:</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select 
              className="input-control" 
              style={{ width: '100%', appearance: 'none' }}
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
            >
              <option value="">-- Buscar Paciente --</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={20} style={{ position: 'absolute', right: '1rem', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>
        </div>
      </div>

      {isLoadingPatients && <p>Carregando pacientes...</p>}
      {selectedPatient && isLoadingTreatments && <p>Carregando tratamentos...</p>}

      {selectedPatient && !isLoadingTreatments && treatments.length === 0 && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Stethoscope size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem' }}>Este paciente ainda não possui nenhum plano de tratamento.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Crie um novo orçamento para começar.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {treatments.map((treatment: any) => {
          const totalValue = treatment.procedures?.reduce((acc: number, curr: any) => acc + (curr.price || 0), 0) || 0;
          const completedCount = treatment.procedures?.filter((p:any) => p.isCompleted).length || 0;
          const totalProcs = treatment.procedures?.length || 0;
          const progress = totalProcs === 0 ? 0 : Math.round((completedCount / totalProcs) * 100);

          return (
            <div key={treatment.id} className={`glass-panel treatment-card ${printingId === treatment.id ? 'printing' : ''}`} style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.4)' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)' }}>{treatment.name}</h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem' }}>{treatment.description || 'Sem descrição adicional'}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.875rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontWeight: 500 }}>
                      <DollarSign size={16} color="var(--secondary-color)" /> Total: {formatCurrency(totalValue)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                      <Activity size={16} /> Progresso: {progress}% ({completedCount}/{totalProcs})
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => setPrintingId(treatment.id)}
                    >
                      <Printer size={14} /> Imprimir
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => setEditingTreatment(treatment)}
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}
                      onClick={() => setTreatmentToDelete(treatment.id)}
                      disabled={deleteTreatmentMutation.isLoading}
                    >
                      <Trash size={14} /> {deleteTreatmentMutation.isLoading ? '...' : 'Excluir'}
                    </button>
                  </div>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: treatment.status === 'ACTIVE' ? 'rgba(6, 182, 212, 0.1)' : 'var(--border-color)',
                    color: treatment.status === 'ACTIVE' ? 'var(--secondary-color)' : 'var(--text-muted)'
                  }}>
                    {treatment.status === 'ACTIVE' ? 'Em Andamento' : treatment.status}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Criado em: {new Date(treatment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div style={{ padding: '0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>Status</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>Procedimento</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>Dente/Região</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500 }}>Duração</th>
                      <th style={{ padding: '0.75rem 1.5rem', fontWeight: 500, textAlign: 'right' }}>Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {treatment.procedures?.map((proc: any, index: number) => (
                      <tr key={proc.id} style={{ borderBottom: index === treatment.procedures.length - 1 ? 'none' : '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ 
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '50%', 
                            backgroundColor: proc.isCompleted ? '#10B981' : 'transparent',
                            border: proc.isCompleted ? 'none' : '2px solid var(--border-color)',
                            color: 'white', fontSize: '0.75rem'
                          }}>
                            {proc.isCompleted && '✓'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500 }}>{proc.name}</td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{proc.tooth ? getToothRegionName(proc.tooth) : '-'}</td>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-muted)' }}>{proc.duration} min</td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 500 }}>{formatCurrency(proc.price || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '950px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Novo Plano de Tratamento</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Nome do Plano (ex: Reabilitação Oral, Limpeza)</label>
                  <input required type="text" className="input-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Descrição e Observações</label>
                  <textarea className="input-control" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              
              <div style={{ marginTop: '1.5rem', marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
                  <Stethoscope size={20} /> Odontograma Interativo
                </h4>
                
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '1.5rem', 
                  padding: '1.5rem 1rem', 
                  backgroundColor: 'rgba(255,255,255,0.5)', 
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  overflowX: 'auto',
                  width: '100%'
                }}>
                  <div style={{ display: 'flex', gap: '4px', paddingBottom: '1rem', borderBottom: '1px dashed var(--border-color)', minWidth: 'max-content' }}>
                    {UPPER_TEETH.map(renderTooth)}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', paddingTop: '1rem', minWidth: 'max-content' }}>
                    {LOWER_TEETH.map(renderTooth)}
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
                    Clique em um dente para adicionar um procedimento específico a ele.
                  </p>
                </div>

                {selectedTooth && (
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: 'var(--primary-color)' }}>
                        Adicionar ao {getToothRegionName(selectedTooth)}
                      </label>
                      <select 
                        className="input-control" 
                        onChange={(e) => handleAddToothProcedure(e.target.value)}
                        value=""
                      >
                        <option value="" disabled>-- Selecione o Procedimento do Catálogo --</option>
                        <optgroup label="Serviços">
                          {catalog.filter((c: any) => c.type === 'SERVICE').map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} - R$ {c.price.toFixed(2)}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Produtos">
                          {catalog.filter((c: any) => c.type === 'PRODUCT').map((c: any) => (
                            <option key={c.id} value={c.id}>{c.name} - R$ {c.price.toFixed(2)}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <button type="button" className="btn btn-secondary" onClick={() => setSelectedTooth(null)}>Cancelar</button>
                  </div>
                )}
                
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600 }}>Orçamento Atual</h4>
                    <button type="button" className="btn btn-secondary" onClick={handleAddProcedure} style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
                      <Plus size={16} /> Procedimento Geral (Sem dente)
                    </button>
                  </div>
                  
                  {procedures.length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 'var(--radius-md)' }}>
                      Nenhum procedimento adicionado ao orçamento ainda.<br/>Selecione um dente no odontograma ou adicione um procedimento geral.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {procedures.map((proc, index) => (
                        <div key={index} style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end' }}>
                            <div className="input-group" style={{ flex: '2 1 200px', margin: 0 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                Nome
                                {proc.color && proc.color !== 'transparent' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: proc.color }} title="Cor no Odontograma"></div>}
                              </label>
                              <input required type="text" className="input-control" placeholder="Ex: Restauração" value={proc.name} onChange={e => handleProcedureChange(index, 'name', e.target.value)} />
                            </div>
                            <div className="input-group" style={{ flex: '1 1 120px', margin: 0 }}>
                              <label>Dente/Região</label>
                              <input type="text" className="input-control" placeholder="Geral" value={proc.tooth ? getToothRegionName(proc.tooth) : ''} disabled />
                            </div>
                            <div className="input-group" style={{ flex: '1 1 100px', margin: 0 }}>
                              <label>Valor (R$)</label>
                              <input required type="number" min="0" step="0.01" className="input-control" value={proc.price} onChange={e => handleProcedureChange(index, 'price', parseFloat(e.target.value))} />
                            </div>
                            <div className="input-group" style={{ flex: '1 1 100px', margin: 0 }}>
                              <label>Tempo (min)</label>
                              <input required type="number" min="0" step="15" className="input-control" value={proc.duration} onChange={e => handleProcedureChange(index, 'duration', parseInt(e.target.value, 10))} />
                            </div>
                            <button type="button" onClick={() => handleRemoveProcedure(index)} style={{ flex: '0 0 auto', padding: '0.75rem', height: '42px', backgroundColor: 'transparent', border: '1px solid #ef4444', borderRadius: 'var(--radius-md)', color: '#ef4444', cursor: 'pointer' }}>
                              <Trash size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div style={{ marginTop: '1.5rem', textAlign: 'right', fontSize: '1.125rem', fontWeight: 600 }}>
                    Total Estimado: {formatCurrency(procedures.reduce((acc, curr) => acc + (curr.price || 0), 0))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isLoading}>
                  {mutation.isLoading ? 'Salvando...' : 'Salvar Plano de Tratamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingTreatment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Editar Tratamento</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: editingTreatment.id,
                data: {
                  name: editingTreatment.name,
                  description: editingTreatment.description,
                  status: editingTreatment.status
                }
              });
            }}>
              <div className="input-group">
                <label>Nome do Plano</label>
                <input required type="text" className="input-control" value={editingTreatment.name} onChange={e => setEditingTreatment({...editingTreatment, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Descrição</label>
                <textarea className="input-control" rows={2} value={editingTreatment.description || ''} onChange={e => setEditingTreatment({...editingTreatment, description: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input-control" value={editingTreatment.status} onChange={e => setEditingTreatment({...editingTreatment, status: e.target.value})}>
                  <option value="ACTIVE">Em Andamento</option>
                  <option value="COMPLETED">Concluído</option>
                  <option value="CANCELLED">Cancelado</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingTreatment(null)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={updateMutation.isLoading}>
                  {updateMutation.isLoading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {treatmentToDelete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', textAlign: 'center' }}>
            <Trash size={48} color="#ef4444" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Excluir Tratamento</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              Tem certeza que deseja apagar todo este tratamento e todos os seus procedimentos? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setTreatmentToDelete(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" style={{ backgroundColor: '#ef4444', border: 'none' }} onClick={() => {
                deleteTreatmentMutation.mutate(treatmentToDelete);
                setTreatmentToDelete(null);
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
