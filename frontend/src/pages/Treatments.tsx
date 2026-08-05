import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, fetchTreatments, fetchAllTreatments, createTreatment, updateTreatment, deleteTreatment, fetchCatalog, deleteAllAppointments, payTransaction, refundTransaction } from '../api';
import { Plus, ChevronDown, ChevronUp, Stethoscope, Activity, Trash, DollarSign, Clock, Edit, BookOpen, Printer, Search, Filter, CheckCircle2, RotateCcw } from 'lucide-react';
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
  const [selectedPatient, setSelectedPatient] = useState(''); // Utilizado apenas no modal de Novo Orçamento
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTreatment, setEditingTreatment] = useState<any>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<string | null>(null);
  const [treatmentToDelete, setTreatmentToDelete] = useState<string | null>(null);
  const [expandedTreatments, setExpandedTreatments] = useState<Record<string, boolean>>({});

  const toggleTreatment = (id: string) => {
    setExpandedTreatments(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
  const [paymentMethod, setPaymentMethod] = useState('NONE');
  const [procedures, setProcedures] = useState<ProcedureData[]>([
    { name: '', tooth: '', price: 0, duration: 30 }
  ]);
  const [modalTab, setModalTab] = useState<'procedures' | 'billing'>('procedures');
  const [paidInstallmentsSum, setPaidInstallmentsSum] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [addition, setAddition] = useState<number>(0);
  const [paymentEntries, setPaymentEntries] = useState([{ method: 'PIX', amount: 0 }]);
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [installmentsInterval, setInstallmentsInterval] = useState<number>(30);
  const [generatedInstallments, setGeneratedInstallments] = useState<any[]>([]);

  const subtotal = procedures.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const total = subtotal - discount + addition;
  const paymentsSum = paymentEntries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const remaining = total - paymentsSum - paidInstallmentsSum;
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({ 
    queryKey: ['patients'], 
    queryFn: fetchPatients 
  });

  const { data: allTreatments = [], isLoading: isLoadingTreatments } = useQuery({ 
    queryKey: ['treatments'], 
    queryFn: fetchAllTreatments
  });

  const filteredTreatments = allTreatments.filter((t: any) => {
    const matchesSearch = searchTerm === '' || 
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.patient?.name && t.patient.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['catalog'],
    queryFn: fetchCatalog
  });

  const mutation = useMutation({
    mutationFn: createTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setIsModalOpen(false);
      setFormData({ name: '', description: '' });
      setProcedures([{ name: '', tooth: '', price: 0, duration: 30 }]);
      setSelectedTooth(null);
      setSelectedPatient('');
      setDiscount(0);
      setAddition(0);
      setPaidInstallmentsSum(0);
      setPaymentEntries([{ method: 'PIX', amount: 0 }]);
      setGeneratedInstallments([]);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateTreatment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setEditingTreatment(null);
      setIsModalOpen(false);
    }
  });

  const handleEditClick = (treatment: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTreatment(treatment);
    setFormData({ name: treatment.name, description: treatment.description || '' });
    setSelectedPatient(treatment.patientId);
    
    if (treatment.procedures && treatment.procedures.length > 0) {
       setProcedures(treatment.procedures.map((p: any) => ({
         name: p.name,
         tooth: p.tooth || '',
         price: p.price,
         duration: p.duration,
         color: '#3b82f6'
       })));
    } else {
       setProcedures([]);
    }
    
    setDiscount(treatment.discount || 0);
    setAddition(treatment.addition || 0);
    
    // Carrega entradas iniciais (transações pagas sem parcela)
    if (treatment.transactions && treatment.transactions.length > 0) {
      const initialPayments = treatment.transactions.filter((t:any) => !t.installment && t.status === 'PAID');
      if (initialPayments.length > 0) {
        setPaymentEntries(initialPayments.map((p:any) => ({
          method: p.method,
          amount: p.amount
        })));
      } else {
        setPaymentEntries([{ method: 'PIX', amount: 0 }]);
      }
      
      // Salva o total já pago em parcelas para não abater de novo
      const paidInst = treatment.transactions.filter((t:any) => t.installment && t.status === 'PAID');
      const paidSum = paidInst.reduce((sum:number, t:any) => sum + t.amount, 0);
      setPaidInstallmentsSum(paidSum);
    } else {
      setPaymentEntries([{ method: 'PIX', amount: 0 }]);
      setPaidInstallmentsSum(0);
    }
    
    // Carrega TODAS as parcelas (pagas e pendentes) para mostrar histórico completo
    if (treatment.transactions && treatment.transactions.length > 0) {
      const installments = treatment.transactions
        .filter((t:any) => t.installment)
        .sort((a:any, b:any) => a.installment - b.installment);
      if (installments.length > 0) {
        setGeneratedInstallments(installments.map((p:any) => ({
          _id: p.id,
          installment: p.installment,
          dueDate: p.dueDate ? p.dueDate.split('T')[0] : '',
          amount: p.amount,
          method: p.method,
          status: p.status
        })));
        setInstallmentsCount(installments.filter((t:any) => t.status === 'PENDING').length || installments.length);
      } else {
        setGeneratedInstallments([]);
      }
    } else {
      setGeneratedInstallments([]);
    }
    
    setIsModalOpen(true);
  };

  const deleteTreatmentMutation = useMutation({
    mutationFn: deleteTreatment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
    }
  });

  const payInstallmentMutation = useMutation({
    mutationFn: payTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      if (editingTreatment) {
        const updated = allTreatments.find((t: any) => t.id === editingTreatment.id);
        if (updated) {
          setGeneratedInstallments(prev =>
            prev.map(inst =>
              inst._id && inst._id === payInstallmentMutation.variables
                ? { ...inst, status: 'PAID' }
                : inst
            )
          );
        }
      }
    }
  });

  const refundInstallmentMutation = useMutation({
    mutationFn: refundTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
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

  const generateInstallments = () => {
    if (remaining <= 0 || installmentsCount < 1) return;
    
    const installmentValue = Number((remaining / installmentsCount).toFixed(2));
    const newInstallments = [];
    
    for (let i = 1; i <= installmentsCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i * installmentsInterval));
      
      let val = installmentValue;
      // Handle rounding error on last installment
      if (i === installmentsCount) {
        val = Number((remaining - (installmentValue * (installmentsCount - 1))).toFixed(2));
      }
      
      newInstallments.push({
        installment: i,
        dueDate: date.toISOString().split('T')[0],
        amount: val,
        method: 'CARD', // Default method for generated installments
        status: 'PENDING'
      });
    }
    setGeneratedInstallments(newInstallments);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) {
      alert('Por favor, selecione um paciente primeiro.');
      return;
    }
    
    const payload = {
      name: formData.name,
      description: formData.description,
      status: editingTreatment ? editingTreatment.status : 'ACTIVE',
      patientId: selectedPatient,
      subtotal,
      discount,
      addition,
      total,
      transactions: [
        ...paymentEntries.filter(e => e.amount > 0).map(e => ({ amount: e.amount, method: e.method, status: 'PAID', dueDate: new Date().toISOString() })),
        ...generatedInstallments.map(gi => ({ ...gi, dueDate: gi.dueDate ? new Date(gi.dueDate).toISOString() : new Date().toISOString() }))
      ],
      procedures: procedures.filter(p => p.name.trim() !== '')
    };

    if (editingTreatment) {
      updateMutation.mutate({ id: editingTreatment.id, data: payload });
    } else {
      mutation.mutate(payload);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { label: 'Em Andamento', bg: 'rgba(6, 182, 212, 0.1)', color: 'var(--secondary-color)' };
      case 'PENDING': return { label: 'Pendente', bg: 'rgba(241, 245, 249, 1)', color: 'var(--text-muted)' };
      case 'COMPLETED': return { label: 'Concluído', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'CANCELLED': return { label: 'Cancelado', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      case 'FOLLOW_UP': return { label: 'Acompanhamento', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' };
      case 'CONTACTED': return { label: 'Contato Realizado', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' };
      case 'RETRY': return { label: 'Retornar Novamente', bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
      case 'REJECTED': return { label: 'Orçamento Reprovado', bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' };
      default: return { label: status || 'Pendente', bg: 'var(--border-color)', color: 'var(--text-muted)' };
    }
  };

  // Helper to format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Planos de Tratamento</h2>
        <button className="btn btn-primary" onClick={() => {
          setEditingTreatment(null);
          setFormData({ name: '', description: '' });
          setSelectedPatient('');
          setProcedures([{ name: '', tooth: '', price: 0, duration: 30 }]);
          setDiscount(0);
          setAddition(0);
          setPaidInstallmentsSum(0);
          setPaymentEntries([{ method: 'PIX', amount: 0 }]);
          setGeneratedInstallments([]);
          setIsModalOpen(true);
        }}>
          <Plus size={18} /> Novo Orçamento / Plano
        </button>
      </div>
      
      <div className="glass-panel no-print" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="input-group" style={{ margin: 0, flex: '1 1 300px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Search size={16} /> Buscar por Paciente ou Plano</label>
          <input 
            type="text" 
            className="input-control" 
            placeholder="Digite o nome do paciente ou plano..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="input-group" style={{ margin: 0, flex: '0 0 200px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Filter size={16} /> Status do Plano</label>
          <select 
            className="input-control" 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDING">Pendente</option>
            <option value="ACTIVE">Em Andamento</option>
            <option value="FOLLOW_UP">Acompanhamento</option>
            <option value="COMPLETED">Concluído</option>
            <option value="CANCELLED">Cancelado</option>
          </select>
        </div>
      </div>

      {isLoadingTreatments && <p>Carregando tratamentos...</p>}

      {!isLoadingTreatments && filteredTreatments.length === 0 && (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Stethoscope size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.125rem' }}>Nenhum plano de tratamento encontrado.</p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>Ajuste os filtros ou crie um novo orçamento para começar.</p>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {filteredTreatments.map((treatment: any) => {
          const totalValue = treatment.procedures?.reduce((acc: number, curr: any) => acc + (curr.price || 0), 0) || 0;
          const completedCount = treatment.procedures?.filter((p:any) => p.isCompleted).length || 0;
          const totalProcs = treatment.procedures?.length || 0;
          const progress = totalProcs === 0 ? 0 : Math.round((completedCount / totalProcs) * 100);

          const isExpanded = expandedTreatments[treatment.id];

          return (
            <div key={treatment.id} className={`glass-panel treatment-card ${printingId === treatment.id ? 'printing' : ''}`} style={{ overflow: 'hidden' }}>
              {/* Print-only Header */}
              <div className="print-only" style={{ padding: '2rem 1.5rem 0', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '24pt', margin: 0, color: '#000' }}>PLANO DE TRATAMENTO</h2>
                <p style={{ fontSize: '12pt', marginTop: '0.5rem', color: '#000' }}>
                  <strong>Paciente:</strong> {treatment.patient?.name || 'Desconhecido'}
                </p>
                <p style={{ fontSize: '10pt', color: '#666' }}>Data: {new Date().toLocaleDateString()}</p>
              </div>

              <div 
                style={{ padding: '1.5rem', borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.4)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onClick={() => toggleTreatment(treatment.id)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.6)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.4)'}
              >
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className="no-print" style={{ display: 'flex' }}>
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </span>
                    {treatment.name} <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 400 }}>- {treatment.patient?.name}</span>
                  </h3>
                  <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '0.875rem', paddingLeft: '1.75rem' }}>{treatment.description || 'Sem descrição adicional'}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.875rem', paddingLeft: '1.75rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-main)', fontWeight: 500 }}>
                      <DollarSign size={16} color="var(--secondary-color)" /> Total: {formatCurrency(totalValue)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                      <Activity size={16} /> Progresso: {progress}% ({completedCount}/{totalProcs})
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
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
                      onClick={(e) => handleEditClick(treatment, e)}
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#ef4444', borderColor: '#ef4444' }}
                      onClick={() => setTreatmentToDelete(treatment.id)}
                      disabled={deleteTreatmentMutation.isPending}
                    >
                      <Trash size={14} /> {deleteTreatmentMutation.isPending ? '...' : 'Excluir'}
                    </button>
                  </div>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '0.25rem 0.75rem', 
                    borderRadius: '9999px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: getStatusBadge(treatment.status).bg,
                    color: getStatusBadge(treatment.status).color
                  }}>
                    {getStatusBadge(treatment.status).label}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Criado em: {new Date(treatment.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              {(isExpanded || printingId === treatment.id) && (
                <div style={{ padding: '0', animation: 'fadeIn 0.3s ease-in-out' }}>
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
              )}
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '950px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {editingTreatment ? 'Editar Plano de Tratamento' : 'Novo Plano de Tratamento'}
            </h3>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <button 
                type="button"
                onClick={() => setModalTab('procedures')}
                style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontWeight: modalTab === 'procedures' ? 600 : 400, color: modalTab === 'procedures' ? 'var(--primary-color)' : 'var(--text-main)', borderBottom: modalTab === 'procedures' ? '2px solid var(--primary-color)' : 'none', cursor: 'pointer' }}>
                Procedimentos
              </button>
              <button 
                type="button"
                onClick={() => setModalTab('billing')}
                style={{ background: 'none', border: 'none', padding: '0.5rem 1rem', fontWeight: modalTab === 'billing' ? 600 : 400, color: modalTab === 'billing' ? 'var(--primary-color)' : 'var(--text-main)', borderBottom: modalTab === 'billing' ? '2px solid var(--primary-color)' : 'none', cursor: 'pointer' }}>
                Faturamento
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: modalTab === 'procedures' ? 'block' : 'none' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ gridColumn: 'span 2' }}>
                  <label>Paciente</label>
                  <select 
                    required
                    className="input-control" 
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                  >
                    <option value="">-- Selecione o Paciente --</option>
                    {patients.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
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

              </div>

              <div style={{ display: modalTab === 'billing' ? 'block' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                   {/* Left Side: Resumo and Conditions */}
                   <div>
                     <div style={{ backgroundColor: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>SubTotal:</span> <strong>{formatCurrency(subtotal)}</strong></div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <span>Desconto (R$):</span> 
                         <input type="number" min="0" step="0.01" className="input-control" style={{ width: '100px' }} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center' }}>
                         <span>Acréscimo (R$):</span> 
                         <input type="number" min="0" step="0.01" className="input-control" style={{ width: '100px' }} value={addition} onChange={e => setAddition(Number(e.target.value))} />
                       </div>
                       <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '1.125rem' }}><span>Total:</span> <strong>{formatCurrency(total)}</strong></div>
                     </div>

                     <h5 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Entradas / Pagamento Inicial</h5>
                     {paymentEntries.map((entry, index) => (
                       <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                         <select className="input-control" style={{ flex: 1 }} value={entry.method} onChange={e => {
                           const newE = [...paymentEntries]; newE[index].method = e.target.value; setPaymentEntries(newE);
                         }}>
                           <option value="PIX">PIX</option>
                           <option value="CARD">Cartão de Crédito</option>
                           <option value="DEBIT">Cartão de Débito</option>
                           <option value="CASH">Dinheiro</option>
                         </select>
                         <input type="number" min="0" step="0.01" className="input-control" style={{ width: '120px' }} value={entry.amount || ''} onChange={e => {
                           const newE = [...paymentEntries]; newE[index].amount = Number(e.target.value); setPaymentEntries(newE);
                         }} placeholder="Valor" />
                       </div>
                     ))}
                     <button type="button" onClick={() => setPaymentEntries([...paymentEntries, { method: 'PIX', amount: 0 }])} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '0.875rem', marginBottom: '1rem' }}>+ Adicionar Forma de Pagamento</button>

                     <div style={{ display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.75rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                       <span>Restante a parcelar:</span>
                       <strong style={{ color: remaining > 0 ? '#ef4444' : '#10b981' }}>{formatCurrency(remaining)}</strong>
                     </div>

                     <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div className="input-group" style={{ margin: 0, flex: 1 }}>
                          <label>Qtd. Parcelas</label>
                          <input type="number" min="1" className="input-control" value={installmentsCount} onChange={e => setInstallmentsCount(Number(e.target.value))} />
                        </div>
                        <div className="input-group" style={{ margin: 0, flex: 1 }}>
                          <label>Intervalo (Dias)</label>
                          <input type="number" min="1" className="input-control" value={installmentsInterval} onChange={e => setInstallmentsInterval(Number(e.target.value))} />
                        </div>
                        <button type="button" onClick={generateInstallments} className="btn btn-secondary" style={{ marginTop: '1.5rem' }}>Gerar</button>
                     </div>
                   </div>

                   {/* Right Side: Installments Table */}
                   <div>
                     <h5 style={{ fontWeight: 600, marginBottom: '1rem' }}>Parcelamento Gerado</h5>
                     {generatedInstallments.length === 0 ? (
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', marginTop: '2rem' }}>Nenhuma parcela gerada.</p>
                     ) : (
                       <table className="data-table">
                         <thead>
                           <tr>
                             <th>Parc.</th>
                             <th>Vencimento</th>
                             <th>Valor</th>
                             <th>Método</th>
                             <th>Status</th>
                             {editingTreatment && <th style={{ textAlign: 'center' }}>Ação</th>}
                           </tr>
                         </thead>
                         <tbody>
                           {generatedInstallments.map((inst, i) => (
                             <tr key={i} style={{ opacity: inst.status === 'PAID' ? 0.7 : 1, backgroundColor: inst.status === 'PAID' ? 'rgba(16,185,129,0.04)' : 'transparent' }}>
                               <td>{inst.installment}</td>
                               <td>
                                 {inst.status === 'PAID' ? (
                                   <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                     {inst.dueDate ? new Date(inst.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                                   </span>
                                 ) : (
                                   <input type="date" className="input-control" style={{ padding: '0.25rem', fontSize: '0.875rem' }} value={inst.dueDate} onChange={e => {
                                     const newG = [...generatedInstallments]; newG[i].dueDate = e.target.value; setGeneratedInstallments(newG);
                                   }} />
                                 )}
                               </td>
                               <td>
                                 {inst.status === 'PAID' ? (
                                   <span style={{ fontWeight: 600 }}>R$ {Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                 ) : (
                                   <input type="number" min="0" step="0.01" className="input-control" style={{ padding: '0.25rem', fontSize: '0.875rem', width: '90px' }} value={inst.amount} onChange={e => {
                                     const newG = [...generatedInstallments]; newG[i].amount = Number(e.target.value); setGeneratedInstallments(newG);
                                   }} />
                                 )}
                               </td>
                               <td>
                                 {inst.status === 'PAID' ? (
                                   <span style={{ fontSize: '0.875rem' }}>{inst.method}</span>
                                 ) : (
                                   <select className="input-control" style={{ padding: '0.25rem', fontSize: '0.875rem' }} value={inst.method} onChange={e => {
                                     const newG = [...generatedInstallments]; newG[i].method = e.target.value; setGeneratedInstallments(newG);
                                   }}>
                                     <option value="CARD">Cartão</option>
                                     <option value="PLAN">Boleto</option>
                                     <option value="PIX">PIX</option>
                                   </select>
                                 )}
                               </td>
                               <td>
                                 <span style={{
                                   fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '999px',
                                   backgroundColor: inst.status === 'PAID' ? '#dcfce7' : '#fef3c7',
                                   color: inst.status === 'PAID' ? '#166534' : '#b45309'
                                 }}>
                                   {inst.status === 'PAID' ? '✓ Pago' : 'Pendente'}
                                 </span>
                               </td>
                               {editingTreatment && (
                                 <td style={{ textAlign: 'center' }}>
                                   {inst.status === 'PENDING' && inst._id && (
                                     <button
                                       type="button"
                                       title="Dar Baixa (Confirmar Pagamento)"
                                       onClick={() => {
                                         if (window.confirm(`Confirmar recebimento da Parcela ${inst.installment} — R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
                                           payInstallmentMutation.mutate(inst._id, {
                                             onSuccess: () => {
                                               setGeneratedInstallments(prev =>
                                                 prev.map((p, idx) => idx === i ? { ...p, status: 'PAID' } : p)
                                               );
                                             }
                                           });
                                         }
                                       }}
                                       style={{
                                         background: 'none', border: '1px solid #10b981', cursor: 'pointer',
                                         color: '#10b981', padding: '0.3rem 0.55rem', borderRadius: '8px',
                                         display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                         fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
                                       }}
                                       onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.color = 'white'; }}
                                       onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#10b981'; }}
                                       disabled={payInstallmentMutation.isPending}
                                     >
                                       <CheckCircle2 size={12} /> Dar Baixa
                                     </button>
                                   )}
                                   {inst.status === 'PAID' && inst._id && (
                                     <button
                                       type="button"
                                       title="Estornar pagamento"
                                       onClick={() => {
                                         if (window.confirm(`Estornar a Parcela ${inst.installment} — R$ ${Number(inst.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}? Ela voltará para Pendente.`)) {
                                           refundInstallmentMutation.mutate(inst._id, {
                                             onSuccess: () => {
                                               setGeneratedInstallments(prev =>
                                                 prev.map((p, idx) => idx === i ? { ...p, status: 'PENDING' } : p)
                                               );
                                             }
                                           });
                                         }
                                       }}
                                       style={{
                                         background: 'none', border: '1px solid #f59e0b', cursor: 'pointer',
                                         color: '#d97706', padding: '0.3rem 0.55rem', borderRadius: '8px',
                                         display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                         fontSize: '0.72rem', fontWeight: 600, transition: 'all 0.2s', whiteSpace: 'nowrap'
                                       }}
                                       onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#f59e0b'; e.currentTarget.style.color = 'white'; }}
                                       onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d97706'; }}
                                       disabled={refundInstallmentMutation.isPending}
                                     >
                                       <RotateCcw size={12} /> Estornar
                                     </button>
                                   )}
                                 </td>
                               )}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     )}
                   </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending || updateMutation.isPending}>
                  {mutation.isPending || updateMutation.isPending ? 'Salvando...' : (editingTreatment ? 'Salvar Alterações' : 'Salvar Plano de Tratamento')}
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
