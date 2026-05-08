import React, { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchPatients, fetchTreatments, fetchAppointments, createAppointment, 
  deleteAppointment, updateAppointmentStatus, deleteAllAppointments,
  fetchDentists, fetchScheduleBlocks, createScheduleBlock, deleteScheduleBlock,
  sendWhatsAppMessage
} from '../api';
import { useToast } from '../context/ToastContext';
import { 
  Calendar, Clock, User, FileText, Plus, ChevronLeft, ChevronRight, 
  Trash, CheckCircle, XCircle, Send, Users, ShieldAlert, MoreVertical,
  Printer, MessageSquare
} from 'lucide-react';
import { 
  addDays, subDays, format, parseISO, isSameDay, addMinutes, 
  startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval,
  setHours, setMinutes
} from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

export default function Agenda() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDentistId, setSelectedDentistId] = useState<string>('all');
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  
  // Form State
  const [patientId, setPatientId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [dentistId, setDentistId] = useState('');
  const [blockReason, setBlockReason] = useState('');

  // Queries
  const { data: appointments = [] } = useQuery({ queryKey: ['appointments'], queryFn: fetchAppointments });
  const { data: patients = [] } = useQuery({ queryKey: ['patients'], queryFn: fetchPatients });
  const { data: dentists = [] } = useQuery({ queryKey: ['dentists'], queryFn: fetchDentists });
  const { data: scheduleBlocks = [] } = useQuery({ queryKey: ['schedule-blocks'], queryFn: fetchScheduleBlocks });
  
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
      showToast('Consulta agendada com sucesso!');
    }
  });

  const blockMutation = useMutation({
    mutationFn: createScheduleBlock,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule-blocks'] });
      setIsBlockModalOpen(false);
      setBlockReason('');
      showToast('Horário bloqueado!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setSelectedAppointment(null);
    }
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string, status: string }) => updateAppointmentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['treatments'] });
      setSelectedAppointment(null);
      showToast('Status atualizado!');
    }
  });

  const sendWhatsAppMutation = useMutation({
    mutationFn: ({ phone, message }: { phone: string; message: string }) => sendWhatsAppMessage(phone, message),
    onSuccess: () => showToast('Mensagem enviada!'),
    onError: (error: any) => showToast(error.message || 'Erro ao enviar mensagem. O WhatsApp está conectado?', 'error')
  });

  const resetForm = () => {
    setPatientId('');
    setTreatmentId('');
    setProcedureId('');
    setDentistId('');
    setSelectedSlot(null);
  };

  // Week calculation
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = 8; h <= 18; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h < 18) slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const handleSlotClick = (day: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date(day);
    date.setHours(hours, minutes, 0, 0);
    setSelectedSlot(date);
    setIsModalOpen(true);
  };

  const handleWhatsApp = (app: any) => {
    if (!app.patient?.phone) {
      showToast('Paciente sem telefone cadastrado!', 'error');
      return;
    }
    const cleanPhone = app.patient.phone.replace(/\D/g, '');
    const message = `Olá ${app.patient.name}, confirmamos sua consulta para o dia ${format(parseISO(app.startTime), "dd/MM 'às' HH:mm")}. Podemos confirmar?`;
    sendWhatsAppMutation.mutate({ phone: cleanPhone, message });
  };

  const filteredAppointments = useMemo(() => {
    if (selectedDentistId === 'all') return appointments;
    return appointments.filter((a: any) => a.dentistId === selectedDentistId);
  }, [appointments, selectedDentistId]);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0, backgroundColor: '#f8fafc' }}>
      
      {/* Dynamic Header */}
      <div className="glass-panel" style={{ padding: '1rem 2rem', borderRadius: 0, borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h2 className="page-title" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--primary-color)' }}>Agenda Semanal</h2>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
            <button className="btn-icon" onClick={() => setCurrentDate(subDays(currentDate, 7))}><ChevronLeft size={18} /></button>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', minWidth: '180px', textAlign: 'center' }}>
              {format(weekDays[0], "dd MMM")} - {format(weekDays[6], "dd MMM, yyyy", { locale: ptBR })}
            </span>
            <button className="btn-icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={18} color="var(--text-muted)" />
            <select 
              className="input-control" 
              style={{ padding: '0.4rem', fontSize: '0.875rem', width: '200px' }}
              value={selectedDentistId}
              onChange={(e) => setSelectedDentistId(e.target.value)}
            >
              <option value="all">Todos os Dentistas</option>
              {dentists.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          
          <button className="btn btn-secondary" onClick={() => setIsBlockModalOpen(true)}>
            <ShieldAlert size={18} /> Bloquear Horário
          </button>
          
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>
      </div>

      {/* Weekly Grid */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ minWidth: '1200px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          
          {/* Days Header */}
          <div style={{ display: 'flex', backgroundColor: 'white', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 5 }}>
            <div style={{ width: '80px', borderRight: '1px solid #e2e8f0' }}></div>
            {weekDays.map((day, i) => (
              <div key={i} style={{ 
                flex: 1, padding: '1rem', textAlign: 'center', 
                borderRight: i < 6 ? '1px solid #e2e8f0' : 'none',
                backgroundColor: isSameDay(day, new Date()) ? 'rgba(79, 70, 229, 0.05)' : 'transparent'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {format(day, 'EEE', { locale: ptBR })}
                </div>
                <div style={{ 
                  fontSize: '1.25rem', fontWeight: 700, 
                  color: isSameDay(day, new Date()) ? 'var(--primary-color)' : 'var(--text-main)',
                  marginTop: '0.25rem'
                }}>
                  {format(day, 'dd')}
                </div>
              </div>
            ))}
          </div>

          {/* Grid Content */}
          <div style={{ position: 'relative', display: 'flex', flex: 1 }}>
            {/* Time Labels Column */}
            <div style={{ width: '80px', backgroundColor: 'white', borderRight: '1px solid #e2e8f0' }}>
              {timeSlots.map(time => (
                <div key={time} style={{ height: '60px', padding: '0.5rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, borderBottom: '1px solid #f1f5f9' }}>
                  {time}
                </div>
              ))}
            </div>

            {/* Columns for each day */}
            {weekDays.map((day, dayIdx) => (
              <div key={dayIdx} style={{ flex: 1, position: 'relative', borderRight: dayIdx < 6 ? '1px solid #e2e8f0' : 'none', backgroundColor: dayIdx >= 5 ? '#fcfcfc' : 'white' }}>
                {/* Horizontal lines */}
                {timeSlots.map((_, tIdx) => (
                  <div 
                    key={tIdx} 
                    onClick={() => handleSlotClick(day, timeSlots[tIdx])}
                    style={{ height: '60px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  />
                ))}

                {/* Blocks */}
                {scheduleBlocks.filter((b: any) => isSameDay(parseISO(b.startTime), day)).map((block: any) => {
                  const start = parseISO(block.startTime);
                  const end = parseISO(block.endTime);
                  const top = (start.getHours() - 8) * 120 + (start.getMinutes() / 30) * 60;
                  const height = ((end.getTime() - start.getTime()) / 60000 / 30) * 60;

                  return (
                    <div key={block.id} style={{
                      position: 'absolute', left: 0, right: 0, top: `${top}px`, height: `${height}px`,
                      backgroundColor: 'rgba(241, 245, 249, 0.8)', borderLeft: '4px solid #94a3b8',
                      zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 600, color: '#64748b', backdropFilter: 'blur(2px)'
                    }}>
                      <XCircle size={14} style={{ marginRight: '4px' }} /> {block.reason || 'Bloqueado'}
                    </div>
                  );
                })}

                {/* Appointments */}
                {filteredAppointments.filter((a: any) => isSameDay(parseISO(a.startTime), day)).map((app: any) => {
                  const start = parseISO(app.startTime);
                  const end = parseISO(app.endTime);
                  const top = (start.getHours() - 8) * 120 + (start.getMinutes() / 30) * 60;
                  const height = ((end.getTime() - start.getTime()) / 60000 / 30) * 60;
                  
                  const dentistColor = app.dentist?.color || '#4F46E5';
                  const isCompleted = app.status === 'COMPLETED';
                  const isCancelled = app.status === 'CANCELLED';

                  return (
                    <div 
                      key={app.id}
                      onClick={() => setSelectedAppointment(app)}
                      style={{
                        position: 'absolute', left: '4px', right: '4px', top: `${top + 4}px`, height: `${height - 8}px`,
                        backgroundColor: isCompleted ? '#ecfdf5' : isCancelled ? '#f9fafb' : `${dentistColor}15`,
                        borderLeft: `4px solid ${isCompleted ? '#10b981' : isCancelled ? '#94a3b8' : dentistColor}`,
                        borderRadius: '6px', padding: '0.5rem', zIndex: 3, cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', overflow: 'hidden',
                        transition: 'transform 0.1s', opacity: isCancelled ? 0.6 : 1
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: isCompleted ? '#065f46' : isCancelled ? '#475569' : '#1e293b' }}>
                        {app.patient?.name}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={10} /> {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                      </div>
                      {height > 60 && (
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                          {app.procedure?.name}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem', animation: 'scaleUp 0.2s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Detalhes da Consulta</h3>
                <span style={{ 
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px',
                  backgroundColor: selectedAppointment.status === 'COMPLETED' ? '#dcfce7' : '#e0e7ff',
                  color: selectedAppointment.status === 'COMPLETED' ? '#166534' : '#3730a3'
                }}>
                  {selectedAppointment.status}
                </span>
              </div>
              <button className="btn-icon" onClick={() => setSelectedAppointment(null)}><XCircle size={24} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} color="var(--primary-color)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paciente</div>
                  <div style={{ fontWeight: 600 }}>{selectedAppointment.patient?.name}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Users size={20} color="var(--secondary-color)" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dentista</div>
                  <div style={{ fontWeight: 600 }}>{selectedAppointment.dentist?.name || 'Não atribuído'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={20} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Horário</div>
                  <div style={{ fontWeight: 600 }}>{format(parseISO(selectedAppointment.startTime), "dd/MM/yyyy 'das' HH:mm")} às {format(parseISO(selectedAppointment.endTime), 'HH:mm')}</div>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', gap: '0.5rem' }} 
                onClick={() => handleWhatsApp(selectedAppointment)}
                disabled={sendWhatsAppMutation.isPending}
              >
                <MessageSquare size={18} /> {sendWhatsAppMutation.isPending ? 'Enviando...' : 'WhatsApp'}
              </button>
              <button className="btn btn-secondary" style={{ width: '100%', gap: '0.5rem' }} onClick={() => window.print()}>
                <Printer size={18} /> Imprimir
              </button>
              
              {selectedAppointment.status === 'SCHEDULED' && (
                <>
                  <button className="btn btn-primary" style={{ backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => statusMutation.mutate({ id: selectedAppointment.id, status: 'COMPLETED' })}>
                    Confirmar
                  </button>
                  <button className="btn btn-secondary" style={{ color: '#ef4444', borderColor: '#fee2e2' }} onClick={() => statusMutation.mutate({ id: selectedAppointment.id, status: 'CANCELLED' })}>
                    Faltou
                  </button>
                </>
              )}
            </div>
            
            <button 
              className="btn" 
              style={{ width: '100%', marginTop: '1rem', color: '#ef4444', background: 'none', border: 'none', fontSize: '0.875rem' }}
              onClick={() => { if(window.confirm('Excluir este agendamento?')) deleteMutation.mutate(selectedAppointment.id); }}
            >
              Excluir Agendamento
            </button>
          </div>
        </div>
      )}

      {/* New Appointment Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Novo Agendamento</h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!selectedSlot || !patientId || !procedureId || !dentistId) return;
              const proc = treatments.flatMap((t:any) => t.procedures).find((p:any) => p.id === procedureId);
              mutation.mutate({
                startTime: selectedSlot.toISOString(),
                endTime: addMinutes(selectedSlot, proc?.duration || 30).toISOString(),
                patientId,
                procedureId,
                dentistId
              });
            }}>
              <div className="input-group">
                <label>Data/Hora Selecionada</label>
                <input className="input-control" value={selectedSlot ? format(selectedSlot, "dd/MM/yyyy HH:mm") : 'Selecione no grid'} disabled />
              </div>

              <div className="input-group">
                <label>Dentista Responsável</label>
                <select className="input-control" required value={dentistId} onChange={e => setDentistId(e.target.value)}>
                  <option value="">Selecione o Dentista</option>
                  {dentists.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Paciente</label>
                <select className="input-control" required value={patientId} onChange={e => { setPatientId(e.target.value); setTreatmentId(''); }}>
                  <option value="">Selecione o Paciente</option>
                  {patients.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {patientId && (
                <div className="input-group">
                  <label>Plano de Tratamento</label>
                  <select className="input-control" required value={treatmentId} onChange={e => setTreatmentId(e.target.value)}>
                    <option value="">Selecione o Plano</option>
                    {treatments.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              )}

              {treatmentId && (
                <div className="input-group">
                  <label>Procedimento</label>
                  <select className="input-control" required value={procedureId} onChange={e => setProcedureId(e.target.value)}>
                    <option value="">Selecione o Procedimento</option>
                    {treatments.find((t:any) => t.id === treatmentId)?.procedures.map((p:any) => (
                      <option key={p.id} value={p.id} disabled={!!p.isCompleted || !!p.appointment}>
                        {p.isCompleted ? '✅ ' : p.appointment ? '🔍 ' : ''}
                        {p.name} ({p.duration} min)
                        {p.isCompleted ? ' (Concluído)' : p.appointment ? ' (Agendado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Agendando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {isBlockModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Bloquear Horário</h3>
            <div className="input-group">
              <label>Motivo</label>
              <input className="input-control" placeholder="Ex: Almoço, Feriado" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Dentista (Opcional)</label>
              <select className="input-control" value={dentistId} onChange={e => setDentistId(e.target.value)}>
                <option value="">Todos (Clínica Fechada)</option>
                {dentists.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>* Selecione o horário inicial clicando na grade da agenda.</p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsBlockModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => {
                if (!selectedSlot) { showToast('Selecione um horário na grade primeiro', 'error'); return; }
                blockMutation.mutate({
                  startTime: selectedSlot.toISOString(),
                  endTime: addMinutes(selectedSlot, 60).toISOString(),
                  reason: blockReason,
                  dentistId: dentistId || undefined
                });
              }}>Bloquear</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .btn-icon {
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background 0.2s;
        }
        .btn-icon:hover { background: #f1f5f9; }
      `}} />
    </div>
  );
}
