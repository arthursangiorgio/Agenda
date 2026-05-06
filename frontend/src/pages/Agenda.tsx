import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPatients, fetchTreatments, fetchAppointments, createAppointment, deleteAppointment, updateAppointmentStatus } from '../api';
import { Calendar, Clock, User, FileText, Plus, ChevronLeft, ChevronRight, Trash, CheckCircle, XCircle } from 'lucide-react';
import { addDays, subDays, format, parseISO, isSameDay, addMinutes } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function Agenda() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  
  // Form State
  const [patientId, setPatientId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  
  // Queries
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  
  const { data: treatments = [] } = useQuery({ 
    queryKey: ['treatments', patientId], 
    queryFn: () => fetchTreatments(patientId),
    enabled: !!patientId
  });

  const mutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setIsModalOpen(false);
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      // Invalidate treatments to refresh procedure status
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setSelectedAppointment(null);
    }
  });

  const resetForm = () => {
    setPatientId('');
    setTreatmentId('');
    setProcedureId('');
    setSelectedSlot(null);
  };

  const selectedTreatment = treatments.find((t: any) => t.id === treatmentId);
  const treatmentProcedures = selectedTreatment?.procedures || [];
  const selectedProcedure = treatmentProcedures.find((p: any) => p.id === procedureId);

  const handleSlotClick = (date: Date) => {
    setSelectedSlot(date);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !patientId || !procedureId || !selectedProcedure) return;
    
    const startTime = selectedSlot;
    const endTime = addMinutes(startTime, selectedProcedure.duration || 30);

    mutation.mutate({
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      patientId,
      procedureId
    });
  };

  // Generate day slots from 08:00 to 18:00 in 30min intervals
  const timeSlots = useMemo(() => {
    const slots = [];
    let current = new Date(currentDate);
    current.setHours(8, 0, 0, 0);
    
    const end = new Date(currentDate);
    end.setHours(18, 0, 0, 0);

    while (current <= end) {
      slots.push(new Date(current));
      current = addMinutes(current, 30);
    }
    return slots;
  }, [currentDate]);

  // Filter appointments for the current day
  const dailyAppointments = useMemo(() => {
    return appointments.filter((app: any) => isSameDay(parseISO(app.startTime), currentDate));
  }, [appointments, currentDate]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 2rem', borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <h2 className="page-title" style={{ margin: 0, fontSize: '1.5rem' }}>Agenda de Consultas</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setCurrentDate(new Date())}>Hoje</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.05)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} onClick={() => setCurrentDate(subDays(currentDate, 1))}>
              <ChevronLeft size={20} />
            </button>
            <div 
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker();
                } catch (e) {
                  // Fallback for older browsers
                  dateInputRef.current?.focus();
                }
              }}
            >
              <span style={{ fontWeight: 600, minWidth: '150px', textAlign: 'center' }}>
                {format(currentDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
              <input 
                ref={dateInputRef}
                type="date"
                value={format(currentDate, 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (e.target.value) {
                    const [year, month, day] = e.target.value.split('-').map(Number);
                    setCurrentDate(new Date(year, month - 1, day));
                  }
                }}
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  border: 'none',
                  padding: 0,
                  pointerEvents: 'none',
                  bottom: 0
                }}
              />
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }} onClick={() => setCurrentDate(addDays(currentDate, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>
          <button className="btn btn-primary" onClick={() => handleSlotClick(new Date(currentDate.setHours(8,0,0,0)))}>
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', backgroundColor: 'var(--bg-color)' }}>
        <div className="glass-panel" style={{ position: 'relative', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {timeSlots.map((slot, index) => {
            const isHour = slot.getMinutes() === 0;
            return (
              <div key={index} style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
                {/* Time Label */}
                <div style={{ 
                  width: '80px', 
                  padding: '1rem', 
                  textAlign: 'right', 
                  color: isHour ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: isHour ? 600 : 400,
                  borderRight: '1px solid var(--border-color)',
                  backgroundColor: 'rgba(255,255,255,0.5)'
                }}>
                  {format(slot, 'HH:mm')}
                </div>
                {/* Slot Area */}
                <div 
                  style={{ flex: 1, position: 'relative', minHeight: '60px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(79, 70, 229, 0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => handleSlotClick(slot)}
                >
                  {/* Render appointments that start at this exact slot (Simplified rendering) */}
                  {dailyAppointments.filter((app: any) => parseISO(app.startTime).getTime() === slot.getTime()).map((app: any) => {
                    const start = parseISO(app.startTime);
                    const end = parseISO(app.endTime);
                    const durationMins = (end.getTime() - start.getTime()) / 60000;
                    const heightPixels = Math.max(60, (durationMins / 30) * 60); // 60px per 30 mins

                    const getStatusStyles = (status: string) => {
                      if (status === 'COMPLETED') return { bg: '#ECFDF5', border: '#10B981', text: '#065F46', secondary: '#059669' };
                      if (status === 'CANCELLED') return { bg: '#F3F4F6', border: '#9CA3AF', text: '#6B7280', secondary: '#9CA3AF' };
                      return { bg: '#EEF2FF', border: '#4F46E5', text: '#3730A3', secondary: '#4F46E5' };
                    };

                    const styles = getStatusStyles(app.status);

                    return (
                      <div 
                        key={app.id} 
                        onClick={(e) => { e.stopPropagation(); setSelectedAppointment(app); }}
                        style={{
                          position: 'absolute', top: '4px', left: '8px', right: '8px', height: `${heightPixels - 8}px`,
                          backgroundColor: styles.bg,
                          borderLeft: `4px solid ${styles.border}`,
                          borderRadius: '4px', padding: '0.5rem 0.75rem', zIndex: 5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.25rem',
                          opacity: app.status === 'CANCELLED' ? 0.8 : 1
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ 
                            fontWeight: 600, fontSize: '0.875rem', color: styles.text,
                            textDecoration: app.status === 'CANCELLED' ? 'line-through' : 'none'
                          }}>
                            {app.patient?.name}
                          </span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: styles.secondary }}>
                            {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <FileText size={12} /> {app.procedure?.name} ({app.procedure?.tooth || 'Geral'})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Scheduling Modal */}
      {isModalOpen && selectedSlot && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Agendar Procedimento</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={16} /> Data: {format(selectedSlot, "dd/MM/yyyy 'às' HH:mm")}
            </p>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Paciente</label>
                <select className="input-control" required value={patientId} onChange={e => { setPatientId(e.target.value); setTreatmentId(''); setProcedureId(''); }}>
                  <option value="">Selecione o Paciente</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {patientId && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Plano de Tratamento (Ativos)</label>
                  <select className="input-control" required value={treatmentId} onChange={e => { setTreatmentId(e.target.value); setProcedureId(''); }}>
                    <option value="">Selecione o Tratamento</option>
                    {treatments.map((t: any) => <option key={t.id} value={t.id}>{t.name} - {t.description}</option>)}
                  </select>
                </div>
              )}

              {treatmentId && (
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Procedimento a realizar (Pendentes)</label>
                  {treatmentProcedures.length === 0 ? (
                    <p style={{ color: '#ef4444', fontSize: '0.875rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.25rem' }}>
                      Não há procedimentos neste tratamento.
                    </p>
                  ) : (
                    <select className="input-control" required value={procedureId} onChange={e => setProcedureId(e.target.value)}>
                      <option value="">Selecione o Procedimento</option>
                      {treatmentProcedures.map((p: any) => {
                        let statusStr = '';
                        if (p.isCompleted) statusStr = '✅ Concluído: ';
                        else if (p.appointment) statusStr = '⏳ Agendado: ';

                        return (
                          <option key={p.id} value={p.id} disabled={!!p.isCompleted || !!p.appointment}>
                            {statusStr}{p.name} {p.tooth ? `(${p.tooth})` : ''} - {p.duration} min
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              )}
              
              {procedureId && selectedProcedure && (
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.875rem' }}>
                  <p><strong>Duração Prevista:</strong> {selectedProcedure.duration} minutos</p>
                  <p><strong>Término Estimado:</strong> {format(addMinutes(selectedSlot, selectedProcedure.duration), 'HH:mm')}</p>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isLoading || !procedureId}>
                  {mutation.isLoading ? 'Agendando...' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Detalhes do Agendamento</h3>
            
            <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <p><strong>Paciente:</strong> {selectedAppointment.patient?.name}</p>
              <p><strong>Procedimento:</strong> {selectedAppointment.procedure?.name} ({selectedAppointment.procedure?.tooth || 'Geral'})</p>
              <p><strong>Data:</strong> {format(parseISO(selectedAppointment.startTime), "dd/MM/yyyy")}</p>
              <p><strong>Horário:</strong> {format(parseISO(selectedAppointment.startTime), 'HH:mm')} às {format(parseISO(selectedAppointment.endTime), 'HH:mm')}</p>
              <p><strong>Status:</strong> {selectedAppointment.status}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {selectedAppointment.status !== 'COMPLETED' && (
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    style={{ backgroundColor: '#10B981', borderColor: '#10B981', color: 'white' }}
                    onClick={() => statusMutation.mutate({ id: selectedAppointment.id, status: 'COMPLETED' })}
                    disabled={statusMutation.isLoading}
                  >
                    <CheckCircle size={16} /> {statusMutation.isLoading ? '...' : 'Concluir'}
                  </button>
                )}
                
                {selectedAppointment.status !== 'CANCELLED' && selectedAppointment.status !== 'COMPLETED' && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => statusMutation.mutate({ id: selectedAppointment.id, status: 'CANCELLED' })}
                    disabled={statusMutation.isLoading}
                  >
                    <XCircle size={16} /> {statusMutation.isLoading ? '...' : 'Faltou'}
                  </button>
                )}

                {selectedAppointment.status !== 'SCHEDULED' && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => statusMutation.mutate({ id: selectedAppointment.id, status: 'SCHEDULED' })}
                    disabled={statusMutation.isLoading}
                  >
                    Desfazer Status
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ color: '#ef4444', borderColor: '#ef4444' }}
                  onClick={() => {
                    if (window.confirm('Tem certeza que deseja apagar este agendamento?')) {
                      deleteMutation.mutate(selectedAppointment.id);
                    }
                  }}
                  disabled={deleteMutation.isLoading}
                >
                  <Trash size={16} />
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedAppointment(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
