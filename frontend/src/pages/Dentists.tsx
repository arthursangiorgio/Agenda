import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDentists, createDentist, updateDentist, deleteDentist } from '../api';
import { Plus, User, Trash, Edit, Phone, Mail, Award, Clock, Calendar, UserPlus } from 'lucide-react';
import { useToast } from '../context/ToastContext';

const DAYS = [
  { key: 'SEG', label: 'Seg' },
  { key: 'TER', label: 'Ter' },
  { key: 'QUA', label: 'Qua' },
  { key: 'QUI', label: 'Qui' },
  { key: 'SEX', label: 'Sex' },
  { key: 'SAB', label: 'Sáb' },
];

const COLORS = [
  { hex: '#4F46E5', name: 'Índigo' },
  { hex: '#10B981', name: 'Esmeralda' },
  { hex: '#F59E0B', name: 'Âmbar' },
  { hex: '#EF4444', name: 'Vermelho' },
  { hex: '#8B5CF6', name: 'Violeta' },
  { hex: '#EC4899', name: 'Rosa' },
  { hex: '#06B6D4', name: 'Ciano' },
  { hex: '#F97316', name: 'Laranja' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#6366F1', name: 'Azul Índigo' },
  { hex: '#84CC16', name: 'Lima' },
  { hex: '#0EA5E9', name: 'Céu' },
];

const EMPTY_FORM = {
  name: '',
  specialization: '',
  color: '#4F46E5',
  phone: '',
  email: '',
  cro: '',
  workingDays: [] as string[],
  workingStart: '08:00',
  workingEnd: '18:00',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function Dentists() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: dentists = [], isLoading } = useQuery({ queryKey: ['dentists'], queryFn: fetchDentists });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const mutation = useMutation({
    mutationFn: (data: any) => createDentist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      setIsModalOpen(false);
      resetForm();
      showToast('Profissional cadastrado!');
    },
    onError: () => showToast('Erro ao cadastrar.', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateDentist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      showToast('Dados atualizados!');
    },
    onError: () => showToast('Erro ao atualizar.', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDentist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      showToast('Dentista removido.');
    },
  });

  const resetForm = () => setFormData({ ...EMPTY_FORM });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      workingDays: JSON.stringify(formData.workingDays),
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      mutation.mutate(payload);
    }
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  const openEdit = (dentist: any) => {
    let days: string[] = [];
    try { days = JSON.parse(dentist.workingDays || '[]'); } catch {}
    setEditingId(dentist.id);
    setFormData({
      name: dentist.name || '',
      specialization: dentist.specialization || '',
      color: dentist.color || '#4F46E5',
      phone: dentist.phone || '',
      email: dentist.email || '',
      cro: dentist.cro || '',
      workingDays: days,
      workingStart: dentist.workingStart || '08:00',
      workingEnd: dentist.workingEnd || '18:00',
    });
    setIsModalOpen(true);
  };

  const isPending = mutation.isPending || updateMutation.isPending;

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Dentistas / Profissionais</h2>
        <button
          className="btn btn-primary"
          onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
        >
          <Plus size={18} /> Novo Profissional
        </button>
      </div>

      {isLoading ? (
        <p>Carregando profissionais...</p>
      ) : dentists.length === 0 ? (
        /* ── Estado vazio ── */
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '5rem 2rem', gap: '1.5rem', textAlign: 'center'
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5, #06B6D4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(79,70,229,0.3)'
          }}>
            <UserPlus size={48} color="white" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nenhum profissional cadastrado</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: 380 }}>
              Adicione os dentistas e profissionais da sua clínica para associá-los às consultas da agenda.
            </p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}
            onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}
          >
            <Plus size={18} /> Cadastrar primeiro profissional
          </button>
        </div>
      ) : (
        /* ── Grade de Cards ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {dentists.map((dentist: any) => {
            let days: string[] = [];
            try { days = JSON.parse(dentist.workingDays || '[]'); } catch {}
            return (
              <div key={dentist.id} className="glass-panel" style={{ overflow: 'hidden' }}>
                {/* Barra de cor no topo */}
                <div style={{ height: 6, background: dentist.color }} />

                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Cabeçalho do card */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      background: dentist.color, width: 56, height: 56, borderRadius: '16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '1.125rem',
                      boxShadow: `0 4px 14px ${dentist.color}60`, flexShrink: 0
                    }}>
                      {getInitials(dentist.name) || <User size={24} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {dentist.name}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                        {dentist.specialization || 'Clínico Geral'}
                      </p>
                      {dentist.cro && (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                          CRO: {dentist.cro}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Contato */}
                  {(dentist.phone || dentist.email) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {dentist.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <Phone size={13} /> <span>{dentist.phone}</span>
                        </div>
                      )}
                      {dentist.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <Mail size={13} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dentist.email}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Horário */}
                  {(dentist.workingStart || dentist.workingEnd) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <Clock size={13} />
                      <span>{dentist.workingStart || '--:--'} – {dentist.workingEnd || '--:--'}</span>
                    </div>
                  )}

                  {/* Dias de atendimento */}
                  {days.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {DAYS.map((d) => (
                        <span key={d.key} style={{
                          fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px',
                          borderRadius: 99, border: `1px solid ${days.includes(d.key) ? dentist.color : 'transparent'}`,
                          background: days.includes(d.key) ? `${dentist.color}20` : 'transparent',
                          color: days.includes(d.key) ? dentist.color : 'var(--text-muted)',
                          opacity: days.includes(d.key) ? 1 : 0.3
                        }}>
                          {d.label}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Ações */}
                  <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ flex: 1, fontSize: '0.85rem' }}
                      onClick={() => openEdit(dentist)}
                    >
                      <Edit size={14} /> Editar
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: '0.85rem' }}
                      onClick={() => { if (window.confirm('Excluir este profissional?')) deleteMutation.mutate(dentist.id); }}
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────── MODAL ─────────────── */}
      {isModalOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-panel"
            style={{ width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto', padding: 0 }}
          >
            {/* Cabeçalho do modal */}
            <div style={{
              padding: '1.75rem 2rem 1.25rem',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', gap: '1rem',
              background: 'linear-gradient(135deg, rgba(79,70,229,0.08), rgba(6,182,212,0.05))',
            }}>
              {/* Avatar de preview */}
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: formData.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '1.2rem',
                boxShadow: `0 4px 14px ${formData.color}50`,
                transition: 'all 0.3s ease', flexShrink: 0,
              }}>
                {getInitials(formData.name) || <User size={24} />}
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                  {editingId ? 'Editar Profissional' : 'Novo Profissional'}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  {formData.name || 'Preencha os dados abaixo'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '1.5rem 2rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* ── Seção: Dados Básicos ── */}
              <SectionTitle icon={<User size={14} />} label="Dados do Profissional" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0, gridColumn: '1/-1' }}>
                  <label>Nome Completo *</label>
                  <input
                    required type="text" className="input-control"
                    placeholder="Dr. João Silva"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Especialidade</label>
                  <input
                    type="text" className="input-control"
                    placeholder="Ex: Ortodontia"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>CRO</label>
                  <input
                    type="text" className="input-control"
                    placeholder="Ex: SP-12345"
                    value={formData.cro}
                    onChange={(e) => setFormData({ ...formData, cro: e.target.value })}
                  />
                </div>
              </div>

              {/* ── Seção: Contato ── */}
              <SectionTitle icon={<Phone size={14} />} label="Contato" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Telefone / WhatsApp</label>
                  <input
                    type="tel" className="input-control"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>E-mail</label>
                  <input
                    type="email" className="input-control"
                    placeholder="doutor@clinica.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {/* ── Seção: Horários ── */}
              <SectionTitle icon={<Calendar size={14} />} label="Dias e Horários de Atendimento" />

              {/* Dias */}
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Dias de atendimento</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {DAYS.map((d) => {
                    const active = formData.workingDays.includes(d.key);
                    return (
                      <button
                        key={d.key} type="button"
                        onClick={() => toggleDay(d.key)}
                        style={{
                          padding: '0.35rem 0.75rem', borderRadius: 99,
                          fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                          border: `1.5px solid ${active ? formData.color : 'var(--border-color)'}`,
                          background: active ? `${formData.color}15` : 'transparent',
                          color: active ? formData.color : 'var(--text-muted)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Horário Início/Fim */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label><Clock size={12} style={{ marginRight: 4 }} />Início</label>
                  <input
                    type="time" className="input-control"
                    value={formData.workingStart}
                    onChange={(e) => setFormData({ ...formData, workingStart: e.target.value })}
                  />
                </div>
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label><Clock size={12} style={{ marginRight: 4 }} />Fim</label>
                  <input
                    type="time" className="input-control"
                    value={formData.workingEnd}
                    onChange={(e) => setFormData({ ...formData, workingEnd: e.target.value })}
                  />
                </div>
              </div>

              {/* ── Seção: Cor ── */}
              <SectionTitle icon={<Award size={14} />} label="Cor na Agenda" />

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.5rem' }}>
                {COLORS.map((c) => (
                  <button
                    key={c.hex} type="button" title={c.name}
                    onClick={() => setFormData({ ...formData, color: c.hex })}
                    style={{
                      height: 36, borderRadius: 10,
                      backgroundColor: c.hex,
                      border: formData.color === c.hex ? '3px solid white' : '2px solid transparent',
                      outline: formData.color === c.hex ? `2px solid ${c.hex}` : 'none',
                      boxShadow: formData.color === c.hex ? `0 4px 12px ${c.hex}60` : 'none',
                      cursor: 'pointer', transition: 'all 0.2s ease',
                      transform: formData.color === c.hex ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>

              {/* ── Botões ── */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isPending} style={{ minWidth: 140 }}>
                  {isPending ? 'Salvando...' : editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div style={{
        color: 'var(--primary-color)',
        display: 'flex', alignItems: 'center',
      }}>{icon}</div>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-color)', marginLeft: '0.5rem' }} />
    </div>
  );
}
