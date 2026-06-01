import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertOctagon, Clock, CreditCard, Loader2, RefreshCw, LogOut, Info, Lock, ExternalLink, HelpCircle } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function LicenseExpired() {
  const { license, checkLicense, logout, token } = useAuth();
  const { showToast } = useToast();
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [showSim, setShowSim] = useState(false);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handlePay = async () => {
    setGenerating(true);
    try {
      const res = await fetch('http://localhost:3002/api/licensing/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success && data.paymentLinkUrl) {
        showToast('Link de pagamento gerado com sucesso!');
        await checkLicense(); // Refresh status to store link URL
        window.open(data.paymentLinkUrl, '_blank');
      } else {
        showToast('Erro ao gerar link de pagamento. Tente novamente.', 'error');
      }
    } catch (err) {
      showToast('Falha na comunicação com o servidor.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await checkLicense();
      showToast('Status da assinatura atualizado!');
    } catch (err) {
      showToast('Erro ao atualizar status.', 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!license?.lastPaymentLinkId) {
      // Need a payment link first
      setSimulating(true);
      try {
        const res = await fetch('http://localhost:3002/api/licensing/generate-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success && data.paymentLinkId) {
          await triggerMockWebhook(data.paymentLinkId);
        } else {
          showToast('Erro ao iniciar simulação.', 'error');
          setSimulating(false);
        }
      } catch (err) {
        showToast('Erro na simulação.', 'error');
        setSimulating(false);
      }
      return;
    }

    setSimulating(true);
    await triggerMockWebhook(license.lastPaymentLinkId);
  };

  const triggerMockWebhook = async (linkId: string) => {
    try {
      const res = await fetch('http://localhost:3002/api/webhooks/asaas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event: 'PAYMENT_RECEIVED',
          payment: {
            id: 'mock_pay_' + Math.random().toString(36).substring(2, 11),
            value: license?.subscriptionPrice || 99.90,
            paymentLink: linkId
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Simulação concluída! Pagamento creditado.');
        await checkLicense();
      } else {
        showToast('Erro na simulação do webhook: ' + data.error, 'error');
      }
    } catch (err) {
      showToast('Falha ao conectar com o simulador.', 'error');
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'radial-gradient(circle at top right, #1e1b4b, #0f172a 70%)',
      fontFamily: 'Inter, sans-serif',
      color: '#f8fafc',
      padding: '2rem',
    }}>
      <div className="glass-panel" style={{
        maxWidth: '540px',
        width: '100%',
        padding: '3rem 2.5rem',
        textAlign: 'center',
        background: 'rgba(30, 41, 59, 0.45)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '1.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Effects */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '150px',
          height: '150px',
          background: 'rgba(239, 68, 68, 0.15)',
          filter: 'blur(50px)',
          borderRadius: '50%'
        }}></div>

        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          width: '72px',
          height: '72px',
          borderRadius: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ef4444',
          margin: '0 auto 1.5rem auto'
        }}>
          <AlertOctagon size={36} />
        </div>

        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 800,
          color: '#ffffff',
          marginBottom: '0.5rem',
          letterSpacing: '-0.025em'
        }}>
          Acesso Suspenso
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '0.95rem',
          fontWeight: 500,
          margin: '0 0 1.5rem 0'
        }}>
          A licença da sua clínica <strong>{license?.companyName}</strong> está expirada.
        </p>

        {/* Expiry Details Box */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.04)',
          borderRadius: '1rem',
          padding: '1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Vencimento</span>
            <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{formatDate(license?.licenseExpiresAt)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem' }}>
            <span style={{ color: '#64748b', fontWeight: 500 }}>Status</span>
            <span style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock size={14} /> Expirada
            </span>
          </div>
        </div>

        {/* Information Callout */}
        <div style={{
          background: 'rgba(59, 130, 246, 0.06)',
          border: '1px solid rgba(59, 130, 246, 0.15)',
          borderRadius: '0.75rem',
          padding: '1rem',
          textAlign: 'left',
          fontSize: '0.825rem',
          color: '#93c5fd',
          lineHeight: '1.5',
          marginBottom: '2rem',
          display: 'flex',
          gap: '0.75rem'
        }}>
          <Info size={20} style={{ flexShrink: 0, color: '#3b82f6' }} />
          <span>
            Para reestabelecer o acesso, realize a renovação da licença. O valor é de <strong>R$ {license?.subscriptionPrice?.toFixed(2).replace('.', ',') || '99,90'}</strong> por mais {license?.subscriptionDays || '30'} dias de uso. O pagamento pode ser feito via Pix, Cartão ou Boleto.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={handlePay}
            disabled={generating}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              color: 'white',
              border: 'none',
              padding: '1rem 1.5rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s'
            }}
            className="hover-bright"
          >
            {generating ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <CreditCard size={18} />
            )}
            {`Pagar R$ ${license?.subscriptionPrice?.toFixed(2).replace('.', ',') || '99,90'} (Asaas)`}
            <ExternalLink size={14} style={{ opacity: 0.8 }} />
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
              onClick={handleRefresh}
              disabled={checking}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#e2e8f0',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              {checking ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <RefreshCw size={16} />
              )}
              Já Realizei o Pagamento
            </button>

            <button
              onClick={logout}
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={16} />
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Development Mock Section */}
        <div style={{ marginTop: '2.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '1.5rem' }}>
          <button
            onClick={() => setShowSim(!showSim)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
          >
            <Lock size={12} /> {showSim ? 'Ocultar Ferramenta de Teste' : 'Exibir Ferramenta de Teste'}
          </button>

          {showSim && (
            <div style={{
              marginTop: '1rem',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              borderRadius: '0.75rem',
              padding: '1rem',
              textAlign: 'left',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <p style={{
                color: '#64748b',
                fontSize: '0.75rem',
                lineHeight: '1.4',
                margin: '0 0 1rem 0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <HelpCircle size={14} style={{ color: '#3b82f6' }} />
                <span>Simula o recebimento do Webhook oficial de pagamento do Asaas para testes rápidos locais.</span>
              </p>
              <button
                onClick={handleSimulateWebhook}
                disabled={simulating}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.6rem 1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)'
                }}
              >
                {simulating ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <span>Aprovar Pagamento Simulador ({license?.subscriptionDays || '30'} dias)</span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
