import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCatalog, createCatalogItem, updateCatalogItem, deleteCatalogItem } from '../api';
import { Package, Stethoscope, Plus, Edit, Trash, DollarSign, Clock } from 'lucide-react';

export default function Catalog() {
  const queryClient = useQueryClient();
  
  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    type: 'SERVICE',
    name: '',
    description: '',
    price: 0,
    duration: 30,
    color: '#3b82f6'
  });

  // Queries
  const { data: catalog = [], isLoading } = useQuery({ 
    queryKey: ['catalog'], 
    queryFn: fetchCatalog 
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCatalogItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      closeModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => updateCatalogItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
      closeModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCatalogItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog'] });
    }
  });

  // Helpers
  const openModal = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        type: item.type,
        name: item.name,
        description: item.description || '',
        price: item.price,
        duration: item.duration,
        color: item.color || '#3b82f6'
      });
    } else {
      setEditingItem(null);
      setFormData({ type: 'SERVICE', name: '', description: '', price: 0, duration: 30, color: '#3b82f6' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  // Splitting items
  const services = catalog.filter((item: any) => item.type === 'SERVICE');
  const products = catalog.filter((item: any) => item.type === 'PRODUCT');

  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">Catálogo de Serviços e Produtos</h2>
        <button className="btn btn-primary" onClick={() => openModal()}>
          <Plus size={18} /> Adicionar Item
        </button>
      </div>

      {isLoading ? (
        <p>Carregando catálogo...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Services Section */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-color)' }}>
              <Stethoscope size={24} /> Serviços Clínicos
            </h3>
            
            {services.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum serviço cadastrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {services.map((service: any) => (
                  <div key={service.id} style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: service.color || '#3b82f6' }} title="Cor no Odontograma"></div>
                        <div>
                          <h4 style={{ fontWeight: 600 }}>{service.name}</h4>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{service.description || 'Sem descrição'}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openModal(service)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                        <button onClick={() => { if(window.confirm('Excluir este serviço?')) deleteMutation.mutate(service.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash size={16} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary-color)' }}><DollarSign size={16} /> {formatCurrency(service.price)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}><Clock size={16} /> {service.duration} min</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Products Section */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)' }}>
              <Package size={24} /> Produtos e Materiais
            </h3>
            
            {products.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Nenhum produto cadastrado.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {products.map((product: any) => (
                  <div key={product.id} style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ fontWeight: 600 }}>{product.name}</h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{product.description || 'Sem descrição'}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openModal(product)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Edit size={16} /></button>
                        <button onClick={() => { if(window.confirm('Excluir este produto?')) deleteMutation.mutate(product.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash size={16} /></button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.875rem', fontWeight: 500 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--secondary-color)' }}><DollarSign size={16} /> {formatCurrency(product.price)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Item Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>
              {editingItem ? 'Editar Item' : 'Novo Item do Catálogo'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label>Tipo</label>
                <select className="input-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="SERVICE">Serviço Clínico (Consulta, Limpeza, Cirurgia...)</option>
                  <option value="PRODUCT">Produto/Material (Prótese, Kit Clareamento...)</option>
                </select>
              </div>
              
              <div className="input-group" style={{ margin: 0 }}>
                <label>Nome do Item</label>
                <input required type="text" className="input-control" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Descrição (opcional)</label>
                <textarea className="input-control" rows={2} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ margin: 0 }}>
                  <label>Valor Base (R$)</label>
                  <input required type="number" min="0" step="0.01" className="input-control" value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} />
                </div>
                
                {formData.type === 'SERVICE' && (
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Duração Estimada (min)</label>
                    <input required type="number" min="15" step="15" className="input-control" value={formData.duration} onChange={e => setFormData({...formData, duration: parseInt(e.target.value, 10)})} />
                  </div>
                )}

                <div className="input-group" style={{ margin: 0 }}>
                  <label>Cor (Odontograma)</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} style={{ width: '40px', height: '40px', padding: '0', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{formData.color}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isLoading || updateMutation.isLoading}>
                  {createMutation.isLoading || updateMutation.isLoading ? 'Salvando...' : 'Salvar Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
