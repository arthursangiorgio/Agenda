import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register as registerApi } from '../api';
import { UserPlus, Building2, Mail, Lock, User, Globe, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import '../auth.css';

export default function Register() {
  const [formData, setFormData] = useState({
    companyName: '',
    slug: '',
    name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await registerApi(formData);
      if (data.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      }
    } catch (err) {
      setError('Falha ao registrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card success-card">
          <div className="success-icon">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="auth-title">Cadastro realizado!</h2>
          <p className="auth-subtitle">
            Sua clínica foi registrada com sucesso. Redirecionando para o login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card wide">
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <UserPlus className="w-8 h-8" />
          </div>
          <h1 className="auth-title">Comece agora!</h1>
          <p className="auth-subtitle">Cadastre sua clínica e gerencie seus pacientes</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && (
            <div className="error-message">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="auth-grid">
            <div className="form-group">
              <label className="form-label">Nome da Clínica</label>
              <div className="input-wrapper">
                <Building2 className="input-icon" />
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="auth-input"
                  placeholder="Ex: Sorriso Prime"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Identificador (Slug)</label>
              <div className="input-wrapper">
                <Globe className="input-icon" />
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="auth-input"
                  placeholder="ex-clinica-sorriso"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Dados do Administrador</h3>
            
            <div className="auth-form">
              <div className="form-group">
                <label className="form-label">Seu Nome</label>
                <div className="input-wrapper">
                  <User className="input-icon" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="auth-input"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div className="auth-grid">
                <div className="form-group">
                  <label className="form-label">E-mail de Acesso</label>
                  <div className="input-wrapper">
                    <Mail className="input-icon" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="auth-input"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Crie uma Senha</label>
                  <div className="input-wrapper">
                    <Lock className="input-icon" />
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="auth-input"
                      placeholder="No mínimo 6 caracteres"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="auth-button"
            style={{ marginTop: '1.5rem' }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Criar Minha Conta Grátis'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Já tem uma conta?{' '}
            <Link to="/login" className="auth-link">
              Faça login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
