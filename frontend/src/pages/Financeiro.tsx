import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';
import { 
  DollarSign, TrendingUp, TrendingDown, Clock, 
  Plus, Calendar, User, Search, Download, CreditCard, Pix, Banknote, Trash, CheckCircle2, RotateCcw
} from 'lucide-react';
import { fetchTransactions, createTransaction, fetchPatients, deleteTransaction, payTransaction, refundTransaction } from '../api';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function Financeiro() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PIX');
  const [type, setType] = useState('INCOME');
  const [patientId, setPatientId] = useState('');
  const [description, setDescription] = useState('');

  // Queries
  const { data: transactions = [] } = useQuery({ 
    queryKey: ['transactions', selectedMonth, selectedYear], 
    queryFn: () => fetchTransactions(selectedMonth, selectedYear) 
  });
  
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });

  const mutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setIsModalOpen(false);
      resetForm();
      showToast('Transação registrada!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Transação excluída!');
    },
    onError: () => {
      showToast('Erro ao excluir transação.');
    }
  });

  const payMutation = useMutation({
    mutationFn: payTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Pagamento confirmado! ✓');
    },
    onError: () => {
      showToast('Erro ao confirmar pagamento.', 'error');
    }
  });

  const refundMutation = useMutation({
    mutationFn: refundTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      showToast('Estorno realizado. Parcela voltou para Pendente.', 'info');
    },
    onError: () => {
      showToast('Erro ao realizar estorno.', 'error');
    }
  });

  const resetForm = () => {
    setAmount('');
    setMethod('PIX');
    setType('INCOME');
    setPatientId('');
    setDescription('');
  };

  const totals = useMemo(() => {
    return transactions.reduce((acc: any, t: any) => {
      // Só conta no caixa o que já foi pago (status PAID ou sem status = antigo)
      if (t.status === 'PENDING') {
        if (t.type === 'INCOME') acc.pending += t.amount;
      } else {
        if (t.type === 'INCOME') acc.income += t.amount;
        else acc.expense += t.amount;
      }
      return acc;
    }, { income: 0, expense: 0, pending: 0 });
  }, [transactions]);

  const methodIcons: any = {
    'PIX': <span style={{ color: '#32bcad' }}>PIX</span>,
    'CARD': <CreditCard size={16} color="#4F46E5" />,
    'CASH': <Banknote size={16} color="#10b981" />,
    'PLAN': <Calendar size={16} color="#f59e0b" />
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 className="page-title">Controle Financeiro</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'white', padding: '0.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <select 
              className="input-control" 
              style={{ border: 'none', padding: '0.4rem', width: '120px' }}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>
                  {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                </option>
              ))}
            </select>
            <select 
              className="input-control" 
              style={{ border: 'none', padding: '0.4rem', width: '80px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nova Transação
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Receitas (só pagas) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Receitas Recebidas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
              R$ {totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Apenas pagamentos confirmados</div>
          </div>
        </div>

        {/* A Receber (pendentes) */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock color="#f59e0b" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>A Receber</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>
              R$ {totals.pending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Parcelas ainda não pagas</div>
          </div>
        </div>

        {/* Despesas */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingDown color="#ef4444" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Despesas</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              R$ {totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Saldo real */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Saldo em Caixa</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: (totals.income - totals.expense) >= 0 ? '#3b82f6' : '#ef4444' }}>
              R$ {(totals.income - totals.expense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Receitas pagas − Despesas</div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Fluxo de Caixa</h3>
          <button className="btn btn-secondary" style={{ fontSize: '0.875rem' }} onClick={() => showToast('Exportando relatório...')}>
            <Download size={16} /> Exportar PDF
          </button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Paciente / Descrição</th>
                <th>Método</th>
                <th>Tipo</th>
                <th style={{ textAlign: 'right' }}>Valor</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Nenhuma transação encontrada para este período.
                  </td>
                </tr>
              ) : (
                transactions.map((t: any) => (
                  <tr key={t.id} style={{ 
                    backgroundColor: t.status === 'PENDING' ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
                    borderLeft: t.status === 'PENDING' ? '3px solid #f59e0b' : '3px solid transparent'
                  }}>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>{format(parseISO(t.date), 'dd/MM/yyyy')}</div>
                      {t.status === 'PENDING' && t.dueDate ? (
                        <div style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>Vence: {format(parseISO(t.dueDate), 'dd/MM/yyyy')}</div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(parseISO(t.date), 'HH:mm')}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{t.patient?.name || 'Geral'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.description || t.procedure?.name || 'Diversos'}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                        {methodIcons[t.method]}
                        {t.method}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ 
                          fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px',
                          backgroundColor: t.type === 'INCOME' ? '#dcfce7' : '#fee2e2',
                          color: t.type === 'INCOME' ? '#166534' : '#991b1b'
                        }}>
                          {t.type === 'INCOME' ? 'Receita' : 'Despesa'}
                        </span>
                        {t.status && (
                          <span style={{ 
                            fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px',
                            backgroundColor: t.status === 'PENDING' ? '#fef3c7' : '#dcfce7',
                            color: t.status === 'PENDING' ? '#b45309' : '#166534'
                          }}>
                            {t.status === 'PENDING' ? 'Pendente' : 'Pago'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: t.type === 'INCOME' ? '#10b981' : '#ef4444' }}>
                      {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center', alignItems: 'center' }}>
                        {t.status === 'PENDING' && (
                          <button
                            title="Dar Baixa (Confirmar Pagamento)"
                            onClick={() => {
                              if (window.confirm(`Confirmar recebimento de R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`)) {
                                payMutation.mutate(t.id);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #10b981',
                              cursor: 'pointer',
                              color: '#10b981',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#10b981'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#10b981'; }}
                            disabled={payMutation.isPending}
                          >
                            <CheckCircle2 size={14} />
                            Dar Baixa
                          </button>
                        )}
                        {t.status === 'PAID' && (
                          <button
                            title="Estornar pagamento"
                            onClick={() => {
                              if (window.confirm(`Estornar o pagamento de R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}? A parcela voltará para Pendente.`)) {
                                refundMutation.mutate(t.id);
                              }
                            }}
                            style={{
                              background: 'none',
                              border: '1px solid #f59e0b',
                              cursor: 'pointer',
                              color: '#d97706',
                              padding: '0.35rem 0.6rem',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f59e0b'; e.currentTarget.style.color = 'white'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#d97706'; }}
                            disabled={refundMutation.isPending}
                          >
                            <RotateCcw size={14} />
                            Estornar
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
                              deleteMutation.mutate(t.id);
                            }
                          }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            color: '#ef4444', 
                            padding: '0.5rem',
                            borderRadius: '8px',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Transaction Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Registrar Transação</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate({
                amount: parseFloat(amount),
                method,
                type,
                patientId: patientId || undefined,
              });
            }}>
              <div className="input-group">
                <label>Valor (R$)</label>
                <input 
                  type="number" step="0.01" className="input-control" required autoFocus
                  value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00"
                />
              </div>

              <div className="input-group">
                <label>Tipo</label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <input type="radio" name="type" value="INCOME" checked={type === 'INCOME'} onChange={e => setType(e.target.value)} /> Receita
                  </label>
                  <label style={{ flex: 1, cursor: 'pointer' }}>
                    <input type="radio" name="type" value="EXPENSE" checked={type === 'EXPENSE'} onChange={e => setType(e.target.value)} /> Despesa
                  </label>
                </div>
              </div>

              <div className="input-group">
                <label>Método de Pagamento</label>
                <select className="input-control" value={method} onChange={e => setMethod(e.target.value)}>
                  <option value="PIX">PIX</option>
                  <option value="CARD">Cartão</option>
                  <option value="CASH">Dinheiro</option>
                  <option value="PLAN">Convênio / Plano</option>
                </select>
              </div>

              <div className="input-group">
                <label>Paciente (Opcional)</label>
                <select className="input-control" value={patientId} onChange={e => setPatientId(e.target.value)}>
                  <option value="">Selecione o Paciente</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Registrando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
