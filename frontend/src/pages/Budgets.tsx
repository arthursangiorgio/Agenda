import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllTreatments, updateTreatmentStatus } from '../api';
import { 
  FileText, Search, MoreHorizontal, User, 
  Calendar, DollarSign, ArrowRight, CheckCircle2, 
  XCircle, Clock, PhoneCall, History, Loader2 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLUMNS = [
  { id: 'PENDING', title: 'Em Aberto', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'CONTACTED', title: 'Contato Realizado', color: '#3b82f6', bg: '#eff6ff' },
  { id: 'RETRY', title: 'Retornar Novamente', color: '#8b5cf6', bg: '#f5f3ff' },
  { id: 'FOLLOW_UP', title: 'Orçamento Aprovado', color: '#10b981', bg: '#ecfdf5' },
  { id: 'REJECTED', title: 'Orçamento Reprovado', color: '#ef4444', bg: '#fef2f2' },
];

export default function Budgets() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);

  const { data: treatments = [], isLoading } = useQuery({
    queryKey: ['treatments'],
    queryFn: fetchAllTreatments
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateTreatmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setSelectedTreatment(null);
    }
  });

  const getBudgetValue = (treatment: any) => {
    return treatment.procedures?.reduce((acc: number, p: any) => acc + (p.price || 0), 0) || 0;
  };

  const filteredTreatments = useMemo(() => {
    return treatments.filter((t: any) => 
      t.patient?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [treatments, searchTerm]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    const id = e.dataTransfer.getData('treatmentId');
    if (id) {
      statusMutation.mutate({ id, status });
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary-color)" />
      </div>
    );
  }

  return (
    <div style={{ padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Gestão de Orçamentos</h1>
          <p style={{ color: '#64748b' }}>Acompanhe o status dos planos de tratamento em aberto</p>
        </div>
        
        <div style={{ position: 'relative', width: '300px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
          <input
            type="text"
            placeholder="Buscar paciente ou plano..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '0.75rem 1rem 0.75rem 2.5rem', 
              borderRadius: '0.75rem', 
              border: '1px solid #e2e8f0', 
              outline: 'none',
              fontSize: '0.875rem'
            }}
          />
        </div>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: `repeat(${COLUMNS.length}, 1fr)`, 
        gap: '1.25rem', 
        alignItems: 'start',
        overflowX: 'auto',
        paddingBottom: '2rem'
      }}>
        {COLUMNS.map(column => {
          const columnTreatments = filteredTreatments.filter((t: any) => 
            (t.status === column.id) || (column.id === 'PENDING' && t.status === 'ACTIVE')
          );
          const totalValue = columnTreatments.reduce((acc, t) => acc + getBudgetValue(t), 0);

          return (
            <div 
              key={column.id} 
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{ minWidth: '220px' }}
            >
              <div style={{ 
                backgroundColor: 'white', 
                borderRadius: '1rem', 
                border: '1px solid #e2e8f0', 
                overflow: 'hidden',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
              }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ 
                      fontSize: '0.875rem', 
                      fontWeight: 700, 
                      color: column.color,
                      backgroundColor: column.bg,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '999px'
                    }}>
                      {column.title}
                    </span>
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600 }}>
                      {columnTreatments.length}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Valor Total</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                      {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </div>
                  </div>
                </div>

                <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', minHeight: '60vh', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {columnTreatments.map(treatment => (
                    <div 
                      key={treatment.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('treatmentId', treatment.id)}
                      onClick={() => setSelectedTreatment(treatment)}
                      style={{ 
                        backgroundColor: 'white', 
                        padding: '1rem', 
                        borderRadius: '0.75rem', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                      }}
                    >
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <User size={12} /> {treatment.patient?.name}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.75rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {treatment.name}
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Calendar size={12} />
                          {format(parseISO(treatment.createdAt), 'dd/MM/yy')}
                        </div>
                        <div style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                          {getBudgetValue(treatment).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {columnTreatments.length === 0 && (
                    <div style={{ 
                      padding: '2rem 1rem', 
                      textAlign: 'center', 
                      color: '#94a3b8', 
                      fontSize: '0.75rem',
                      border: '2px dashed #e2e8f0',
                      borderRadius: '0.75rem'
                    }}>
                      Solte aqui
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {selectedTreatment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Detalhes do Orçamento</h3>
                <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
                  Paciente: <strong>{selectedTreatment.patient?.name}</strong>
                </div>
              </div>
              <button 
                onClick={() => setSelectedTreatment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <XCircle size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1e293b', marginBottom: '0.75rem' }}>
                Procedimentos Planejados:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {selectedTreatment.procedures?.map((p: any) => (
                  <div key={p.id} style={{ padding: '0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--primary-color)' }}>
                        {(p.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    {p.tooth && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                        Dente: {p.tooth}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Valor Total do Plano</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
                  {getBudgetValue(selectedTreatment).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => setSelectedTreatment(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}} />
    </div>
  );
}
