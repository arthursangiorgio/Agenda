import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDentists, createDentist, updateDentist, deleteDentist } from '../api';
import { Plus, User, Trash, Edit, Palette } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Dentists() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data: dentists = [], isLoading } = useQuery({ queryKey: ['dentists'], queryFn: fetchDentists });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', specialization: '', color: '#4F46E5' });

  const mutation = useMutation({
    mutationFn: createDentist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      setIsModalOpen(false);
      resetForm();
      showToast('Dentista cadastrado!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateDentist(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      setIsModalOpen(false);
      setEditingId(null);
      resetForm();
      showToast('Dados atualizados!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDentist,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dentists'] });
      showToast('Dentista removido.');
    }
  });

  const resetForm = () => {
    setFormData({ name: '', specialization: '', color: '#4F46E5' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      mutation.mutate(formData);
    }
  };

  const colors = [
    '#4F46E5', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Dentistas / Profissionais</h2>
        <button className="btn btn-primary" onClick={() => { resetForm(); setEditingId(null); setIsModalOpen(true); }}>
          <Plus size={18} /> Novo Dentista
        </button>
      </div>

      {isLoading ? (
        <p>Carregando profissionais...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {dentists.map((dentist: any) => (
            <div key={dentist.id} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: dentist.color, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                  <User size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>{dentist.name}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{dentist.specialization || 'Clínico Geral'}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setEditingId(dentist.id);
                    setFormData({
                      name: dentist.name,
                      specialization: dentist.specialization || '',
                      color: dentist.color
                    });
                    setIsModalOpen(true);
                  }}
                >
                  <Edit size={16} /> Editar
                </button>
                <button 
                  className="btn btn-secondary" 
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                  onClick={() => { if(window.confirm('Excluir este dentista?')) deleteMutation.mutate(dentist.id); }}
                >
                  <Trash size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {editingId ? 'Editar Profissional' : 'Cadastrar Novo Profissional'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Nome Completo</label>
                <input required type="text" className="input-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Especialidade (Opcional)</label>
                <input type="text" className="input-control" placeholder="Ex: Ortodontia, Implante..." value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} />
              </div>
              
              <div className="input-group">
                <label>Cor na Agenda</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {colors.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData({...formData, color: c})}
                      style={{
                        height: '40px',
                        borderRadius: '8px',
                        backgroundColor: c,
                        border: formData.color === c ? '3px solid white' : 'none',
                        boxShadow: formData.color === c ? '0 0 0 2px var(--primary-color)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={mutation.isPending || updateMutation.isPending}>
                  {editingId ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
