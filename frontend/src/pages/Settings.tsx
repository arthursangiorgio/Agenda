import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWhatsAppStatus, fetchWhatsAppQr, logoutWhatsApp } from '../api';
import { Settings as SettingsIcon, MessageSquare, CheckCircle, RefreshCcw, LogOut, Smartphone } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function Settings() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [qrCode, setQrCode] = useState<string | null>(null);

  const { data: statusData, isLoading: loadingStatus } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: fetchWhatsAppStatus,
    refetchInterval: 5000 // Polling status every 5 seconds
  });

  const logoutMutation = useMutation({
    mutationFn: logoutWhatsApp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
      showToast('Desconectado com sucesso!');
    }
  });

  useEffect(() => {
    if (statusData?.status === 'DISCONNECTED' && statusData?.hasQr) {
      fetchWhatsAppQr().then(data => setQrCode(data.qr));
    } else {
      setQrCode(null);
    }
  }, [statusData]);

  const getStatusDisplay = () => {
    switch (statusData?.status) {
      case 'CONNECTED':
        return { 
          label: 'Conectado', 
          color: '#10b981', 
          icon: <CheckCircle size={20} />,
          description: 'O sistema está pronto para enviar mensagens automáticas.'
        };
      case 'INITIALIZING':
        return { 
          label: 'Inicializando...', 
          color: '#f59e0b', 
          icon: <RefreshCcw className="animate-spin" size={20} />,
          description: 'O serviço está iniciando. Por favor, aguarde.'
        };
      default:
        return { 
          label: 'Desconectado', 
          color: '#ef4444', 
          icon: <Smartphone size={20} />,
          description: 'Escaneie o QR Code abaixo com seu WhatsApp para conectar.'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="page-container animate-in">
      <div className="page-header">
        <h2 className="page-title">
          <SettingsIcon size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          Configurações do Sistema
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* WhatsApp Connection Card */}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'var(--secondary-color)', width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
              <MessageSquare size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Conexão WhatsApp</h3>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-muted)' }}>Status da automação</p>
            </div>
          </div>

          <div style={{ 
            backgroundColor: `${status.color}10`, 
            border: `1px solid ${status.color}30`,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: status.color, fontWeight: 700, fontSize: '1.1rem' }}>
              {status.icon}
              {status.label}
            </div>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-main)' }}>
              {status.description}
            </p>
          </div>

          {statusData?.status === 'CONNECTED' ? (
            <div style={{ textAlign: 'center' }}>
              <button 
                className="btn btn-secondary" 
                style={{ color: '#ef4444', borderColor: '#fee2e2', width: '100%' }}
                onClick={() => { if(window.confirm('Deseja desconectar o WhatsApp?')) logoutMutation.mutate(); }}
              >
                <LogOut size={18} style={{ marginRight: '0.5rem' }} />
                Desconectar WhatsApp
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              {qrCode ? (
                <div style={{ background: 'white', padding: '1rem', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  <img src={qrCode} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px' }} />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    Abra o WhatsApp &gt; Aparelhos Conectados &gt; Conectar um aparelho
                  </p>
                </div>
              ) : (
                <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>
                  <RefreshCcw size={48} className="animate-spin" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>Aguardando QR Code...</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Other Settings (Placeholder) */}
        <div className="glass-panel" style={{ padding: '2rem', opacity: 0.7 }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem' }}>Preferências de Mensagens</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>
              <input type="checkbox" checked readOnly />
              Enviar confirmação ao agendar
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>
              <input type="checkbox" checked readOnly />
              Enviar lembrete 24h antes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', cursor: 'not-allowed' }}>
              <input type="checkbox" checked readOnly />
              Anexar orientações pós-procedimento
            </label>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2rem' }}>
            * As mensagens automáticas estão ativas por padrão quando o WhatsApp está conectado.
          </p>
        </div>

      </div>
    </div>
  );
}
